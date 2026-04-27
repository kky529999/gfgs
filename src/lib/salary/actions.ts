'use server';

import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';

// Salary record type
export interface SalaryRecord {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    name: string;
    title: string;
  };
  year_month: string;
  base_salary: number;
  commission_amount: number;
  growth_fund_amount: number;
  other_amount: number;
  total: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalarySummary {
  employee_id: string;
  employee_name: string;
  base_salary: number;
  commission_amount: number;
  growth_fund_amount: number;
  other_amount: number;
  total: number;
}

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

// Get salary records for a month
export async function getSalaryRecordsAction(yearMonth?: string): Promise<{
  success: boolean;
  data?: SalaryRecord[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    let query = supabase
      .from('salary_records')
      .select('*, employee:employees(id, name, title)')
      .order('year_month', { ascending: false });

    if (yearMonth) {
      query = query.eq('year_month', yearMonth);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching salary records:', error);
      return { success: false, error: '获取薪资记录失败' };
    }

    return { success: true, data: data as SalaryRecord[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export interface CreateSalaryRecordInput {
  employee_id: string;
  year_month: string;
  base_salary: number;
  commission_amount?: number;
  growth_fund_amount?: number;
  other_amount?: number;
  note?: string;
}

export async function createSalaryRecordAction(
  input: CreateSalaryRecordInput
): Promise<{
  success: boolean;
  data?: SalaryRecord;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const total = input.base_salary + (input.commission_amount || 0) + (input.growth_fund_amount || 0) + (input.other_amount || 0);

    const { data, error } = await supabase
      .from('salary_records')
      .insert({
        employee_id: input.employee_id,
        year_month: input.year_month,
        base_salary: input.base_salary,
        commission_amount: input.commission_amount || 0,
        growth_fund_amount: input.growth_fund_amount || 0,
        other_amount: input.other_amount || 0,
        total,
        note: input.note || null,
      })
      .select('*, employee:employees(id, name, title)')
      .single();

    if (error) {
      console.error('Error creating salary record:', error);
      return { success: false, error: '创建薪资记录失败' };
    }

    return { success: true, data: data as SalaryRecord };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function updateSalaryRecordAction(
  recordId: string,
  input: Partial<CreateSalaryRecordInput>
): Promise<{
  success: boolean;
  data?: SalaryRecord;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Get current record to calculate total
    const { data: current } = await supabase
      .from('salary_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (!current) {
      return { success: false, error: '薪资记录不存在' };
    }

    const base_salary = input.base_salary ?? current.base_salary;
    const commission_amount = input.commission_amount ?? current.commission_amount;
    const growth_fund_amount = input.growth_fund_amount ?? current.growth_fund_amount;
    const other_amount = input.other_amount ?? current.other_amount;
    const total = base_salary + commission_amount + growth_fund_amount + other_amount;

    const { data, error } = await supabase
      .from('salary_records')
      .update({
        base_salary,
        commission_amount,
        growth_fund_amount,
        other_amount,
        total,
        year_month: input.year_month,
        note: input.note !== undefined ? input.note : current.note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)
      .select('*, employee:employees(id, name, title)')
      .single();

    if (error) {
      console.error('Error updating salary record:', error);
      return { success: false, error: '更新薪资记录失败' };
    }

    return { success: true, data: data as SalaryRecord };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function deleteSalaryRecordAction(
  recordId: string
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
      .from('salary_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('Error deleting salary record:', error);
      return { success: false, error: '删除薪资记录失败' };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get employees for dropdown
export async function getSalaryEmployeesAction(): Promise<{
  success: boolean;
  data?: { id: string; name: string; title: string }[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, title')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching employees:', error);
      return { success: false, error: '获取员工列表失败' };
    }

    return { success: true, data: data as { id: string; name: string; title: string }[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get commissions for auto-fill
export async function getCommissionsForSalaryAction(yearMonth: string): Promise<{
  success: boolean;
  data?: { employee_id: string; total: number }[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Get start and end of month
    const [year, month] = yearMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = month === '12'
      ? `${parseInt(year) + 1}-01-01`
      : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('commissions')
      .select('employee_id, amount')
      .eq('status', 'paid')
      .gte('paid_at', startDate)
      .lt('paid_at', endDate);

    if (error) {
      console.error('Error fetching commissions:', error);
      return { success: false, error: '获取提成数据失败' };
    }

    // Sum by employee
    const summary: Record<string, number> = {};
    for (const item of data || []) {
      summary[item.employee_id] = (summary[item.employee_id] || 0) + item.amount;
    }

    const result = Object.entries(summary).map(([employee_id, total]) => ({
      employee_id,
      total,
    }));

    return { success: true, data: result };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get growth fund for auto-fill
export async function getGrowthFundForSalaryAction(yearMonth: string): Promise<{
  success: boolean;
  data?: { employee_id: string; total: number }[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('growth_funds')
      .select('employee_id, amount')
      .eq('month', yearMonth);

    if (error) {
      console.error('Error fetching growth funds:', error);
      return { success: false, error: '获取成长基金数据失败' };
    }

    // Sum by employee
    const summary: Record<string, number> = {};
    for (const item of data || []) {
      summary[item.employee_id] = (summary[item.employee_id] || 0) + item.amount;
    }

    const result = Object.entries(summary).map(([employee_id, total]) => ({
      employee_id,
      total,
    }));

    return { success: true, data: result };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
