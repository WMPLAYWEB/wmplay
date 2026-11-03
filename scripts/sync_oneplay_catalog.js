const { DatabaseSync } = require('node:sqlite');
const path = require('path');

async function syncCatalog() {
  console.log('Fetching OnePlay VOD and Series data from BugouMods API...');
  const [vodRes, seriesRes] = await Promise.all([
    fetch('https://embed.bugoumods.com/?api=1&t=vod&c=all', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://embed.bugoumods.com/' }
    }),
    fetch('https://embed.bugoumods.com/?api=1&t=series&c=all', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://embed.bugoumods.com/' }
    })
  ]);

  if (!vodRes.ok || !seriesRes.ok) {
    throw new Error('Falha ao obter catálogo OnePlay da API');
  }

  const vodData = await vodRes.json();
  const seriesData = await seriesRes.json();

  const dbPath = path.join(__dirname, '..', 'src', 'data', 'catalog.db');
  const db = new DatabaseSync(dbPath, { open: true });

  const existingTitles = new Set();
  const rows = db.prepare('SELECT clean_title FROM items').all();
  rows.forEach(r => existingTitles.add(r.clean_title));
  console.log(`Itens existentes no banco antes do sync: ${existingTitles.size}`);

  function cleanTitle(t) {
    return (t || '')
      .replace(/^\[L\]O?\s*/i, '')
      .replace(/\s*\[L\]$/i, '')
      .replace(/\s*-\s*.*$/, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function formatTitle(t) {
    return (t || '')
      .replace(/^\[L\]O?\s*/i, '')
      .replace(/\s*\[L\]$/i, '')
      .trim();
  }

  function extractYear(t) {
    const m = (t || '').match(/\b(19\d\d|20\d\d)\b/);
    return m ? m[1] : '2024';
  }

  const insertStmt = db.prepare(`
    INSERT INTO items (
      type, title, original_title, link, thumbnail, fanart,
      rating, genres, year, synopsis, tmdb_id, clean_title, clean_original_title
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  let addedCount = 0;
  const countsByType = {};

  // Transação atômica para alta velocidade de inserção
  db.exec('BEGIN TRANSACTION');

  try {
    // 1. Processar Filmes VOD
    for (const [catName, items] of Object.entries(vodData)) {
      if (!Array.isArray(items)) continue;
      const catLow = catName.toLowerCase();

      for (const item of items) {
        if (!item || !item.id || !item.nome) continue;
        const clean = cleanTitle(item.nome);
        if (existingTitles.has(clean)) continue;
        existingTitles.add(clean);

        let type = 'filmes';
        if (catLow.includes('anime')) type = 'animes';
        else if (catLow.includes('animacao')) type = 'desenhos';
        else if (catLow.includes('lancamentos')) type = 'lancamentos';

        const title = formatTitle(item.nome);
        const year = extractYear(item.nome);
        const thumb = item.capa || item.stream_icon || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop';
        const link = `#oneplay=bugou:movie:${item.id}`;
        const genres = catName.replace(/^Filmes\s*\|\s*/i, '').trim() || 'Filme';
        const synopsis = item.plot || `${title} - Disponível em Dublado Full HD no acervo OnePlay.`;

        insertStmt.run(
          type, title, title, link, thumb, thumb,
          8.2, genres, year, synopsis, '', clean, clean
        );

        addedCount++;
        countsByType[type] = (countsByType[type] || 0) + 1;
      }
    }

    // 2. Processar Séries, Novelas, Desenhos, Animes, Doramas
    for (const [catName, items] of Object.entries(seriesData)) {
      if (!Array.isArray(items)) continue;
      const catLow = catName.toLowerCase();

      for (const item of items) {
        if (!item || !item.id || !item.nome) continue;
        const clean = cleanTitle(item.nome);
        if (existingTitles.has(clean)) continue;
        existingTitles.add(clean);

        let type = 'series';
        if (catLow.includes('novela') || catLow.includes('turcas')) type = 'novelas';
        else if (catLow.includes('anime') || catLow.includes('crunchyroll')) type = 'animes';
        else if (catLow.includes('animacao') || catLow.includes('kids')) type = 'desenhos';
        else if (catLow.includes('dorama')) type = 'doramas';
        else if (catLow.includes('lancamentos')) type = 'lancamentos';

        const title = formatTitle(item.nome);
        const year = extractYear(item.nome);
        const thumb = item.capa || item.stream_icon || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop';
        const link = `#oneplay=bugou:series:${item.id}`;
        const genres = catName.replace(/^Series\s*\|\s*/i, '').trim() || 'Série';
        const synopsis = item.plot || `${title} - Todas as temporadas completas em Dublado Full HD no OnePlay.`;

        insertStmt.run(
          type, title, title, link, thumb, thumb,
          8.5, genres, year, synopsis, '', clean, clean
        );

        addedCount++;
        countsByType[type] = (countsByType[type] || 0) + 1;
      }
    }

    db.exec('COMMIT');
    console.log(`Sucesso! Inseridos ${addedCount} novos títulos do OnePlay no catálogo:`);
    console.log(countsByType);

    const totalCount = db.prepare('SELECT count(*) as count FROM items').get();
    console.log(`Total de títulos agora no catálogo: ${totalCount.count}`);

  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

syncCatalog().catch(err => {
  console.error('Erro no sync OnePlay:', err);
  process.exit(1);
});
