import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'dev-secret-key';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getAuthUser(token);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT t.amount, c.type FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1',
      [userId]
    );

    let totalIncome = 0;
    let totalExpense = 0;

    result.rows.forEach((row: any) => {
      try {
        const amount = parseFloat(decrypt(row.amount, ENCRYPTION_KEY));
        if (isNaN(amount)) return;

        if (row.type === 'income') {
          totalIncome += amount;
        } else {
          totalExpense += amount;
        }
      } catch (e) {
        console.error('Summary decryption error:', e);
      }
    });

    return NextResponse.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
