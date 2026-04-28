'use server';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;

interface LoginAttempt {
  phone: string;
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  blockedUntil?: number;
  retryAfterSeconds?: number;
}

export async function checkLoginRateLimit(phone: string): Promise<RateLimitResult> {
  const now = Date.now();
  const attempt = loginAttempts.get(phone);

  if (!attempt) {
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  // Check if currently blocked
  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    const retryAfterMs = attempt.blockedUntil - now;
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: attempt.blockedUntil,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  // Reset if window has passed
  if (now - attempt.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(phone);
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  // Check if exceeded
  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    const blockedUntil = now + RATE_LIMIT_WINDOW_MS;
    attempt.blockedUntil = blockedUntil;
    loginAttempts.set(phone, attempt);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.attempts,
  };
}

export async function recordFailedLoginAttempt(phone: string): Promise<RateLimitResult> {
  const now = Date.now();
  const attempt = loginAttempts.get(phone);

  if (!attempt) {
    loginAttempts.set(phone, {
      phone,
      attempts: 1,
      firstAttemptAt: now,
    });
    return {
      allowed: true,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - 1,
    };
  }

  // Reset if window has passed
  if (now - attempt.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(phone, {
      phone,
      attempts: 1,
      firstAttemptAt: now,
    });
    return {
      allowed: true,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - 1,
    };
  }

  attempt.attempts += 1;

  // Check if now blocked
  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.blockedUntil = now + RATE_LIMIT_WINDOW_MS;
    loginAttempts.set(phone, attempt);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: attempt.blockedUntil,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }

  loginAttempts.set(phone, attempt);
  return {
    allowed: true,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.attempts,
  };
}

export async function clearLoginAttempts(phone: string): Promise<void> {
  loginAttempts.delete(phone);
}

// In-memory rate limiting for development
// For production, use Redis or Supabase
