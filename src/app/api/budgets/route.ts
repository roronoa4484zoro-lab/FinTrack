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

    // Compute date boundaries for the selected month
    const startOfMonth = `${currentMonth}-01T00:00:00.000Z`;
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const nextMonthStr = monthNum === 12
      ? `${year + 1}-01-01T00:00:00.000Z`
      : `${year}-${String(monthNum + 1).padStart(2, '0')}-01T00:00:00.000Z`;

    // Fetch user's expense transactions in this month to compute actual spending per category
    const transResult = await query(
      'SELECT t.amount, t.category_id, c.type as category_type FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 AND t.date >= $2 AND t.date < $3 ORDER BY t.date ASC',
      [userId, startOfMonth, nextMonthStr]
    );

    const spentByCategory: Record<string, number> = {};
    (transResult.rows || []).forEach((row: any) => {
      // Count expenses only (discretionary spending), ignoring income transactions
      if (row.category_type && row.category_type !== 'expense') return;
      try {
        const amt = parseFloat(decrypt(row.amount));
        if (!isNaN(amt) && amt > 0) {
          spentByCategory[row.category_id] = (spentByCategory[row.category_id] || 0) + amt;
        }
      } catch {
        // Skip unparseable amounts
      }
    });

    const budgets = (budgetResult.rows || []).map((b: any) => {
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

// POST Create Budget
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

    if (!category_id || typeof category_id !== 'string') {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return NextResponse.json({ error: 'Invalid month format. Expected YYYY-MM' }, { status: 400 });
    }

    // Validate category ownership (user-owned or global)
    const catCheck = await query(
      'SELECT id, name FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [category_id, userId]
    );
    if (!catCheck.rows || catCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 403 });
    }

    // Check duplicate: prevent duplicate budgets for same user, category, and month
    const duplicateCheck = await query(
      'SELECT id FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3',
      [userId, category_id, targetMonth]
    );
    if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Budget already exists for this category this month' },
        { status: 409 }
      );
    }

    const result = await query(
      'INSERT INTO budgets (user_id, category_id, amount, month) VALUES ($1, $2, $3, $4) RETURNING id, category_id, amount, month, created_at, updated_at',
      [userId, category_id, numAmount, targetMonth]
    );

    const created = result.rows[0];
    return NextResponse.json(
      {
        message: 'Budget created successfully',
        budget: {
          ...created,
          category_name: catCheck.rows[0].name,
          spent: 0,
          remaining: numAmount,
          percentage: 0,
          is_exceeded: false,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Budget POST error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH Update Budget
export async function PATCH(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
    }

    const { id, amount } = body;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Budget amount must be greater than 0' }, { status: 400 });
    }

    const updateRes = await query(
      'UPDATE budgets SET amount = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, category_id, amount, month, updated_at',
      [numAmount, id, userId]
    );

    if (!updateRes.rows || updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Budget not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Budget updated successfully', budget: updateRes.rows[0] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Budget PATCH error:', error?.message);
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
