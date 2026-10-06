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
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Verify ownership
    const check = await query('SELECT id FROM goals WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!check.rows || check.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 });
    }

    const { title, target_amount, current_amount, target_date } = body;
    const updates: string[] = ['updated_at = NOW()'];
    const sqlParams: any[] = [id, userId];

    if (title && typeof title === 'string') {
      sqlParams.push(title.trim().slice(0, 150));
      updates.push(`title = $${sqlParams.length}`);
    }
    if (target_amount !== undefined) {
      const t = parseFloat(target_amount);
      if (!isNaN(t) && t > 0) {
        sqlParams.push(t);
        updates.push(`target_amount = $${sqlParams.length}`);
      }
    }
    if (current_amount !== undefined) {
      const c = parseFloat(current_amount);
      if (!isNaN(c) && c >= 0) {
        sqlParams.push(c);
        updates.push(`current_amount = $${sqlParams.length}`);
      }
    }
    if (target_date !== undefined) {
      sqlParams.push(target_date);
      updates.push(`target_date = $${sqlParams.length}`);
    }

    const res = await query(
      `UPDATE goals SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING id, title, target_amount, current_amount, target_date, updated_at`,
      sqlParams
    );

    return NextResponse.json({ message: 'Goal updated successfully', goal: res.rows[0] }, { status: 200 });
  } catch (error: any) {
    console.error('Goal PATCH [id] error:', error?.message);
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
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const res = await query('DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Goal deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Goal DELETE [id] error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
