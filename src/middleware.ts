import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/change-password'];
const AUTH_COOKIE_NAME = 'gfgs_auth';
const JWT_SECRET = process.env.JWT_SECRET || '';

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public paths without authentication
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (!authCookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the JWT token
  try {
    const { payload } = await jwtVerify(authCookie.value, getJwtSecret());
    // Token is valid, proceed
    if (!payload || !payload.user_id) {
      throw new Error('Invalid token payload');
    }
  } catch {
    // Token is invalid or expired, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear invalid cookie
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
