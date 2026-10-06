import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';

// GET Recurring Transactions
export async function GET(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT r.id, r.amount, r.description, r.frequency, r.next_date, r.is_active, c.name as category_name FROM recurring_transactions r JOIN categories c ON r.category_id = c.id WHERE r.user_id = $1 ORDER BY r.next_date ASC',
      [userId]
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    console.error('Recurring GET error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST Create Recurring Transaction
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

    const { category_id, amount, description, frequency, next_date } = body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return NextResponse.json({ error: 'Frequency must be daily, weekly, monthly, or yearly' }, { status: 400 });
    }

    // Verify category
    const catCheck = await query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [category_id, userId]);
    if (catCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 403 });
    }

    const validDate = next_date && !isNaN(new Date(next_date).getTime()) ? next_date : new Date().toISOString().slice(0, 10);

    const result = await query(
      'INSERT INTO recurring_transactions (user_id, category_id, amount, description, frequency, next_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, amount, description, frequency, next_date, is_active',
      [userId, category_id, numAmount, (description || '').slice(0, 255), frequency, validDate]
    );

    return NextResponse.json({ message: 'Recurring transaction scheduled', recurring: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Recurring POST error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE Recurring Transaction
export async function DELETE(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Recurring ID is required' }, { status: 400 });
    }

    const res = await query('DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Recurring schedule not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Recurring schedule removed' }, { status: 200 });
  } catch (error: any) {
    console.error('Recurring DELETE error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

