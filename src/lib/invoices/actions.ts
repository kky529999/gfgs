'use server';

import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { Invoice } from '@/types';

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

// Get all invoices
export async function getInvoicesAction(filters?: {
  customer_id?: string;
  brand?: string;
}): Promise<{
  success: boolean;
  data?: Invoice[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    let query = supabase
      .from('invoices')
      .select('*, customer:customers(name, brand)')
      .order('invoice_date', { ascending: false });

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters?.brand) {
      query = query.eq('brand', filters.brand);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return { success: false, error: '获取发票列表失败' };
    }

    return { success: true, data: data as Invoice[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export interface CreateInvoiceInput {
  customer_id: string;
  brand: string;
  invoice_no?: string;
  amount: number;
  invoice_date?: string;
  note?: string;
}

export async function createInvoiceAction(
  input: CreateInvoiceInput
): Promise<{
  success: boolean;
  data?: Invoice;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录' };
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        customer_id: input.customer_id,
        brand: input.brand,
        invoice_no: input.invoice_no || null,
        amount: input.amount,
        invoice_date: input.invoice_date || null,
        note: input.note || null,
        created_by: auth.user_id,
      })
      .select('*, customer:customers(name, brand)')
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      return { success: false, error: '创建发票失败' };
    }

    return { success: true, data: data as Invoice };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function updateInvoiceAction(
  invoiceId: string,
  input: Partial<CreateInvoiceInput>
): Promise<{
  success: boolean;
  data?: Invoice;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.invoice_no !== undefined) updateData.invoice_no = input.invoice_no;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.invoice_date !== undefined) updateData.invoice_date = input.invoice_date;
    if (input.note !== undefined) updateData.note = input.note;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select('*, customer:customers(name, brand)')
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      return { success: false, error: '更新发票失败' };
    }

    return { success: true, data: data as Invoice };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function deleteInvoiceAction(
  invoiceId: string
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
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      console.error('Error deleting invoice:', error);
      return { success: false, error: '删除发票失败' };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get customers for dropdown (only those that have closed/shipped)
export async function getInvoiceCustomersAction(): Promise<{
  success: boolean;
  data?: { id: string; name: string; brand: string | null }[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, brand')
      .in('current_stage', ['ship', 'grid', 'close'])
      .order('name');

    if (error) {
      console.error('Error fetching customers:', error);
      return { success: false, error: '获取客户列表失败' };
    }

    return { success: true, data: data as { id: string; name: string; brand: string | null }[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get brands for filter dropdown
export async function getInvoiceBrandsAction(): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('brand')
      .order('brand');

    if (error) {
      console.error('Error fetching brands:', error);
      return { success: false, error: '获取品牌列表失败' };
    }

    const brands = [...new Set((data || []).map((d) => d.brand).filter(Boolean))] as string[];
    return { success: true, data: brands };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
