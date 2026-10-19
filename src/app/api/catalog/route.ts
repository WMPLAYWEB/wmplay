import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), 'src', 'data', 'catalog.db');
    dbInstance = new DatabaseSync(dbPath, { open: true, readOnly: true });
  }
  return dbInstance;
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'um', 'uma', 'uns', 'umas', 'por', 'para', 'com', 'sem', 'the', 'of', 'and', 'in', 'on', 'at', 'to'
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let type = searchParams.get('type') || 'filmes';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '48', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const genre = searchParams.get('genre')?.trim() || '';

    const db = getDb();
    const offset = (page - 1) * limit;

    const buildQuery = (filterType: string) => {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (filterType !== 'all') {
        conditions.push('type = ?');
        params.push(filterType);
      }

      let cleanSearch = '';
      let cleanCombined = '';

      if (search) {
        cleanSearch = normalizeText(search);
        const rawTokens = cleanSearch.split(/\s+/).filter(Boolean);
        let tokens = rawTokens;
        if (tokens.length > 1) {
          const nonStop = tokens.filter(t => !STOP_WORDS.has(t));
          if (nonStop.length > 0) tokens = nonStop;
        }
        cleanCombined = tokens.join(' ');

        for (const token of tokens) {
          conditions.push('(clean_title LIKE ? OR clean_original_title LIKE ?)');
          params.push(`%${token}%`, `%${token}%`);
        }
      }

      if (genre) {
        const gLower = genre.toLowerCase();
        if (gLower.includes('ficção') || gLower.includes('ficcao')) {
          conditions.push('(genres LIKE ? OR genres LIKE ? OR genres LIKE ?)');
          params.push('%Ficção%', '%Sci-Fi%', '%Ficcao%');
        } else if (gLower.includes('terror') || gLower.includes('horror')) {
          conditions.push('(genres LIKE ? OR genres LIKE ?)');
          params.push('%Terror%', '%Horror%');
        } else if (gLower.includes('suspense') || gLower.includes('misterio') || gLower.includes('mistério')) {
          conditions.push('(genres LIKE ? OR genres LIKE ? OR genres LIKE ?)');
          params.push('%Suspense%', '%Mistério%', '%Misterio%');
        } else if (gLower.includes('romance') || gLower.includes('romantico')) {
          conditions.push('(genres LIKE ? OR genres LIKE ?)');
          params.push('%Romance%', '%Soap%');
        } else {
          conditions.push('genres LIKE ?');
          params.push(`%${genre}%`);
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      let orderBy = 'id ASC';
      const orderParams: (string | number)[] = [];
      if (cleanSearch) {
        orderBy = `
          CASE 
            WHEN clean_title = ? THEN 0
            WHEN clean_title = ? THEN 1
            WHEN clean_title LIKE ? THEN 2
            WHEN clean_title LIKE ? THEN 3
            WHEN clean_original_title = ? THEN 4
            WHEN clean_title LIKE ? THEN 5
            ELSE 6
          END, id ASC
        `;
        orderParams.push(
          cleanSearch,
          cleanCombined,
          `${cleanSearch}%`,
          `${cleanCombined}%`,
          cleanSearch,
          `%${cleanCombined}%`
        );
      }

      return { conditions, params, whereClause, orderBy, orderParams };
    };

    let q = buildQuery(type);
    let countSql = `SELECT COUNT(*) as total FROM items ${q.whereClause}`;
    let countRow = db.prepare(countSql).get(...q.params) as { total: number } | undefined;
    let total = countRow ? countRow.total : 0;

    // Fallback: If 0 results found with search in specific type, search across all catalog types
    if (total === 0 && search && type !== 'all') {
      type = 'all';
      q = buildQuery('all');
      countSql = `SELECT COUNT(*) as total FROM items ${q.whereClause}`;
      countRow = db.prepare(countSql).get(...q.params) as { total: number } | undefined;
      total = countRow ? countRow.total : 0;
    }

    const itemsSql = `SELECT * FROM items ${q.whereClause} ORDER BY ${q.orderBy} LIMIT ? OFFSET ?`;
    const items = db.prepare(itemsSql).all(...q.params, ...q.orderParams, limit, offset);

    return NextResponse.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      type,
      items
    });
  } catch (error: any) {
    console.error('Catalog API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
