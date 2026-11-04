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
      targetUrl.includes('mxcontent.net') ? 'https://mxdrop.click/' :
      targetUrl.includes('tapecontent.net') || targetUrl.includes('streamtape.com') ? 'https://streamtape.com/' :
      targetUrl.includes('bugoumods.com') ? 'https://embed.bugoumods.com/' :
      targetUrl.includes('fenix') ? 'https://fenixflix.fenixhub.online/' :
      targetUrl.includes('zunderflix') ? 'https://zunderflix.lat/' :
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

    const isM3U8 = targetUrl.includes('.m3u8');

    if (!isM3U8) {
      try {
        const upstreamRes = await fetch(targetUrl, {
          headers: reqHeaders,
          signal: AbortSignal.timeout(15000),
        });

        if (!upstreamRes.ok && upstreamRes.status !== 206) {
          return new NextResponse(`Erro upstream ${upstreamRes.status}`, { status: upstreamRes.status });
        }

        const contentType = upstreamRes.headers.get('content-type') || 'video/mp4';
        const respHeaders: Record<string, string> = {
          'Content-Type': contentType.includes('video') || targetUrl.includes('.ts') ? (contentType || 'video/mp4') : contentType,
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

    return await new Promise<NextResponse>((resolve) => {
      const request = mod.get(targetUrl, {
        headers: reqHeaders,
        timeout: 10000
      }, (res) => {
        // Tratar Redirecionamentos 301, 302, 307, 308
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          return resolve(NextResponse.redirect(new URL(`/api/proxy-stream?url=${encodeURIComponent(redirectUrl)}&referer=${encodeURIComponent(referer)}`, req.url)));
        }

        // Se o servidor upstream retornou erro (ex: 403, 404, 500), retornar erro imediatamente sem travar o vídeo
        if (res.statusCode && res.statusCode >= 400) {
          return resolve(new NextResponse(`Erro upstream ${res.statusCode}`, { status: res.statusCode }));
        }

        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          // Reescrever as linhas do manifesto HLS para apontar para o proxy local
          const lines = body.split('\n');
          const rewritten = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
              // Reescrever URIs em tags como #EXT-X-MEDIA:URI="..."
              if (trimmed.includes('URI="')) {
                return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                  try {
                    const full = new URL(uri, targetUrl).toString();
                    return `URI="/api/proxy-stream?url=${encodeURIComponent(full)}"`;
                  } catch {
                    return _;
                  }
                });
              }
              return line;
            }
            try {
              const fullSegmentUrl = new URL(trimmed, targetUrl).toString();
              return `/api/proxy-stream?url=${encodeURIComponent(fullSegmentUrl)}`;
            } catch {
              return line;
            }
          }).join('\n');

          resolve(new NextResponse(rewritten, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            }
          }));
        });
      });

      request.on('error', (err) => {
        resolve(new NextResponse(`Erro no Proxy HLS: ${err.message}`, { status: 502 }));
      });
      request.on('timeout', () => {
        request.destroy();
        resolve(new NextResponse('Tempo limite esgotado no Proxy HLS', { status: 504 }));
      });
    });
  } catch (err: any) {
    return new NextResponse(`Exceção no Proxy: ${err.message}`, { status: 500 });
  }
}

