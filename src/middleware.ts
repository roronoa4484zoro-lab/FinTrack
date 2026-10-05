import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitMiddleware } from '@/lib/rate-limiter';

export async function middleware(request: NextRequest) {
  // Apply rate limiting only to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const result = await rateLimitMiddleware(request);

    if (result) {
      return result;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
