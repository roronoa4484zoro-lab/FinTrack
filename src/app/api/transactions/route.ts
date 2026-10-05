import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'dev-secret-key';

export async function POST(request: Request) {
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

    const body = await request.json();
    const { amount, category_id, description, date } = body;

    if (amount === undefined || !category_id) {
      return NextResponse.json({ error: 'Amount and category are required' }, { status: 400 });
    }

    // Ensure amount is treated as a string for encryption
    const amountStr = String(amount);
    const encryptedAmount = encrypt(amountStr, ENCRYPTION_KEY);

    const result = await query(
      'INSERT INTO transactions (user_id, category_id, amount, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, category_id, encryptedAmount, description || '', date || new Date().toISOString()]
    );

    return NextResponse.json({
      message: 'Transaction recorded securely',
      id: result.rows[0].id
    }, { status: 201 });
  } catch (error: any) {
    console.error('Transaction POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
