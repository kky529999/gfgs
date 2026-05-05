'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';

export type CustomerForCommission = {
  id: string;
  name: string;
  phone: string | null;
  brand: string | null;
  capacity: string | null;
  panel_count: number | null;
  current_stage: string;
  salesperson_id: string | null;
};

// Get customers eligible for commission (not closed or commission not completed)
export async function getActiveCustomersForCommission(): Promise<{
  success: boolean;
  data?: CustomerForCommission[];
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    // Get customers that are NOT closed with completed commission
    // Filter: close_date IS NULL OR commission_status != 'completed'
    let query = supabaseAdmin
      .from('customers')
      .select('id, name, phone, brand, capacity, panel_count, current_stage, salesperson_id')
      .or(`and(close_date.is.null,commission_status.neq.completed),and(close_date.is.not.null,commission_status.neq.completed)`)
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (auth.role === 'business') {
      query = query.eq('salesperson_id', auth.user_id);
    } else if (auth.role === 'tech') {
      // Tech can see customers assigned to them
      query = query.eq('tech_assigned_id', auth.user_id);
    }
    // admin and gm can see all

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active customers for commission:', error);
      return { success: false, error: '获取客户列表失败' };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
