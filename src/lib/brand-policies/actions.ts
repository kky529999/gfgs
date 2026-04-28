'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { BrandPolicy } from '@/types';
import { formatZodError } from '@/lib/validators';

// Validation schemas
const createBrandPolicySchema = z.object({
  brand: z.string().min(1, '请输入品牌').max(100, '品牌不能超过100个字符'),
  city: z.string().max(100, '城市不能超过100个字符').optional().nullable(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的开始日期'),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的结束日期').optional().nullable(),
  installation_fee: z.number({ error: '请输入安装费' }).min(0, '安装费不能为负数').optional(),
  comprehensive_subsidy: z.number({ error: '请输入综合补贴' }).min(0, '综合补贴不能为负数').optional(),
  channel_fee: z.number({ error: '请输入渠道费' }).min(0, '渠道费不能为负数').optional(),
  install_days: z.number({ error: '请输入安装天数' }).int('安装天数必须为整数').min(0, '安装天数不能为负数').optional(),
  grid_penalty: z.string().max(500, '并网处罚不能超过500个字符').optional().nullable(),
  monthly_target: z.number({ error: '请输入月度目标' }).min(0, '月度目标不能为负数').optional().nullable(),
  inspection_reward: z.number({ error: '请输入验仓奖励' }).min(0, '验仓奖励不能为负数').optional(),
  quality_bond: z.number({ error: '请输入质量保证金' }).min(0, '质量保证金不能为负数').optional().nullable(),
  note: z.string().max(500, '备注不能超过500个字符').optional().nullable(),
});

const updateBrandPolicySchema = z.object({
  brand: z.string().min(1, '请输入品牌').max(100, '品牌不能超过100个字符').optional(),
  city: z.string().max(100, '城市不能超过100个字符').optional().nullable(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的开始日期').optional(),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的结束日期').optional().nullable(),
  installation_fee: z.number({ error: '请输入安装费' }).min(0, '安装费不能为负数').optional(),
  comprehensive_subsidy: z.number({ error: '请输入综合补贴' }).min(0, '综合补贴不能为负数').optional(),
  channel_fee: z.number({ error: '请输入渠道费' }).min(0, '渠道费不能为负数').optional(),
  install_days: z.number({ error: '请输入安装天数' }).int('安装天数必须为整数').min(0, '安装天数不能为负数').optional(),
  grid_penalty: z.string().max(500, '并网处罚不能超过500个字符').optional().nullable(),
  monthly_target: z.number({ error: '请输入月度目标' }).min(0, '月度目标不能为负数').optional().nullable(),
  inspection_reward: z.number({ error: '请输入验仓奖励' }).min(0, '验仓奖励不能为负数').optional(),
  quality_bond: z.number({ error: '请输入质量保证金' }).min(0, '质量保证金不能为负数').optional().nullable(),
  note: z.string().max(500, '备注不能超过500个字符').optional().nullable(),
  is_active: z.boolean({ error: '请选择是否生效' }).optional(),
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

// Get all brand policies
export async function getBrandPoliciesAction(): Promise<{
  success: boolean;
  data?: BrandPolicy[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('brand_policies')
      .select('*, creator:employees(*)')
      .order('brand')
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching brand policies:', error);
      return { success: false, error: '获取品牌政策列表失败' };
    }

    return { success: true, data: data as BrandPolicy[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get single brand policy by ID
export async function getBrandPolicyAction(
  policyId: string
): Promise<{
  success: boolean;
  data?: BrandPolicy;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('brand_policies')
      .select('*, creator:employees(*)')
      .eq('id', policyId)
      .single();

    if (error) {
      console.error('Error fetching brand policy:', error);
      return { success: false, error: '获取品牌政策信息失败' };
    }

    return { success: true, data: data as BrandPolicy };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Input type for creating/updating brand policies
export interface CreateBrandPolicyInput {
  brand: string;
  city?: string;
  effective_from: string;
  effective_to?: string;
  installation_fee?: number;
  comprehensive_subsidy?: number;
  channel_fee?: number;
  install_days?: number;
  grid_penalty?: string;
  monthly_target?: number;
  inspection_reward?: number;
  quality_bond?: number;
  note?: string;
}

export interface UpdateBrandPolicyInput {
  brand?: string;
  city?: string | null;
  effective_from?: string;
  effective_to?: string | null;
  installation_fee?: number;
  comprehensive_subsidy?: number;
  channel_fee?: number;
  install_days?: number;
  grid_penalty?: string | null;
  monthly_target?: number | null;
  inspection_reward?: number;
  quality_bond?: number | null;
  note?: string | null;
  is_active?: boolean;
}

// Create new brand policy
export async function createBrandPolicyAction(
  input: CreateBrandPolicyInput
): Promise<{
  success: boolean;
  data?: BrandPolicy;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = createBrandPolicySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    // Get auth employee ID
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录' };
    }

    // Check if brand already has an active policy
    if (!input.effective_to) {
      const { data: existingActive } = await supabase
        .from('brand_policies')
        .select('id')
        .eq('brand', input.brand)
        .eq('is_active', true)
        .single();

      if (existingActive) {
        return { success: false, error: '该品牌已有生效中的政策，请先停用旧政策' };
      }
    }

    // Calculate next version
    const { data: latestVersion } = await supabase
      .from('brand_policies')
      .select('version')
      .eq('brand', input.brand)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    const { data, error } = await supabase
      .from('brand_policies')
      .insert({
        brand: input.brand,
        city: input.city || null,
        effective_from: input.effective_from,
        effective_to: input.effective_to || null,
        installation_fee: input.installation_fee || 0,
        comprehensive_subsidy: input.comprehensive_subsidy || 0,
        channel_fee: input.channel_fee || 0,
        install_days: input.install_days || 30,
        grid_penalty: input.grid_penalty || null,
        monthly_target: input.monthly_target || null,
        inspection_reward: input.inspection_reward || 0,
        quality_bond: input.quality_bond || null,
        note: input.note || null,
        is_active: !input.effective_to,
        version: nextVersion,
        created_by: auth.user_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating brand policy:', error);
      return { success: false, error: '创建品牌政策失败' };
    }

    revalidatePath('/brand-policies');

    return { success: true, data: data as BrandPolicy };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Update brand policy
export async function updateBrandPolicyAction(
  policyId: string,
  input: UpdateBrandPolicyInput
): Promise<{
  success: boolean;
  data?: BrandPolicy;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = updateBrandPolicySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.effective_from !== undefined) updateData.effective_from = input.effective_from;
    if (input.effective_to !== undefined) updateData.effective_to = input.effective_to;
    if (input.installation_fee !== undefined) updateData.installation_fee = input.installation_fee;
    if (input.comprehensive_subsidy !== undefined) updateData.comprehensive_subsidy = input.comprehensive_subsidy;
    if (input.channel_fee !== undefined) updateData.channel_fee = input.channel_fee;
    if (input.install_days !== undefined) updateData.install_days = input.install_days;
    if (input.grid_penalty !== undefined) updateData.grid_penalty = input.grid_penalty;
    if (input.monthly_target !== undefined) updateData.monthly_target = input.monthly_target;
    if (input.inspection_reward !== undefined) updateData.inspection_reward = input.inspection_reward;
    if (input.quality_bond !== undefined) updateData.quality_bond = input.quality_bond;
    if (input.note !== undefined) updateData.note = input.note;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('brand_policies')
      .update(updateData)
      .eq('id', policyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating brand policy:', error);
      return { success: false, error: '更新品牌政策失败' };
    }

    revalidatePath('/brand-policies');
    revalidatePath(`/brand-policies/${policyId}`);

    return { success: true, data: data as BrandPolicy };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Deactivate brand policy (sets effective_to to today)
export async function deactivateBrandPolicyAction(
  policyId: string
): Promise<{
  success: boolean;
  data?: BrandPolicy;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('brand_policies')
      .update({
        effective_to: today,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating brand policy:', error);
      return { success: false, error: '停用品牌政策失败' };
    }

    revalidatePath('/brand-policies');
    revalidatePath(`/brand-policies/${policyId}`);

    return { success: true, data: data as BrandPolicy };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
