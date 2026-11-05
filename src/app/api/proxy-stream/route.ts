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

    const referer = customReferer || (
      targetUrl.includes('zunderflix') || targetUrl.includes('sprintcdn') ? 'https://zunderflix.lat/' :
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
                           targetUrl.includes('.m4s');

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
        const contentType = targetUrl.includes('.ts') || targetUrl.includes('seg-')
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

    const rawType = upstreamRes.headers.get('content-type') || '';
    const bodyText = await upstreamRes.text();

    if (bodyText.startsWith('#EXTM3U') || rawType.includes('mpegurl') || rawType.includes('m3u8')) {
      const lines = bodyText.split('\n');
      const rewritten = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith('#')) {
          if (trimmed.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/g, (_, uri) => {
              try {
                const full = new URL(uri, targetUrl).toString();
                return `URI="/api/proxy-stream?url=${encodeURIComponent(full)}&referer=${encodeURIComponent(referer)}"`;
              } catch {
                return _;
              }
            });
          }
          return line;
        }
        try {
          const fullSegmentUrl = new URL(trimmed, targetUrl).toString();
          return `/api/proxy-stream?url=${encodeURIComponent(fullSegmentUrl)}&referer=${encodeURIComponent(referer)}`;
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

    // Fallback para conteúdo binário não identificado previamente
    return new NextResponse(bodyText, {
      status: 200,
      headers: {
        'Content-Type': rawType || 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });
  } catch (err: any) {
    return new NextResponse(`Exceção no Proxy: ${err.message}`, { status: 500 });
  }
}

