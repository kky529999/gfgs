'use server';

import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { createCommissionSchema } from '@/lib/validators';
import type { Commission, CommissionWithRelations, CreateCommissionInput, UpdateCommissionStatusInput, CommissionStatus, CommissionType } from '@/types/commission';

// 获取提成列表（带角色过滤）
export async function getCommissionsAction(filters?: {
  status?: CommissionStatus;
  commission_type?: CommissionType;
  employee_id?: string;
}): Promise<{
  success: boolean;
  data?: CommissionWithRelations[];
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  let query = supabase
    .from('commissions')
    .select(`
      *,
      customer:customers!customer_id(id, name, phone, brand, capacity, salesperson_id),
      employee:employees!employee_id(id, name, phone)
    `)
    .order('created_at', { ascending: false });

  // 角色过滤
  if (auth.role === 'business') {
    // 业务员只能看到自己的提成（通过客户关联）
    query = query.eq('employee_id', auth.user_id);
  } else if (auth.role === 'tech') {
    // 技术员看不到提成（提成是业务员的）
    query = query.eq('employee_id', auth.user_id);
  }
  // admin 和 gm 可以看到全部

  // 状态过滤
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  // 类型过滤
  if (filters?.commission_type) {
    query = query.eq('commission_type', filters.commission_type);
  }

  // 员工过滤
  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch commissions:', error);
    return { success: false, error: '获取提成列表失败' };
  }

  return { success: true, data: data || [] };
}

// 获取单个提成详情
export async function getCommissionAction(commissionId: string): Promise<{
  success: boolean;
  data?: CommissionWithRelations;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  const { data, error } = await supabase
    .from('commissions')
    .select(`
      *,
      customer:customers!customer_id(
        id, name, phone, brand, capacity, area, address,
        salesperson_id, tech_assigned_id, current_stage,
        grid_date, close_date
      ),
      employee:employees!employee_id(id, name, phone, title)
    `)
    .eq('id', commissionId)
    .single();

  if (error || !data) {
    return { success: false, error: '提成记录不存在' };
  }

  // 权限检查
  if (auth.role === 'business' && data.employee_id !== auth.user_id) {
    return { success: false, error: '无权查看此记录' };
  }

  return { success: true, data };
}

// 计算提成金额（根据客户信息和政策）
export async function calculateCommissionAction(input: {
  customer_id: string;
  commission_type: CommissionType;
}): Promise<{
  success: boolean;
  data?: { amount: number; breakdown: string };
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // 获取客户信息
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, name, capacity, brand, salesperson_id, current_stage, grid_date, close_date')
    .eq('id', input.customer_id)
    .single();

  if (customerError || !customer) {
    return { success: false, error: '客户不存在' };
  }

  // 权限检查：只有业务员自己和 admin/gm 可以计算
  if (auth.role === 'business' && customer.salesperson_id !== auth.user_id) {
    return { success: false, error: '无权为此客户计算提成' };
  }

  // 获取业务员信息
  const { data: employee } = await supabase
    .from('employees')
    .select('id, name')
    .eq('id', customer.salesperson_id)
    .single();

  if (!employee) {
    return { success: false, error: '未找到负责业务员' };
  }

  // 计算提成（这里使用简化的计算逻辑，实际需要根据政策表）
  let amount = 0;
  let breakdown = '';

  if (input.commission_type === 'entry') {
    // 进场提成：根据装机容量计算
    // 假设规则：10kW 以下 500 元，10-20kW 800 元，20kW 以上 1000 元
    const capacity = parseFloat(customer.capacity?.replace(/[^\d.]/g, '') || '0');
    if (capacity < 10) {
      amount = 500;
    } else if (capacity < 20) {
      amount = 800;
    } else {
      amount = 1000;
    }
    breakdown = `进场提成：基于装机容量 ${customer.capacity || '未知'}kW`;
  } else {
    // 闭环提成：根据品牌计算
    // 天合品牌闭环提成更高
    if (customer.brand?.includes('天合')) {
      amount = 800;
    } else {
      amount = 600;
    }
    breakdown = `闭环提成：基于品牌 ${customer.brand || '未知'}`;
  }

  return {
    success: true,
    data: {
      amount,
      breakdown: `${breakdown}\n客户：${customer.name}`,
    },
  };
}

// 创建提成记录
export async function createCommissionAction(input: CreateCommissionInput): Promise<{
  success: boolean;
  data?: Commission;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // Input validation
  const parsed = createCommissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
  }

  // 只有 admin 和 gm 可以手动创建提成
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { success: false, error: '无权创建提成记录' };
  }

  // 获取客户信息以确定员工
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('salesperson_id')
    .eq('id', input.customer_id)
    .single();

  if (customerError || !customer) {
    return { success: false, error: '客户不存在' };
  }

  const { data, error } = await supabase
    .from('commissions')
    .insert({
      customer_id: input.customer_id,
      employee_id: customer.salesperson_id,
      commission_type: input.commission_type,
      amount: input.amount,
      status: 'pending',
      note: input.note || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create commission:', error);
    return { success: false, error: '创建提成记录失败' };
  }

  return { success: true, data };
}

// 更新提成状态
export async function updateCommissionStatusAction(input: UpdateCommissionStatusInput): Promise<{
  success: boolean;
  data?: Commission;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // 获取当前提成记录
  const { data: existing, error: fetchError } = await supabase
    .from('commissions')
    .select('employee_id, status')
    .eq('id', input.commission_id)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: '提成记录不存在' };
  }

  // 权限检查
  const canUpdateStatus = (status: string) => {
    // pending -> applied: 业务员自己
    if (status === 'applied') {
      return auth.role === 'business' && existing.employee_id === auth.user_id;
    }
    // applied -> approved: admin/gm
    if (status === 'approved') {
      return auth.role === 'admin' || auth.role === 'gm';
    }
    // approved -> paid: admin/gm
    if (status === 'paid') {
      return auth.role === 'admin' || auth.role === 'gm';
    }
    return false;
  };

  if (!canUpdateStatus(input.status)) {
    return { success: false, error: '无权更新此状态' };
  }

  // 状态流转检查
  const statusFlow: Record<CommissionStatus, CommissionStatus[]> = {
    pending: ['applied'],
    applied: ['approved'],
    approved: ['paid'],
    paid: [],
  };

  if (!statusFlow[existing.status as CommissionStatus]?.includes(input.status)) {
    return { success: false, error: `无法从 ${existing.status} 变更为 ${input.status}` };
  }

  // 更新状态
  const updateData: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  // 设置对应的时间戳
  if (input.status === 'applied') {
    updateData.applied_at = new Date().toISOString();
  } else if (input.status === 'approved') {
    updateData.approved_at = new Date().toISOString();
  } else if (input.status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }

  if (input.note) {
    updateData.note = input.note;
  }

  const { data, error } = await supabase
    .from('commissions')
    .update(updateData)
    .eq('id', input.commission_id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update commission status:', error);
    return { success: false, error: '更新状态失败' };
  }

  return { success: true, data };
}

// 提交到钉钉
export async function submitToDingtalkAction(commissionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // 获取提成记录
  const { data: commission, error: fetchError } = await supabase
    .from('commissions')
    .select('employee_id, dingtalk_submitted_at')
    .eq('id', commissionId)
    .single();

  if (fetchError || !commission) {
    return { success: false, error: '提成记录不存在' };
  }

  // 权限检查：只能自己的记录
  if (auth.role === 'business' && commission.employee_id !== auth.user_id) {
    return { success: false, error: '无权操作此记录' };
  }

  // 检查是否已提交
  if (commission.dingtalk_submitted_at) {
    return { success: false, error: '已提交过钉钉' };
  }

  // 检查状态是否允许提交（需要 approved 状态）
  const { data: current } = await supabase
    .from('commissions')
    .select('status')
    .eq('id', commissionId)
    .single();

  if (current?.status !== 'approved') {
    return { success: false, error: '需要已审批状态才能提交钉钉' };
  }

  // 更新提交时间（实际需要调用钉钉 API，这里模拟）
  const { error: updateError } = await supabase
    .from('commissions')
    .update({
      dingtalk_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', commissionId);

  if (updateError) {
    return { success: false, error: '提交失败' };
  }

  return { success: true };
}

// 获取提成统计
export async function getCommissionStatsAction(): Promise<{
  success: boolean;
  data?: {
    pending: number;
    applied: number;
    approved: number;
    paid: number;
    total: number;
    totalAmount: number;
  };
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  let query = supabase.from('commissions').select('status, amount');

  // 角色过滤
  if (auth.role === 'business' || auth.role === 'tech') {
    query = query.eq('employee_id', auth.user_id);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: '获取统计失败' };
  }

  const stats = {
    pending: 0,
    applied: 0,
    approved: 0,
    paid: 0,
    total: data?.length || 0,
    totalAmount: 0,
  };

  data?.forEach((c) => {
    stats[c.status as keyof typeof stats]++;
    stats.totalAmount += c.amount;
  });

  return { success: true, data: stats };
}
