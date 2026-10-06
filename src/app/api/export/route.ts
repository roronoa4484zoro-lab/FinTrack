import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// GET CSV Export
export async function GET(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT t.amount, t.description, t.date, c.name as category_name, c.type as category_type FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 ORDER BY t.date DESC',
      [userId]
    );

    const rows: string[] = ['Date,Category,Type,Amount,Description'];

    result.rows.forEach((row: any) => {
      let amt = 0;
      try {
        amt = parseFloat(decrypt(row.amount)) || 0;
      } catch {
        amt = 0;
      }

      const dateStr = new Date(row.date).toISOString().slice(0, 10);
      const category = (row.category_name || '').replace(/,/g, ' ');
      const type = row.category_type || '';
      const amountStr = amt.toFixed(2);
      const desc = (row.description || '').replace(/[,\r\n]/g, ' ').replace(/"/g, '""');

      rows.push(`${dateStr},${category},${type},${amountStr},"${desc}"`);
    });

    const csvContent = rows.join('\n');
    const filename = `fintrack_export_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Export error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

