import { NextResponse } from 'next/server';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { email, password, full_name } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 255) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters in length' },
        { status: 400 }
      );
    }

    const sanitizedFullName = typeof full_name === 'string' ? full_name.trim().slice(0, 100) : null;

    // Check if user already exists
    const userCheck = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (userCheck.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
      [normalizedEmail, hashedPassword, sanitizedFullName]
    );

    const user = result.rows[0];

    // Seed default categories for convenient out-of-the-box experience
    const defaultCategories = [
      { name: 'Salary', type: 'income' },
      { name: 'Investments', type: 'income' },
      { name: 'Food & Dining', type: 'expense' },
      { name: 'Groceries', type: 'expense' },
      { name: 'Transport & Fuel', type: 'expense' },
      { name: 'Rent & Utilities', type: 'expense' },
      { name: 'Shopping', type: 'expense' },
      { name: 'Entertainment', type: 'expense' },
    ];

    for (const cat of defaultCategories) {
      try {
        await query(
          'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO NOTHING',
          [user.id, cat.name, cat.type]
        );
      } catch {
        // Continue if category already exists
      }
    }

    // Set auth cookie
    const token = generateToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: { id: user.id, email: user.email, full_name: user.full_name },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration handler error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

