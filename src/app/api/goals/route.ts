import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';

// GET Goals
export async function GET(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT id, title, target_amount, current_amount, target_date, created_at, updated_at FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const goals = (result.rows || []).map((g: any) => {
      const target = parseFloat(g.target_amount) || 0;
      const current = parseFloat(g.current_amount) || 0;
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return {
        id: g.id,
        title: g.title,
        target_amount: target,
        current_amount: current,
        target_date: g.target_date,
        progress_percentage: progress,
        created_at: g.created_at,
        updated_at: g.updated_at,
      };
    });

    return NextResponse.json(goals, { status: 200 });
  } catch (error: any) {
    console.error('Goals GET error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST Create Goal
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

    const { title, target_amount, current_amount, target_date } = body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Goal title is required' }, { status: 400 });
    }

    const numTarget = parseFloat(target_amount);
    if (isNaN(numTarget) || numTarget <= 0) {
      return NextResponse.json({ error: 'Target amount must be greater than 0' }, { status: 400 });
    }

    const numCurrent = Math.max(0, parseFloat(current_amount) || 0);
    const validDate = target_date && !isNaN(new Date(target_date).getTime()) ? target_date : null;

    const result = await query(
      'INSERT INTO goals (user_id, title, target_amount, current_amount, target_date, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, title, target_amount, current_amount, target_date, created_at, updated_at',
      [userId, title.trim().slice(0, 150), numTarget, numCurrent, validDate]
    );

    const goal = result.rows[0];
    const progress = numTarget > 0 ? Math.min(100, Math.round((numCurrent / numTarget) * 100)) : 0;

    return NextResponse.json(
      {
        message: 'Goal created successfully',
        goal: {
          ...goal,
          progress_percentage: progress,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Goal POST error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to handle goal updates (used by PUT and PATCH)
async function handleUpdateGoal(request: Request) {
  const userId = await getAuthUser(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, title, target_amount, current_amount, target_date } = body;
  if (!id) {
    return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
  }

  // Verify ownership
  const check = await query('SELECT id FROM goals WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!check.rows || check.rows.length === 0) {
    return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 });
  }

  const updates: string[] = ['updated_at = NOW()'];
  const params: any[] = [id, userId];

  if (title && typeof title === 'string') {
    params.push(title.trim().slice(0, 150));
    updates.push(`title = $${params.length}`);
  }
  if (target_amount !== undefined) {
    const t = parseFloat(target_amount);
    if (!isNaN(t) && t > 0) {
      params.push(t);
      updates.push(`target_amount = $${params.length}`);
    }
  }
  if (current_amount !== undefined) {
    const c = parseFloat(current_amount);
    if (!isNaN(c) && c >= 0) {
      params.push(c);
      updates.push(`current_amount = $${params.length}`);
    }
  }
  if (target_date !== undefined) {
    params.push(target_date);
    updates.push(`target_date = $${params.length}`);
  }

  await query(
    `UPDATE goals SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING id, title, target_amount, current_amount, target_date, updated_at`,
    params
  );

  return NextResponse.json({ message: 'Goal updated successfully' }, { status: 200 });
}

export async function PUT(request: Request) {
  try {
    return await handleUpdateGoal(request);
  } catch (error: any) {
    console.error('Goal PUT error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    return await handleUpdateGoal(request);
  } catch (error: any) {
    console.error('Goal PATCH error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE Goal
export async function DELETE(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const res = await query('DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Goal deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Goal DELETE error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
