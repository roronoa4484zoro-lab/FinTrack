import { NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  lastReset: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Automatic periodic cleanup to avoid memory leaks in long-running instances
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.lastReset > 5 * 60 * 1000) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000);

export function rateLimitMiddleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  const ip =
    forwardedFor?.split(',')[0]?.trim() ||
    realIp ||
    '127.0.0.1';

  let limit = 120;
  let windowMs = 60 * 1000;

  // Stricter limits for brute-force vulnerable endpoints
  if (pathname.includes('/api/auth/login') || pathname.includes('/api/auth/register')) {
    limit = 20; // 20 attempts per minute
    windowMs = 60 * 1000;
  } else if (pathname.includes('/api/ai/')) {
    limit = 15; // 15 AI prompts per minute
    windowMs = 60 * 1000;
  }

  const key = `${ip}:${pathname.split('/')[2] || 'general'}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now - record.lastReset >= windowMs) {
    rateLimitMap.set(key, {
      count: 1,
      lastReset: now,
    });
    return null;
  }

  record.count++;

  if (record.count > limit) {
    const retrySecs = Math.ceil((windowMs - (now - record.lastReset)) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retrySecs > 0 ? retrySecs : 60),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}

