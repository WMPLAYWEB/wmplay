import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
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
const OVERFLIX_HOSTS = ['www.overflix.date', 'www.overflix.fit', 'www.overflix.asia'];
const OVERFLIX_HOST = OVERFLIX_HOSTS[0];
const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';

// In-memory cache for ultra-fast response
const episodesCache = new Map<string, { seasons: FormattedSeason[]; totalSeasons: number }>();

async function callResolver(resolverNum: number, requestStr: string): Promise<any> {
  const params = `{'resolver': ${resolverNum}, 'request': '${requestStr}'}`;
  const payload = encodeURIComponent(Buffer.from(params).toString('base64'));

  for (const host of HOSTS) {
    try {
      const resData = await new Promise<string>((resolve, reject) => {
        const req = https.get(`https://${host}/?resolver=${payload}`, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          timeout: 1200
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });

      const json = JSON.parse(resData);
      if (json && json.success && json.result) {
        if (typeof json.result === 'string') {
          if (json.result.includes('not found') || json.result.includes('Maintenance') || json.result.trim() === '') {
            return null;
          }
          try {
            const decoded = Buffer.from(json.result, 'base64').toString('utf8');
            try {
              return JSON.parse(decoded);
            } catch {
              return decoded;
            }
          } catch {
            return json.result;
          }
        }
        return json.result;
      }
    } catch {
      // try next host
    }
  }
  return null;
}

async function fetchOverflixEpisodes(seriesId: string, season: number, referer: string): Promise<any[]> {
  const fetchAudio = (audio: string) => new Promise<any[]>((resolve) => {
    const doFetch = (hostIndex = 0, targetUrl?: string) => {
      if (hostIndex >= OVERFLIX_HOSTS.length && !targetUrl) return resolve([]);
      const currentHost = OVERFLIX_HOSTS[hostIndex] || 'www.overflix.download';
      const url = targetUrl || `https://${currentHost}/index.php?app=videobox&module=video&controller=view&do=episodesList&id=${seriesId}&season=${season}&audio=${audio}`;
      
      try {
        const u = new URL(url);
        https.get({
          hostname: u.hostname,
          path: u.pathname + u.search,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': referer
          },
          timeout: 5000
        }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextLoc = res.headers.location.startsWith('http') ? res.headers.location : `https://${u.hostname}${res.headers.location}`;
            return doFetch(hostIndex, nextLoc);
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed && parsed.redirect && typeof parsed.redirect === 'string') {
                return doFetch(hostIndex, parsed.redirect);
              }
              if (parsed && Array.isArray(parsed.episodes)) {
                return resolve(parsed.episodes);
              }
              doFetch(hostIndex + 1);
            } catch {
              doFetch(hostIndex + 1);
            }
          });
        }).on('error', () => doFetch(hostIndex + 1));
      } catch {
        doFetch(hostIndex + 1);
      }
    };
    doFetch(0);
  });

  let eps = await fetchAudio('Dublado');
  if (eps.length === 0) {
    eps = await fetchAudio('Legendado');
  }
  return eps;
}

async function searchOverflixSeries(query: string): Promise<{ url: string; seriesId: string; title: string }[]> {
  if (!query) return [];
  const cleanQ = query.replace(/[^\w\sÀ-ÿ]/gi, ' ').replace(/\s+/g, ' ').trim();
  const searchUrl = `https://${OVERFLIX_HOST}/index.php?app=videobox&module=video&controller=index&do=buscarContent&q=${encodeURIComponent(cleanQ)}&type=serie`;
  return new Promise((resolve) => {
    https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://${OVERFLIX_HOST}/`
      },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json || !json.html) return resolve([]);
          const results: { url: string; seriesId: string; title: string }[] = [];
          const matches = [...json.html.matchAll(/href="([^"]+)"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>/g)];
          for (const m of matches) {
            const fullUrl = m[1];
            const title = m[2].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();
            const idMatch = fullUrl.match(/-(\d+)\/?$/);
            if (idMatch) {
              results.push({ url: fullUrl, seriesId: idMatch[1], title });
            }
          }
          resolve(results);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function searchAnimesDigitalSeries(cleanTitle: string): Promise<{ url: string; episodes: { number: number; url: string; title: string }[] } | null> {
  if (!cleanTitle) return null;
  const sUrl = `https://animesdigital.org/?s=${encodeURIComponent(cleanTitle)}`;
  try {
    const res = await fetch(sUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const animes = [...html.matchAll(/<a[^>]+href="(https:\/\/animesdigital\.org\/anime\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => m[1]);
    if (animes.length === 0) return null;
    const animeUrl = animes[0];
    const aRes = await fetch(animeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(4000)
    });
    if (!aRes.ok) return null;
    const aHtml = await aRes.text();
    const epLinks = [...aHtml.matchAll(/<a[^>]+href="(https:\/\/animesdigital\.org\/video\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    const episodes = epLinks.map((m, i) => ({
      number: i + 1,
      url: m[1],
      title: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || `Episódio ${i + 1}`
    }));
    return { url: animeUrl, episodes };
  } catch {
    return null;
  }
}

async function fetchTmdbTvShow(tmdbId: string): Promise<any> {
  return new Promise((resolve) => {
    https.get(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=pt-BR`, { timeout: 4500 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function fetchTmdbSeasonEpisodes(tmdbId: string, sNum: number): Promise<any[]> {
  return new Promise((resolve) => {
    https.get(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${sNum}?api_key=${TMDB_KEY}&language=pt-BR`, { timeout: 4500 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          resolve(Array.isArray(json?.episodes) ? json.episodes : []);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function searchTmdbTvShow(query: string): Promise<any> {
  return new Promise((resolve) => {
    https.get(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`, { timeout: 4500 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          if (json && Array.isArray(json.results) && json.results.length > 0) {
            resolve(json.results[0]);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

export interface FormattedEpisode {
  number: number;
  title: string;
  link?: string;
  thumbnail?: string;
  duration?: string;
  streamUrl?: string;
}

export interface FormattedSeason {
  seasonNumber: number;
  seasonTitle: string;
  episodes: FormattedEpisode[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const link = searchParams.get('link') || '';
    let tmdbId = searchParams.get('tmdbId') || '';
    const title = searchParams.get('title') || 'Série';


    // Se o link contiver tmdb= ou tmdb_ep=, extrair diretamente
    if (!tmdbId && link.includes('tmdb=')) {
      const match = link.match(/tmdb=(\d+)/);
      if (match && match[1]) tmdbId = match[1];
    }
    if (!tmdbId && link.includes('tmdb_ep=')) {
      const match = link.match(/tmdb_ep=(\d+)/);
      if (match && match[1]) tmdbId = match[1];
    }

    // Se não tiver tmdbId, buscar no banco com correspondência exata (evita trocar de série)
    if (!tmdbId && (link.includes('novelas=') || (title && title !== 'Série'))) {
      try {
        const db = getDb();
        const normTitle = title.toLowerCase().trim();
        const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        const row = db.prepare(
          `SELECT tmdb_id FROM items WHERE (link = ? OR clean_title = ? OR lower(title) = ? OR title = ?) AND tmdb_id IS NOT NULL AND tmdb_id != '' LIMIT 1`
        ).get(link, cleanTitle, normTitle, title) as { tmdb_id?: string } | undefined;
        if (row && row.tmdb_id) {
          tmdbId = row.tmdb_id;
        }
      } catch {}
    }

    // Se ainda assim não foi fornecido, buscar no TMDB pelo título em português
    if (!tmdbId && title && title !== 'Série') {
      try {
        const cleanTitle = title.replace(/\s*-\s*.*$/, '').trim();
        const searchResult = await searchTmdbTvShow(cleanTitle || title);
        if (searchResult && searchResult.id) {
          tmdbId = String(searchResult.id);
        }
      } catch {}
    }

    const cacheKey = `${tmdbId}_${link}_${title}`;
    if (episodesCache.has(cacheKey)) {
      const cached = episodesCache.get(cacheKey)!;
      return NextResponse.json({
        success: true,
        title,
        totalSeasons: cached.totalSeasons,
        seasons: cached.seasons
      });
    }

    const seasonsMap: { [s: number]: FormattedEpisode[] } = {};

    // =========================================================================
    // 1. PRIORIDADE 1: BRAZUCA PLAY RESOLVER 2 (MP4s Nativos em Português)
    // =========================================================================
    if (link.includes('resolver2_tvshows=')) {
      try {
        let slug = link.split('resolver2_tvshows=')[1].split('|')[0];
        if (!slug.includes('#')) slug = 'series#' + slug;
        const data = await callResolver(2, `tvshows=${slug}`);
        if (Array.isArray(data)) {
          data.forEach((sObj: any, idx: number) => {
            const sNum = sObj.season_number || (idx + 1);
            seasonsMap[sNum] = seasonsMap[sNum] || [];
            if (Array.isArray(sObj.episodes)) {
              sObj.episodes.forEach((ep: any) => {
                const epNum = ep.episode_number || 1;
                seasonsMap[sNum].push({
                  number: epNum,
                  title: ep.episode_name || `Episódio ${epNum}`,
                  duration: '45m',
                  link: `resolver2_episodes=${ep.link || ''}&season=${sNum}&episode=${epNum}`,
                  streamUrl: ep.link || ''
                });
              });
            }
          });
        }
      } catch (err) {
        console.error('Resolver 2 error:', err);
      }
    }

    // =========================================================================
    // 2. PRIORIDADE 2: OVERFLIX DUBLADO (serie3=...)
    // =========================================================================
    if (Object.keys(seasonsMap).length === 0 && link.includes('serie3=')) {
      try {
        const rawSlug = link.split('serie3=')[1]?.split('|')[0]?.split('&')[0] || '';
        const slug = decodeURIComponent(rawSlug).trim().replace(/^[^\w]+/, '');
        if (slug) {
          const seriesId = slug.split('-').pop();
          if (seriesId && /^\d+$/.test(seriesId)) {
            const referer = `https://${OVERFLIX_HOST}/series/online/${encodeURIComponent(slug)}/`;
            // Buscar até 10 temporadas
            for (let s = 1; s <= 10; s++) {
              const epList = await fetchOverflixEpisodes(seriesId, s, referer);
              if (Array.isArray(epList) && epList.length > 0) {
                seasonsMap[s] = [];
                epList.forEach((ep: any) => {
                  const epNum = parseInt(ep.number, 10) || 1;
                  seasonsMap[s].push({
                    number: epNum,
                    title: ep.title || `Episódio ${epNum}`,
                    duration: ep.duration || '45m',
                    thumbnail: ep.thumb || '',
                    link: `serie3_ep=${encodeURIComponent(ep.url || '')}&season=${s}&episode=${epNum}`,
                    streamUrl: ''
                  });
                });
              } else {
                // Se uma temporada não retornar episódios, para a busca sequencial
                if (s > 1) break;
              }
            }
          }
        }
      } catch (err) {
        console.error('Overflix serie3 error:', err);
      }
    }

    // =========================================================================
    // 2.5 PRIORIDADE ANIMES: animesonlinecc.to & animesdigital.org (1.827 animes)
    // =========================================================================
    if (Object.keys(seasonsMap).length === 0 && (link.includes('animes3=') || link.includes('animes2='))) {
      try {
        const rawSlug = link.includes('animes3=') ? link.split('animes3=')[1] : link.split('animes2=')[1];
        const slug = rawSlug?.split('|')[0]?.split('&')[0]?.trim();
        if (slug) {
          const animeUrl = `https://animesonlinecc.to/anime/${slug}`;
          const res = await fetch(animeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(4000)
          });
          if (res.ok) {
            const html = await res.text();
            const seasonBlocks = [...html.matchAll(/<div class="se-c">[\s\S]*?<span class="title">([^<]+)<\/span>([\s\S]*?)<\/div>\s*<\/div>/g)];
            if (seasonBlocks.length > 0) {
              seasonBlocks.forEach((sb, sIdx) => {
                const sNum = sIdx + 1;
                seasonsMap[sNum] = [];
                const sBody = sb[2];
                const eps = [...sBody.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
                eps.forEach((m, eIdx) => {
                  const epNum = eIdx + 1;
                  seasonsMap[sNum].push({
                    number: epNum,
                    title: m[2].trim() || `Episódio ${epNum}`,
                    duration: '24m',
                    link: `animes3_ep=${encodeURIComponent(m[1])}&season=${sNum}&episode=${epNum}&title=${encodeURIComponent(title)}`,
                    streamUrl: ''
                  });
                });
              });
            }
          }
        }
        // Se ainda vazio, tentar busca dinâmica no animesdigital.org
        if (Object.keys(seasonsMap).length === 0 && title) {
          const cleanAnimeTitle = title.split(' - T')[0].replace(/\s*-\s*.*$/, '').replace(/dublado|legendado/gi, '').trim();
          const adData = await searchAnimesDigitalSeries(cleanAnimeTitle);
          if (adData && adData.episodes.length > 0) {
            seasonsMap[1] = adData.episodes.map(ep => ({
              number: ep.number,
              title: ep.title,
              duration: '24m',
              link: `animesdigital_ep=${encodeURIComponent(ep.url)}&season=1&episode=${ep.number}&title=${encodeURIComponent(title)}`,
              streamUrl: ''
            }));
          }
        }
      } catch (err) {
        console.error('Erro na extração de episódios animes3:', err);
      }
    }

    // =========================================================================
    // 3. PRIORIDADE 3: BRAZUCA PLAY RESOLVER 3 (Wasabi S3)
    // =========================================================================
    if (Object.keys(seasonsMap).length === 0 && (link.includes('resolver3_tvshows=') || link.includes('resolver3_episodes=') || link.includes('animes2=') || link.includes('doramas_resolver1='))) {
      try {
        let slug = '';
        let isDorama = false;
        if (link.includes('resolver3_episodes=')) {
          slug = link.split('resolver3_episodes=')[1].split('&')[0].split(/[#/]/)[0];
        } else if (link.includes('resolver3_tvshows=')) {
          slug = link.split('resolver3_tvshows=')[1].split('|')[0].split('&')[0];
          // Evitar resolver3 com slugs puramente numéricos (animes trocados)
          if (/^\d+$/.test(slug)) {
            slug = '';
          }
        } else if (link.includes('animes2=')) {
          slug = link.split('animes2=')[1].split('|')[0].split('&')[0];
        } else {
          slug = link.split('doramas_resolver1=')[1].split('|')[0].split('&')[0];
          isDorama = true;
        }

        if (slug) {
          let data = isDorama ? await callResolver(1, `tvshows=${slug}`) : null;
          if (!data || typeof data !== 'object') {
            data = await callResolver(3, `tvshows=${slug}`);
          }
          if (data && typeof data === 'object' && !data.result) {
            for (const [seasonKey, seasonVal] of Object.entries(data)) {
              const sNum = parseInt(seasonKey, 10) || 1;
              seasonsMap[sNum] = seasonsMap[sNum] || [];
              const eps = (seasonVal as any)?.episodes || {};
              for (const [epKey, epVal] of Object.entries(eps)) {
                const epNum = parseInt(epKey, 10) || 1;
                const epTitle = (epVal as any)?.title || `Episódio ${epNum}`;
                seasonsMap[sNum].push({
                  number: epNum,
                  title: epTitle,
                  duration: '45m',
                  link: isDorama
                    ? `doramas_resolver1=${slug}&season=${sNum}&episode=${epNum}`
                    : `resolver3_episodes=${slug}#${sNum}#${epNum}#Dublado&season=${sNum}&episode=${epNum}`,
                  streamUrl: ''
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Resolver 3 error:', err);
      }
    }

    // =========================================================================
    // 3.5 BUSCA AUTOMÁTICA DE SÉRIE ALTERNATIVA NO CATÁLOGO POR TMDB_ID OU TÍTULO EXATO
    // (Correspondência 100% exata - NUNCA usa LIKE amplo para não trocar de série)
    // =========================================================================
    if (Object.keys(seasonsMap).length === 0 && (tmdbId || (title && title !== 'Série'))) {
      try {
        const db = getDb();
        let altRow: { link: string; tmdb_id?: string } | undefined;

        // 1. Prioridade absoluta: buscar exatamente pelo TMDB ID
        if (tmdbId) {
          altRow = db.prepare(
            `SELECT link, tmdb_id FROM items WHERE tmdb_id = ? AND type IN ('series', 'animes', 'doramas', 'desenhos', 'novelas') AND (link LIKE '%resolver3_tvshows=%' OR link LIKE '%serie3=%' OR link LIKE '%resolver2_tvshows=%') AND link != ? LIMIT 1`
          ).get(tmdbId, link) as { link: string; tmdb_id?: string } | undefined;
        }

        // 2. Se não encontrou por TMDB ID, buscar por título EXATO (sem wildcards %...%)
        if (!altRow && title && title !== 'Série') {
          const normTitle = title.toLowerCase().trim();
          const cleanTitle = title.split(' - T')[0].replace(/\s*-\s*.*$/, '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
          altRow = db.prepare(
            `SELECT link, tmdb_id FROM items WHERE (clean_title = ? OR lower(title) = ? OR title = ?) AND type IN ('series', 'animes', 'doramas', 'desenhos', 'novelas') AND (link LIKE '%resolver3_tvshows=%' OR link LIKE '%serie3=%' OR link LIKE '%resolver2_tvshows=%') AND link != ? LIMIT 1`
          ).get(cleanTitle, normTitle, title, link) as { link: string; tmdb_id?: string } | undefined;
        }

        if (altRow && altRow.link) {
          const altLink = altRow.link;
          if (altRow.tmdb_id && !tmdbId) tmdbId = altRow.tmdb_id;

          // 1. Tentar resolver3_tvshows na rota alternativa (Wasabi S3 Dublado)
          if (altLink.includes('resolver3_tvshows=')) {
            let slug = altLink.split('resolver3_tvshows=')[1].split('|')[0].split('&')[0];
            if (slug && !/^\d+$/.test(slug)) {
              const resData = await callResolver(3, `tvshows=${slug}`);
              if (resData && typeof resData === 'object' && !resData.result) {
                for (const [seasonKey, seasonVal] of Object.entries(resData)) {
                  const sNum = parseInt(seasonKey, 10) || 1;
                  seasonsMap[sNum] = seasonsMap[sNum] || [];
                  const eps = (seasonVal as any)?.episodes || {};
                  for (const [epKey, epVal] of Object.entries(eps)) {
                    const epNum = parseInt(epKey, 10) || 1;
                    const epTitle = (epVal as any)?.title || `Episódio ${epNum}`;
                    seasonsMap[sNum].push({
                      number: epNum,
                      title: epTitle,
                      duration: '45m',
                      link: `resolver3_episodes=${slug}#${sNum}#${epNum}#Dublado&season=${sNum}&episode=${epNum}`,
                      streamUrl: ''
                    });
                  }
                }
              }
            }
          }

          // 2. Se ainda vazio, tentar resolver2 na rota alternativa
          if (Object.keys(seasonsMap).length === 0 && altLink.includes('resolver2_tvshows=')) {
            let sSlug = altLink.split('resolver2_tvshows=')[1].split('|')[0].split('&')[0];
            if (!sSlug.includes('#')) sSlug = 'series#' + sSlug;
            const resData = await callResolver(2, `tvshows=${sSlug}`);
            if (Array.isArray(resData)) {
              resData.forEach((sObj: any, idx: number) => {
                const sNum = sObj.season_number || (idx + 1);
                seasonsMap[sNum] = seasonsMap[sNum] || [];
                if (Array.isArray(sObj.episodes)) {
                  sObj.episodes.forEach((ep: any) => {
                    const epNum = ep.episode_number || 1;
                    seasonsMap[sNum].push({
                      number: epNum,
                      title: ep.episode_name || `Episódio ${epNum}`,
                      duration: '45m',
                      link: `resolver2_episodes=${ep.link || ''}&season=${sNum}&episode=${epNum}`,
                      streamUrl: ep.link || ''
                    });
                  });
                }
              });
            }
          }

          // 3. Se ainda vazio, tentar serie3 na rota alternativa
          if (Object.keys(seasonsMap).length === 0 && altLink.includes('serie3=')) {
            const rawSlug = altLink.split('serie3=')[1]?.split('|')[0]?.split('&')[0] || '';
            const sSlug = decodeURIComponent(rawSlug).trim().replace(/^[^\w]+/, '');
            if (sSlug) {
              const seriesId = sSlug.split('-').pop();
              if (seriesId && /^\d+$/.test(seriesId)) {
                const referer = `https://${OVERFLIX_HOST}/series/online/${encodeURIComponent(sSlug)}/`;
                for (let s = 1; s <= 10; s++) {
                  const epList = await fetchOverflixEpisodes(seriesId, s, referer);
                  if (Array.isArray(epList) && epList.length > 0) {
                    seasonsMap[s] = [];
                    epList.forEach((ep: any) => {
                      const epNum = parseInt(ep.number, 10) || 1;
                      seasonsMap[s].push({
                        number: epNum,
                        title: ep.title || `Episódio ${epNum}`,
                        duration: ep.duration || '45m',
                        thumbnail: ep.thumb || '',
                        link: `serie3_ep=${encodeURIComponent(ep.url || '')}&season=${s}&episode=${epNum}`,
                        streamUrl: ''
                      });
                    });
                  } else {
                    if (s > 1) break;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro na busca de episódios alternativos no catálogo:', err);
      }
    }

    // =========================================================================
    // 3.8 BUSCA DINÂMICA DIRETA NO ACERVO OVERFLIX POR TÍTULO
    // =========================================================================
    if (Object.keys(seasonsMap).length === 0 && title && title !== 'Série') {
      try {
        const cleanTitle = title.split(' - T')[0].replace(/\s*-\s*.*$/, '').replace(/[^a-zA-Z0-9\sÀ-ÿ]/g, ' ').replace(/\s+/g, ' ').trim();
        const ovResults = await searchOverflixSeries(cleanTitle);
        if (ovResults.length > 0) {
          const match = ovResults[0];
          const referer = match.url;
          for (let s = 1; s <= 10; s++) {
            const epList = await fetchOverflixEpisodes(match.seriesId, s, referer);
            if (Array.isArray(epList) && epList.length > 0) {
              seasonsMap[s] = [];
              epList.forEach((ep: any) => {
                const epNum = parseInt(ep.number, 10) || 1;
                seasonsMap[s].push({
                  number: epNum,
                  title: ep.title || `Episódio ${epNum}`,
                  duration: ep.duration || '45m',
                  thumbnail: ep.thumb || '',
                  link: `serie3_ep=${encodeURIComponent(ep.url || '')}&season=${s}&episode=${epNum}`,
                  streamUrl: ''
                });
              });
            } else {
              if (s > 1) break;
            }
          }
        }
      } catch (err) {
        console.error('Erro na busca dinâmica de séries Overflix:', err);
      }
    }

    // =========================================================================
    // 4. INTEGRAÇÃO TMDB: Metadados em Português
    // =========================================================================
    if (tmdbId) {
      try {
        const tmdbData = await fetchTmdbTvShow(tmdbId);
        if (tmdbData && Array.isArray(tmdbData.seasons)) {
          const validSeasons = tmdbData.seasons.filter((s: any) => s.season_number > 0 && s.episode_count > 0);

          if (validSeasons.length > 0) {
            // Se nenhuma das fontes acima retornou temporadas, estruturar as temporadas do TMDB
            if (Object.keys(seasonsMap).length === 0) {
              await Promise.all(
                validSeasons.map(async (s: any) => {
                  const sNum = s.season_number;
                  seasonsMap[sNum] = [];
                  const sEpisodes = await fetchTmdbSeasonEpisodes(tmdbId, sNum);
                  if (Array.isArray(sEpisodes) && sEpisodes.length > 0) {
                    sEpisodes.forEach((epObj: any) => {
                      const epNum = epObj.episode_number || 1;
                      seasonsMap[sNum].push({
                        number: epNum,
                        title: epObj.name ? `Episódio ${epNum}: ${epObj.name}` : `Episódio ${epNum}`,
                        duration: epObj.runtime ? `${epObj.runtime}m` : '45m',
                        thumbnail: epObj.still_path ? `https://image.tmdb.org/t/p/w300${epObj.still_path}` : '',
                        link: `tmdb_ep=${tmdbId}&season=${sNum}&episode=${epNum}&title=${encodeURIComponent(title)}`,
                        streamUrl: ''
                      });
                    });
                  } else {
                    const epCount = s.episode_count || 10;
                    for (let ep = 1; ep <= epCount; ep++) {
                      seasonsMap[sNum].push({
                        number: ep,
                        title: `Episódio ${ep}`,
                        duration: '45m',
                        link: `tmdb_ep=${tmdbId}&season=${sNum}&episode=${ep}&title=${encodeURIComponent(title)}`,
                        streamUrl: ''
                      });
                    }
                  }
                })
              );
            } else {
              // Enriquecer nomes de episódios existentes com títulos oficiais em Português
              const enrichSeasons = validSeasons.slice(0, 6);
              await Promise.all(
                enrichSeasons.map(async (s: any) => {
                  const sNum = s.season_number;
                  try {
                    const sEpisodes = await fetchTmdbSeasonEpisodes(tmdbId, sNum);
                    if (Array.isArray(sEpisodes) && sEpisodes.length > 0 && seasonsMap[sNum]) {
                      sEpisodes.forEach((epObj: any) => {
                        const existing = seasonsMap[sNum].find(e => e.number === epObj.episode_number);
                        if (existing && epObj.name && epObj.name !== `Episódio ${epObj.episode_number}`) {
                          existing.title = `Episódio ${epObj.episode_number}: ${epObj.name}`;
                        }
                        if (existing && epObj.still_path && !existing.thumbnail) {
                          existing.thumbnail = `https://image.tmdb.org/t/p/w300${epObj.still_path}`;
                        }
                      });
                    }
                  } catch {}
                })
              );
              // Filtrar temporadas fantasmas ou nao lancadas: remover temporadas que nao existem no TMDB oficial
              const validSeasonNumbers = new Set(validSeasons.map((s: any) => s.season_number));
              for (const sKey of Object.keys(seasonsMap)) {
                const sNum = parseInt(sKey, 10);
                if (!validSeasonNumbers.has(sNum)) {
                  delete seasonsMap[sNum];
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('TMDB seasons fetch error:', err);
      }
    }

    // =========================================================================
    // 5. ESTRUTURA FINAL DAS TEMPORADAS
    // =========================================================================
    if (Object.keys(seasonsMap).length === 0) {
      seasonsMap[1] = [];
      for (let ep = 1; ep <= 10; ep++) {
        seasonsMap[1].push({
          number: ep,
          title: `Episódio ${ep}`,
          duration: '45m',
          link: `${link}&season=1&episode=${ep}`,
          streamUrl: ''
        });
      }
    }

    const seasons: FormattedSeason[] = Object.keys(seasonsMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map(sNum => ({
        seasonNumber: sNum,
        seasonTitle: `${sNum}ª Temporada`,
        episodes: seasonsMap[sNum].sort((a, b) => a.number - b.number)
      }));

    // Cache the resolved seasons
    episodesCache.set(cacheKey, { seasons, totalSeasons: seasons.length });

    return NextResponse.json({
      success: true,
      title,
      tmdbId,
      totalSeasons: seasons.length,
      seasons
    });
  } catch (error: any) {
    console.error('Episodes API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
