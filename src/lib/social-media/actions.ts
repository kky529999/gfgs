'use server';

import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import { formatZodError } from '@/lib/validators';
import { calculateReward } from './constants';

// Validation schemas
const createSocialMediaPostSchema = z.object({
  employee_id: z.string().uuid('无效的员工ID'),
  platform: z.string().min(1, '请输入平台').max(50, '平台名称不能超过50个字符'),
  video_url: z.string().max(500, '视频链接不能超过500个字符').optional().nullable(),
  duration_seconds: z.number({ error: '请输入时长' }).int('时长必须为整数').min(0, '时长不能为负数').optional().nullable(),
  is_real_person: z.boolean({ error: '请选择是否真人出镜' }),
  likes: z.number({ error: '请输入点赞数' }).int('点赞数必须为整数').min(0, '点赞数不能为负数').optional(),
  views: z.number({ error: '请输入播放量' }).int('播放量必须为整数').min(0, '播放量不能为负数').optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, '请输入正确的月份格式（YYYY-MM）'),
});

const updateSocialMediaPostSchema = z.object({
  platform: z.string().min(1, '请输入平台').max(50, '平台名称不能超过50个字符').optional(),
  video_url: z.string().max(500, '视频链接不能超过500个字符').optional().nullable(),
  duration_seconds: z.number({ error: '请输入时长' }).int('时长必须为整数').min(0, '时长不能为负数').optional().nullable(),
  is_real_person: z.boolean({ error: '请选择是否真人出镜' }).optional(),
  likes: z.number({ error: '请输入点赞数' }).int('点赞数必须为整数').min(0, '点赞数不能为负数').optional(),
  views: z.number({ error: '请输入播放量' }).int('播放量必须为整数').min(0, '播放量不能为负数').optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, '请输入正确的月份格式（YYYY-MM）').optional(),
});

// Social media post type
export interface SocialMediaPost {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    name: string;
    title: string;
  };
  platform: string;
  video_url: string | null;
  duration_seconds: number | null;
  is_real_person: boolean;
  likes: number;
  views: number;
  status: string;
  reward: number | null;
  month: string;
  created_at: string;
}

export interface CreateSocialMediaPostInput {
  employee_id: string;
  platform: string;
  video_url?: string;
  duration_seconds?: number;
  is_real_person: boolean;
  likes?: number;
  views?: number;
  month: string;
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

// Get social media posts
export async function getSocialMediaPostsAction(filters?: {
  month?: string;
  employee_id?: string;
}): Promise<{
  success: boolean;
  data?: SocialMediaPost[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    let query = supabase
      .from('social_media_posts')
      .select('*, employee:employees(id, name, title)')
      .order('created_at', { ascending: false });

    if (filters?.month) {
      query = query.eq('month', filters.month);
    }
    if (filters?.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching social media posts:', error);
      return { success: false, error: '获取自媒体记录失败' };
    }

    return { success: true, data: data as SocialMediaPost[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function createSocialMediaPostAction(
  input: CreateSocialMediaPostInput
): Promise<{
  success: boolean;
  data?: SocialMediaPost;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = createSocialMediaPostSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    const reward = calculateReward(input.is_real_person);

    const { data, error } = await supabase
      .from('social_media_posts')
      .insert({
        employee_id: input.employee_id,
        platform: input.platform,
        video_url: input.video_url || null,
        duration_seconds: input.duration_seconds || null,
        is_real_person: input.is_real_person,
        likes: input.likes || 0,
        views: input.views || 0,
        status: 'pending',
        reward,
        month: input.month,
      })
      .select('*, employee:employees(id, name, title)')
      .single();

    if (error) {
      console.error('Error creating social media post:', error);
      return { success: false, error: '创建自媒体记录失败' };
    }

    return { success: true, data: data as SocialMediaPost };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function updateSocialMediaPostAction(
  postId: string,
  input: Partial<CreateSocialMediaPostInput>
): Promise<{
  success: boolean;
  data?: SocialMediaPost;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Get current post to calculate reward if needed
    const { data: current } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (!current) {
      return { success: false, error: '记录不存在' };
    }

    const is_real_person = input.is_real_person ?? current.is_real_person;
    const reward = calculateReward(is_real_person);

    const { data, error } = await supabase
      .from('social_media_posts')
      .update({
        platform: input.platform ?? current.platform,
        video_url: input.video_url !== undefined ? input.video_url : current.video_url,
        duration_seconds: input.duration_seconds !== undefined ? input.duration_seconds : current.duration_seconds,
        is_real_person,
        likes: input.likes ?? current.likes,
        views: input.views ?? current.views,
        month: input.month ?? current.month,
        reward,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select('*, employee:employees(id, name, title)')
      .single();

    if (error) {
      console.error('Error updating social media post:', error);
      return { success: false, error: '更新自媒体记录失败' };
    }

    return { success: true, data: data as SocialMediaPost };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function approveSocialMediaPostAction(
  postId: string
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
      .from('social_media_posts')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      console.error('Error approving social media post:', error);
      return { success: false, error: '审批失败' };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

export async function deleteSocialMediaPostAction(
  postId: string
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
      .from('social_media_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting social media post:', error);
      return { success: false, error: '删除失败' };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get employees for dropdown (available to all authenticated users)
export async function getSocialMediaEmployeesAction(): Promise<{
  success: boolean;
  data?: { id: string; name: string; title: string }[];
  error?: string;
}> {
  try {
    await refreshSessionAction();

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

// Get monthly statistics
export async function getSocialMediaStatsAction(month?: string): Promise<{
  success: boolean;
  data?: {
    total_posts: number;
    normal_posts: number;
    real_person_posts: number;
    total_reward: number;
    pending_count: number;
    approved_count: number;
  };
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    let query = supabase
      .from('social_media_posts')
      .select('is_real_person, reward, status');

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching social media stats:', error);
      return { success: false, error: '获取统计数据失败' };
    }

    const posts = data || [];
    const stats = {
      total_posts: posts.length,
      normal_posts: posts.filter(p => !p.is_real_person).length,
      real_person_posts: posts.filter(p => p.is_real_person).length,
      total_reward: posts.reduce((sum, p) => sum + (p.reward || 0), 0),
      pending_count: posts.filter(p => p.status === 'pending').length,
      approved_count: posts.filter(p => p.status === 'approved').length,
    };

    return { success: true, data: stats };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
