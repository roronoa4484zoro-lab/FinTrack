import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type'); // 'income' | 'expense'
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') === 'oldest' ? 'ASC' : 'DESC';

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['t.user_id = $1'];
    const params: any[] = [userId];

    if (category) {
      params.push(category);
      conditions.push(`c.name = $${params.length}`);
    }

    if (type && (type === 'income' || type === 'expense')) {
      params.push(type);
      conditions.push(`c.type = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      conditions.push(`t.date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`t.date <= $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(t.description ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    // Count query for pagination metadata
    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t JOIN categories c ON t.category_id = c.id WHERE ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

    // Data query
    const dataQuery = `
      SELECT t.id, t.amount, t.description, t.date, t.category_id,
             c.name as category_name, c.type as category_type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      ORDER BY t.date ${sortBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, limit, offset];
    const result = await query(dataQuery, dataParams);

    const transactions = result.rows.map((row: any) => {
      let decryptedAmount = 0;
      try {
        decryptedAmount = parseFloat(decrypt(row.amount)) || 0;
      } catch (e: any) {
        console.error(`Decryption failed for transaction ${row.id}:`, e?.message);
      }

      return {
        id: row.id,
        amount: decryptedAmount,
        description: row.description || '',
        date: row.date,
        category_id: row.category_id,
        category_name: row.category_name,
        type: row.category_type,
      };
    });

    return NextResponse.json(
      {
        transactions,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Fetch transactions error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

