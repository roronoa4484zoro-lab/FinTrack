import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';

// Simple in-memory rate limiter (In production, use Redis)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 100; // max requests
const WINDOW = 60 * 1000; // 1 minute

export async function middleware(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  const userId = await getAuthUser(token);
  if (!userId) return null;

  const now = Date.now();
  const userRate = rateLimitMap.get(userId) || { count: 0, lastReset: now };

  if (now - userRate.lastReset > WINDOW) {
    userRate.count = 0;
    userRate.lastReset = now;
  }

  userRate.count++;
  rateLimitMap.set(userId, userRate);

  if (userRate.count > LIMIT) {
    return new NextResponse('Too many requests. Please try again later.', { status: 429 });
  }

  return null;
}
