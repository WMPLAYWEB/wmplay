import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import vm from 'node:vm';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

let dbInstance: DatabaseSync | null = null;
function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), 'src', 'data', 'catalog.db');
    dbInstance = new DatabaseSync(dbPath, { open: true, readOnly: true });
  }
  return dbInstance;
}

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyZXNvbHZlciIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc5MDk4OTczfQ.WzQBuOqMai96Afleh9g-i7NXo6h-YsjPUbOgxlUqVsU';
const HOSTS = ['api.geekantenado.online', 'geekantenado.fly.dev'];
const OVERFLIX_HOSTS = ['www.overflix.download', 'www.overflix.fit', 'www.overflix.asia'];
const OVERFLIX_HOST = OVERFLIX_HOSTS[0];

export interface StreamServer {
  name: string;
  url: string;
  type: 'video' | 'embed';
  isDubbed?: boolean;
}

async function fetchOverflix(pathOrUrl: string, referer: string): Promise<any> {
  const initialUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `https://${OVERFLIX_HOST}${pathOrUrl}`;
  return new Promise((resolve) => {
    const doFetch = (targetUrl: string, depth = 0, hostIdx = 0) => {
      if (depth > 3) return resolve(null);
      try {
        const u = new URL(targetUrl);
        https.get({
          hostname: u.hostname,
          path: u.pathname + u.search,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': referer
          },
          timeout: 6000
        }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextLoc = res.headers.location.startsWith('http')
              ? res.headers.location
              : `https://${u.hostname}${res.headers.location}`;
            return doFetch(nextLoc, depth + 1, hostIdx);
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json && json.redirect && typeof json.redirect === 'string') {
                return doFetch(json.redirect, depth + 1, hostIdx);
              }
              resolve(json);
            } catch {
              if (hostIdx + 1 < OVERFLIX_HOSTS.length && !targetUrl.startsWith('http')) {
                return doFetch(`https://${OVERFLIX_HOSTS[hostIdx + 1]}${pathOrUrl}`, depth, hostIdx + 1);
              }
              resolve(null);
            }
          });
        }).on('error', () => {
          if (hostIdx + 1 < OVERFLIX_HOSTS.length && !targetUrl.startsWith('http')) {
            return doFetch(`https://${OVERFLIX_HOSTS[hostIdx + 1]}${pathOrUrl}`, depth, hostIdx + 1);
          }
          resolve(null);
        });
      } catch {
        resolve(null);
      }
    };
    doFetch(initialUrl, 0, 0);
  });
}

function parseServersString(str?: string): Record<string, string> {
  if (!str) return {};
  const cleaned = str.replace(/&amp;/g, '&');
  const result: Record<string, string> = {};
  cleaned.split('&').forEach((pair) => {
    const [k, v] = pair.split('=');
    if (k && v) result[k.trim().toLowerCase()] = v.trim();
  });
  return result;
}

// Extrai o link direto de vídeo MP4 do StreamTape (Padrão Kodi ResolveURL - Sem Anúncios)
async function resolveStreamTape(mediaId: string): Promise<string | null> {
  const url = `https://streamtape.com/e/${mediaId}`;
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://streamtape.com/'
      },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/document\.getElementById\(['"]robotlink['"]\)\.innerHTML\s*=\s*(.+?);/);
          if (match && match[1]) {
            const expr = match[1];
            const resolvedPath = vm.runInNewContext(expr, {});
            if (resolvedPath && typeof resolvedPath === 'string') {
              const directUrl = (resolvedPath.startsWith('//') ? 'https:' : '') + resolvedPath + '&stream=1';
              resolve(directUrl);
              return;
            }
          }
        } catch {}
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

// Segue o redirecionamento 302 para obter a URL direta de entrega de vídeo (tapecontent.net)
async function getRedirectLocation(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    https.get(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://streamtape.com/'
      },
      timeout: 5000
    }, (res) => {
      if (res.headers.location) {
        resolve(res.headers.location);
      } else {
        resolve(videoUrl);
      }
    }).on('error', () => resolve(videoUrl));
  });
}

// Verifica se um stream direto realmente responde e não dá 403 Forbidden
async function isStreamReachable(url: string): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  if (url.includes('source.apperror404.com')) return false;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': 'bytes=0-100'
      },
      signal: AbortSignal.timeout(2500)
    });
    if (res.body && typeof res.body.cancel === 'function') {
      try { res.body.cancel(); } catch {}
    }
    return res.status === 200 || res.status === 206 || (res.status >= 300 && res.status < 400);
  } catch {
    return url.includes('wasabisys.com');
  }
}

// Extrai o link direto de vídeo MP4 do MixDrop (Padrão Kodi ResolveURL - Sem Anúncios)
async function resolveMixdrop(mediaId: string): Promise<string | null> {
  const domains = ['https://mxdrop.click', 'https://mxdrop.to'];
  for (const domain of domains) {
    try {
      const pageData = await new Promise<string>((resolve) => {
        https.get(`${domain}/e/${mediaId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.overflix.win/'
          },
          timeout: 6000
        }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https.get(res.headers.location, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.overflix.win/'
              },
              timeout: 6000
            }, (res2) => {
              let d = '';
              res2.on('data', c => d += c);
              res2.on('end', () => resolve(d));
            }).on('error', () => resolve(''));
            return;
          }
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve(d));
        }).on('error', () => resolve(''));
      });

      if (!pageData) continue;
      const match = pageData.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]+?\.split\('\|'\),\d+,\{\}\)\)/);
      if (match) {
        const unpacked = vm.runInNewContext(match[0].replace(/^eval/, ''), {});
        if (unpacked && typeof unpacked === 'string') {
          const wurlMatch = unpacked.match(/MDCore\.wurl\s*=\s*['"]([^'"]+)['"]/);
          if (wurlMatch && wurlMatch[1]) {
            let finalUrl = wurlMatch[1];
            if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;
            return finalUrl;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao resolver Mixdrop:', e);
    }
  }
  return null;
}

async function buildOverflixServers(playerData: any, labelPrefix = 'Dublado PT-BR'): Promise<StreamServer[]> {
  const servers: StreamServer[] = [];
  if (!playerData) return servers;

  const dub = parseServersString(playerData.servers_dub);

  // 1. Extração Direta de Vídeo MP4 via StreamTape (Padrão Kodi - 0 Anúncios / Reprodução Direta)
  let tapeValid = false;
  if (dub.streamtape) {
    try {
      const directTape = await resolveStreamTape(dub.streamtape);
      if (directTape) {
        tapeValid = true;
        const finalMp4 = await getRedirectLocation(directTape);
        servers.push({
          name: `Servidor StreamTape Full HD Dublado (CDN Rápida)`,
          url: finalMp4,
          type: 'video',
          isDubbed: true
        });
      }
    } catch (err) {
      console.error('Erro ao resolver StreamTape direto:', err);
    }
  }

  // 1.5 Extração Direta de Vídeo MP4 via MixDrop (Padrão Kodi - 0 Anúncios / Reprodução Direta)
  if (dub.mixdrop) {
    try {
      const directMix = await resolveMixdrop(dub.mixdrop);
      if (directMix) {
        const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(directMix)}&referer=${encodeURIComponent('https://mxdrop.click/')}`;
        servers.push({
          name: `Servidor MixDrop Full HD Dublado (Anti-Buffer)`,
          url: proxiedUrl,
          type: 'video',
          isDubbed: true
        });
      }
    } catch (err) {
      console.error('Erro ao resolver Mixdrop direto:', err);
    }
  }

  return servers;
}

async function callResolver(resolverNum: number, requestStr: string): Promise<string | null> {
  const params = `{'resolver': ${resolverNum}, 'request': '${requestStr}'}`;
  const payload = encodeURIComponent(Buffer.from(params).toString('base64'));

  for (const host of HOSTS) {
    try {
      const resData = await new Promise<string>((resolve, reject) => {
        const req = https.get(`https://${host}/?resolver=${payload}`, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'User-Agent': 'Mozilla/5.0'
          },
          timeout: 4500
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });

      const json = JSON.parse(resData);
      if (json && json.success && json.result) {
        if (typeof json.result === 'string') {
          if (json.result.includes('not found') || json.result.includes('Maintenance') || json.result.trim() === '') {
            return null;
          }
          try {
            const decoded = Buffer.from(json.result, 'base64').toString('utf8');
            if (decoded && (decoded.startsWith('http') || decoded.startsWith('{') || decoded.startsWith('['))) {
              const cleanUrl = decoded.split('|')[0].trim();
              return cleanUrl;
            }
          } catch {}
          const cleanRaw = json.result.split('|')[0].trim();
          return cleanRaw.startsWith('http') ? cleanRaw : null;
        }
      }
    } catch {}
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const link = searchParams.get('link') || '';
    const title = searchParams.get('title') || '';
    const tmdbId = searchParams.get('tmdbId') || searchParams.get('tmdb_id') || '';
    const mediaType = searchParams.get('type') || searchParams.get('mediaType') || 'movie'; // movie or tv
    const season = searchParams.get('season') || '1';
    const episode = searchParams.get('episode') || '1';

    const servers: StreamServer[] = [];

    // =========================================================================
    // 0. CANAIS ESPECIAIS AO VIVO (REDE GLOBO, GLOBONEWS, ETC.)
    // =========================================================================
    const lowerTitle = title.toLowerCase();
    const isGloboNews = lowerTitle.includes('globonews') || link.includes('ch_globonews');
    const isGlobo = !isGloboNews && (
      lowerTitle.includes('globo') ||
      link.includes('ch_globo') ||
      link.includes('globotvbahia')
    );

    if (isGlobo) {
      servers.push(
        {
          name: 'Rede Globo HD Ao Vivo (Sinal Principal Full HD)',
          url: '/api/proxy-stream?url=' + encodeURIComponent('http://hls1.sua.tv/live/globotvbahiafhdbr2/s.m3u8'),
          type: 'video',
          isDubbed: true
        },
        {
          name: 'Rede Globo HD (Sinal Direto HLS)',
          url: 'http://hls1.sua.tv/live/globotvbahiafhdbr2/s.m3u8',
          type: 'video',
          isDubbed: true
        },
        {
          name: 'ge Fast (Globo Esporte 24h Ao Vivo HD Oficial)',
          url: 'https://amg00716-globo-amg00716c1-tcl-br-9495.playouts.now.amagi.tv/playlist.m3u8',
          type: 'video',
          isDubbed: true
        }
      );
    } else if (isGloboNews) {
      servers.push(
        {
          name: 'GloboNews HD Ao Vivo (Sinal Principal)',
          url: '/api/proxy-stream?url=' + encodeURIComponent('http://79.127.238.228:14093'),
          type: 'video',
          isDubbed: true
        },
        {
          name: 'GloboNews HD (Sinal Direto)',
          url: 'http://79.127.238.228:14093',
          type: 'video',
          isDubbed: true
        }
      );
    }

    // =========================================================================
    // 1. REPRODUÇÃO DIRETA DE EPISÓDIOS RESOLVIDOS DO BRAZUCA PLAY (MP4 Sem Anúncios)
    // =========================================================================
    if (link.includes('resolver2_episodes=')) {
      try {
        let epUrl = link.split('resolver2_episodes=')[1];
        if (epUrl.includes('&season=')) {
          epUrl = epUrl.split('&season=')[0];
        }
        if (epUrl && epUrl.startsWith('http') && !epUrl.includes('source.apperror404.com')) {
          const finalUrl = await getRedirectLocation(epUrl);
          servers.push({
            name: `Transmissão Direta Full HD Dublado T${season}E${episode} (Sem Anúncios)`,
            url: finalUrl,
            type: 'video',
            isDubbed: true
          });
          servers.push({
            name: `Transmissão Acelerada Anti-Travamento T${season}E${episode}`,
            url: `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}`,
            type: 'video',
            isDubbed: true
          });
        }
      } catch (err) {
        console.error('Erro ao extrair resolver2_episodes:', err);
      }
    }

    // =========================================================================
    // 1.5 REPRODUÇÃO DIRETA DO RESOLVER 2 TVSHOWS (MP4 Direto Sem Anúncios)
    // =========================================================================
    if (servers.length === 0 && link.includes('resolver2_tvshows=')) {
      try {
        let slug = link.split('resolver2_tvshows=')[1].split('|')[0].split('&')[0];
        if (!slug.includes('#')) slug = 'series#' + slug;
        const resData = await callResolver(2, `tvshows=${slug}`);
        if (resData) {
          try {
            const seasons = typeof resData === 'string' ? JSON.parse(resData) : resData;
            if (Array.isArray(seasons)) {
              const targetSeason = seasons.find((s: any) => String(s.season_number) === String(season)) || seasons[0];
              const targetEp = targetSeason?.episodes?.find((e: any) => String(e.episode_number) === String(episode));
              if (targetEp?.link && targetEp.link.startsWith('http') && !targetEp.link.includes('source.apperror404.com')) {
                const finalUrl = await getRedirectLocation(targetEp.link);
                servers.push({
                  name: `Transmissão Direta Full HD Dublado T${season}E${episode} (Sem Anúncios)`,
                  url: finalUrl,
                  type: 'video',
                  isDubbed: true
                });
                servers.push({
                  name: `Transmissão Acelerada Anti-Travamento T${season}E${episode}`,
                  url: `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}`,
                  type: 'video',
                  isDubbed: true
                });
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error('Erro ao resolver resolver2_tvshows em resolve-stream:', err);
      }
    }

    // =========================================================================
    // 2. REPRODUÇÃO DIRETA DO RESOLVER 3 EPISODES OU TVSHOWS (Wasabi S3 MP4 Sem Anúncios)
    // =========================================================================
    if (link.includes('resolver3_episodes=') || link.includes('resolver3_tvshows=') || link.includes('animes2=')) {
      try {
        let epSlug = '';
        if (link.includes('resolver3_episodes=')) {
          epSlug = link.split('resolver3_episodes=')[1].split('&')[0];
        } else if (link.includes('resolver3_tvshows=')) {
          epSlug = link.split('resolver3_tvshows=')[1].split('|')[0].split('&')[0];
        } else {
          epSlug = link.split('animes2=')[1].split('|')[0].split('&')[0];
        }

        const parts = epSlug.split(/[#/]/);
        const slug = parts[0];
        const s = parts[1] || season || '1';
        const e = parts[2] || episode || '1';

        let directWasabi = await callResolver(3, `episodes=${slug}#${s}#${e}#Dublado`);
        if (!directWasabi) {
          directWasabi = await callResolver(3, `episodes=${slug}#${s}#${e}#Legendado`);
        }
        if (!directWasabi) {
          directWasabi = await callResolver(3, `episodes=${slug}#${s}#${e}`);
        }
        if (directWasabi && directWasabi.startsWith('http')) {
          const isReachable = await isStreamReachable(directWasabi);
          if (isReachable) {
            servers.push({
              name: `Servidor 1: Transmissão Wasabi Full HD Dublado T${season}E${episode} (Sem Anúncios)`,
              url: directWasabi,
              type: 'video',
              isDubbed: true
            });
            servers.push({
              name: `Servidor 2: Wasabi Acelerado (Buffer Anti-Travamento)`,
              url: `/api/proxy-stream?url=${encodeURIComponent(directWasabi)}`,
              type: 'video',
              isDubbed: true
            });
          }
        }
      } catch (err) {
        console.error('Erro ao resolver resolver3_episodes:', err);
      }
    }

    // =========================================================================
    // 3. REPRODUÇÃO DE FILMES: RESOLVER 2 & 3 (GeekAntenado Brazuca / Wasabi MP4 Full HD - Sem Anúncios)
    // =========================================================================
    if (link.includes('resolver3_mv=') || link.includes('resolver2_mv=')) {
      try {
        const match = link.match(/resolver[23]_mv=([a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          const slug = match[1];
          let directStream = await callResolver(3, `mvshows=${slug}`);
          if (!directStream) {
            directStream = await callResolver(2, `mvshows=${slug}`);
          }
          if (!directStream) {
            directStream = await callResolver(1, `mvshows=${slug}`);
          }
          if (directStream && directStream.startsWith('http') && !directStream.includes('source.apperror404.com')) {
            const finalUrl = directStream.includes('source.apperror404.com')
              ? await getRedirectLocation(directStream)
              : directStream;
            const isReachable = await isStreamReachable(finalUrl);
            if (isReachable) {
              servers.push({
                name: 'Transmissão Direta Full HD Dublado (Sem Anúncios)',
                url: finalUrl,
                type: 'video',
                isDubbed: true
              });
              servers.push({
                name: 'Transmissão Acelerada Anti-Travamento (Proxy Seguro)',
                url: `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}`,
                type: 'video',
                isDubbed: true
              });
            }
          }
        }
      } catch (err) {
        console.error('Erro ao resolver resolver_mv:', err);
      }
    }

    // =========================================================================
    // 4. REPRODUÇÃO DE FILMES: OVERFLIX DUBLADO (movie2=...)
    // =========================================================================
    if (link.includes('movie2=')) {
      try {
        const match = link.match(/movie2=([a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          const slug = match[1];
          const baseSlug = slug.replace(/-dublado-\d+$/, '').replace(/-legendado-\d+$/, '').replace(/-\d+$/, '');

          // Se ainda não encontrou servidor direto, tentar via Resolver 2 / 3 com o baseSlug
          if (servers.length === 0 && baseSlug) {
            try {
              let directStream = await callResolver(3, `mvshows=${baseSlug}`);
              if (!directStream) {
                directStream = await callResolver(2, `mvshows=${baseSlug}`);
              }
              if (directStream && directStream.startsWith('http') && !directStream.includes('source.apperror404.com')) {
                const finalUrl = directStream.includes('source.apperror404.com')
                  ? await getRedirectLocation(directStream)
                  : directStream;
                const isReachable = await isStreamReachable(finalUrl);
                if (isReachable) {
                  servers.push({
                    name: 'Transmissão Direta Full HD Dublado (Sem Anúncios)',
                    url: finalUrl,
                    type: 'video',
                    isDubbed: true
                  });
                  servers.push({
                    name: 'Transmissão Acelerada Anti-Travamento (Proxy Seguro)',
                    url: `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}`,
                    type: 'video',
                    isDubbed: true
                  });
                }
              }
            } catch (err) {
              console.error('Erro ao resolver stream direto do movie2:', err);
            }
          }

          const videoId = slug.split('-').pop();
          if (videoId && /^\d+$/.test(videoId)) {
            const referer = `https://${OVERFLIX_HOST}/filmes/online/${slug}/`;
            const path = `/index.php?app=videobox&module=video&controller=view&do=playerData&id=${videoId}`;
            const playerData = await fetchOverflix(path, referer);
            const ovServers = await buildOverflixServers(playerData, 'Dublado PT-BR');
            servers.push(...ovServers);
          }
        }
      } catch (err) {
        console.error('Erro ao resolver Overflix filme:', err);
      }
    }

    // =========================================================================
    // 5. REPRODUÇÃO DE SÉRIES: OVERFLIX DUBLADO (serie3_ep= ou serie3=)
    // =========================================================================
    if (link.includes('serie3_ep=')) {
      try {
        const match = link.match(/serie3_ep=([^&]+)/);
        if (match && match[1]) {
          const epUrl = decodeURIComponent(match[1]);
          const epSlug = epUrl.replace(/\/$/, '').split('/').pop();
          const epId = epSlug?.split('-').pop();
          if (epId && /^\d+$/.test(epId)) {
            const epPlayerData = await fetchOverflix(`/index.php?app=videobox&module=video&controller=view&do=playerData&id=${epId}`, epUrl);
            const ovServers = await buildOverflixServers(epPlayerData, `Dublado PT-BR T${season}E${episode}`);
            servers.push(...ovServers);
          }
        }
      } catch (err) {
        console.error('Erro ao resolver serie3_ep:', err);
      }
    }
    
    if (link.includes('serie3=')) {
      try {
        const match = link.match(/serie3=([a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          const slug = match[1];
          const seriesId = slug.split('-').pop();
          if (seriesId && /^\d+$/.test(seriesId)) {
            const referer = `https://${OVERFLIX_HOST}/series/online/${slug}/`;
            const epListPath = `/index.php?app=videobox&module=video&controller=view&do=episodesList&id=${seriesId}&season=${season}&audio=Dublado`;
            let epListData = await fetchOverflix(epListPath, referer);
            if (!epListData || !Array.isArray(epListData.episodes) || epListData.episodes.length === 0) {
              const legListPath = `/index.php?app=videobox&module=video&controller=view&do=episodesList&id=${seriesId}&season=${season}&audio=Legendado`;
              epListData = await fetchOverflix(legListPath, referer);
            }

            if (epListData && Array.isArray(epListData.episodes)) {
              const targetEp = epListData.episodes.find((e: any) => String(e.number) === String(episode));
              if (targetEp && targetEp.url) {
                const epSlug = targetEp.url.replace(/\/$/, '').split('/').pop();
                const epId = epSlug?.split('-').pop();
                if (epId && /^\d+$/.test(epId)) {
                  const epPlayerData = await fetchOverflix(`/index.php?app=videobox&module=video&controller=view&do=playerData&id=${epId}`, targetEp.url);
                  const ovServers = await buildOverflixServers(epPlayerData, `Dublado PT-BR T${season}E${episode}`);
                  servers.push(...ovServers);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro ao resolver Overflix série:', err);
      }
    }

    // =========================================================================
    // 5.5 REPRODUÇÃO DE DORAMAS (doramas_resolver1=...)
    // =========================================================================
    if (servers.length === 0 && link.includes('doramas_resolver1=')) {
      try {
        const slug = link.split('doramas_resolver1=')[1].split('|')[0].split('&')[0];
        let directWasabi = await callResolver(1, `episodes=${slug}#${season}#${episode}#Dublado`);
        if (!directWasabi) {
          directWasabi = await callResolver(1, `episodes=${slug}#${season}#${episode}#Legendado`);
        }
        if (!directWasabi) {
          directWasabi = await callResolver(3, `episodes=${slug}#${season}#${episode}#Dublado`);
        }
        if (!directWasabi) {
          directWasabi = await callResolver(3, `episodes=${slug}#${season}#${episode}#Legendado`);
        }
        if (directWasabi && directWasabi.startsWith('http')) {
          servers.push({
            name: `Transmissão Dorama Full HD T${season}E${episode} (Sem Anúncios)`,
            url: directWasabi,
            type: 'video',
            isDubbed: true
          });
        }
      } catch (err) {
        console.error('Erro ao resolver doramas_resolver1:', err);
      }
    }

    // =========================================================================
    // 6. STREAMS DIRETOS (HLS .m3u8 ou MP4 nativo)
    // =========================================================================
    if (servers.length === 0 && link.startsWith('http') && (link.includes('.m3u8') || link.includes('.mp4')) && !link.includes('source.apperror404.com')) {
      const isHttp = link.startsWith('http://');
      const mainUrl = isHttp ? `/api/proxy-stream?url=${encodeURIComponent(link)}` : link;
      servers.push({
        name: link.includes('.m3u8') ? 'Sinal Direto HD (Sem Anúncios)' : 'Transmissão Direta MP4 Dublado (Sem Anúncios)',
          url: mainUrl,
          type: 'video',
          isDubbed: true
        });
        if (isHttp) {
          servers.push({
            name: 'Sinal Alternativo (Direto HLS)',
            url: link,
            type: 'video',
            isDubbed: true
          });
        }
      }

    // =========================================================================
    // 7. BUSCA AUTOMÁTICA DE SERVIDOR ALTERNATIVO NO CATÁLOGO POR TMDB_ID OU TÍTULO EXATO
    // (Correspondência 100% exata - NUNCA usa LIKE amplo para não misturar conteúdos)
    // =========================================================================
    if (servers.length === 0 && (tmdbId || title)) {
      try {
        const db = getDb();

        if (mediaType === 'tv') {
          // Fallback para Séries, Animes, Doramas, Desenhos e Novelas
          let altRows: { link: string; tmdb_id?: string }[] = [];
          if (tmdbId) {
            altRows = db.prepare(
              `SELECT link, tmdb_id FROM items WHERE tmdb_id = ? AND type IN ('series', 'animes', 'doramas', 'desenhos', 'novelas') AND link != ? LIMIT 6`
            ).all(tmdbId, link) as { link: string; tmdb_id?: string }[];
          }
          if (altRows.length === 0 && title) {
            const normTitle = title.toLowerCase().trim();
            const cleanTitle = title.split(' - T')[0].replace(/\s*-\s*.*$/, '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
            altRows = db.prepare(
              `SELECT link, tmdb_id FROM items WHERE (clean_title = ? OR lower(title) = ? OR title = ?) AND type IN ('series', 'animes', 'doramas', 'desenhos', 'novelas') AND link != ? LIMIT 6`
            ).all(cleanTitle, normTitle, title, link) as { link: string; tmdb_id?: string }[];
          }

          for (const altRow of altRows) {
            if (servers.length > 0) break;
            if (!altRow.link || altRow.link === link) continue;
            const altLink = altRow.link;

            // 1. Tentar resolver3_tvshows na rota alternativa (Wasabi S3 Dublado)
            if (altLink.includes('resolver3_tvshows=')) {
              const sSlug = altLink.split('resolver3_tvshows=')[1].split('|')[0].split('&')[0];
              if (sSlug && !/^\d+$/.test(sSlug)) {
                let directWasabi = await callResolver(3, `episodes=${sSlug}#${season}#${episode}#Dublado`);
                if (!directWasabi) {
                  directWasabi = await callResolver(3, `episodes=${sSlug}#${season}#${episode}#Legendado`);
                }
                if (directWasabi && directWasabi.startsWith('http')) {
                  const isReachable = await isStreamReachable(directWasabi);
                  if (isReachable) {
                    servers.push({
                      name: `Transmissão Wasabi Full HD Dublado T${season}E${episode} (Sem Anúncios)`,
                      url: directWasabi,
                      type: 'video',
                      isDubbed: true
                    });
                    servers.push({
                      name: `Wasabi Acelerado Anti-Buffer T${season}E${episode}`,
                      url: `/api/proxy-stream?url=${encodeURIComponent(directWasabi)}`,
                      type: 'video',
                      isDubbed: true
                    });
                  }
                }
              }
            }

            // 2. Tentar serie3 na rota alternativa (Overflix: StreamTape / MixDrop Dublado)
            if (servers.length === 0 && altLink.includes('serie3=')) {
              const match = altLink.match(/serie3=([a-zA-Z0-9_\-]+)/);
              if (match && match[1]) {
                const sSlug = match[1];
                const seriesId = sSlug.split('-').pop();
                if (seriesId && /^\d+$/.test(seriesId)) {
                  const referer = `https://${OVERFLIX_HOST}/series/online/${sSlug}/`;
                  let epList = await fetchOverflix(`/index.php?app=videobox&module=video&controller=view&do=episodesList&id=${seriesId}&season=${season}&audio=Dublado`, referer);
                  if (!epList || !Array.isArray(epList.episodes) || epList.episodes.length === 0) {
                    epList = await fetchOverflix(`/index.php?app=videobox&module=video&controller=view&do=episodesList&id=${seriesId}&season=${season}&audio=Legendado`, referer);
                  }
                  if (epList && Array.isArray(epList.episodes)) {
                    const targetEp = epList.episodes.find((e: any) => String(e.number) === String(episode));
                    if (targetEp && targetEp.url) {
                      const epId = targetEp.url.replace(/\/$/, '').split('/').pop()?.split('-').pop();
                      if (epId && /^\d+$/.test(epId)) {
                        const epPData = await fetchOverflix(`/index.php?app=videobox&module=video&controller=view&do=playerData&id=${epId}`, targetEp.url);
                        const ovServers = await buildOverflixServers(epPData, `Dublado PT-BR T${season}E${episode}`);
                        servers.push(...ovServers);
                      }
                    }
                  }
                }
              }
            }

            // 3. Tentar resolver2_tvshows na rota alternativa
            if (servers.length === 0 && altLink.includes('resolver2_tvshows=')) {
              let sSlug = altLink.split('resolver2_tvshows=')[1].split('|')[0].split('&')[0];
              if (!sSlug.includes('#')) sSlug = 'series#' + sSlug;
              const resData = await callResolver(2, `tvshows=${sSlug}`);
              if (resData) {
                try {
                  const seasons = typeof resData === 'string' ? JSON.parse(resData) : resData;
                  if (Array.isArray(seasons)) {
                    const targetSeason = seasons.find((s: any) => String(s.season_number) === String(season)) || seasons[0];
                    const targetEp = targetSeason?.episodes?.find((e: any) => String(e.episode_number) === String(episode));
                    if (targetEp?.link && targetEp.link.startsWith('http') && !targetEp.link.includes('source.apperror404.com')) {
                      const finalUrl = await getRedirectLocation(targetEp.link);
                      servers.push({
                        name: `Transmissão Direta Full HD Dublado T${season}E${episode} (Sem Anúncios)`,
                        url: finalUrl,
                        type: 'video',
                        isDubbed: true
                      });
                    }
                  }
                } catch {}
              }
            }
          }
        } else {
          // Fallback para Filmes por TMDB_ID ou Título Exato
          let altRows: { link: string; tmdb_id?: string }[] = [];
          if (tmdbId) {
            altRows = db.prepare(
              `SELECT link, tmdb_id FROM items WHERE tmdb_id = ? AND type IN ('filmes', 'lancamentos') AND link != ? LIMIT 6`
            ).all(tmdbId, link) as { link: string; tmdb_id?: string }[];
          }
          if (altRows.length === 0 && title) {
            const normTitle = title.toLowerCase().trim();
            const cleanTitle = title.split(' - T')[0].replace(/\s*-\s*.*$/, '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
            altRows = db.prepare(
              `SELECT link, tmdb_id FROM items WHERE (clean_title = ? OR lower(title) = ? OR title = ?) AND type IN ('filmes', 'lancamentos') AND link != ? LIMIT 6`
            ).all(cleanTitle, normTitle, title, link) as { link: string; tmdb_id?: string }[];
          }

          for (const altRow of altRows) {
            if (servers.length > 0) break;
            if (!altRow.link || altRow.link === link) continue;
            const altLink = altRow.link;

            // 1. Tentar resolver3_mv na linha alternativa (Wasabi S3 Dublado)
            if (altLink.includes('resolver3_mv=')) {
              const match = altLink.match(/resolver3_mv=([a-zA-Z0-9_\-]+)/);
              if (match && match[1]) {
                const slug = match[1];
                let directStream = await callResolver(3, `mvshows=${slug}`);
                if (!directStream) {
                  directStream = await callResolver(2, `mvshows=${slug}`);
                }
                if (directStream && directStream.startsWith('http') && !directStream.includes('source.apperror404.com')) {
                  const isReachable = await isStreamReachable(directStream);
                  if (isReachable) {
                    servers.push({
                      name: 'Transmissão Direta Full HD Dublado (Sem Anúncios)',
                      url: directStream,
                      type: 'video',
                      isDubbed: true
                    });
                    servers.push({
                      name: 'Transmissão Acelerada Anti-Travamento (Proxy Seguro)',
                      url: `/api/proxy-stream?url=${encodeURIComponent(directStream)}`,
                      type: 'video',
                      isDubbed: true
                    });
                  }
                }
              }
            }

            // 2. Se ainda sem servidores, tentar movie2 (Overflix: StreamTape / MixDrop Dublado)
            if (servers.length === 0 && altLink.includes('movie2=')) {
              const match = altLink.match(/movie2=([a-zA-Z0-9_\-]+)/);
              if (match && match[1]) {
                const slug = match[1];
                const videoId = slug.split('-').pop();
                if (videoId && /^\d+$/.test(videoId)) {
                  const referer = `https://${OVERFLIX_HOST}/filmes/online/${slug}/`;
                  const p = `/index.php?app=videobox&module=video&controller=view&do=playerData&id=${videoId}`;
                  const playerData = await fetchOverflix(p, referer);
                  const ovServers = await buildOverflixServers(playerData, 'Dublado PT-BR');
                  servers.push(...ovServers);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro no fallback por título:', err);
      }
    }

    // =========================================================================
    // 8. REDE UNIVERSAL DE SERVIDORES DE BACKUP INTERNACIONAL (EMERGÊNCIA)
    // =========================================================================
    let targetTmdbId = tmdbId;
    let targetSeason = season;
    let targetEpisode = episode;

    if (!targetTmdbId && link.includes('tmdb_ep=')) {
      const match = link.match(/tmdb_ep=(\d+)/);
      if (match) targetTmdbId = match[1];
      const sMatch = link.match(/season=(\d+)/);
      if (sMatch) targetSeason = sMatch[1];
      const eMatch = link.match(/episode=(\d+)/);
      if (eMatch) targetEpisode = eMatch[1];
    }
    if (!targetTmdbId && link.includes('tmdb=')) {
      const match = link.match(/tmdb=(\d+)/);
      if (match) targetTmdbId = match[1];
    }

    if (!targetTmdbId && title) {
      try {
        const normTitle = title.toLowerCase().trim();
        const cleanTitle = title.split(' - T')[0].replace(/\s*-\s*.*$/, '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        const db = getDb();
        const row = db.prepare(
          'SELECT tmdb_id FROM items WHERE (clean_title = ? OR lower(title) = ? OR title = ?) AND tmdb_id IS NOT NULL AND tmdb_id != "" LIMIT 1'
        ).get(cleanTitle, normTitle, title) as { tmdb_id?: string } | undefined;
        if (row && row.tmdb_id) {
          targetTmdbId = row.tmdb_id;
        }
      } catch {}
    }

    return NextResponse.json({
      success: servers.length > 0,
      servers,
      totalServers: servers.length,
      error: servers.length === 0 ? 'Sinal temporariamente indisponível no acervo do Brazuca Play / Overflix. Por favor, escolha outro título do catálogo.' : undefined
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, servers: [] }, { status: 500 });
  }
}
