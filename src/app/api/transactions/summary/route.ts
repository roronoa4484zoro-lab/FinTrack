import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT t.amount, c.type FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1',
      [userId]
    );

    let totalIncome = 0;
    let totalExpense = 0;

    result.rows.forEach((row: any) => {
      try {
        const decryptedStr = decrypt(row.amount);
        const amount = parseFloat(decryptedStr);
        if (isNaN(amount)) return;

        if (row.type === 'income') {
          totalIncome += amount;
        } else {
          totalExpense += amount;
        }
      } catch (e: any) {
        console.error('Summary decryption warning:', e?.message);
      }
    });

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

    return NextResponse.json(
      {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        savingsRate,
        transactionCount: result.rows.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Summary error:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

