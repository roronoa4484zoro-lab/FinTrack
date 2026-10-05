import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'dev-secret-key';

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

    const { question } = await request.json();
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // 1. Fetch data for context
    const result = await query(
      'SELECT t.amount, t.description, c.name as category_name, t.date FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 ORDER BY t.date DESC LIMIT 50',
      [userId]
    );

    // 2. PRIVACY SHIELD: Anonymize data before sending to AI
    // We only send decrypted amounts and categories, NO personal IDs, names, or emails.
    const financialContext = result.rows.map((row: any) => {
      try {
        const amount = decrypt(row.amount, ENCRYPTION_KEY);
        return `${row.date} | ${row.category_name}: $${amount} (${row.description || 'No desc'})`;
      } catch (e) {
        return 'Invalid record';
      }
    }).join('\n');

    const systemPrompt = `You are a professional, secure Financial AI Assistant.
    You only have access to the following anonymized transaction history:

    ${financialContext}

    Rules:
    1. Be concise and professional.
    2. Base your answers ONLY on the provided data.
    3. If you don't know, say you don't have enough data.
    4. Never ask for or store the user's personal identity.`;

    // 3. Call AI API (Generic wrapper for OpenAI/Claude)
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await aiResponse.json();
    const answer = aiData.choices[0].message.content;

    return NextResponse.json({ answer }, { status: 200 });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ error: 'AI Service currently unavailable' }, { status: 500 });
  }
}
