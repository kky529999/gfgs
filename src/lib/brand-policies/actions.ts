'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { BrandPolicy } from '@/types';

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
