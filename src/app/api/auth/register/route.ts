import { NextResponse } from 'next/server';
import { hashPassword, setAuthCookie } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, full_name]
    );

    const userId = result.rows[0].id;

    // We don't automatically log in on register for security,
    // but we could if we wanted to.

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
