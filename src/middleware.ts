import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/change-password'];

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('gfgs_auth');

  if (!authCookie && !PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
