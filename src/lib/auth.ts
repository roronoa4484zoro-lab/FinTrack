import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be configured in production');
    }
    return 'dev-jwt-super-secret-key-32-chars-minimum!';
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  const secret = getJwtSecret();
  return jwt.sign({ userId }, secret, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Universal server-side auth getter.
 * Supports:
 * - Calling getAuthUser() with no arguments (retrieves auth_token from Next.js cookies())
 * - Calling getAuthUser(tokenString)
 * - Calling getAuthUser(request) (reads Bearer header or cookie from NextRequest/Request)
 */
export async function getAuthUser(source?: string | Request | NextRequest | null): Promise<string | null> {
  try {
    let token: string | undefined | null = null;

    if (typeof source === 'string') {
      token = source;
    } else if (source && typeof (source as Request).headers?.get === 'function') {
      const authHeader = (source as Request).headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        const cookieHeader = (source as Request).headers.get('cookie');
        if (cookieHeader) {
          const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
          if (match) {
            token = decodeURIComponent(match[1]);
          }
        }
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get('auth_token')?.value || null;
      } catch {
        // cookies() may throw outside Next.js request context
      }
    }

    if (!token) {
      return null;
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { userId: string };

    if (!decoded || !decoded.userId || typeof decoded.userId !== 'string') {
      return null;
    }

    return decoded.userId;
  } catch {
    // Malformed, expired or signature mismatch
    return null;
  }
}