'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type {
  Customer,
  CustomerWithRelations,
  CreateCustomerInput,
  UpdateCustomerInput,
  AdvanceStageInput,
  CustomerStage,
} from '@/types/customer';
import { STAGE_ORDER } from '@/types/customer';

// Helper to set RLS session context
async function withRLS<T>(
  callback: (supabase: typeof import('@/lib/supabase').supabase) => Promise<T>
): Promise<T> {
  await refreshSessionAction();
  return callback(supabase);
}

// Get all customers (with role-based filtering)
export async function getCustomersAction(): Promise<{
  success: boolean;
  data?: CustomerWithRelations[];
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    await refreshSessionAction();

    let query = supabase
      .from('customers')
      .select(
        `
        *,
        salesperson:employees!salesperson_id(id, name, phone),
        tech_assigned:employees!tech_assigned_id(id, name, phone),
        dealer:dealers(id, name)
      `
      )
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (auth.role === 'business') {
      query = query.eq('salesperson_id', auth.user_id);
    } else if (auth.role === 'tech') {
      query = query.eq('tech_assigned_id', auth.user_id);
    }
    // admin and gm can see all

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return { success: false, error: '获取客户列表失败' };
    }

    return { success: true, data: data as CustomerWithRelations[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get single customer by ID
export async function getCustomerAction(
  customerId: string
): Promise<{
  success: boolean;
  data?: CustomerWithRelations;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    await refreshSessionAction();

    const { data, error } = await supabase
      .from('customers')
      .select(
        `
        *,
        salesperson:employees!salesperson_id(id, name, phone),
        tech_assigned:employees!tech_assigned_id(id, name, phone),
        dealer:dealers(id, name)
      `
      )
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      return { success: false, error: '获取客户信息失败' };
    }

    // Check access permission
    const customer = data as CustomerWithRelations;
    if (auth.role === 'business' && customer.salesperson_id !== auth.user_id) {
      return { success: false, error: '无权访问此客户' };
    }
    if (auth.role === 'tech' && customer.tech_assigned_id !== auth.user_id) {
      return { success: false, error: '无权访问此客户' };
    }

    return { success: true, data: customer };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Create new customer
export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<{
  success: boolean;
  data?: Customer;
  error?: string;
  redirectTo?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    await refreshSessionAction();

    // Set default salesperson if business role
    const salespersonId =
      input.salesperson_id ||
      (auth.role === 'business' ? auth.user_id : undefined);

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: input.name,
        phone: input.phone,
        area: input.area,
        township: input.township,
        address: input.address,
        capacity: input.capacity,
        brand: input.brand,
        panel_count: input.panel_count,
        house_type: input.house_type,
        customer_type: input.customer_type || 'direct',
        dealer_id: input.dealer_id,
        salesperson_id: salespersonId,
        tech_assigned_id: input.tech_assigned_id,
        current_stage: input.current_stage || 'survey',
        survey_date: input.survey_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return { success: false, error: '创建客户失败' };
    }

    revalidatePath('/customers');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: data as Customer,
      redirectTo: `/customers/${data.id}`,
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Update customer
export async function updateCustomerAction(
  customerId: string,
  input: UpdateCustomerInput
): Promise<{
  success: boolean;
  data?: Customer;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    await refreshSessionAction();

    // Check access permission first
    const { data: existing } = await supabase
      .from('customers')
      .select('salesperson_id, tech_assigned_id')
      .eq('id', customerId)
      .single();

    if (!existing) {
      return { success: false, error: '客户不存在' };
    }

    if (auth.role === 'business' && existing.salesperson_id !== auth.user_id) {
      return { success: false, error: '无权修改此客户' };
    }
    if (auth.role === 'tech' && existing.tech_assigned_id !== auth.user_id) {
      return { success: false, error: '无权修改此客户' };
    }

    const { data, error } = await supabase
      .from('customers')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      return { success: false, error: '更新客户失败' };
    }

    revalidatePath('/customers');
    revalidatePath('/customers/[id]', 'page');
    revalidatePath('/dashboard');

    return { success: true, data: data as Customer };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Advance customer to next stage
export async function advanceStageAction(
  input: AdvanceStageInput
): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    await refreshSessionAction();

    // Get current customer state
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('current_stage, salesperson_id, tech_assigned_id')
      .eq('id', input.customer_id)
      .single();

    if (fetchError || !customer) {
      return { success: false, error: '客户不存在' };
    }

    // Check access permission
    if (auth.role === 'business' && customer.salesperson_id !== auth.user_id) {
      return { success: false, error: '无权修改此客户' };
    }
    if (auth.role === 'tech' && customer.tech_assigned_id !== auth.user_id) {
      return { success: false, error: '无权修改此客户' };
    }

    // Get the date field for this stage
    const stageDateField = getStageDateField(input.to_stage);
    const updateData: Record<string, unknown> = {
      current_stage: input.to_stage,
      stage_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (stageDateField && input.date) {
      updateData[stageDateField] = input.date;
    } else if (stageDateField) {
      updateData[stageDateField] = new Date().toISOString().split('T')[0];
    }

    // Update customer
    const { error: updateError } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', input.customer_id);

    if (updateError) {
      console.error('Error advancing stage:', updateError);
      return { success: false, error: '更新阶段失败' };
    }

    // Log the progress
    await supabase.from('progress_logs').insert({
      customer_id: input.customer_id,
      operator_id: auth.user_id,
      from_stage: customer.current_stage,
      to_stage: input.to_stage,
      note: input.note,
    });

    revalidatePath('/customers');
    revalidatePath(`/customers/${input.customer_id}`, 'page');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get employees for assignment dropdown
export async function getEmployeesAction(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string; phone: string; role: string }>;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // Only admin/gm can assign employees
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { success: false, error: '无权访问' };
  }

  try {
    await refreshSessionAction();

    const { data, error } = await supabase
      .from('employees')
      .select('id, name, phone, role')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching employees:', error);
      return { success: false, error: '获取员工列表失败' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get dealers for customer assignment
export async function getDealersAction(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  try {
    await refreshSessionAction();

    const { data, error } = await supabase
      .from('dealers')
      .select('id, name')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching dealers:', error);
      return { success: false, error: '获取二级商列表失败' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Helper function to get date field name for stage
function getStageDateField(stage: CustomerStage): string | null {
  const stageDateFields: Record<CustomerStage, string | null> = {
    survey: 'survey_date',
    design: 'design_date',
    filing: 'filing_date',
    record: 'record_date',
    grid_materials: 'grid_materials_date',
    ship: 'ship_date',
    grid: 'grid_date',
    close: 'close_date',
  };
  return stageDateFields[stage];
}
