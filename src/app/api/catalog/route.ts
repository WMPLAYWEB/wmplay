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
          conditions.push(`(synopsis LIKE '%netflix%' OR clean_title LIKE '%stranger things%' OR clean_title LIKE '%wandinha%' OR clean_title LIKE '%round 6%' OR clean_title LIKE '%squid game%' OR clean_title LIKE '%casa de papel%' OR clean_title LIKE '%the crown%' OR clean_title LIKE '%black mirror%' OR clean_title LIKE '%dark%' OR clean_title LIKE '%elite%' OR clean_title LIKE '%ozark%' OR clean_title LIKE '%bridgerton%' OR clean_title LIKE '%peaky blinders%' OR clean_title LIKE '%narcos%' OR clean_title LIKE '%witcher%' OR clean_title LIKE '%heartstopper%' OR clean_title LIKE '%sex education%' OR clean_title LIKE '%dahmer%' OR clean_title LIKE '%arcane%' OR clean_title LIKE '%lupin%' OR clean_title LIKE '%outer banks%' OR clean_title LIKE '%emily in paris%' OR clean_title LIKE '%manifest%' OR clean_title LIKE '%you%' OR clean_title LIKE '%lucifer%' OR clean_title LIKE '%cobra kai%' OR clean_title LIKE '%orange is the new black%' OR clean_title LIKE '%mindhunter%' OR clean_title LIKE '%umbrella academy%' OR clean_title LIKE '%sandman%' OR clean_title LIKE '%bird box%' OR clean_title LIKE '%alerta vermelho%' OR clean_title LIKE '%resgate%' OR clean_title LIKE '%o irlandes%' OR clean_title LIKE '%glass onion%' OR clean_title LIKE '%enola holmes%' OR clean_title LIKE '%bebe rena%' OR clean_title LIKE '%one piece%' OR clean_title LIKE '%avatar o ultimo mestre%' OR clean_title LIKE '%berlim%' OR clean_title LIKE '%griselda%' OR clean_title LIKE '%sociedade da neve%' OR clean_title LIKE '%better call saul%' OR clean_title LIKE '%vikings%')`);
        } else if (p === 'max' || p === 'hbo') {
          conditions.push(`(synopsis LIKE '%hbo%' OR synopsis LIKE '%max original%' OR synopsis LIKE '%warner bros%' OR clean_title LIKE '%game of thrones%' OR clean_title LIKE '%house of the dragon%' OR clean_title LIKE '%succession%' OR clean_title LIKE '%the last of us%' OR clean_title LIKE '%euphoria%' OR clean_title LIKE '%chernobyl%' OR clean_title LIKE '%sopranos%' OR clean_title LIKE '%the wire%' OR clean_title LIKE '%westworld%' OR clean_title LIKE '%rick and morty%' OR clean_title LIKE '%white lotus%' OR clean_title LIKE '%true detective%' OR clean_title LIKE '%barry%' OR clean_title LIKE '%peacemaker%' OR clean_title LIKE '%pacificador%' OR clean_title LIKE '%hacks%' OR clean_title LIKE '%batman%' OR clean_title LIKE '%coringa%' OR clean_title LIKE '%joker%' OR clean_title LIKE '%duna%' OR clean_title LIKE '%dune%' OR clean_title LIKE '%matrix%' OR clean_title LIKE '%mad max%' OR clean_title LIKE '%harry potter%' OR clean_title LIKE '%animais fantasticos%' OR clean_title LIKE '%senhor dos aneis%' OR clean_title LIKE '%godzilla%' OR clean_title LIKE '%king kong%' OR clean_title LIKE '%watchmen%' OR clean_title LIKE '%band of brothers%' OR clean_title LIKE '%boardwalk empire%' OR clean_title LIKE '%silicon valley%' OR clean_title LIKE '%penguin%' OR clean_title LIKE '%pinguim%' OR clean_title LIKE '%titans%' OR clean_title LIKE '%harley quinn%')`);
        } else if (p === 'disney') {
          conditions.push(`(synopsis LIKE '%disney%' OR synopsis LIKE '%pixar%' OR synopsis LIKE '%marvel%' OR synopsis LIKE '%star wars%' OR synopsis LIKE '%lucasfilm%' OR clean_title LIKE '%mandalorian%' OR clean_title LIKE '%loki%' OR clean_title LIKE '%wandavision%' OR clean_title LIKE '%ahsoka%' OR clean_title LIKE '%andor%' OR clean_title LIKE '%percy jackson%' OR clean_title LIKE '%vingadores%' OR clean_title LIKE '%avengers%' OR clean_title LIKE '%encanto%' OR clean_title LIKE '%moana%' OR clean_title LIKE '%frozen%' OR clean_title LIKE '%rei leao%' OR clean_title LIKE '%toy story%' OR clean_title LIKE '%divertida mente%' OR clean_title LIKE '%inside out%' OR clean_title LIKE '%elementos%' OR clean_title LIKE '%soul%' OR clean_title LIKE '%homem de ferro%' OR clean_title LIKE '%capitao america%' OR clean_title LIKE '%thor%' OR clean_title LIKE '%pantera negra%' OR clean_title LIKE '%guardioes da galaxia%' OR clean_title LIKE '%doutor estranho%' OR clean_title LIKE '%homem formiga%' OR clean_title LIKE '%viuva negra%' OR clean_title LIKE '%cavaleiro da lua%' OR clean_title LIKE '%mulher hulk%' OR clean_title LIKE '%shogun%' OR clean_title LIKE '%o urso%')`);
        } else if (p === 'prime') {
          conditions.push(`(synopsis LIKE '%prime video%' OR synopsis LIKE '%amazon original%' OR synopsis LIKE '%amazon studios%' OR clean_title LIKE '%the boys%' OR clean_title LIKE '%aneis de poder%' OR clean_title LIKE '%invencivel%' OR clean_title LIKE '%reacher%' OR clean_title LIKE '%gen v%' OR clean_title LIKE '%fallout%' OR clean_title LIKE '%jack ryan%' OR clean_title LIKE '%roda do tempo%' OR clean_title LIKE '%fleabag%' OR clean_title LIKE '%maravilhosa sra maisel%' OR clean_title LIKE '%good omens%' OR clean_title LIKE '%carnival row%' OR clean_title LIKE '%bosch%' OR clean_title LIKE '%verao que mudou minha vida%' OR clean_title LIKE '%citadel%' OR clean_title LIKE '%uma ideia de voce%' OR clean_title LIKE '%dom%' OR clean_title LIKE '%impuros%' OR clean_title LIKE '%road house%' OR clean_title LIKE '%matador de aluguel%' OR clean_title LIKE '%saltburn%' OR clean_title LIKE '%creed%' OR clean_title LIKE '%007%' OR clean_title LIKE '%terminal list%')`);
        } else if (p === 'apple') {
          conditions.push(`(synopsis LIKE '%apple tv%' OR synopsis LIKE '%apple original%' OR clean_title LIKE '%ted lasso%' OR clean_title LIKE '%ruptura%' OR clean_title LIKE '%severance%' OR clean_title LIKE '%silo%' OR clean_title LIKE '%see%' OR clean_title LIKE '%fundacao%' OR clean_title LIKE '%foundation%' OR clean_title LIKE '%morning show%' OR clean_title LIKE '%black bird%' OR clean_title LIKE '%slow horses%' OR clean_title LIKE '%para toda a humanidade%' OR clean_title LIKE '%servant%' OR clean_title LIKE '%defending jacob%' OR clean_title LIKE '%acima de qualquer suspeita%' OR clean_title LIKE '%dark matter%' OR clean_title LIKE '%materia escura%' OR clean_title LIKE '%monarch%' OR clean_title LIKE '%sugar%' OR clean_title LIKE '%palm royale%' OR clean_title LIKE '%assassinos da lua das flores%' OR clean_title LIKE '%napoleao%' OR clean_title LIKE '%napoleon%' OR clean_title LIKE '%coda%' OR clean_title LIKE '%tetris%' OR clean_title LIKE '%greyhound%' OR clean_title LIKE '%ghosted%' OR clean_title LIKE '%argylle%')`);
        } else if (p === 'globo' || p === 'globoplay') {
          conditions.push(`(synopsis LIKE '%globoplay%' OR synopsis LIKE '%tv globo%' OR synopsis LIKE '%gshow%' OR clean_title LIKE '%sob pressao%' OR clean_title LIKE '%os outros%' OR clean_title LIKE '%justica%' OR clean_title LIKE '%arcanjo renegado%' OR clean_title LIKE '%verdades secretas%' OR clean_title LIKE '%as five%' OR clean_title LIKE '%pantanal%' OR clean_title LIKE '%avenida brasil%' OR clean_title LIKE '%todas as flores%' OR clean_title LIKE '%renascer%' OR clean_title LIKE '%terra e paixao%' OR clean_title LIKE '%vai na fe%' OR clean_title LIKE '%o clone%' OR clean_title LIKE '%tieta%' OR clean_title LIKE '%vale tudo%' OR clean_title LIKE '%a favorita%' OR clean_title LIKE '%senhora do destino%' OR clean_title LIKE '%mulheres apaixonadas%' OR clean_title LIKE '%lacos de familia%' OR clean_title LIKE '%por amor%' OR clean_title LIKE '%celebridade%' OR clean_title LIKE '%imperio%' OR clean_title LIKE '%a forca do querer%' OR clean_title LIKE '%a dona do pedaco%' OR clean_title LIKE '%linha direta%')`);
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
