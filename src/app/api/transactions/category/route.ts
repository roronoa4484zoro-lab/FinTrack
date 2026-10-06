import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';

// GET User Categories
export async function GET(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let result = await query(
      'SELECT id, name, type, created_at FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY name ASC',
      [userId]
    );

    // If the user has no categories, auto-seed the standard default categories
    if (!result.rows || result.rows.length === 0) {
      const defaultCategories = [
        { name: 'Salary', type: 'income' },
        { name: 'Investments', type: 'income' },
        { name: 'Freelance & Side Hustles', type: 'income' },
        { name: 'Food & Dining', type: 'expense' },
        { name: 'Groceries', type: 'expense' },
        { name: 'Transport & Fuel', type: 'expense' },
        { name: 'Rent & Utilities', type: 'expense' },
        { name: 'Shopping', type: 'expense' },
        { name: 'Entertainment', type: 'expense' },
        { name: 'Healthcare', type: 'expense' },
      ];

      for (const cat of defaultCategories) {
        try {
          await query(
            'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [userId, cat.name, cat.type]
          );
        } catch {
          // Continue
        }
      }

      result = await query(
        'SELECT id, name, type, created_at FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY name ASC',
        [userId]
      );
    }

    return NextResponse.json(result.rows || [], { status: 200 });
  } catch (error: any) {
    console.error('Fetch categories error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// CREATE Category
export async function POST(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { name, type } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const normalizedName = name.trim().slice(0, 100);

    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json({ error: 'Type must be either "income" or "expense"' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO categories (name, type, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO UPDATE SET type = EXCLUDED.type
       RETURNING id, name, type`,
      [normalizedName, type, userId]
    );

    return NextResponse.json(
      {
        message: 'Category saved successfully',
        category: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Category error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

