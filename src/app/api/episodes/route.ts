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
const OVERFLIX_HOSTS = ['www.overflix.download', 'www.overflix.asia', 'www.overflix.win'];
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
          timeout: 4500
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

    // Se o link for de novela ou não tiver tmdbId, buscar no banco
    if (!tmdbId && (link.includes('novelas=') || title)) {
      try {
        const db = getDb();
        const row = db.prepare(
          'SELECT tmdb_id FROM items WHERE link = ? OR link LIKE ? OR title = ? OR title LIKE ? LIMIT 1'
        ).get(link, `%${link}%`, title, `%${title}%`) as { tmdb_id?: string } | undefined;
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
        const match = link.match(/serie3=([a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          const slug = match[1];
          const seriesId = slug.split('-').pop();
          if (seriesId && /^\d+$/.test(seriesId)) {
            const referer = `https://${OVERFLIX_HOST}/series/online/${slug}/`;
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
    // 3. PRIORIDADE 3: BRAZUCA PLAY RESOLVER 3 (Wasabi S3)
    // =========================================================================
    if (Object.keys(seasonsMap).length === 0 && (link.includes('resolver3_tvshows=') || link.includes('animes2=') || link.includes('doramas_resolver1='))) {
      try {
        let slug = '';
        let isDorama = false;
        if (link.includes('resolver3_tvshows=')) {
          slug = link.split('resolver3_tvshows=')[1].split('|')[0];
          // Evitar resolver3 com slugs puramente numéricos (animes trocados como no caso de 3%)
          if (/^\d+$/.test(slug)) {
            slug = '';
          }
        } else if (link.includes('animes2=')) {
          slug = link.split('animes2=')[1].split('|')[0];
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
    // 3.5 BUSCA AUTOMÁTICA DE SÉRIE ALTERNATIVA NO CATÁLOGO POR TÍTULO
    // =========================================================================
    if (Object.keys(seasonsMap).length === 0 && title && title !== 'Série') {
      try {
        const cleanTitle = title.split(' - T')[0].replace(/\s*-\s*.*$/, '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const db = getDb();
        const altRow = db.prepare(
          `SELECT link FROM items WHERE type IN ('series', 'animes', 'doramas', 'desenhos', 'novelas') AND (title LIKE ? OR title LIKE ?) AND (link LIKE '%resolver2_tvshows=%' OR link LIKE '%serie3=%' OR link LIKE '%#series_list=%') AND link != ? LIMIT 1`
        ).get(`%${cleanTitle}%`, `%${title}%`, link) as { link: string } | undefined;

        if (altRow && altRow.link) {
          const altLink = altRow.link;
          // Tentar resolver2 na linha alternativa
          if (altLink.includes('resolver2_tvshows=')) {
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

          // Se ainda vazio, tentar serie3 na linha alternativa
          if (Object.keys(seasonsMap).length === 0 && altLink.includes('serie3=')) {
            const match = altLink.match(/serie3=([a-zA-Z0-9_\-]+)/);
            if (match && match[1]) {
              const sSlug = match[1];
              const seriesId = sSlug.split('-').pop();
              if (seriesId && /^\d+$/.test(seriesId)) {
                const referer = `https://${OVERFLIX_HOST}/series/online/${sSlug}/`;
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
