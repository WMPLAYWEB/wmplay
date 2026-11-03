const fs = require('fs');
const path = require('path');

async function generate() {
  console.log('Fetching OnePlay live channels from BugouMods API...');
  const res = await fetch('https://embed.bugoumods.com/?api=1&t=live&c=all', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      'Referer': 'https://embed.bugoumods.com/'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch channels: ${res.status}`);
  }

  const data = await res.json();
  const channels = [];
  const seenIds = new Set();

  function mapCategory(catName) {
    const c = (catName || '').toLowerCase();
    if (c.includes('24 horas') || c.includes('24h')) return '24horas';
    if (c.includes('sportv') || c.includes('espn') || c.includes('premiere') || c.includes('dazn') ||
        c.includes('ufc') || c.includes('nba') || c.includes('esporte') || c.includes('evento') ||
        c.includes('futebol') || c.includes('pay-per-view') || c.includes('x-sports')) {
      return 'esportes';
    }
    if (c.includes('telecine') || c.includes('hbo') || c.includes('filme') || c.includes('série') ||
        c.includes('series') || c.includes('paramount') || c.includes('tnt') || c.includes('sky')) {
      return 'filmes_series';
    }
    if (c.includes('infantil') || c.includes('disney') || c.includes('kids') || c.includes('cartoon') || c.includes('desenho')) {
      return 'infantil';
    }
    if (c.includes('noticia') || c.includes('notícia') || c.includes('documentario') || c.includes('documentário') || c.includes('discovery')) {
      return 'noticias_docs';
    }
    if (c.includes('aberto') || c.includes('globo') || c.includes('sbt') || c.includes('record') || c.includes('band')) {
      return 'aberta';
    }
    return 'variedades';
  }

  for (const [categoryName, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    const cat = mapCategory(categoryName);

    for (const item of items) {
      if (!item || !item.id) continue;
      const chId = `oneplay_${item.id}`;
      if (seenIds.has(chId)) continue;
      seenIds.add(chId);

      const name = (item.nome || `Canal ${item.id}`).trim();
      const logo = item.capa || 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=300&h=300&fit=crop';
      const streamUrl = `https://teco.bugoumods.com/live/BugouVortex/BugouVortex/${item.id}.m3u8?domain_auth=embed.bugoumods.com`;

      channels.push({
        id: chId,
        name,
        logo,
        category: cat,
        epg: `Transmissão OnePlay Ao Vivo: ${name} (${categoryName.replace(/[^\w\s-]/g, '').trim()})`,
        streamUrl
      });
    }
  }

  console.log(`Generated ${channels.length} OnePlay channels.`);

  const fileContent = `import { BrazucaChannel } from "./brazuca_full";

// Acervo oficial OnePlay Live (1.189+ Canais em HLS Direto com CORS Aberto)
// Atualizado automaticamente do repositório OnePlay
export const ONEPLAY_CHANNELS: BrazucaChannel[] = ${JSON.stringify(channels, null, 2)};
`;

  const outputPath = path.join(__dirname, '..', 'src', 'data', 'oneplay_channels.ts');
  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log(`Saved to ${outputPath} (${(fileContent.length / 1024).toFixed(1)} KB)`);
}

generate().catch(err => {
  console.error('Error generating channels:', err);
  process.exit(1);
});
