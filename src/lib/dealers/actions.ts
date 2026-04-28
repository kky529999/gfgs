'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { Dealer, DealerDeposit } from '@/types';
import { formatZodError } from '@/lib/validators';

// Validation schemas
const createDealerSchema = z.object({
  name: z.string().min(1, '请输入二级商名称').max(100, '名称不能超过100个字符'),
  contact: z.string().max(100, '联系人不能超过100个字符').optional().nullable(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional().nullable(),
  contract_no: z.string().max(100, '合同编号不能超过100个字符').optional().nullable(),
  deposit_amount: z.number({ error: '请输入押金金额' }).min(0, '押金金额不能为负数').optional(),
  fee_per_panel: z.number({ error: '请输入单板费用' }).min(0, '单板费用不能为负数').optional(),
  note: z.string().max(500, '备注不能超过500个字符').optional().nullable(),
});

const updateDealerSchema = z.object({
  name: z.string().min(1, '请输入二级商名称').max(100, '名称不能超过100个字符').optional(),
  contact: z.string().max(100, '联系人不能超过100个字符').optional().nullable(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional().nullable(),
  contract_no: z.string().max(100, '合同编号不能超过100个字符').optional().nullable(),
  contract_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期').optional().nullable(),
  contract_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期').optional().nullable(),
  deposit_amount: z.number({ error: '请输入押金金额' }).min(0, '押金金额不能为负数').optional(),
  deposit_paid: z.number({ error: '请输入已付押金' }).min(0, '已付押金不能为负数').optional(),
  deposit_status: z.enum(['unpaid', 'partial', 'paid', 'refunded'] as const).optional(),
  fee_per_panel: z.number({ error: '请输入单板费用' }).min(0, '单板费用不能为负数').optional(),
  status: z.enum(['active', 'terminated'] as const).optional(),
  note: z.string().max(500, '备注不能超过500个字符').optional().nullable(),
});

const addDealerDepositSchema = z.object({
  amount: z.number({ error: '请输入押金金额' }).positive('押金金额必须为正数'),
  type: z.enum(['pay', 'refund'] as const, { error: '请选择类型' }),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期'),
  note: z.string().max(500, '备注不能超过500个字符').optional().nullable(),
});

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

// Get all dealers
export async function getDealersAction(): Promise<{
  success: boolean;
  data?: Dealer[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching dealers:', error);
      return { success: false, error: '获取二级商列表失败' };
    }

    return { success: true, data: data as Dealer[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get single dealer by ID
export async function getDealerAction(
  dealerId: string
): Promise<{
  success: boolean;
  data?: Dealer;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .eq('id', dealerId)
      .single();

    if (error) {
      console.error('Error fetching dealer:', error);
      return { success: false, error: '获取二级商信息失败' };
    }

    return { success: true, data: data as Dealer };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Input type for creating/updating dealers
export interface CreateDealerInput {
  name: string;
  contact?: string;
  phone?: string;
  contract_no?: string;
  deposit_amount?: number;
  fee_per_panel?: number;
  note?: string;
}

export interface UpdateDealerInput {
  name?: string;
  contact?: string;
  phone?: string;
  contract_no?: string;
  contract_start?: string;
  contract_end?: string;
  deposit_amount?: number;
  deposit_paid?: number;
  deposit_status?: 'unpaid' | 'partial' | 'paid' | 'refunded';
  fee_per_panel?: number;
  status?: 'active' | 'terminated';
  note?: string;
}

// Create new dealer
export async function createDealerAction(
  input: CreateDealerInput
): Promise<{
  success: boolean;
  data?: Dealer;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = createDealerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    // Check if name already exists
    const { data: existing } = await supabase
      .from('dealers')
      .select('id')
      .eq('name', input.name)
      .single();

    if (existing) {
      return { success: false, error: '该二级商名称已存在' };
    }

    const { data, error } = await supabase
      .from('dealers')
      .insert({
        name: input.name,
        contact: input.contact || '',
        phone: input.phone || '',
        contract_no: input.contract_no || '',
        deposit_amount: input.deposit_amount || 0,
        deposit_paid: 0,
        deposit_status: 'unpaid',
        fee_per_panel: input.fee_per_panel || 0,
        status: 'active',
        note: input.note || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating dealer:', error);
      return { success: false, error: '创建二级商失败' };
    }

    revalidatePath('/dealers');

    return { success: true, data: data as Dealer };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Update dealer
export async function updateDealerAction(
  dealerId: string,
  input: UpdateDealerInput
): Promise<{
  success: boolean;
  data?: Dealer;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = updateDealerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    // Check if name already exists for another dealer
    if (input.name) {
      const { data: existing } = await supabase
        .from('dealers')
        .select('id')
        .eq('name', input.name)
        .neq('id', dealerId)
        .single();

      if (existing) {
        return { success: false, error: '该二级商名称已存在' };
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.contact !== undefined) updateData.contact = input.contact;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.contract_no !== undefined) updateData.contract_no = input.contract_no;
    if (input.contract_start !== undefined) updateData.contract_start = input.contract_start;
    if (input.contract_end !== undefined) updateData.contract_end = input.contract_end;
    if (input.deposit_amount !== undefined) updateData.deposit_amount = input.deposit_amount;
    if (input.deposit_paid !== undefined) updateData.deposit_paid = input.deposit_paid;
    if (input.deposit_status !== undefined) updateData.deposit_status = input.deposit_status;
    if (input.fee_per_panel !== undefined) updateData.fee_per_panel = input.fee_per_panel;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.note !== undefined) updateData.note = input.note;

    const { data, error } = await supabase
      .from('dealers')
      .update(updateData)
      .eq('id', dealerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating dealer:', error);
      return { success: false, error: '更新二级商失败' };
    }

    revalidatePath('/dealers');
    revalidatePath(`/dealers/${dealerId}`);

    return { success: true, data: data as Dealer };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get dealer deposit records
export async function getDealerDepositsAction(
  dealerId: string
): Promise<{
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
      .select('*')
      .eq('dealer_id', dealerId)
      .order('record_date', { ascending: false });

    if (error) {
      console.error('Error fetching dealer deposits:', error);
      return { success: false, error: '获取押金记录失败' };
    }

    return { success: true, data: data as DealerDeposit[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Add dealer deposit record
export async function addDealerDepositAction(
  dealerId: string,
  input: {
    amount: number;
    type: 'pay' | 'refund';
    record_date: string;
    note?: string;
  }
): Promise<{
  success: boolean;
  data?: DealerDeposit;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = addDealerDepositSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    // Get auth employee ID
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录' };
    }

    const { data, error } = await supabase
      .from('dealer_deposits')
      .insert({
        dealer_id: dealerId,
        amount: input.amount,
        type: input.type,
        record_date: input.record_date,
        note: input.note || '',
        created_by: auth.user_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding dealer deposit:', error);
      return { success: false, error: '添加押金记录失败' };
    }

    // Update dealer's deposit_paid and deposit_status
    const dealer = await getDealerAction(dealerId);
    if (dealer.success && dealer.data) {
      let newDepositPaid = dealer.data.deposit_paid;
      if (input.type === 'pay') {
        newDepositPaid += input.amount;
      } else {
        newDepositPaid -= input.amount;
      }
      newDepositPaid = Math.max(0, newDepositPaid);

      let newDepositStatus: 'unpaid' | 'partial' | 'paid' | 'refunded' = dealer.data.deposit_status;
      if (newDepositPaid <= 0) {
        newDepositStatus = 'unpaid';
      } else if (newDepositPaid >= (dealer.data.deposit_amount || 0)) {
        newDepositStatus = 'paid';
      } else {
        newDepositStatus = 'partial';
      }

      await supabase
        .from('dealers')
        .update({
          deposit_paid: newDepositPaid,
          deposit_status: newDepositStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealerId);
    }

    revalidatePath('/dealers');
    revalidatePath(`/dealers/${dealerId}`);

    return { success: true, data: data as DealerDeposit };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}