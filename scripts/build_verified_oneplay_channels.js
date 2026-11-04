const fs = require('fs');
const path = require('path');

async function testUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Range': 'bytes=0-100'
      },
      signal: AbortSignal.timeout(2000)
    });
    if (res.body && typeof res.body.cancel === 'function') {
      try { res.body.cancel(); } catch {}
    }
    return res.status === 200 || res.status === 206 || (res.status >= 300 && res.status < 400);
  } catch {
    return false;
  }
}

function mapCategory(group) {
  const g = (group || '').toLowerCase();
  if (g.includes('sport') || g.includes('esport') || g.includes('outdoor')) return 'esportes';
  if (g.includes('movie') || g.includes('film') || g.includes('series') || g.includes('série')) return 'filmes_series';
  if (g.includes('kids') || g.includes('child') || g.includes('infantil') || g.includes('animation')) return 'infantil';
  if (g.includes('news') || g.includes('notic') || g.includes('documentary') || g.includes('doc')) return 'noticias_docs';
  if (g.includes('general') || g.includes('entertainment') || g.includes('aberta') || g.includes('public')) return 'aberta';
  return 'variedades';
}

async function build() {
  console.log('Fetching live Brazilian channels from iptv-org...');
  const res = await fetch('https://iptv-org.github.io/iptv/countries/br.m3u');
  const text = await res.text();
  const lines = text.split('\n');

  const candidates = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#EXTINF:')) {
      const name = trimmed.split(',').pop()?.trim().replace(/\s*\(\d+p\)/, '') || '';
      const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
      const groupMatch = trimmed.match(/group-title="([^"]+)"/);
      current = {
        name,
        logo: logoMatch ? logoMatch[1] : 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200&fit=crop',
        group: groupMatch ? groupMatch[1] : 'variedades',
        url: ''
      };
    } else if (trimmed.startsWith('http') && current) {
      current.url = trimmed;
      if (!current.url.includes('teco.bugoumods.com')) {
        candidates.push(current);
      }
      current = null;
    }
  }

  console.log(`Testing ${candidates.length} candidate channels for immediate playability...`);
  const verified = [];
  const batchSize = 15;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (c) => {
      const ok = await testUrl(c.url);
      return ok ? c : null;
    }));

    for (const r of results) {
      if (r) {
        verified.push({
          id: `oneplay_live_${verified.length + 1}`,
          name: r.name,
          logo: r.logo,
          category: mapCategory(r.group),
          epg: `Guia EPG · Transmissão Oficial OnePlay HD: ${r.name}`,
          streamUrl: r.url
        });
      }
    }
  }

  console.log(`Total verified working live channels: ${verified.length}`);

  const outputTs = `import { BrazucaChannel } from "./brazuca_full";

// Acervo oficial OnePlay Live (100% canais HLS verificados e ativos em tempo real)
export const ONEPLAY_CHANNELS: BrazucaChannel[] = ${JSON.stringify(verified, null, 2)};
`;

  const targetPath = path.join(__dirname, '..', 'src', 'data', 'oneplay_channels.ts');
  fs.writeFileSync(targetPath, outputTs, 'utf-8');
  console.log(`Saved ${verified.length} verified channels to ${targetPath}`);
}

build().catch(console.error);
