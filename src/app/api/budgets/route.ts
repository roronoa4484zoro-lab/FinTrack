import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// GET User Budgets with calculation of actual monthly spending
export async function GET(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currentMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const budgetResult = await query(
      'SELECT b.id, b.category_id, b.amount, b.month, c.name as category_name FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.user_id = $1 AND b.month = $2 ORDER BY c.name ASC',
      [userId, currentMonth]
    );

    // Fetch transactions in this month for this user to compute actual spending per category
    const startOfMonth = currentMonth + '-01T00:00:00.000Z';
    const transResult = await query(
      'SELECT t.amount, t.category_id FROM transactions t WHERE t.user_id = $1 AND t.date >= $2 ORDER BY t.date ASC',
      [userId, startOfMonth]
    );

    const spentByCategory: Record<string, number> = {};
    transResult.rows.forEach((row: any) => {
      try {
        const amt = parseFloat(decrypt(row.amount));
        if (!isNaN(amt)) {
          spentByCategory[row.category_id] = (spentByCategory[row.category_id] || 0) + amt;
        }
      } catch {
        // Skip unparseable
      }
    });

    const budgets = budgetResult.rows.map((b: any) => {
      const budgetAmount = parseFloat(b.amount) || 0;
      const spent = spentByCategory[b.category_id] || 0;
      const remaining = budgetAmount - spent;
      const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

      return {
        id: b.id,
        category_id: b.category_id,
        category_name: b.category_name,
        month: b.month,
        amount: budgetAmount,
        spent: Number(spent.toFixed(2)),
        remaining: Number(remaining.toFixed(2)),
        percentage,
        is_exceeded: spent > budgetAmount,
      };
    });

    return NextResponse.json({ budgets, month: currentMonth }, { status: 200 });
  } catch (error: any) {
    console.error('Budgets GET error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST Create or Update Budget
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

    const { category_id, amount, month } = body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Budget amount must be greater than 0' }, { status: 400 });
    }

    if (!category_id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const validMonth = (month && /^\d{4}-\d{2}\$/.test(month)) ? month : new Date().toISOString().slice(0, 7);

    // Validate category ownership
    const catCheck = await query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [category_id, userId]
    );
    if (catCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 403 });
    }

    const result = await query(
      'INSERT INTO budgets (user_id, category_id, amount, month) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, category_id, month) DO UPDATE SET amount = EXCLUDED.amount RETURNING id, category_id, amount, month',
      [userId, category_id, numAmount, validMonth]
    );

    return NextResponse.json({ message: 'Budget saved successfully', budget: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Budget POST error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE Budget
export async function DELETE(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
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
    console.error('Budget DELETE error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
