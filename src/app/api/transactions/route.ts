import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

// CREATE Transaction
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

    const { amount, category_id, description, date, account_id } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number greater than 0' }, { status: 400 });
    }

    if (!category_id || typeof category_id !== 'string') {
      return NextResponse.json({ error: 'Valid category_id is required' }, { status: 400 });
    }

    // Verify category ownership
    const categoryCheck = await query(
      'SELECT id, type FROM categories WHERE id = $1 AND user_id = $2',
      [category_id, userId]
    );

    if (categoryCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found or access denied' }, { status: 403 });
    }

    // Verify account ownership if provided
    let validAccountId: string | null = null;
    if (account_id) {
      const accountCheck = await query(
        'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
        [account_id, userId]
      );
      if (accountCheck.rows.length > 0) {
        validAccountId = account_id;
      }
    }

    const sanitizedDesc = typeof description === 'string' ? description.trim().slice(0, 255) : '';
    const validDate = date && !isNaN(new Date(date).getTime()) ? new Date(date).toISOString() : new Date().toISOString();

    const encryptedAmount = encrypt(numAmount.toFixed(2));

    const result = await query(
      `INSERT INTO transactions
        (user_id, category_id, account_id, amount, description, date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, date, created_at`,
      [userId, category_id, validAccountId, encryptedAmount, sanitizedDesc, validDate]
    );

    return NextResponse.json(
      {
        message: 'Transaction recorded securely',
        id: result.rows[0].id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Transaction POST error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// UPDATE Transaction (with strict ownership check)
export async function PUT(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { id, amount, category_id, description, date } = body;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Ensure transaction exists and belongs to the authenticated user
    const existingCheck = await query(
      'SELECT id, category_id, amount, description, date FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 });
    }

    let targetCategoryId = existingCheck.rows[0].category_id;
    if (category_id) {
      const categoryCheck = await query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, userId]
      );
      if (categoryCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid category for this user' }, { status: 403 });
      }
      targetCategoryId = category_id;
    }

    let encryptedAmount = existingCheck.rows[0].amount;
    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
      }
      encryptedAmount = encrypt(numAmount.toFixed(2));
    }

    const targetDescription = description !== undefined ? String(description).slice(0, 255) : existingCheck.rows[0].description;
    const targetDate = date && !isNaN(new Date(date).getTime()) ? new Date(date).toISOString() : existingCheck.rows[0].date;

    await query(
      `UPDATE transactions
       SET category_id = $1, amount = $2, description = $3, date = $4
       WHERE id = $5 AND user_id = $6`,
      [targetCategoryId, encryptedAmount, targetDescription, targetDate, id, userId]
    );

    return NextResponse.json({ message: 'Transaction updated successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Transaction PUT error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE Transaction (IDOR Safe)
export async function DELETE(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Must match both resource id AND authenticated user_id
    const deleteResult = await query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Transaction deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Transaction DELETE error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}