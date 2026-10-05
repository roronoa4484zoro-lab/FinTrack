import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

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

    const { name, type } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type (income/expense) are required' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO categories (name, type, user_id) VALUES ($1, $2, $3) RETURNING id',
      [name, type, userId]
    );

    return NextResponse.json({
      message: 'Category created successfully',
      id: result.rows[0].id
    }, { status: 201 });
  } catch (error: any) {
    console.error('Category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
