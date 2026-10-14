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
const OVERFLIX_HOST = 'www.overflix.asia';

export interface StreamServer {
  name: string;
  url: string;
  type: 'video' | 'embed';
  isDubbed?: boolean;
}

async function fetchOverflix(path: string, referer: string): Promise<any> {
  const url = `https://${OVERFLIX_HOST}${path}`;
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': referer
      },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
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

async function buildOverflixServers(playerData: any, labelPrefix = 'Dublado PT-BR'): Promise<StreamServer[]> {
  const servers: StreamServer[] = [];
  if (!playerData) return servers;

  const dub = parseServersString(playerData.servers_dub);

  // 1. Extração Direta de Vídeo MP4 (Como no Kodi - 0 Anúncios / Reprodução Direta)
  if (dub.streamtape) {
    try {
      const directTape = await resolveStreamTape(dub.streamtape);
      if (directTape) {
        const finalMp4 = await getRedirectLocation(directTape);
        servers.push({
          name: `Transmissão Direta Full HD Dublado (Sem Anúncios)`,
          url: finalMp4,
          type: 'video',
          isDubbed: true
        });
      }
    } catch (err) {
      console.error('Erro ao resolver StreamTape direto:', err);
    }
  }

  // 2. Servidores Alternativos de Backup
  if (dub.streamtape) {
    servers.push({
      name: `1. ${labelPrefix} (StreamTape Reserva)`,
      url: `https://streamtape.com/e/${dub.streamtape}`,
      type: 'embed',
      isDubbed: true
    });
  }
  if (dub.mixdrop) {
    servers.push({
      name: `2. ${labelPrefix} (MixDrop Reserva)`,
      url: `https://mxdrop.top/e/${dub.mixdrop}`,
      type: 'embed',
      isDubbed: true
    });
  }
  if (dub.byse) {
    servers.push({
      name: `3. ${labelPrefix} (Byse Reserva)`,
      url: `https://bysebuho.com/e/${dub.byse}`,
      type: 'embed',
      isDubbed: true
    });
  }
  if (dub.doodstream) {
    servers.push({
      name: `4. ${labelPrefix} (DoodStream Reserva)`,
      url: `https://playmogo.com/e/${dub.doodstream}`,
      type: 'embed',
      isDubbed: true
    });
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
              return decoded;
            }
          } catch {}
          return json.result.startsWith('http') ? json.result : null;
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
    const mediaType = searchParams.get('type') || 'movie'; // movie or tv
    const season = searchParams.get('season') || '1';
    const episode = searchParams.get('episode') || '1';

    const servers: StreamServer[] = [];

    // =========================================================================
    // 1. REPRODUÇÃO DIRETA DE EPISÓDIOS RESOLVIDOS DO BRAZUCA PLAY (MP4 Sem Anúncios)
    // =========================================================================
    if (link.includes('resolver2_episodes=')) {
      try {
        let epUrl = link.split('resolver2_episodes=')[1];
        if (epUrl.includes('&season=')) {
          epUrl = epUrl.split('&season=')[0];
        }
        if (epUrl && epUrl.startsWith('http')) {
          const finalUrl = await getRedirectLocation(epUrl);
          servers.push({
            name: `Transmissão Direta Full HD Dublado T${season}E${episode} (Sem Anúncios)`,
            url: finalUrl,
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
              if (targetEp?.link && targetEp.link.startsWith('http')) {
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
      } catch (err) {
        console.error('Erro ao resolver resolver2_tvshows em resolve-stream:', err);
      }
    }

    // =========================================================================
    // 2. REPRODUÇÃO DIRETA DO RESOLVER 3 EPISODES OU TVSHOWS (Wasabi S3 MP4 Sem Anúncios)
    // =========================================================================
    if (servers.length === 0 && (link.includes('resolver3_episodes=') || link.includes('resolver3_tvshows=') || link.includes('animes2='))) {
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
          servers.push({
            name: `Transmissão Wasabi Full HD Dublado T${season}E${episode} (Sem Anúncios)`,
            url: directWasabi,
            type: 'video',
            isDubbed: true
          });
        }
      } catch (err) {
        console.error('Erro ao resolver resolver3_episodes:', err);
      }
    }

    // =========================================================================
    // 3. REPRODUÇÃO DE FILMES: RESOLVER 3 (GeekAntenado Wasabi S3 MP4 Full HD - Sem Anúncios)
    // =========================================================================
    if (link.includes('resolver3_mv=')) {
      try {
        const match = link.match(/resolver3_mv=([a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          const slug = match[1];
          let directWasabi = await callResolver(3, `mvshows=${slug}`);
          if (!directWasabi) {
            directWasabi = await callResolver(2, `mvshows=${slug}`);
          }
          if (!directWasabi) {
            directWasabi = await callResolver(1, `mvshows=${slug}`);
          }
          if (directWasabi && directWasabi.startsWith('http')) {
            servers.push({
              name: 'Transmissão Direta Full HD Dublado (Wasabi S3 - Sem Anúncios)',
              url: directWasabi,
              type: 'video',
              isDubbed: true
            });
          }
        }
      } catch (err) {
        console.error('Erro ao resolver resolver3_mv:', err);
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
    } else if (mediaType === 'tv' && link.includes('serie3=')) {
      try {
        const match = link.match(/serie3=([a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          const slug = match[1];
          const seriesId = slug.split('-').pop();
          if (seriesId && /^\d+$/.test(seriesId)) {
            const referer = `https://${OVERFLIX_HOST}/series/online/${slug}/`;
            const epListPath = `/index.php?app=videobox&module=video&controller=view&do=episodesList&id=${seriesId}&season=${season}&audio=Dublado`;
            const epListData = await fetchOverflix(epListPath, referer);

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
    // 6. STREAMS DIRETOS (HLS .m3u8 ou MP4 nativo)
    // =========================================================================
    if (link.startsWith('http') && (link.includes('.m3u8') || link.includes('.mp4'))) {
      if (!servers.some(s => s.url === link)) {
        servers.unshift({
          name: link.includes('.m3u8') ? 'Sinal Direto HD (Sem Anúncios)' : 'Transmissão Direta MP4 Dublado (Sem Anúncios)',
          url: link,
          type: 'video',
          isDubbed: true
        });
      }
    }

    // =========================================================================
    // 7. BUSCA AUTOMÁTICA DE SERVIDOR ALTERNATIVO NO CATÁLOGO POR TÍTULO
    // =========================================================================
    if (servers.length === 0 && title) {
      try {
        const baseTitle = title.split(' - T')[0].replace(/\s*-\s*.*$/, '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const db = getDb();

        if (mediaType === 'tv') {
          // Fallback para Séries, Animes, Doramas, Desenhos e Novelas
          const altRow = db.prepare(
            `SELECT link FROM items WHERE type IN ('series', 'animes', 'doramas', 'desenhos', 'novelas') AND (title LIKE ? OR title LIKE ?) AND (link LIKE '%resolver2_tvshows=%' OR link LIKE '%serie3=%' OR link LIKE '%#series_list=%' OR link LIKE '%resolver3_tvshows=%') AND link != ? LIMIT 1`
          ).get(`%${baseTitle}%`, `%${title}%`, link) as { link: string } | undefined;

          if (altRow && altRow.link) {
            const altLink = altRow.link;

            // 1. Tentar resolver2_tvshows na rota alternativa
            if (altLink.includes('resolver2_tvshows=')) {
              let sSlug = altLink.split('resolver2_tvshows=')[1].split('|')[0].split('&')[0];
              if (!sSlug.includes('#')) sSlug = 'series#' + sSlug;
              const resData = await callResolver(2, `tvshows=${sSlug}`);
              if (resData) {
                try {
                  const seasons = typeof resData === 'string' ? JSON.parse(resData) : resData;
                  if (Array.isArray(seasons)) {
                    const targetSeason = seasons.find((s: any) => String(s.season_number) === String(season)) || seasons[0];
                    const targetEp = targetSeason?.episodes?.find((e: any) => String(e.episode_number) === String(episode));
                    if (targetEp?.link && targetEp.link.startsWith('http')) {
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

            // 2. Tentar serie3 na rota alternativa
            if (servers.length === 0 && altLink.includes('serie3=')) {
              const match = altLink.match(/serie3=([a-zA-Z0-9_\-]+)/);
              if (match && match[1]) {
                const sSlug = match[1];
                const seriesId = sSlug.split('-').pop();
                if (seriesId && /^\d+$/.test(seriesId)) {
                  const referer = `https://${OVERFLIX_HOST}/series/online/${sSlug}/`;
                  const epList = await fetchOverflix(`/index.php?app=videobox&module=video&controller=view&do=episodesList&id=${seriesId}&season=${season}&audio=Dublado`, referer);
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

            // 3. Tentar resolver3_tvshows na rota alternativa
            if (servers.length === 0 && altLink.includes('resolver3_tvshows=')) {
              const sSlug = altLink.split('resolver3_tvshows=')[1].split('|')[0].split('&')[0];
              let directWasabi = await callResolver(3, `episodes=${sSlug}#${season}#${episode}#Dublado`);
              if (!directWasabi) {
                directWasabi = await callResolver(3, `episodes=${sSlug}#${season}#${episode}#Legendado`);
              }
              if (directWasabi && directWasabi.startsWith('http')) {
                servers.push({
                  name: `Transmissão Wasabi Full HD Dublado T${season}E${episode} (Sem Anúncios)`,
                  url: directWasabi,
                  type: 'video',
                  isDubbed: true
                });
              }
            }
          }
        } else {
          // Fallback para Filmes
          const altRow = db.prepare(
            'SELECT link FROM items WHERE type = ? AND (title LIKE ? OR title LIKE ?) AND (link LIKE ? OR link LIKE ?) LIMIT 1'
          ).get('filmes', `%${baseTitle}%`, `%${title}%`, '%movie2=%', '%#movies_list=%') as { link: string } | undefined;

          if (altRow && altRow.link && altRow.link !== link) {
            const altLink = altRow.link;
            if (altLink.includes('movie2=')) {
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

    return NextResponse.json({
      success: servers.length > 0,
      servers,
      totalServers: servers.length,
      error: servers.length === 0 ? 'Sinal temporariamente indisponível no servidor principal do Brazuca Play.' : undefined
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, servers: [] }, { status: 500 });
  }
}
