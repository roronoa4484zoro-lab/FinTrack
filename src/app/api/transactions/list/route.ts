import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'dev-secret-key';

export async function GET(request: Request) {
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

    // SECURITY WIN: Ownership check - Only fetch transactions for the logged-in user
    const result = await query(
      'SELECT t.id, t.amount, t.description, t.date, c.name as category_name FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 ORDER BY t.date DESC',
      [userId]
    );

    // Decrypt the amounts before sending them to the frontend
    const transactions = result.rows.map((row: any) => ({
      ...row,
      amount: decrypt(row.amount, ENCRYPTION_KEY)
    }));

    return NextResponse.json(transactions, { status: 200 });
  } catch (error: any) {
    console.error('Fetch transactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
