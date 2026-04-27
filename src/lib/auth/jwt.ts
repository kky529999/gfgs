import jwt from 'jsonwebtoken';
import type { UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  user_id: string;
  role: UserRole;
  phone: string;
}

export interface TokenResult {
  token: string;
  expiresIn: number;
}

function getExpirySeconds(): number {
  switch (JWT_EXPIRES_IN) {
    case '7d':
      return 7 * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
}

export function signToken(payload: TokenPayload): TokenResult {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, expiresIn: getExpirySeconds() };
}

export function verifyToken(token: string): TokenPayload | null {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not set');
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
