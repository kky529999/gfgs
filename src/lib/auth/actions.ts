'use server';

import bcrypt from 'bcryptjs';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { signToken } from '@/lib/auth/jwt';
import { setAuthCookie, clearAuthCookie, getAuthCookie } from '@/lib/auth/cookie';
import type { AuthUser, LoginInput, ChangePasswordInput } from '@/types';
import type { UserRole } from '@/types';

// 设置 RLS 会话上下文
async function setupSession(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('set_auth_session', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) {
    console.error('Failed to set auth session:', error);
  }
}

// 登录
export async function loginAction(
  input: LoginInput
): Promise<{ success: boolean; error?: string; redirectTo?: string }> {
  try {
    // 1. 查询员工（使用 supabaseAdmin 绕过 RLS，因为登录时无认证上下文）
    const { data: employee, error: queryError } = await supabaseAdmin
      .from('employees')
      .select('id, phone, password_hash, name, title, department_id, is_active, must_change_password')
      .eq('phone', input.phone)
      .single();

    if (queryError || !employee) {
      return { success: false, error: '手机号或密码错误' };
    }

    if (!employee.is_active) {
      return { success: false, error: '账号已被禁用，请联系管理员' };
    }

    // 2. 校验密码
    const valid = await bcrypt.compare(input.password, employee.password_hash);
    if (!valid) {
      return { success: false, error: '手机号或密码错误' };
    }

    // 3. 查询部门信息
    let departmentCode: string | null = null;
    let userRole: UserRole = 'business'; // 默认角色

    if (employee.department_id) {
      const { data: dept } = await supabaseAdmin
        .from('departments')
        .select('code')
        .eq('id', employee.department_id)
        .single();
      departmentCode = dept?.code || null;
      userRole = (departmentCode as UserRole) || 'business';
    }

    // 4. 生成 JWT
    const { token } = signToken({
      user_id: employee.id,
      role: userRole,
      phone: employee.phone,
    });

    // 5. 设置 Cookie
    await setAuthCookie({
      user_id: employee.id,
      role: userRole,
      phone: employee.phone,
    });

    // 6. 设置 RLS 会话（非阻塞，失败不影响登录）
    try {
      await setupSession(employee.id, userRole);
    } catch (sessionError) {
      console.warn('RLS session setup failed, continuing anyway:', sessionError);
    }

    // 7. 决定跳转目标
    if (employee.must_change_password) {
      return { success: true, redirectTo: '/change-password' };
    }

    return { success: true, redirectTo: '/dashboard' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

// 修改密码
export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录或登录已过期' };
    }

    // 1. 查询当前密码
    const { data: employee, error: queryError } = await supabase
      .from('employees')
      .select('password_hash')
      .eq('id', auth.user_id)
      .single();

    if (queryError || !employee) {
      return { success: false, error: '用户不存在' };
    }

    // 2. 校验旧密码
    const valid = await bcrypt.compare(input.oldPassword, employee.password_hash);
    if (!valid) {
      return { success: false, error: '原密码错误' };
    }

    // 3. 新密码校验
    if (input.newPassword.length < 6) {
      return { success: false, error: '新密码长度不能少于6位' };
    }

    // 4. 更新密码
    const newHash = await bcrypt.hash(input.newPassword, 10);
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        password_hash: newHash,
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.user_id);

    if (updateError) {
      return { success: false, error: '密码更新失败，请重试' };
    }

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: '密码更新失败，请稍后重试' };
  }
}

// 获取当前用户信息
export async function getProfileAction(): Promise<{
  success: boolean;
  data?: AuthUser;
  error?: string;
}> {
  try {
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录' };
    }

    // 设置 RLS 会话
    await setupSession(auth.user_id, auth.role);

    const { data: employee, error } = await supabase
      .from('employees')
      .select(
        'id, phone, name, title, department_id, is_active, must_change_password, department:departments(code)'
      )
      .eq('id', auth.user_id)
      .single();

    if (error || !employee) {
      return { success: false, error: '用户不存在' };
    }

    const deptCode = (employee.department as { code: string }[] | null)?.[0]?.code || null;

    return {
      success: true,
      data: {
        id: employee.id,
        phone: employee.phone,
        name: employee.name,
        title: employee.title,
        role: auth.role,
        department_id: employee.department_id,
        department_code: deptCode as AuthUser['department_code'],
        must_change_password: employee.must_change_password,
      },
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: '获取用户信息失败，请稍后重试' };
  }
}

// 登出
export async function logoutAction(): Promise<void> {
  await clearAuthCookie();
}

// 刷新会话（用当前 cookie 重新设置 RLS）
export async function refreshSessionAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  await setupSession(auth.user_id, auth.role);
  return { success: true };
}

// 获取当前用户信息（供客户端使用）
export async function getAuthInfoAction(): Promise<{
  success: boolean;
  data?: { user_id: string; role: string; phone: string } | null;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: true, data: null };
  }
  return {
    success: true,
    data: {
      user_id: auth.user_id,
      role: auth.role,
      phone: auth.phone,
    },
  };
}
