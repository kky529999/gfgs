'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { formatZodError } from '@/lib/validators';
import type { MonthlyDeliveryTarget, MonthlyDeptRules } from '@/types';

// ========== MonthlyDeliveryTarget Actions ==========

// Validation schemas for monthly delivery targets
const createDeliveryTargetSchema = z.object({
  brand: z.string().min(1, '请输入品牌'),
  year_month: z.string().regex(/^\d{4}-\d{2}$/, '请输入有效的年月格式（如 2026-02）'),
  target_panels: z.number({ error: '请输入送货量目标' }).int().min(0, '送货量不能为负数'),
  base_salary: z.number({ error: '请输入底薪' }).min(0, '底薪不能为负数'),
  bonus_for_meeting_target: z.number({ error: '请输入送够奖励' }).min(0, '送够奖励不能为负数'),
  note: z.string().max(500, '备注不能超过500个字符').optional().nullable(),
});

const updateDeliveryTargetSchema = z.object({
  brand: z.string().min(1, '请输入品牌').optional(),
  year_month: z.string().regex(/^\d{4}-\d{2}$/, '请输入有效的年月格式（如 2026-02）').optional(),
  target_panels: z.number({ error: '请输入送货量目标' }).int().min(0, '送货量不能为负数').optional(),
  base_salary: z.number({ error: '请输入底薪' }).min(0, '底薪不能为负数').optional(),
  bonus_for_meeting_target: z.number({ error: '请输入送够奖励' }).min(0, '送够奖励不能为负数').optional(),
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
  return { allowed: true };
}

// Get all monthly delivery targets
export async function getMonthlyDeliveryTargetsAction(filters?: {
  brand?: string;
  year_month?: string;
}): Promise<{
  success: boolean;
  data?: MonthlyDeliveryTarget[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    let query = supabaseAdmin
      .from('monthly_delivery_targets')
      .select('*, creator:employees!created_by(id, name)')
      .order('year_month', { ascending: false })
      .order('brand');

    if (filters?.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters?.year_month) {
      query = query.eq('year_month', filters.year_month);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching monthly delivery targets:', error);
      return { success: false, error: '获取月度达量配置失败' };
    }

    return { success: true, data: data as MonthlyDeliveryTarget[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get single monthly delivery target
export async function getMonthlyDeliveryTargetAction(
  id: string
): Promise<{
  success: boolean;
  data?: MonthlyDeliveryTarget;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('monthly_delivery_targets')
      .select('*, creator:employees!created_by(id, name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching monthly delivery target:', error);
      return { success: false, error: '获取月度达量配置失败' };
    }

    return { success: true, data: data as MonthlyDeliveryTarget };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Input types for monthly delivery targets
export interface CreateDeliveryTargetInput {
  brand: string;
  year_month: string;
  target_panels: number;
  base_salary: number;
  bonus_for_meeting_target: number;
  note?: string;
}

export interface UpdateDeliveryTargetInput {
  brand?: string;
  year_month?: string;
  target_panels?: number;
  base_salary?: number;
  bonus_for_meeting_target?: number;
  note?: string | null;
}

// Create monthly delivery target
export async function createDeliveryTargetAction(
  input: CreateDeliveryTargetInput
): Promise<{
  success: boolean;
  data?: MonthlyDeliveryTarget;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = createDeliveryTargetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录' };
    }

    // Check if record already exists for brand + year_month
    const { data: existing } = await supabaseAdmin
      .from('monthly_delivery_targets')
      .select('id')
      .eq('brand', input.brand)
      .eq('year_month', input.year_month)
      .single();

    if (existing) {
      return { success: false, error: '该品牌该月份已存在配置，请编辑现有记录' };
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_delivery_targets')
      .insert({
        brand: input.brand,
        year_month: input.year_month,
        target_panels: input.target_panels,
        base_salary: input.base_salary,
        bonus_for_meeting_target: input.bonus_for_meeting_target,
        note: input.note || null,
        created_by: auth.user_id,
      })
      .select('*, creator:employees!created_by(id, name)')
      .single();

    if (error) {
      console.error('Error creating monthly delivery target:', error);
      return { success: false, error: '创建月度达量配置失败' };
    }

    revalidatePath('/monthly-delivery-targets');

    return { success: true, data: data as MonthlyDeliveryTarget };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Update monthly delivery target
export async function updateDeliveryTargetAction(
  id: string,
  input: UpdateDeliveryTargetInput
): Promise<{
  success: boolean;
  data?: MonthlyDeliveryTarget;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = updateDeliveryTargetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.year_month !== undefined) updateData.year_month = input.year_month;
    if (input.target_panels !== undefined) updateData.target_panels = input.target_panels;
    if (input.base_salary !== undefined) updateData.base_salary = input.base_salary;
    if (input.bonus_for_meeting_target !== undefined) updateData.bonus_for_meeting_target = input.bonus_for_meeting_target;
    if (input.note !== undefined) updateData.note = input.note;

    const { data, error } = await supabaseAdmin
      .from('monthly_delivery_targets')
      .update(updateData)
      .eq('id', id)
      .select('*, creator:employees!created_by(id, name)')
      .single();

    if (error) {
      console.error('Error updating monthly delivery target:', error);
      return { success: false, error: '更新月度达量配置失败' };
    }

    revalidatePath('/monthly-delivery-targets');
    revalidatePath(`/monthly-delivery-targets/${id}`);

    return { success: true, data: data as MonthlyDeliveryTarget };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Delete monthly delivery target
export async function deleteDeliveryTargetAction(
  id: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { error } = await supabaseAdmin
      .from('monthly_delivery_targets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting monthly delivery target:', error);
      return { success: false, error: '删除月度达量配置失败' };
    }

    revalidatePath('/monthly-delivery-targets');

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// ========== MonthlyDeptRules Actions ==========

// Validation schema for monthly department rules
const createDeptRulesSchema = z.object({
  department: z.enum(['admin', 'tech', 'business'], {
    errorMap: () => ({ message: '请选择有效的部门' }),
  }),
  year_month: z.string().regex(/^\d{4}-\d{2}$/, '请输入有效的年月格式（如 2026-02）'),
  // 综合部奖励
  admin_record_reward: z.number().min(0).optional(),
  admin_grid_reward: z.number().min(0).optional(),
  admin_close_reward: z.number().min(0).optional(),
  admin_recruit_invite_reward: z.number().min(0).optional(),
  admin_recruit_interview_reward: z.number().min(0).optional(),
  admin_recruit_probation_reward: z.number().min(0).optional(),
  admin_meeting_reward: z.number().min(0).optional(),
  admin_video_reward: z.number().min(0).optional(),
  admin_video_real_reward: z.number().min(0).optional(),
  admin_live_reward: z.number().min(0).optional(),
  // 综合部考核
  admin_record_penalty_days: z.number().int().min(0).optional(),
  admin_record_penalty_per_day: z.number().min(0).optional(),
  admin_grid_penalty_days: z.number().int().min(0).optional(),
  admin_grid_penalty_days_other: z.number().int().min(0).optional(),
  admin_grid_penalty_per_day: z.number().min(0).optional(),
  // 技术部奖励
  tech_survey_reward: z.number().min(0).optional(),
  tech_survey_reward_dealer: z.number().min(0).optional(),
  tech_design_own_reward: z.number().min(0).optional(),
  tech_design_outsource_reward: z.number().min(0).optional(),
  tech_grid_reward: z.number().min(0).optional(),
  tech_grid_reward_dealer: z.number().min(0).optional(),
  tech_warehouse_reward: z.number().min(0).optional(),
  // 技术部考核
  tech_design_penalty_days: z.number().int().min(0).optional(),
  tech_design_penalty_per_day: z.number().min(0).optional(),
  tech_grid_penalty_days: z.number().int().min(0).optional(),
  tech_grid_penalty_days_other: z.number().int().min(0).optional(),
  tech_grid_penalty_per_day: z.number().min(0).optional(),
  // 业务部奖励
  biz_commission_per_panel: z.number().min(0).optional(),
  biz_car_subsidy: z.number().min(0).optional(),
  biz_bonus_target: z.number().int().min(0).optional(),
  biz_bonus_if_met: z.number().min(0).optional(),
  biz_supervisor_reward_per_panel: z.number().min(0).optional(),
  // 业务部考核
  biz_min_ship_penalty: z.number().min(0).optional(),
  biz_min_ship_count: z.number().int().min(0).optional(),
  // 通用字段
  note: z.string().max(500).optional().nullable(),
});

// Get all monthly department rules
export async function getMonthlyDeptRulesAction(filters?: {
  department?: string;
  year_month?: string;
}): Promise<{
  success: boolean;
  data?: MonthlyDeptRules[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    let query = supabaseAdmin
      .from('monthly_dept_rules')
      .select('*, creator:employees!created_by(id, name)')
      .order('year_month', { ascending: false })
      .order('department');

    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.year_month) {
      query = query.eq('year_month', filters.year_month);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching monthly dept rules:', error);
      return { success: false, error: '获取月度部门规则失败' };
    }

    return { success: true, data: data as MonthlyDeptRules[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get single monthly department rules
export async function getMonthlyDeptRulesOneAction(
  id: string
): Promise<{
  success: boolean;
  data?: MonthlyDeptRules;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('monthly_dept_rules')
      .select('*, creator:employees!created_by(id, name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching monthly dept rules:', error);
      return { success: false, error: '获取月度部门规则失败' };
    }

    return { success: true, data: data as MonthlyDeptRules };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get monthly dept rules by department and year_month
export async function getMonthlyDeptRulesByMonthAction(
  department: string,
  year_month: string
): Promise<{
  success: boolean;
  data?: MonthlyDeptRules;
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('monthly_dept_rules')
      .select('*, creator:employees!created_by(id, name)')
      .eq('department', department)
      .eq('year_month', year_month)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - return null data, not error
        return { success: true, data: undefined };
      }
      console.error('Error fetching monthly dept rules:', error);
      return { success: false, error: '获取月度部门规则失败' };
    }

    return { success: true, data: data as MonthlyDeptRules };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Input type for creating/updating monthly dept rules
export interface CreateDeptRulesInput {
  department: 'admin' | 'tech' | 'business';
  year_month: string;
  // 综合部奖励
  admin_record_reward?: number;
  admin_grid_reward?: number;
  admin_close_reward?: number;
  admin_recruit_invite_reward?: number;
  admin_recruit_interview_reward?: number;
  admin_recruit_probation_reward?: number;
  admin_meeting_reward?: number;
  admin_video_reward?: number;
  admin_video_real_reward?: number;
  admin_live_reward?: number;
  // 综合部考核
  admin_record_penalty_days?: number;
  admin_record_penalty_per_day?: number;
  admin_grid_penalty_days?: number;
  admin_grid_penalty_days_other?: number;
  admin_grid_penalty_per_day?: number;
  // 技术部奖励
  tech_survey_reward?: number;
  tech_survey_reward_dealer?: number;
  tech_design_own_reward?: number;
  tech_design_outsource_reward?: number;
  tech_grid_reward?: number;
  tech_grid_reward_dealer?: number;
  tech_warehouse_reward?: number;
  // 技术部考核
  tech_design_penalty_days?: number;
  tech_design_penalty_per_day?: number;
  tech_grid_penalty_days?: number;
  tech_grid_penalty_days_other?: number;
  tech_grid_penalty_per_day?: number;
  // 业务部奖励
  biz_commission_per_panel?: number;
  biz_car_subsidy?: number;
  biz_bonus_target?: number;
  biz_bonus_if_met?: number;
  biz_supervisor_reward_per_panel?: number;
  // 业务部考核
  biz_min_ship_penalty?: number;
  biz_min_ship_count?: number;
  // 通用字段
  note?: string;
}

export interface UpdateDeptRulesInput {
  department?: 'admin' | 'tech' | 'business';
  year_month?: string;
  admin_record_reward?: number;
  admin_grid_reward?: number;
  admin_close_reward?: number;
  admin_recruit_invite_reward?: number;
  admin_recruit_interview_reward?: number;
  admin_recruit_probation_reward?: number;
  admin_meeting_reward?: number;
  admin_video_reward?: number;
  admin_video_real_reward?: number;
  admin_live_reward?: number;
  admin_record_penalty_days?: number;
  admin_record_penalty_per_day?: number;
  admin_grid_penalty_days?: number;
  admin_grid_penalty_days_other?: number;
  admin_grid_penalty_per_day?: number;
  tech_survey_reward?: number;
  tech_survey_reward_dealer?: number;
  tech_design_own_reward?: number;
  tech_design_outsource_reward?: number;
  tech_grid_reward?: number;
  tech_grid_reward_dealer?: number;
  tech_warehouse_reward?: number;
  tech_design_penalty_days?: number;
  tech_design_penalty_per_day?: number;
  tech_grid_penalty_days?: number;
  tech_grid_penalty_days_other?: number;
  tech_grid_penalty_per_day?: number;
  biz_commission_per_panel?: number;
  biz_car_subsidy?: number;
  biz_bonus_target?: number;
  biz_bonus_if_met?: number;
  biz_supervisor_reward_per_panel?: number;
  biz_min_ship_penalty?: number;
  biz_min_ship_count?: number;
  note?: string | null;
}

// Create monthly department rules
export async function createDeptRulesAction(
  input: CreateDeptRulesInput
): Promise<{
  success: boolean;
  data?: MonthlyDeptRules;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = createDeptRulesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录' };
    }

    // Check if record already exists
    const { data: existing } = await supabaseAdmin
      .from('monthly_dept_rules')
      .select('id')
      .eq('department', input.department)
      .eq('year_month', input.year_month)
      .single();

    if (existing) {
      return { success: false, error: '该部门该月份已存在配置，请编辑现有记录' };
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_dept_rules')
      .insert({
        department: input.department,
        year_month: input.year_month,
        admin_record_reward: input.admin_record_reward || 0,
        admin_grid_reward: input.admin_grid_reward || 0,
        admin_close_reward: input.admin_close_reward || 0,
        admin_recruit_invite_reward: input.admin_recruit_invite_reward || 0,
        admin_recruit_interview_reward: input.admin_recruit_interview_reward || 0,
        admin_recruit_probation_reward: input.admin_recruit_probation_reward || 0,
        admin_meeting_reward: input.admin_meeting_reward || 0,
        admin_video_reward: input.admin_video_reward || 0,
        admin_video_real_reward: input.admin_video_real_reward || 0,
        admin_live_reward: input.admin_live_reward || 0,
        admin_record_penalty_days: input.admin_record_penalty_days || 0,
        admin_record_penalty_per_day: input.admin_record_penalty_per_day || 0,
        admin_grid_penalty_days: input.admin_grid_penalty_days || 0,
        admin_grid_penalty_days_other: input.admin_grid_penalty_days_other || 0,
        admin_grid_penalty_per_day: input.admin_grid_penalty_per_day || 0,
        tech_survey_reward: input.tech_survey_reward || 0,
        tech_survey_reward_dealer: input.tech_survey_reward_dealer || 0,
        tech_design_own_reward: input.tech_design_own_reward || 0,
        tech_design_outsource_reward: input.tech_design_outsource_reward || 0,
        tech_grid_reward: input.tech_grid_reward || 0,
        tech_grid_reward_dealer: input.tech_grid_reward_dealer || 0,
        tech_warehouse_reward: input.tech_warehouse_reward || 0,
        tech_design_penalty_days: input.tech_design_penalty_days || 0,
        tech_design_penalty_per_day: input.tech_design_penalty_per_day || 0,
        tech_grid_penalty_days: input.tech_grid_penalty_days || 0,
        tech_grid_penalty_days_other: input.tech_grid_penalty_days_other || 0,
        tech_grid_penalty_per_day: input.tech_grid_penalty_per_day || 0,
        biz_commission_per_panel: input.biz_commission_per_panel || 0,
        biz_car_subsidy: input.biz_car_subsidy || 0,
        biz_bonus_target: input.biz_bonus_target || 0,
        biz_bonus_if_met: input.biz_bonus_if_met || 0,
        biz_supervisor_reward_per_panel: input.biz_supervisor_reward_per_panel || 0,
        biz_min_ship_penalty: input.biz_min_ship_penalty || 0,
        biz_min_ship_count: input.biz_min_ship_count || 0,
        note: input.note || null,
        created_by: auth.user_id,
      })
      .select('*, creator:employees!created_by(id, name)')
      .single();

    if (error) {
      console.error('Error creating monthly dept rules:', error);
      return { success: false, error: '创建月度部门规则失败' };
    }

    revalidatePath('/monthly-dept-rules');

    return { success: true, data: data as MonthlyDeptRules };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Update monthly department rules
export async function updateDeptRulesAction(
  id: string,
  input: UpdateDeptRulesInput
): Promise<{
  success: boolean;
  data?: MonthlyDeptRules;
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

    // Only update fields that are provided
    const fieldMappings: Record<string, string> = {
      department: 'department',
      year_month: 'year_month',
      admin_record_reward: 'admin_record_reward',
      admin_grid_reward: 'admin_grid_reward',
      admin_close_reward: 'admin_close_reward',
      admin_recruit_invite_reward: 'admin_recruit_invite_reward',
      admin_recruit_interview_reward: 'admin_recruit_interview_reward',
      admin_recruit_probation_reward: 'admin_recruit_probation_reward',
      admin_meeting_reward: 'admin_meeting_reward',
      admin_video_reward: 'admin_video_reward',
      admin_video_real_reward: 'admin_video_real_reward',
      admin_live_reward: 'admin_live_reward',
      admin_record_penalty_days: 'admin_record_penalty_days',
      admin_record_penalty_per_day: 'admin_record_penalty_per_day',
      admin_grid_penalty_days: 'admin_grid_penalty_days',
      admin_grid_penalty_days_other: 'admin_grid_penalty_days_other',
      admin_grid_penalty_per_day: 'admin_grid_penalty_per_day',
      tech_survey_reward: 'tech_survey_reward',
      tech_survey_reward_dealer: 'tech_survey_reward_dealer',
      tech_design_own_reward: 'tech_design_own_reward',
      tech_design_outsource_reward: 'tech_design_outsource_reward',
      tech_grid_reward: 'tech_grid_reward',
      tech_grid_reward_dealer: 'tech_grid_reward_dealer',
      tech_warehouse_reward: 'tech_warehouse_reward',
      tech_design_penalty_days: 'tech_design_penalty_days',
      tech_design_penalty_per_day: 'tech_design_penalty_per_day',
      tech_grid_penalty_days: 'tech_grid_penalty_days',
      tech_grid_penalty_days_other: 'tech_grid_penalty_days_other',
      tech_grid_penalty_per_day: 'tech_grid_penalty_per_day',
      biz_commission_per_panel: 'biz_commission_per_panel',
      biz_car_subsidy: 'biz_car_subsidy',
      biz_bonus_target: 'biz_bonus_target',
      biz_bonus_if_met: 'biz_bonus_if_met',
      biz_supervisor_reward_per_panel: 'biz_supervisor_reward_per_panel',
      biz_min_ship_penalty: 'biz_min_ship_penalty',
      biz_min_ship_count: 'biz_min_ship_count',
      note: 'note',
    };

    for (const [key, dbKey] of Object.entries(fieldMappings)) {
      if (key in input) {
        updateData[dbKey] = (input as Record<string, unknown>)[key];
      }
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_dept_rules')
      .update(updateData)
      .eq('id', id)
      .select('*, creator:employees!created_by(id, name)')
      .single();

    if (error) {
      console.error('Error updating monthly dept rules:', error);
      return { success: false, error: '更新月度部门规则失败' };
    }

    revalidatePath('/monthly-dept-rules');
    revalidatePath(`/monthly-dept-rules/${id}`);

    return { success: true, data: data as MonthlyDeptRules };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Delete monthly department rules
export async function deleteDeptRulesAction(
  id: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { error } = await supabaseAdmin
      .from('monthly_dept_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting monthly dept rules:', error);
      return { success: false, error: '删除月度部门规则失败' };
    }

    revalidatePath('/monthly-dept-rules');

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get unique brands for filter
export async function getBrandsForDeliveryTargetAction(): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('monthly_delivery_targets')
      .select('brand');

    if (error) {
      return { success: false, error: '获取品牌列表失败' };
    }

    const brands = [...new Set(data?.map((r) => r.brand).filter(Boolean) as string[])];
    return { success: true, data: brands.sort() };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}