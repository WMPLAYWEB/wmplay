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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'filmes';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '48', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const genre = searchParams.get('genre')?.trim() || '';

    const db = getDb();
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    if (search) {
      conditions.push('(title LIKE ? OR original_title LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
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

    // Total count query
    const countSql = `SELECT COUNT(*) as total FROM items ${whereClause}`;
    const countRow = db.prepare(countSql).get(...params) as { total: number } | undefined;
    const total = countRow ? countRow.total : 0;

    // Items query
    const itemsSql = `SELECT * FROM items ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`;
    const items = db.prepare(itemsSql).all(...params, limit, offset);

    return NextResponse.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items
    });
  } catch (error: any) {
    console.error('Catalog API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
