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
 * Verifica se um stream HLS ou MP4 está realmente ativo e acessível (evita erros 403/404/DNS)
 */
export async function isStreamPlayable(url: string, referer: string = ''): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  if (url.includes('source.apperror404.com') || url.includes('teco.bugoumods.com')) return false;

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Range': 'bytes=0-100'
    };
    if (referer) headers['Referer'] = referer;

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(1800)
    });

    if (res.body && typeof res.body.cancel === 'function') {
      try { res.body.cancel(); } catch {}
    }

    return res.status === 200 || res.status === 206 || (res.status >= 300 && res.status < 400);
  } catch {
    return false;
  }
}

/**
 * Resolve streams Dublado PT-BR do provider FenixFlix do OnePlay com correspondência 100% exata
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

    const candidateStreams: { rawUrl: string; cleanLabel: string; isDub: boolean }[] = [];
    const seenUrls = new Set<string>();

    for (const qId of queryIds) {
      const streamPath = isSeries ? `series/${qId}:${season}:${episode}.json` : `movie/${qId}.json`;
      const url = `https://fenixflix.fenixhub.online/qualities=4k,1080p,720p,sd,cam%7Caudio=dublado,legendado%7Ccatalogs=populares_movie,populares_series,recentes_movie,recentes_series/stream/${streamPath}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

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

          candidateStreams.push({
            rawUrl: s.url,
            cleanLabel,
            isDub
          });
        }

        if (candidateStreams.length > 0) break;
      } catch {}
    }

    if (candidateStreams.length === 0) return [];

    // Verificação de acessibilidade em paralelo: descarta URLs 404/403/off-line
    const verifiedResults = await Promise.allSettled(
      candidateStreams.map(async (item) => {
        const playable = await isStreamPlayable(item.rawUrl, 'https://fenixflix.fenixhub.online/');
        return { item, playable };
      })
    );

    const streams: OnePlayStream[] = [];
    for (const r of verifiedResults) {
      if (r.status === 'fulfilled' && r.value.playable) {
        const { item } = r.value;
        streams.push({
          name: `${item.cleanLabel} - Acelerado`,
          url: `/api/proxy-stream?url=${encodeURIComponent(item.rawUrl)}`,
          type: 'video',
          isDubbed: item.isDub
        });
        streams.push({
          name: `${item.cleanLabel} - Sinal Direto`,
          url: item.rawUrl,
          type: 'video',
          isDubbed: item.isDub
        });
      }
    }

    // Dublado sempre primeiro
    return streams.sort((a, b) => (b.isDubbed ? 1 : 0) - (a.isDubbed ? 1 : 0));
  } catch {
    return [];
  }
}

/**
 * Agregador Master OnePlay: Busca com 100% de precisão por TMDB / IMDb ID
 */
export async function resolveOnePlaySources(params: {
  title?: string;
  mediaType: 'movie' | 'tv' | 'series';
  tmdbId?: string;
  imdbId?: string;
  season?: string | number;
  episode?: string | number;
}): Promise<OnePlayStream[]> {
  const { mediaType, tmdbId, imdbId, season = 1, episode = 1 } = params;
  const targetId = imdbId || tmdbId || '';

  if (!targetId) return [];

  try {
    const fenixStreams = await resolveFenixFlix(mediaType, targetId, season, episode);
    return fenixStreams;
  } catch {
    return [];
  }
}
