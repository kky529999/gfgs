'use server';

import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { BrandDeposit, DealerDeposit, DepositType, BrandDepositStatus } from '@/types';

// Helper to check admin/gm permission
async function checkAdminPermission(): Promise<{ allowed: boolean; error?: string }> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { allowed: false, error: '未登录' };
  }
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { allowed: false, error: '无权访问' };
  }
  await refreshSessionAction();
  return { allowed: true };
}

// =====================
// Brand Deposits (我方交品牌方)
// =====================

export async function getBrandDepositsAction(): Promise<{
  success: boolean;
  data?: BrandDeposit[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('brand_deposits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching brand deposits:', error);
      return { success: false, error: '获取品牌押金失败' };
    }

    return { success: true, data: data as BrandDeposit[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export interface CreateBrandDepositInput {
  brand: string;
  amount: number;
  pay_date?: string;
  note?: string;
}

export async function createBrandDepositAction(
  input: CreateBrandDepositInput
): Promise<{
  success: boolean;
  data?: BrandDeposit;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('brand_deposits')
      .insert({
        brand: input.brand,
        amount: input.amount,
        pay_date: input.pay_date || null,
        status: 'paid',
        refunded: 0,
        note: input.note || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating brand deposit:', error);
      return { success: false, error: '创建品牌押金失败' };
    }

    return { success: true, data: data as BrandDeposit };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function refundBrandDepositAction(
  depositId: string,
  refundAmount: number
): Promise<{
  success: boolean;
  data?: BrandDeposit;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Get current deposit
    const { data: current, error: fetchError } = await supabase
      .from('brand_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: '押金记录不存在' };
    }

    const newRefunded = (current.refunded || 0) + refundAmount;
    let newStatus: BrandDepositStatus;
    if (newRefunded >= current.amount) {
      newStatus = 'refunded';
    } else if (newRefunded > 0) {
      newStatus = 'partial_refund';
    } else {
      newStatus = 'paid';
    }

    const { data, error } = await supabase
      .from('brand_deposits')
      .update({
        refunded: newRefunded,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', depositId)
      .select()
      .single();

    if (error) {
      console.error('Error refunding brand deposit:', error);
      return { success: false, error: '退还押金失败' };
    }

    return { success: true, data: data as BrandDeposit };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function deleteBrandDepositAction(
  depositId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { error } = await supabase
      .from('brand_deposits')
      .delete()
      .eq('id', depositId);

    if (error) {
      console.error('Error deleting brand deposit:', error);
      return { success: false, error: '删除品牌押金失败' };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// =====================
// Dealer Deposits (二级商交我方)
// =====================

export async function getDealerDepositsAction(): Promise<{
  success: boolean;
  data?: DealerDeposit[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('dealer_deposits')
      .select('*, dealer:dealers(*), creator:employees(*)')
      .order('record_date', { ascending: false });

    if (error) {
      console.error('Error fetching dealer deposits:', error);
      return { success: false, error: '获取二级商押金失败' };
    }

    return { success: true, data: data as DealerDeposit[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export interface CreateDealerDepositInput {
  dealer_id: string;
  amount: number;
  type: DepositType;
  record_date?: string;
  note?: string;
}

export async function createDealerDepositAction(
  input: CreateDealerDepositInput
): Promise<{
  success: boolean;
  data?: DealerDeposit;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Get auth employee ID
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录' };
    }

    // Create deposit record
    const { data, error } = await supabase
      .from('dealer_deposits')
      .insert({
        dealer_id: input.dealer_id,
        amount: input.amount,
        type: input.type,
        record_date: input.record_date || new Date().toISOString().split('T')[0],
        note: input.note || null,
        created_by: auth.employeeId,
      })
      .select('*, dealer:dealers(*), creator:employees(*)')
      .single();

    if (error) {
      console.error('Error creating dealer deposit:', error);
      return { success: false, error: '创建二级商押金记录失败' };
    }

    // Update dealer's deposit amount
    const { data: dealer } = await supabase
      .from('dealers')
      .select('deposit_paid, deposit_amount')
      .eq('id', input.dealer_id)
      .single();

    if (dealer) {
      let newPaid = dealer.deposit_paid || 0;
      if (input.type === 'pay') {
        newPaid += input.amount;
      } else if (input.type === 'refund') {
        newPaid -= input.amount;
      }

      let depositStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
      if (!dealer.deposit_amount || newPaid <= 0) {
        depositStatus = 'unpaid';
      } else if (newPaid >= dealer.deposit_amount) {
        depositStatus = 'paid';
      } else if (newPaid > 0) {
        depositStatus = 'partial';
      } else {
        depositStatus = 'refunded';
      }

      await supabase
        .from('dealers')
        .update({ deposit_paid: newPaid, deposit_status: depositStatus })
        .eq('id', input.dealer_id);
    }

    return { success: true, data: data as DealerDeposit };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function deleteDealerDepositAction(
  depositId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { error } = await supabase
      .from('dealer_deposits')
      .delete()
      .eq('id', depositId);

    if (error) {
      console.error('Error deleting dealer deposit:', error);
      return { success: false, error: '删除二级商押金记录失败' };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get active dealers for dropdown
export async function getActiveDealersAction(): Promise<{
  success: boolean;
  data?: { id: string; name: string }[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('id, name')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching active dealers:', error);
      return { success: false, error: '获取二级商列表失败' };
    }

    return { success: true, data: data as { id: string; name: string }[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
