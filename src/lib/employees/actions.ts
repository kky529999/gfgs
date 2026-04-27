'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { Employee, Department } from '@/types';

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

// Get all employees
export async function getEmployeesAction(): Promise<{
  success: boolean;
  data?: Array<Employee & { department?: Department }>;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*, department:departments(*)')
      .order('name');

    if (error) {
      console.error('Error fetching employees:', error);
      return { success: false, error: '获取员工列表失败' };
    }

    return { success: true, data: data as Array<Employee & { department?: Department }> };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get single employee by ID
export async function getEmployeeAction(
  employeeId: string
): Promise<{
  success: boolean;
  data?: Employee & { department?: Department };
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*, department:departments(*)')
      .eq('id', employeeId)
      .single();

    if (error) {
      console.error('Error fetching employee:', error);
      return { success: false, error: '获取员工信息失败' };
    }

    return { success: true, data: data as Employee & { department?: Department } };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get all departments
export async function getDepartmentsAction(): Promise<{
  success: boolean;
  data?: Department[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return { success: false, error: '获取部门列表失败' };
    }

    return { success: true, data: data as Department[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Input type for creating/updating employees
export interface CreateEmployeeInput {
  name: string;
  phone: string;
  title?: string;
  department_id?: string;
  is_active?: boolean;
}

export interface UpdateEmployeeInput {
  name?: string;
  phone?: string;
  title?: string;
  department_id?: string | null;
  is_active?: boolean;
}

// Create new employee
export async function createEmployeeAction(
  input: CreateEmployeeInput
): Promise<{
  success: boolean;
  data?: Employee;
  error?: string;
  redirectTo?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Check if phone already exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('phone', input.phone)
      .single();

    if (existing) {
      return { success: false, error: '该手机号已存在' };
    }

    // Hash default password (123456)
    const passwordHash = await bcrypt.hash('123456', 10);

    const { data, error } = await supabase
      .from('employees')
      .insert({
        name: input.name,
        phone: input.phone,
        title: input.title || '',
        department_id: input.department_id || null,
        is_active: input.is_active ?? true,
        password_hash: passwordHash,
        must_change_password: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      return { success: false, error: '创建员工失败' };
    }

    revalidatePath('/employees');

    return {
      success: true,
      data: data as Employee,
      redirectTo: '/employees',
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Update employee
export async function updateEmployeeAction(
  employeeId: string,
  input: UpdateEmployeeInput
): Promise<{
  success: boolean;
  data?: Employee;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Check if phone already exists for another employee
    if (input.phone) {
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('phone', input.phone)
        .neq('id', employeeId)
        .single();

      if (existing) {
        return { success: false, error: '该手机号已被其他员工使用' };
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.department_id !== undefined) updateData.department_id = input.department_id;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return { success: false, error: '更新员工失败' };
    }

    revalidatePath('/employees');
    revalidatePath(`/employees/${employeeId}`);

    return { success: true, data: data as Employee };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Reset employee password to default (123456)
export async function resetEmployeePasswordAction(
  employeeId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const passwordHash = await bcrypt.hash('123456', 10);

    const { error } = await supabase
      .from('employees')
      .update({
        password_hash: passwordHash,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: '重置密码失败' };
    }

    revalidatePath('/employees');

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Toggle employee active status
export async function toggleEmployeeStatusAction(
  employeeId: string
): Promise<{
  success: boolean;
  data?: Employee;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Get current status
    const { data: current, error: fetchError } = await supabase
      .from('employees')
      .select('is_active')
      .eq('id', employeeId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: '员工不存在' };
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling employee status:', error);
      return { success: false, error: '更新状态失败' };
    }

    revalidatePath('/employees');

    return { success: true, data: data as Employee };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
