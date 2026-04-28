'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_BLOCKED = 'login_blocked',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  SESSION_EXPIRED = 'session_expired',
}

export enum SecurityEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

interface SecurityEvent {
  event_type: SecurityEventType;
  severity: SecurityEventSeverity;
  user_id?: string;
  user_phone?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  created_at?: string;
}

export async function logSecurityEvent(
  event: Omit<SecurityEvent, 'created_at'>
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('security_events')
      .insert({
        event_type: event.event_type,
        severity: event.severity,
        user_id: event.user_id || null,
        user_phone: event.user_phone || null,
        ip_address: event.ip_address || null,
        user_agent: event.user_agent || null,
        details: event.details ? JSON.stringify(event.details) : null,
      });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (err) {
    // Don't let logging failures affect the main flow
    console.error('Security event logging error:', err);
  }
}

export async function getSecurityEventsAction(filters?: {
  event_type?: SecurityEventType;
  severity?: SecurityEventSeverity;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: SecurityEvent[];
  error?: string;
}> {
  try {
    const auth = await getAuthCookie();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'gm')) {
      return { success: false, error: '无权访问安全日志' };
    }

    let query = supabaseAdmin
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch security events:', error);
      return { success: false, error: '获取安全日志失败' };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
