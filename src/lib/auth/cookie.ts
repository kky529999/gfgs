import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import type { TokenPayload } from './jwt';

const COOKIE_NAME = 'gfgs_auth';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function getAuthCookie(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifyToken(cookie.value);
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  return getAuthCookie();
}
