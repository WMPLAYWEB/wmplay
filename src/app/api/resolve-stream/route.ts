import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

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

function buildOverflixServers(playerData: any, labelPrefix = 'Dublado PT-BR'): StreamServer[] {
  const servers: StreamServer[] = [];
  if (!playerData) return servers;

  const dub = parseServersString(playerData.servers_dub);
  const leg = parseServersString(playerData.servers_leg);

  // Servidores Dublados
  if (dub.streamtape) {
    servers.push({
      name: `1. ${labelPrefix} (StreamTape)`,
      url: `https://streamtape.com/e/${dub.streamtape}`,
      type: 'embed',
      isDubbed: true
    });
  }
  if (dub.mixdrop) {
    servers.push({
      name: `2. ${labelPrefix} (MixDrop)`,
      url: `https://mxdrop.top/e/${dub.mixdrop}`,
      type: 'embed',
      isDubbed: true
    });
  }
  if (dub.byse) {
    servers.push({
      name: `3. ${labelPrefix} (Byse)`,
      url: `https://bysebuho.com/e/${dub.byse}`,
      type: 'embed',
      isDubbed: true
    });
  }
  if (dub.doodstream) {
    servers.push({
      name: `4. ${labelPrefix} (DoodStream)`,
      url: `https://playmogo.com/e/${dub.doodstream}`,
      type: 'embed',
      isDubbed: true
    });
  }

  // Servidores Legendados como alternativa
  if (leg.streamtape) {
    servers.push({
      name: `5. Legendado (StreamTape)`,
      url: `https://streamtape.com/e/${leg.streamtape}`,
      type: 'embed',
      isDubbed: false
    });
  }
  if (leg.mixdrop) {
    servers.push({
      name: `6. Legendado (MixDrop)`,
      url: `https://mxdrop.top/e/${leg.mixdrop}`,
      type: 'embed',
      isDubbed: false
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
          timeout: 4000
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
          try {
            return Buffer.from(json.result, 'base64').toString('utf8');
          } catch {
            return json.result;
          }
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
    const tmdbId = searchParams.get('tmdbId') || '';
    const mediaType = searchParams.get('type') || 'movie'; // movie or tv
    const season = searchParams.get('season') || '1';
    const episode = searchParams.get('episode') || '1';

    const servers: StreamServer[] = [];

    // 1. Resolver Overflix Dublado para Filmes (movie2=...)
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
            const ovServers = buildOverflixServers(playerData, 'Dublado PT-BR');
            servers.push(...ovServers);
          }
        }
      } catch (err) {
        console.error('Erro ao resolver Overflix filme:', err);
      }
    }

    // 2. Resolver Overflix Dublado para Séries (serie3=...)
    if (mediaType === 'tv' && link.includes('serie3=')) {
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
                  const ovServers = buildOverflixServers(epPlayerData, `Dublado PT-BR T${season}E${episode}`);
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

    // 2.1. Resolver diretamente se o link contiver o episódio específico (serie3_ep=...)
    if (link.includes('serie3_ep=')) {
      try {
        const match = link.match(/serie3_ep=([^&]+)/);
        if (match && match[1]) {
          const epUrl = decodeURIComponent(match[1]);
          const epSlug = epUrl.replace(/\/$/, '').split('/').pop();
          const epId = epSlug?.split('-').pop();
          if (epId && /^\d+$/.test(epId)) {
            const epPlayerData = await fetchOverflix(`/index.php?app=videobox&module=video&controller=view&do=playerData&id=${epId}`, epUrl);
            const ovServers = buildOverflixServers(epPlayerData, `Dublado PT-BR T${season}E${episode}`);
            servers.push(...ovServers);
          }
        }
      } catch (err) {
        console.error('Erro ao resolver serie3_ep:', err);
      }
    }

    // 3. Resolver GeekAntenado (resolver3_mv=, resolver1_mv=)
    if (link.includes('resolver3_mv=')) {
      const match = link.match(/resolver3_mv=([a-zA-Z0-9_\-]+)/);
      if (match && match[1]) {
        const direct = await callResolver(3, `mvshows=${match[1]}`);
        if (direct && direct.startsWith('http')) {
          servers.push({
            name: 'Transmissão Direta HD (Nacional)',
            url: direct,
            type: 'video',
            isDubbed: true
          });
        }
      }
    }

    // 4. URL direta (se fornecida e for stream direto)
    if (link.startsWith('http') && (link.includes('.m3u8') || link.includes('.mp4'))) {
      servers.unshift({
        name: link.includes('.m3u8') ? 'Sinal Direto HD' : 'Vídeo Direto MP4',
        url: link,
        type: 'video',
        isDubbed: true
      });
    }

    // 5. Provedores de Embed Globais com Suporte a Áudio PT / Legendas PT
    if (tmdbId) {
      if (mediaType === 'movie') {
        servers.push({
          name: 'MultiEmbed (Áudio PT-BR / Legendas)',
          url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
          type: 'embed',
          isDubbed: true
        });
        servers.push({
          name: 'AutoEmbed Backup HD',
          url: `https://player.autoembed.cc/embed/movie/${tmdbId}`,
          type: 'embed'
        });
        servers.push({
          name: 'VidSrc HD',
          url: `https://vidsrc.sh/embed/movie?tmdb=${tmdbId}`,
          type: 'embed'
        });
        servers.push({
          name: '2Embed Skin',
          url: `https://www.2embed.skin/embed/${tmdbId}`,
          type: 'embed'
        });
      } else {
        servers.push({
          name: 'MultiEmbed (Áudio PT-BR / Legendas)',
          url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
          type: 'embed',
          isDubbed: true
        });
        servers.push({
          name: 'AutoEmbed Backup HD',
          url: `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`,
          type: 'embed'
        });
        servers.push({
          name: 'VidSrc HD',
          url: `https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
          type: 'embed'
        });
        servers.push({
          name: '2Embed Skin',
          url: `https://www.2embed.skin/embedtv/${tmdbId}&s=${season}&e=${episode}`,
          type: 'embed'
        });
      }
    }

    return NextResponse.json({
      success: true,
      servers,
      totalServers: servers.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, servers: [] }, { status: 500 });
  }
}
