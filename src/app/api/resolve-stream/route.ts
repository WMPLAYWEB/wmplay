import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyZXNvbHZlciIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc5MDk4OTczfQ.WzQBuOqMai96Afleh9g-i7NXo6h-YsjPUbOgxlUqVsU';
const HOSTS = ['api.geekantenado.online', 'geekantenado.fly.dev'];

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
            const decoded = Buffer.from(json.result, 'base64').toString('utf8');
            return decoded;
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

    let directStream: string | null = null;

    if (link.startsWith('resolver3_mv=')) {
      const slug = link.replace('resolver3_mv=', '');
      directStream = await callResolver(3, `mvshows=${slug}`);
    } else if (link.startsWith('resolver1_mv=')) {
      const slug = link.replace('resolver1_mv=', '');
      directStream = await callResolver(1, `mvshows=${slug}`);
    } else if (link.startsWith('http')) {
      directStream = link;
    }

    // Embed sources fallback (Reliable operational endpoints)
    const embedSources: string[] = [];
    if (tmdbId) {
      if (mediaType === 'movie') {
        embedSources.push(`https://vidsrc.sh/embed/movie?tmdb=${tmdbId}`);
        embedSources.push(`https://www.2embed.skin/embed/${tmdbId}`);
        embedSources.push(`https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`);
        embedSources.push(`https://vidsrc.me/embed/movie?tmdb=${tmdbId}`);
        embedSources.push(`https://autoembed.co/movie/tmdb/${tmdbId}`);
      } else {
        embedSources.push(`https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`);
        embedSources.push(`https://www.2embed.skin/embedtv/${tmdbId}&s=${season}&e=${episode}`);
        embedSources.push(`https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`);
        embedSources.push(`https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`);
        embedSources.push(`https://autoembed.co/tv/tmdb/${tmdbId}/${season}/${episode}`);
      }
    }

    return NextResponse.json({
      success: true,
      directStream: directStream && directStream.startsWith('http') ? directStream : null,
      embedSources,
      activeStream: (directStream && directStream.startsWith('http')) ? directStream : embedSources[0] || null
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
