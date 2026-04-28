'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { createCustomerSchema, updateCustomerSchema } from '@/lib/validators';
import type {
  Customer,
  CustomerWithRelations,
  CreateCustomerInput,
  UpdateCustomerInput,
  AdvanceStageInput,
  CustomerStage,
} from '@/types/customer';

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
    // supabaseAdmin uses service role key, bypassing RLS entirely
    // No need to call refreshSessionAction() - it uses anon client which
    // creates a different connection context
    let query = supabaseAdmin
      .from('customers')
      .select(
        `
        *,
        salesperson:employees!salesperson_id(id, name, phone),
        tech_assigned:employees!tech_assigned_id(id, name, phone)
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
      console.error('Error fetching customers:', JSON.stringify(error, null, 2));
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
    // Use supabaseAdmin for consistent data access (service role key bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select(
        `
        *,
        salesperson:employees!salesperson_id(id, name, phone),
        tech_assigned:employees!tech_assigned_id(id, name, phone)
      `
      )
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Error fetching customer:', JSON.stringify(error, null, 2));
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

  // Input validation
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
  }

  try {
    // Use supabaseAdmin for consistent data access (service role key bypasses RLS)
    // Set default salesperson if business role
    const salespersonId =
      input.salesperson_id ||
      (auth.role === 'business' ? auth.user_id : undefined);

    // Use supabaseAdmin for consistent data access
    const { data, error } = await supabaseAdmin
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

  // Input validation
  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
  }

  try {
    // Use supabaseAdmin for consistent data access (service role key bypasses RLS)
    // Check access permission first
    const { data: existing } = await supabaseAdmin
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

    // Use supabaseAdmin for consistent data access
    const { data, error } = await supabaseAdmin
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
    // Use supabaseAdmin for consistent data access (service role key bypasses RLS)
    // Get current customer state
    const { data: customer, error: fetchError } = await supabaseAdmin
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

    // Update customer (use supabaseAdmin for consistency)
    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .eq('id', input.customer_id);

    if (updateError) {
      console.error('Error advancing stage:', updateError);
      return { success: false, error: '更新阶段失败' };
    }

    // Log the progress (use supabaseAdmin for consistency)
    await supabaseAdmin.from('progress_logs').insert({
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
  data?: Array<{ id: string; name: string; phone: string; department_code: string | null; title: string }>;
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // All authenticated users can view employee list for assignment
  // Role-based filtering is applied when rendering the dropdown

  try {
    // Use supabaseAdmin for consistent data access (service role key bypasses RLS)
    // Join with departments to get the department code (which determines role)
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        name,
        phone,
        title,
        department:departments(code)
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching employees:', error);
      return { success: false, error: '获取员工列表失败' };
    }

    // Transform the data to flatten the department relation
    const employees = (data || []).map((emp: Record<string, unknown>) => ({
      id: emp.id as string,
      name: emp.name as string,
      phone: emp.phone as string,
      title: (emp.title as string) || '',
      department_code: (emp.department as { code: string } | null)?.code || null,
    }));

    return { success: true, data: employees };
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
    // Use supabaseAdmin for consistent data access (service role key bypasses RLS)
    const { data, error } = await supabaseAdmin
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
