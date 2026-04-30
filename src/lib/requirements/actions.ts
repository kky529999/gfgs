'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { Requirement, CreateRequirementInput, UpdateRequirementInput, RequirementStatus } from '@/types';


// Get current user helper
async function getCurrentUser() {
  const auth = await getAuthCookie();
  if (!auth) return null;
  await refreshSessionAction();
  return auth;
}

// Get all requirements (admin/gm see all, others see their own)
export async function getRequirementsAction(): Promise<{
  success: boolean;
  data?: Requirement[];
  error?: string;
}> {
  const auth = await getCurrentUser();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    let query = supabaseAdmin
      .from('requirements')
      .select('*')
      .order('created_at', { ascending: false });

    // Non-admin/gm users can only see their own requirements
    if (auth.role !== 'admin' && auth.role !== 'gm') {
      query = query.eq('submitter_id', auth.user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching requirements:', error);
      return { success: false, error: '获取需求列表失败' };
    }

    return { success: true, data: data as Requirement[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get single requirement
export async function getRequirementAction(
  requirementId: string
): Promise<{
  success: boolean;
  data?: Requirement;
  error?: string;
}> {
  const auth = await getCurrentUser();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (error) {
      console.error('Error fetching requirement:', error);
      return { success: false, error: '获取需求详情失败' };
    }

    // Check permission: must be owner, assigned, or admin/gm
    if (
      data.submitter_id !== auth.user_id &&
      data.assigned_to !== auth.user_id &&
      auth.role !== 'admin' &&
      auth.role !== 'gm'
    ) {
      return { success: false, error: '无权访问' };
    }

    return { success: true, data: data as Requirement };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Submit new requirement
export async function createRequirementAction(
  input: CreateRequirementInput
): Promise<{
  success: boolean;
  data?: Requirement;
  error?: string;
}> {
  const auth = await getCurrentUser();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  if (!input.title || input.title.trim().length === 0) {
    return { success: false, error: '标题不能为空' };
  }

  if (input.title.length > 200) {
    return { success: false, error: '标题不能超过200个字符' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('requirements')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        type: input.type || 'feedback',
        priority: input.priority || 'medium',
        status: 'submitted',
        submitter_id: auth.user_id,
        submitter_name: auth.name,
        submitter_phone: auth.phone,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating requirement:', error);
      return { success: false, error: '提交需求失败' };
    }

    revalidatePath('/requirements');

    return { success: true, data: data as Requirement };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Update requirement (admin/gm or assigned person)
export async function updateRequirementAction(
  requirementId: string,
  input: UpdateRequirementInput
): Promise<{
  success: boolean;
  data?: Requirement;
  error?: string;
}> {
  const auth = await getCurrentUser();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    // Get current requirement
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: '需求不存在' };
    }

    // Check permission
    const isAdminOrGM = auth.role === 'admin' || auth.role === 'gm';
    const isAssigned = current.assigned_to === auth.user_id;
    const isSubmitter = current.submitter_id === auth.user_id;

    // Submitter can only update confirmed_at
    if (isSubmitter && !isAssigned && !isAdminOrGM) {
      // Allow submitter to confirm
      if (input.confirmed_at && input.status === 'confirmed') {
        const { data, error } = await supabaseAdmin
          .from('requirements')
          .update({
            status: 'confirmed',
            confirmed_at: input.confirmed_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', requirementId)
          .select()
          .single();

        if (error) {
          return { success: false, error: '确认失败' };
        }

        revalidatePath('/requirements');
        revalidatePath(`/requirements/${requirementId}`);
        return { success: true, data: data as Requirement };
      }
      return { success: false, error: '无权修改' };
    }

    // Only admin/gm or assigned can update other fields
    if (!isAdminOrGM && !isAssigned) {
      return { success: false, error: '无权修改' };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;
    if (input.response !== undefined) updateData.response = input.response?.trim() || null;

    // Auto-set completed_at when status changes to completed
    if (input.status === 'completed' && current.status !== 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('requirements')
      .update(updateData)
      .eq('id', requirementId)
      .select()
      .single();

    if (error) {
      console.error('Error updating requirement:', error);
      return { success: false, error: '更新需求失败' };
    }

    revalidatePath('/requirements');
    revalidatePath(`/requirements/${requirementId}`);

    return { success: true, data: data as Requirement };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Confirm requirement (submitter confirms the work is done)
export async function confirmRequirementAction(
  requirementId: string,
  satisfied: boolean
): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await getCurrentUser();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    // Get current requirement
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: '需求不存在' };
    }

    // Only submitter can confirm
    if (current.submitter_id !== auth.user_id) {
      return { success: false, error: '只有提交人可以确认' };
    }

    // Can only confirm completed requirements
    if (current.status !== 'completed') {
      return { success: false, error: '需求尚未完成，无法确认' };
    }

    const newStatus: RequirementStatus = satisfied ? 'confirmed' : 'in_progress';
    const feedbackNote = satisfied ? '已确认完成' : '要求继续改进';

    const { error } = await supabaseAdmin
      .from('requirements')
      .update({
        status: newStatus,
        confirmed_at: satisfied ? new Date().toISOString() : null,
        response: current.response
          ? `${current.response}\n\n[${auth.name} ${new Date().toLocaleString('zh-CN')}]: ${feedbackNote}`
          : `[${auth.name} ${new Date().toLocaleString('zh-CN')}]: ${feedbackNote}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requirementId);

    if (error) {
      console.error('Error confirming requirement:', error);
      return { success: false, error: '确认失败' };
    }

    revalidatePath('/requirements');
    revalidatePath(`/requirements/${requirementId}`);

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Reject requirement (admin/gm only)
export async function rejectRequirementAction(
  requirementId: string,
  reason: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await getCurrentUser();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // Only admin/gm can reject
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { success: false, error: '无权拒绝需求' };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: '请填写拒绝原因' };
  }

  try {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: '需求不存在' };
    }

    const rejectNote = `[${auth.name} 已拒绝 ${new Date().toLocaleString('zh-CN')}]: ${reason.trim()}`;

    const { error } = await supabaseAdmin
      .from('requirements')
      .update({
        status: 'rejected',
        response: current.response
          ? `${current.response}\n\n${rejectNote}`
          : rejectNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requirementId);

    if (error) {
      console.error('Error rejecting requirement:', error);
      return { success: false, error: '拒绝失败' };
    }

    revalidatePath('/requirements');
    revalidatePath(`/requirements/${requirementId}`);

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get stats for dashboard
export async function getRequirementsStatsAction(): Promise<{
  success: boolean;
  data?: {
    total: number;
    submitted: number;
    in_progress: number;
    completed: number;
    confirmed: number;
  };
  error?: string;
}> {
  const auth = await getCurrentUser();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    let query = supabaseAdmin.from('requirements').select('status');

    // Non-admin/gm users only see their own
    if (auth.role !== 'admin' && auth.role !== 'gm') {
      query = query.eq('submitter_id', auth.user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stats:', error);
      return { success: false, error: '获取统计失败' };
    }

    const stats = {
      total: data.length,
      submitted: data.filter((r: { status: string }) => r.status === 'submitted').length,
      in_progress: data.filter((r: { status: string }) => r.status === 'in_progress').length,
      completed: data.filter((r: { status: string }) => r.status === 'completed').length,
      confirmed: data.filter((r: { status: string }) => r.status === 'confirmed').length,
    };

    return { success: true, data: stats };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}