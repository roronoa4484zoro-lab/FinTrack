import { NextResponse } from 'next/server';
import { rateLimitMiddleware } from '@/lib/rate-limiter';

export async function middleware(request: Request) {
  // Apply rate limiting only to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const result = await rateLimitMiddleware(request);
    if (result) return result;
  }

  return NextResponse.next();
}
