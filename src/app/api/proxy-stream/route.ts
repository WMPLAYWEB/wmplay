import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import https from 'https';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return new NextResponse('URL de stream inválida', { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;

    return await new Promise<NextResponse>((resolve) => {
      const request = mod.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': parsed.origin + '/',
          'Origin': parsed.origin
        },
        timeout: 9000
      }, (res) => {
        // Tratar Redirecionamentos 301, 302, 307, 308
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          return resolve(NextResponse.redirect(new URL(`/api/proxy-stream?url=${encodeURIComponent(redirectUrl)}`, req.url)));
        }

        const contentType = res.headers['content-type'] || 'application/vnd.apple.mpegurl';
        const isM3U8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('text/plain');

        if (isM3U8) {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            // Reescrever as linhas do manifesto HLS para apontar para o proxy local
            const lines = body.split('\n');
            const rewritten = lines.map(line => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) return line;
              const fullSegmentUrl = new URL(trimmed, targetUrl).toString();
              return `/api/proxy-stream?url=${encodeURIComponent(fullSegmentUrl)}`;
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
        } else {
          // Streaming de chunks de vídeo (.ts, .aac, .m4s)
          const chunks: Buffer[] = [];
          res.on('data', c => { chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)); });
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(new NextResponse(buffer, {
              status: 200,
              headers: {
                'Content-Type': contentType.includes('video') || targetUrl.includes('.ts') ? 'video/mp2t' : contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Cache-Control': 'public, max-age=3600',
              }
            }));
          });
        }
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
