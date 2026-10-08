const fs = require('fs');
const path = require('path');
const https = require('https');
const { DatabaseSync } = require('node:sqlite');

const SOURCES = [
  {
    type: 'filmes',
    url: 'https://gist.githubusercontent.com/skyrisk/5b87797329c7b46422565ffbaab3be7e/raw/page.xml',
    itemTag: 'item'
  },
  {
    type: 'lancamentos',
    url: 'https://gist.githubusercontent.com/skyrisk/5b87797329c7b46422565ffbaab3be7e/raw/lancamentos.xml',
    itemTag: 'item'
  },
  {
    type: 'series',
    url: 'https://gist.githubusercontent.com/skyrisk/16070347f20c87c72540f9f805b57a66/raw/SeriesBase',
    itemTag: 'channel'
  },
  {
    type: 'animes',
    url: 'https://gist.githubusercontent.com/skyrisk/16070347f20c87c72540f9f805b57a66/raw/AnimesBase',
    itemTag: 'channel'
  },
  {
    type: 'desenhos',
    url: 'https://gist.githubusercontent.com/skyrisk/16070347f20c87c72540f9f805b57a66/raw/DesenhosBase',
    itemTag: 'channel'
  },
  {
    type: 'doramas',
    url: 'https://gist.githubusercontent.com/skyrisk/16070347f20c87c72540f9f805b57a66/raw/DoramasBase',
    itemTag: 'channel'
  },
  {
    type: 'novelas',
    url: 'https://gist.githubusercontent.com/skyrisk/07f1f4cd1b203cbf2efec959c4e8645a/raw/novelas.xml',
    itemTag: 'channel'
  }
];

function cleanBBCode(str) {
  if (!str) return '';
  return str
    .replace(/\[\/?(b|i|u|color|cr|b\]|i\]|u\])[^\]]*\]/gi, '')
    .replace(/\[COLOR [^\]]+\]/gi, '')
    .replace(/\[\/COLOR\]/gi, '')
    .replace(/\[CR\]/gi, ' ')
    .replace(/\[B\]/gi, '')
    .replace(/\[\/B\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseInfo(infoStr) {
  const clean = cleanBBCode(infoStr);
  let rating = '';
  let genres = '';
  let year = '';
  let synopsis = clean;

  const ratingMatch = clean.match(/Avaliação:\s*([\d.]+)/i);
  if (ratingMatch) rating = ratingMatch[1];

  const genresMatch = clean.match(/Gêneros?:\s*([^]+?)(?:Lançamento:|Sinopse:|$)/i);
  if (genresMatch) genres = genresMatch[1].trim();

  const yearMatch = clean.match(/Lançamento:\s*([^]+?)(?:Sinopse:|$)/i);
  if (yearMatch) year = yearMatch[1].trim();

  const synMatch = clean.match(/Sinopse:\s*([^]+)$/i);
  if (synMatch) synopsis = synMatch[1].trim();

  return { rating, genres, year, synopsis };
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function getTagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1].trim() : '';
}

async function main() {
  const dbPath = path.join(__dirname, '..', 'src', 'data', 'catalog.db');
  console.log('Target SQLite Database:', dbPath);

  if (fs.existsSync(dbPath)) {
    try { fs.unlinkSync(dbPath); } catch (e) {}
  }

  const db = new DatabaseSync(dbPath);

  // Optimize SQLite
  db.exec('PRAGMA synchronous = OFF;');
  db.exec('PRAGMA journal_mode = MEMORY;');

  db.exec(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      original_title TEXT,
      link TEXT NOT NULL,
      thumbnail TEXT,
      fanart TEXT,
      rating TEXT,
      genres TEXT,
      year TEXT,
      synopsis TEXT,
      tmdb_id TEXT
    );
    CREATE INDEX idx_items_type ON items(type);
    CREATE INDEX idx_items_title ON items(title);
    CREATE INDEX idx_items_genres ON items(genres);
    CREATE INDEX idx_items_type_title ON items(type, title);
  `);

  const insertStmt = db.prepare(`
    INSERT INTO items (type, title, original_title, link, thumbnail, fanart, rating, genres, year, synopsis, tmdb_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let grandTotal = 0;

  for (const src of SOURCES) {
    console.log(`\nFetching ${src.type} from ${src.url}...`);
    try {
      const xml = await fetchUrl(src.url);
      console.log(`Downloaded ${xml.length} bytes for ${src.type}. Parsing items...`);

      const regex = new RegExp(`<${src.itemTag}>[\\s\\S]*?<\\/${src.itemTag}>`, 'gi');
      const matches = xml.match(regex) || [];
      console.log(`Found ${matches.length} entries for ${src.type}.`);

      db.exec('BEGIN TRANSACTION;');
      let count = 0;

      for (const block of matches) {
        const rawTitle = getTagValue(block, 'title') || getTagValue(block, 'name');
        const cleanTitle = cleanBBCode(rawTitle);

        // Ignore pagination buttons like "PRÓXIMA PÁGINA" or headers like "TODOS OS FILMES"
        if (!cleanTitle || cleanTitle.includes('PRÓXIMA PÁGINA') || cleanTitle.includes('PÁGINA ANTERIOR') || cleanTitle.includes('|||')) {
          continue;
        }

        const link = getTagValue(block, 'link') || getTagValue(block, 'externallink');
        if (!link || link === 'here') continue;

        const thumbnail = getTagValue(block, 'thumbnail');
        const fanart = getTagValue(block, 'fanart');
        const rawInfo = getTagValue(block, 'info');
        const date = getTagValue(block, 'date') || getTagValue(block, 'tmdb_date');
        const tmdbTitle = getTagValue(block, 'tmdb_title') || getTagValue(block, 'tmdb_name');
        const tmdbOrig = getTagValue(block, 'tmdb_original_title') || getTagValue(block, 'tmdb_original_name');
        const tmdbId = getTagValue(block, 'tmdb_id');

        const { rating, genres, year, synopsis } = parseInfo(rawInfo);

        insertStmt.run(
          src.type,
          cleanTitle,
          tmdbOrig || tmdbTitle || cleanTitle,
          link,
          thumbnail || '',
          fanart || '',
          rating || '',
          genres || '',
          year || date || '',
          synopsis || '',
          tmdbId || ''
        );
        count++;
      }

      db.exec('COMMIT;');
      console.log(`Successfully imported ${count} valid items for ${src.type}!`);
      grandTotal += count;
    } catch (err) {
      console.error(`Error processing ${src.type}:`, err.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`GRAND TOTAL IMPORTED: ${grandTotal} items in SQLite DB!`);
  console.log(`Database saved successfully at: ${dbPath}`);
  console.log(`========================================`);
  db.close();
}

main().catch(console.error);
