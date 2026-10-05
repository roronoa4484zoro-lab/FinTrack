import { NextResponse } from 'next/server';

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const LIMIT = 100;
const WINDOW = 60 * 1000;

export function rateLimitMiddleware(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  const identifier =
    forwardedFor?.split(',')[0]?.trim() ||
    realIp ||
    'unknown';

  const now = Date.now();
  const userRate = rateLimitMap.get(identifier);

  if (!userRate || now - userRate.lastReset >= WINDOW) {
    rateLimitMap.set(identifier, {
      count: 1,
      lastReset: now,
    });

    return null;
  }

  userRate.count++;

  if (userRate.count > LIMIT) {
    return new NextResponse(
      'Too many requests. Please try again later.',
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }

  return null;
}
