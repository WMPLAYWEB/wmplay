import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyZXNvbHZlciIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc5MDk4OTczfQ.WzQBuOqMai96Afleh9g-i7NXo6h-YsjPUbOgxlUqVsU';
const HOSTS = ['api.geekantenado.online', 'geekantenado.fly.dev'];
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
          timeout: 4000
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

    // If tmdbId is missing, attempt to find it via title on TMDB
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

    // 1. Prioritize Brazuca Resolver 2 (Has verified multi-season arrays)
    if (link.includes('resolver2_tvshows=')) {
      try {
        let slug = link.split('resolver2_tvshows=')[1].split('|')[0];
        if (!slug.includes('#')) slug = 'serie#' + slug;
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
                  link: `resolver2_episodes=${ep.link || ''}`,
                  streamUrl: ep.link || (tmdbId ? `https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${sNum}&episode=${epNum}` : '')
                });
              });
            }
          });
        }
      } catch (err) {
        console.error('Resolver 2 error:', err);
      }
    }

    // 2. Fallback to Resolver 3 if Resolver 2 yielded no seasons
    if (Object.keys(seasonsMap).length === 0 && link.includes('resolver3_tvshows=')) {
      try {
        const slug = link.split('resolver3_tvshows=')[1].split('|')[0];
        const data = await callResolver(3, `tvshows=${slug}`);
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
                link: `resolver3_episodes=${slug}/${sNum}/${epNum}`,
                streamUrl: tmdbId ? `https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${sNum}&episode=${epNum}` : ''
              });
            }
          }
        }
      } catch (err) {
        console.error('Resolver 3 error:', err);
      }
    }

    // 3. TMDB Integration: Guarantees ALL seasons & real episode counts for every TV show
    if (tmdbId) {
      try {
        const tmdbData = await fetchTmdbTvShow(tmdbId);
        if (tmdbData && Array.isArray(tmdbData.seasons)) {
          // Filter to valid seasons (season_number > 0 and episode_count > 0)
          const validSeasons = tmdbData.seasons.filter((s: any) => s.season_number > 0 && s.episode_count > 0);

          if (validSeasons.length > 0) {
            // For seasons not yet present in seasonsMap, create them
            for (const s of validSeasons) {
              const sNum = s.season_number;
              const epCount = s.episode_count || 10;

              if (!seasonsMap[sNum] || seasonsMap[sNum].length === 0) {
                seasonsMap[sNum] = [];
                for (let ep = 1; ep <= epCount; ep++) {
                  seasonsMap[sNum].push({
                    number: ep,
                    title: `Episódio ${ep}`,
                    duration: '45m',
                    streamUrl: `https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${sNum}&episode=${ep}`
                  });
                }
              }
            }

            // Enrich episode titles for up to 6 seasons in parallel with Portuguese names
            if (validSeasons.length > 0) {
              try {
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
                        });
                      }
                    } catch {}
                  })
                );
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('TMDB seasons fetch error:', err);
      }
    }

    // 4. Fallback if still empty: generate multiple seasons (4 seasons)
    if (Object.keys(seasonsMap).length === 0) {
      for (let s = 1; s <= 4; s++) {
        seasonsMap[s] = [];
        for (let ep = 1; ep <= 10; ep++) {
          seasonsMap[s].push({
            number: ep,
            title: `Episódio ${ep}`,
            duration: '45m',
            streamUrl: tmdbId ? `https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${ep}` : ''
          });
        }
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
