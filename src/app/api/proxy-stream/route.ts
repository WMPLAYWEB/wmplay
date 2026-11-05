import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import https from 'https';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  const customReferer = searchParams.get('referer');

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return new NextResponse('URL de stream inválida', { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;

    const isEmbedPlayer = targetUrl.includes('embedplayer') ||
                          targetUrl.includes('embedvip') ||
                          targetUrl.includes('cincloud') ||
                          targetUrl.includes('playcine') ||
                          targetUrl.includes('playclou');
    const isZunder = targetUrl.includes('zunderflix') || targetUrl.includes('sprintcdn');

    const referer = isEmbedPlayer ? 'https://embedplayer2.xyz/' :
      isZunder ? 'https://zunderflix.lat/' :
      customReferer || (
        targetUrl.includes('mxcontent.net') ? 'https://mxdrop.click/' :
        targetUrl.includes('tapecontent.net') || targetUrl.includes('streamtape.com') ? 'https://streamtape.com/' :
        targetUrl.includes('bugoumods.com') ? 'https://embed.bugoumods.com/' :
        targetUrl.includes('fenix') ? 'https://fenixflix.fenixhub.online/' :
        parsed.origin + '/'
      );
    const rangeHeader = req.headers.get('range');

    const reqHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': referer,
    };
    if (!targetUrl.includes('mxcontent.net')) {
      try {
        reqHeaders['Origin'] = new URL(referer).origin;
      } catch {}
    }
    if (rangeHeader) {
      reqHeaders['Range'] = rangeHeader;
    }

    const isDirectBinary = targetUrl.includes('.ts') ||
                           targetUrl.includes('.mp4') ||
                           targetUrl.includes('seg-') ||
                           targetUrl.includes('.m4s') ||
                           targetUrl.includes('/p/');

    if (isDirectBinary) {
      try {
        const upstreamRes = await fetch(targetUrl, {
          headers: reqHeaders,
          signal: AbortSignal.timeout(15000),
        });

        if (!upstreamRes.ok && upstreamRes.status !== 206) {
          return new NextResponse(`Erro upstream ${upstreamRes.status}`, { status: upstreamRes.status });
        }

        const rawContentType = upstreamRes.headers.get('content-type') || '';
        const contentType = targetUrl.includes('.ts') || targetUrl.includes('seg-') || targetUrl.includes('/p/')
          ? 'video/mp2t'
          : (rawContentType || 'video/mp4');

        const respHeaders: Record<string, string> = {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        };
        if (upstreamRes.headers.get('content-range')) {
          respHeaders['Content-Range'] = upstreamRes.headers.get('content-range')!;
        }
        if (upstreamRes.headers.get('content-length')) {
          respHeaders['Content-Length'] = upstreamRes.headers.get('content-length')!;
        }

        return new NextResponse(upstreamRes.body, {
          status: upstreamRes.status,
          headers: respHeaders
        });
      } catch (err: any) {
        return new NextResponse(`Erro no Proxy de Vídeo: ${err.message}`, { status: 502 });
      }
    }

    // Tratamento de Manifestos HLS (Master Playlists e Sub-playlists com reescrita para proxy)
    const upstreamRes = await fetch(targetUrl, {
      headers: reqHeaders,
      signal: AbortSignal.timeout(12000),
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(`Erro upstream ${upstreamRes.status}`, { status: upstreamRes.status });
    }

    const rawContentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    const isExplicitBinary = rawContentType.includes('video/') ||
                             rawContentType.includes('application/octet-stream') ||
                             rawContentType.includes('audio/');

    // Se o cabeçalho upstream já indicar vídeo binário, repassar diretamente o stream sem buffering
    if (isExplicitBinary) {
      const contentType = targetUrl.includes('.ts') || targetUrl.includes('seg-') || targetUrl.includes('/p/')
        ? 'video/mp2t'
        : (rawContentType || 'video/mp4');

      const respHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      };
      if (upstreamRes.headers.get('content-range')) {
        respHeaders['Content-Range'] = upstreamRes.headers.get('content-range')!;
      }
      if (upstreamRes.headers.get('content-length')) {
        respHeaders['Content-Length'] = upstreamRes.headers.get('content-length')!;
      }

      return new NextResponse(upstreamRes.body, {
        status: upstreamRes.status,
        headers: respHeaders
      });
    }

    // Leitura segura do buffer binário: previne corrupção de arquivos de vídeo e permite detecção precisa de M3U8
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const isM3U8 = Buffer.from(arrayBuffer.slice(0, 7)).toString('utf-8') === '#EXTM3U' ||
                   rawContentType.includes('mpegurl') ||
                   rawContentType.includes('m3u8') ||
                   targetUrl.includes('.m3u8');

    if (isM3U8) {
      const bodyText = Buffer.from(arrayBuffer).toString('utf-8');
      const lines = bodyText.split('\n');
      const rewritten = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith('#')) {
          if (trimmed.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/g, (_, uri) => {
              try {
                const full = new URL(uri, targetUrl).toString();
                const uriReferer = full.includes('cincloud') || full.includes('embedplayer') || full.includes('embedvip') || full.includes('playcine') || full.includes('playclou')
                  ? 'https://embedplayer2.xyz/'
                  : referer;
                return `URI="/api/proxy-stream?url=${encodeURIComponent(full)}&referer=${encodeURIComponent(uriReferer)}"`;
              } catch {
                return _;
              }
            });
          }
          return line;
        }
        try {
          const fullSegmentUrl = new URL(trimmed, targetUrl).toString();
          const segReferer = fullSegmentUrl.includes('cincloud') || fullSegmentUrl.includes('embedplayer') || fullSegmentUrl.includes('embedvip') || fullSegmentUrl.includes('playcine') || fullSegmentUrl.includes('playclou')
            ? 'https://embedplayer2.xyz/'
            : referer;
          return `/api/proxy-stream?url=${encodeURIComponent(fullSegmentUrl)}&referer=${encodeURIComponent(segReferer)}`;
        } catch {
          return line;
        }
      }).join('\n');

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });
    }

    // Fallback binário seguro: repassar arrayBuffer original sem converter para string UTF-8
    const fallbackContentType = rawContentType || (targetUrl.includes('.ts') ? 'video/mp2t' : 'video/mp4');
    const respHeaders: Record<string, string> = {
      'Content-Type': fallbackContentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };
    if (upstreamRes.headers.get('content-range')) {
      respHeaders['Content-Range'] = upstreamRes.headers.get('content-range')!;
    }
    if (upstreamRes.headers.get('content-length')) {
      respHeaders['Content-Length'] = upstreamRes.headers.get('content-length')!;
    }

    return new NextResponse(arrayBuffer, {
      status: upstreamRes.status,
      headers: respHeaders
    });
  } catch (err: any) {
    return new NextResponse(`Exceção no Proxy: ${err.message}`, { status: 500 });
  }
}

