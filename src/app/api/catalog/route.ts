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
    const platform = searchParams.get('platform')?.trim() || '';

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

      if (platform) {
        const p = platform.toLowerCase();
        if (p === 'netflix') {
          conditions.push(`(synopsis LIKE '%netflix%' OR clean_title LIKE '%stranger things%' OR clean_title LIKE '%wandinha%' OR clean_title LIKE '%round 6%' OR clean_title LIKE '%casa de papel%' OR clean_title LIKE '%the crown%' OR clean_title LIKE '%black mirror%' OR clean_title LIKE '%dark%' OR clean_title LIKE '%elite%' OR clean_title LIKE '%ozark%' OR clean_title LIKE '%bridgerton%' OR clean_title LIKE '%peaky blinders%' OR clean_title LIKE '%narcos%' OR clean_title LIKE '%the witcher%' OR clean_title LIKE '%heartstopper%' OR clean_title LIKE '%sex education%' OR clean_title LIKE '%dahmer%' OR clean_title LIKE '%arcane%' OR clean_title LIKE '%lupin%' OR clean_title LIKE '%outer banks%' OR clean_title LIKE '%emily in paris%' OR clean_title LIKE '%manifest%' OR clean_title LIKE '%you%' OR clean_title LIKE '%lucifer%' OR clean_title LIKE '%cobra kai%')`);
        } else if (p === 'max' || p === 'hbo') {
          conditions.push(`(synopsis LIKE '%hbo%' OR synopsis LIKE '%max%' OR clean_title LIKE '%game of thrones%' OR clean_title LIKE '%house of the dragon%' OR clean_title LIKE '%succession%' OR clean_title LIKE '%the last of us%' OR clean_title LIKE '%euphoria%' OR clean_title LIKE '%chernobyl%' OR clean_title LIKE '%sopranos%' OR clean_title LIKE '%the wire%' OR clean_title LIKE '%westworld%' OR clean_title LIKE '%rick and morty%' OR clean_title LIKE '%white lotus%' OR clean_title LIKE '%true detective%' OR clean_title LIKE '%barry%' OR clean_title LIKE '%peacemaker%' OR clean_title LIKE '%pacificador%' OR clean_title LIKE '%hacks%')`);
        } else if (p === 'disney') {
          conditions.push(`(synopsis LIKE '%disney%' OR synopsis LIKE '%pixar%' OR synopsis LIKE '%marvel%' OR synopsis LIKE '%star wars%' OR clean_title LIKE '%mandalorian%' OR clean_title LIKE '%loki%' OR clean_title LIKE '%wandavision%' OR clean_title LIKE '%ahsoka%' OR clean_title LIKE '%andor%' OR clean_title LIKE '%percy jackson%' OR clean_title LIKE '%vingadores%' OR clean_title LIKE '%avengers%' OR clean_title LIKE '%encanto%' OR clean_title LIKE '%moana%' OR clean_title LIKE '%frozen%')`);
        } else if (p === 'prime') {
          conditions.push(`(synopsis LIKE '%prime video%' OR synopsis LIKE '%amazon%' OR clean_title LIKE '%the boys%' OR clean_title LIKE '%senhor dos aneis%' OR clean_title LIKE '%invencivel%' OR clean_title LIKE '%reacher%' OR clean_title LIKE '%gen v%' OR clean_title LIKE '%fallout%' OR clean_title LIKE '%jack ryan%' OR clean_title LIKE '%roda do tempo%' OR clean_title LIKE '%fleabag%')`);
        } else if (p === 'apple') {
          conditions.push(`(synopsis LIKE '%apple tv%' OR synopsis LIKE '%apple%' OR clean_title LIKE '%ted lasso%' OR clean_title LIKE '%ruptura%' OR clean_title LIKE '%severance%' OR clean_title LIKE '%silo%' OR clean_title LIKE '%see%' OR clean_title LIKE '%fundacao%' OR clean_title LIKE '%morning show%' OR clean_title LIKE '%black bird%' OR clean_title LIKE '%slow horses%')`);
        } else if (p === 'globo' || p === 'globoplay') {
          conditions.push(`(synopsis LIKE '%globo%' OR synopsis LIKE '%globoplay%' OR clean_title LIKE '%sob pressao%' OR clean_title LIKE '%os outros%' OR clean_title LIKE '%justica%' OR clean_title LIKE '%arcanjo renegado%' OR clean_title LIKE '%verdades secretas%' OR clean_title LIKE '%as five%' OR clean_title LIKE '%pantanal%' OR clean_title LIKE '%avenida brasil%' OR clean_title LIKE '%todas as flores%')`);
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
