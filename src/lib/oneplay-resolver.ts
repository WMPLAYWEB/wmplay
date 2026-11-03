export interface OnePlayStream {
  name: string;
  url: string;
  type: 'video';
  isDubbed?: boolean;
}

const TMDB_API_KEY = '92c1507cc18d85290e7a0b96abb37316';
const imdbCache = new Map<string, string>();

/**
 * Converte TMDB ID em IMDb ID em milissegundos usando a chave oficial do OnePlay
 */
export async function getImdbId(mediaType: 'movie' | 'tv' | 'series', tmdbId: string): Promise<string | null> {
  if (!tmdbId || !/^\d+$/.test(tmdbId)) return null;
  const cacheKey = `${mediaType}:${tmdbId}`;
  if (imdbCache.has(cacheKey)) return imdbCache.get(cacheKey)!;

  try {
    const isTv = mediaType === 'tv' || mediaType === 'series';
    const url = `https://api.themoviedb.org/3/${isTv ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.imdb_id) {
      imdbCache.set(cacheKey, data.imdb_id);
      return data.imdb_id;
    }
  } catch {}
  return null;
}

/**
 * Resolve streams Dublado PT-BR do provider FenixFlix do OnePlay
 */
export async function resolveFenixFlix(
  mediaType: 'movie' | 'tv' | 'series',
  idOrTmdb: string,
  season: string | number = 1,
  episode: string | number = 1
): Promise<OnePlayStream[]> {
  try {
    if (!idOrTmdb) return [];
    const isSeries = mediaType === 'tv' || mediaType === 'series';

    // Se recebemos um TMDB ID numérico, buscar o IMDb ID equivalente
    let queryIds = [idOrTmdb];
    if (/^\d+$/.test(idOrTmdb)) {
      const imdb = await getImdbId(mediaType, idOrTmdb);
      if (imdb) queryIds = [imdb, `tmdb:${idOrTmdb}`];
      else queryIds = [`tmdb:${idOrTmdb}`];
    }

    const streams: OnePlayStream[] = [];
    const seenUrls = new Set<string>();

    for (const qId of queryIds) {
      const streamPath = isSeries ? `series/${qId}:${season}:${episode}.json` : `movie/${qId}.json`;
      const url = `https://fenixflix.fenixhub.online/qualities=4k,1080p,720p,sd,cam%7Caudio=dublado,legendado%7Ccatalogs=populares_movie,populares_series,recentes_movie,recentes_series/stream/${streamPath}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
            'Referer': 'https://fenixflix.fenixhub.online/'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) continue;
        const data = await res.json();
        if (!data || !Array.isArray(data.streams)) continue;

        for (const s of data.streams) {
          if (!s || !s.url || typeof s.url !== 'string') continue;
          if (seenUrls.has(s.url)) continue;
          seenUrls.add(s.url);

          const rawTitle = (s.title || '').replace(/\n/g, ' ');
          const isDub = rawTitle.toLowerCase().includes('dub') || (s.name || '').toLowerCase().includes('dub') || !rawTitle.toLowerCase().includes('leg');
          const quality = s.name || 'Full HD';
          const cleanLabel = `OnePlay Fenix (${quality}${isDub ? ' Dublado PT-BR' : ' Legendado'})`;

          streams.push({
            name: `${cleanLabel} - Acelerado`,
            url: `/api/proxy-stream?url=${encodeURIComponent(s.url)}`,
            type: 'video',
            isDubbed: isDub
          });

          streams.push({
            name: `${cleanLabel} - Sinal Direto`,
            url: s.url,
            type: 'video',
            isDubbed: isDub
          });
        }

        if (streams.length > 0) break;
      } catch {}
    }

    return streams;
  } catch {
    return [];
  }
}

/**
 * Resolve streams Dublado do provider BugouMods do OnePlay (Cine HD MP4 Direto)
 */
export async function resolveBugouMods(
  title: string,
  mediaType: 'movie' | 'tv' | 'series' = 'movie'
): Promise<OnePlayStream[]> {
  try {
    const clean = title.replace(/\s*-\s*.*$/, '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean || clean.length < 2) return [];

    const url = `https://embed.bugoumods.com/index.php?ajax=1&type=global_search&q=${encodeURIComponent(clean)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://embed.bugoumods.com/'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();

    const streams: OnePlayStream[] = [];
    if (mediaType === 'movie' && Array.isArray(data.vod) && data.vod.length > 0) {
      const cleanLower = clean.toLowerCase();
      const match = data.vod.find((v: any) => {
        const n = (v.name || '').toLowerCase();
        return n.includes(cleanLower) || cleanLower.includes(n);
      }) || data.vod[0];

      if (match && match.stream_id) {
        const mp4Url = `https://teco.bugoumods.com/movie/BugouVortex/BugouVortex/${match.stream_id}.mp4?domain_auth=embed.bugoumods.com`;
        const matchName = (match.name || clean).replace(/^\[L\]O?\s*/, '').replace(/\s*\[L\]$/, '');
        streams.push({
          name: `OnePlay Cine HD (${matchName} - Dublado MP4)`,
          url: `/api/proxy-stream?url=${encodeURIComponent(mp4Url)}`,
          type: 'video',
          isDubbed: true
        });
        streams.push({
          name: `OnePlay Cine HD (${matchName} - Sinal Direto MP4)`,
          url: mp4Url,
          type: 'video',
          isDubbed: true
        });
      }
    }

    return streams;
  } catch {
    return [];
  }
}

/**
 * Agregador Master OnePlay: Busca em paralelo em todos os providers OnePlay
 */
export async function resolveOnePlaySources(params: {
  title?: string;
  mediaType: 'movie' | 'tv' | 'series';
  tmdbId?: string;
  imdbId?: string;
  season?: string | number;
  episode?: string | number;
}): Promise<OnePlayStream[]> {
  const { title, mediaType, tmdbId, imdbId, season = 1, episode = 1 } = params;
  const targetId = imdbId || tmdbId || '';

  const promises: Promise<OnePlayStream[]>[] = [];

  if (targetId) {
    promises.push(resolveFenixFlix(mediaType, targetId, season, episode));
  }

  if (title) {
    promises.push(resolveBugouMods(title, mediaType));
  }

  try {
    const results = await Promise.allSettled(promises);
    const combined: OnePlayStream[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        combined.push(...r.value);
      }
    }
    return combined;
  } catch {
    return [];
  }
}
