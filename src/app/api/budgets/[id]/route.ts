import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { amount } = body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Budget amount must be greater than 0' }, { status: 400 });
    }

    const res = await query(
      'UPDATE budgets SET amount = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, category_id, amount, month, updated_at',
      [numAmount, id, userId]
    );

    if (!res.rows || res.rows.length === 0) {
      return NextResponse.json({ error: 'Budget not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Budget updated successfully', budget: res.rows[0] }, { status: 200 });
  } catch (error: any) {
    console.error('Budget PATCH [id] error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    const deleteRes = await query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ error: 'Budget not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Budget deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Budget DELETE [id] error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
