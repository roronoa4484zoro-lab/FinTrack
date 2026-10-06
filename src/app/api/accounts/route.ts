import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';

// GET Accounts
export async function GET(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT id, name, type, balance, created_at FROM accounts WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    console.error('Accounts GET error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST Create Account
export async function POST(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
    }

    const { name, type, balance } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    }

    const allowedTypes = ['bank', 'cash', 'upi', 'credit_card', 'savings'];
    const accType = allowedTypes.includes(type) ? type : 'bank';
    const numBalance = parseFloat(balance) || 0.00;

    const result = await query(
      'INSERT INTO accounts (user_id, name, type, balance) VALUES ($1, $2, $3, $4) RETURNING id, name, type, balance, created_at',
      [userId, name.trim().slice(0, 100), accType, numBalance]
    );

    return NextResponse.json({ message: 'Account created successfully', account: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Account POST error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

