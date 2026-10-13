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

  // Servidores Estritamente Dublados em Português do Brazuca Play
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

  return servers;
}

async function callResolver(resolverNum: number, requestStr: string): Promise<string | null> {
  // Padrão do Brazuca Play com aspas simples para compatibilidade com o backend Python
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
          try {
            const decoded = Buffer.from(json.result, 'base64').toString('utf8');
            if (decoded && (decoded.startsWith('http') || decoded.startsWith('{') || decoded.startsWith('['))) {
              return decoded;
            }
          } catch {}
          return json.result;
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
    const mediaType = searchParams.get('type') || 'movie'; // movie or tv
    const season = searchParams.get('season') || '1';
    const episode = searchParams.get('episode') || '1';

    const servers: StreamServer[] = [];

    // =========================================================================
    // 1. REPRODUÇÃO DIRETA DE EPISÓDIOS RESOLVIDOS DO BRAZUCA PLAY
    // =========================================================================
    if (link.includes('resolver2_episodes=')) {
      try {
        let epUrl = link.split('resolver2_episodes=')[1];
        if (epUrl.includes('&season=')) {
          epUrl = epUrl.split('&season=')[0];
        }
        if (epUrl && epUrl.startsWith('http')) {
          servers.push({
            name: `Transmissão Direta Full HD Dublado T${season}E${episode}`,
            url: epUrl,
            type: 'video',
            isDubbed: true
          });
        }
      } catch (err) {
        console.error('Erro ao extrair resolver2_episodes:', err);
      }
    }

    // =========================================================================
    // 2. REPRODUÇÃO DIRETA DO RESOLVER 3 EPISODES (Wasabi S3)
    // =========================================================================
    if (link.includes('resolver3_episodes=')) {
      try {
        let epSlug = link.split('resolver3_episodes=')[1];
        if (epSlug.includes('&season=')) {
          epSlug = epSlug.split('&season=')[0];
        }
        if (epSlug) {
          const directWasabi = await callResolver(3, `episodes=${epSlug}`);
          if (directWasabi && directWasabi.startsWith('http')) {
            servers.push({
              name: `Transmissão Wasabi Full HD Dublado T${season}E${episode}`,
              url: directWasabi,
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
    // 3. REPRODUÇÃO DE FILMES: RESOLVER 3 (GeekAntenado Wasabi S3 MP4 Full HD)
    // =========================================================================
    if (link.includes('resolver3_mv=')) {
      try {
        const match = link.match(/resolver3_mv=([a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          const slug = match[1];
          const directWasabi = await callResolver(3, `mvshows=${slug}`);
          if (directWasabi && directWasabi.startsWith('http')) {
            servers.push({
              name: 'Transmissão Direta Full HD Dublado (Wasabi S3)',
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
            const ovServers = buildOverflixServers(playerData, 'Dublado PT-BR');
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
            const ovServers = buildOverflixServers(epPlayerData, `Dublado PT-BR T${season}E${episode}`);
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

    // =========================================================================
    // 6. STREAMS DIRETOS (HLS .m3u8 ou MP4 nativo)
    // =========================================================================
    if (link.startsWith('http') && (link.includes('.m3u8') || link.includes('.mp4'))) {
      if (!servers.some(s => s.url === link)) {
        servers.unshift({
          name: link.includes('.m3u8') ? 'Sinal Direto HD' : 'Transmissão Direta MP4 Dublado',
          url: link,
          type: 'video',
          isDubbed: true
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
