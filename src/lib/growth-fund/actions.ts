'use server';

import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import type {
  FundTransaction,
  FundTransactionWithRelations,
  CreateFundTransactionInput,
  FundStats,
  FundBalance,
} from '@/types/growth-fund';

// 获取成长基金统计（全员可见汇总）
export async function getFundStatsAction(): Promise<{
  success: boolean;
  data?: FundStats;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // 获取所有交易汇总
  const { data: transactions, error } = await supabase
    .from('fund_transactions')
    .select('transaction_type, amount');

  if (error) {
    return { success: false, error: '获取统计失败' };
  }

  const stats: FundStats = {
    total_balance: 0,
    total_deposits: 0,
    total_withdrawals: 0,
    employee_count: 0,
  };

  transactions?.forEach((t) => {
    if (t.transaction_type === 'deposit') {
      stats.total_deposits += t.amount;
      stats.total_balance += t.amount;
    } else if (t.transaction_type === 'withdrawal') {
      stats.total_withdrawals += t.amount;
      stats.total_balance -= t.amount;
    }
  });

  // 获取有余额的员工数
  const { data: balances } = await supabase
    .from('fund_balances')
    .select('employee_id')
    .gt('balance', 0);

  stats.employee_count = balances?.length || 0;

  return { success: true, data: stats };
}

// 获取个人成长基金余额
export async function getMyFundBalanceAction(): Promise<{
  success: boolean;
  data?: FundBalance;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  const { data, error } = await supabase
    .from('fund_balances')
    .select('*')
    .eq('employee_id', auth.user_id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    return { success: false, error: '获取余额失败' };
  }

  return {
    success: true,
    data: data || { employee_id: auth.user_id, balance: 0, last_transaction_at: null },
  };
}

// 获取个人成长基金明细
export async function getMyFundTransactionsAction(): Promise<{
  success: boolean;
  data?: FundTransaction[];
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  const { data, error } = await supabase
    .from('fund_transactions')
    .select('*')
    .eq('employee_id', auth.user_id)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: '获取明细失败' };
  }

  return { success: true, data: data || [] };
}

// 获取所有员工基金余额（admin/gm 可见）
export async function getAllFundBalancesAction(): Promise<{
  success: boolean;
  data?: (FundBalance & { employee: { name: string; phone: string } })[];
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // 只有 admin 和 gm 可以查看所有员工余额
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { success: false, error: '无权查看' };
  }

  const { data, error } = await supabase
    .from('fund_balances')
    .select(`
      employee_id,
      balance,
      last_transaction_at,
      employee:employees!employee_id(name, phone)
    `)
    .order('balance', { ascending: false });

  if (error) {
    return { success: false, error: '获取余额失败' };
  }

  // Transform: extract first element from employee array
  const transformedData = (data || []).map((row) => ({
    ...row,
    employee: row.employee?.[0] || { name: '未知', phone: '无' },
  }));

  return { success: true, data: transformedData };
}

// 获取所有交易明细（admin/gm 可见）
export async function getAllFundTransactionsAction(filters?: {
  employee_id?: string;
}): Promise<{
  success: boolean;
  data?: FundTransactionWithRelations[];
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // 只有 admin 和 gm 可以查看所有明细
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { success: false, error: '无权查看' };
  }

  let query = supabase
    .from('fund_transactions')
    .select(`
      *,
      employee:employees!employee_id(id, name, phone),
      operator:employees!operator_id(id, name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: '获取明细失败' };
  }

  // Transform: extract first element from relation arrays
  const transformedData = (data || []).map((row) => ({
    ...row,
    employee: row.employee?.[0] || { id: '', name: '未知', phone: '' },
    operator: row.operator?.[0] || { id: '', name: '系统' },
  }));

  return { success: true, data: transformedData };
}

// 创建基金交易（admin/gm）
export async function createFundTransactionAction(input: CreateFundTransactionInput): Promise<{
  success: boolean;
  data?: FundTransaction;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // 只有 admin 和 gm 可以操作
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { success: false, error: '无权操作' };
  }

  // 获取当前余额
  const { data: currentBalance } = await supabase
    .from('fund_balances')
    .select('balance')
    .eq('employee_id', input.employee_id)
    .single();

  const current = currentBalance?.balance || 0;
  let balanceAfter: number;

  if (input.transaction_type === 'deposit') {
    balanceAfter = current + input.amount;
  } else if (input.transaction_type === 'withdrawal') {
    if (current < input.amount) {
      return { success: false, error: '余额不足' };
    }
    balanceAfter = current - input.amount;
  } else {
    // adjustment - 直接设置余额
    balanceAfter = input.amount;
  }

  // 创建交易记录
  const { data: transaction, error: txError } = await supabase
    .from('fund_transactions')
    .insert({
      employee_id: input.employee_id,
      amount: input.transaction_type === 'withdrawal' ? -input.amount : input.amount,
      transaction_type: input.transaction_type,
      balance_after: balanceAfter,
      note: input.note || null,
      operator_id: auth.user_id,
    })
    .select()
    .single();

  if (txError) {
    console.error('Failed to create transaction:', txError);
    return { success: false, error: '创建交易失败' };
  }

  // 更新余额
  const { error: balanceError } = await supabase
    .from('fund_balances')
    .upsert({
      employee_id: input.employee_id,
      balance: balanceAfter,
      last_transaction_at: new Date().toISOString(),
    });

  if (balanceError) {
    console.error('Failed to update balance:', balanceError);
    // 交易已创建，但余额更新失败 - 需要手动修复
  }

  return { success: true, data: transaction };
}

// 获取所有员工列表（用于下拉选择）
export async function getEmployeesForFundAction(): Promise<{
  success: boolean;
  data?: { id: string; name: string; phone: string }[];
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  const { data, error } = await supabase
    .from('employees')
    .select('id, name, phone')
    .eq('is_active', true)
    .order('name');

  if (error) {
    return { success: false, error: '获取员工列表失败' };
  }

  return { success: true, data: data || [] };
}