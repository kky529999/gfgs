'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { WarehouseMaterial, StockMovement, StockMovementType, WarehouseStatus } from '@/types';
import { formatZodError } from '@/lib/validators';

// Validation schemas
const createWarehouseMaterialSchema = z.object({
  brand: z.string().min(1, '请输入品牌').max(100, '品牌不能超过100个字符'),
  model: z.string().max(100, '型号不能超过100个字符').optional().nullable(),
  quantity: z.number({ error: '请输入数量' }).int('数量必须为整数').min(0, '数量不能为负数'),
  unit: z.string().max(20, '单位不能超过20个字符').optional().nullable(),
  note: z.string().max(500, '备注不能超过500个字符').optional().nullable(),
});

const updateWarehouseMaterialSchema = z.object({
  brand: z.string().min(1, '请输入品牌').max(100, '品牌不能超过100个字符').optional(),
  model: z.string().max(100, '型号不能超过100个字符').optional().nullable(),
  quantity: z.number({ error: '请输入数量' }).int('数量必须为整数').min(0, '数量不能为负数').optional(),
  unit: z.string().max(20, '单位不能超过20个字符').optional().nullable(),
  status: z.enum(['in_stock', 'low_stock', 'out', 'reserved'] as const).optional(),
  note: z.string().max(500, '备注不能超过500个字符').optional().nullable(),
});

const createStockMovementSchema = z.object({
  material_id: z.string().uuid('无效的材料ID'),
  type: z.enum(['inbound', 'outbound', 'adjustment'] as const, { error: '请选择类型' }),
  quantity: z.number({ error: '请输入数量' }).int('数量必须为正数').min(1, '数量必须为正数'),
  customer_id: z.string().uuid('无效的客户ID').optional().nullable(),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期'),
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
  await refreshSessionAction();
  return { allowed: true };
}

// Get all warehouse materials
export async function getWarehouseMaterialsAction(): Promise<{
  success: boolean;
  data?: WarehouseMaterial[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('warehouse_materials')
      .select('*')
      .order('brand')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching warehouse materials:', error);
      return { success: false, error: '获取库存材料失败' };
    }

    return { success: true, data: data as WarehouseMaterial[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get single warehouse material by ID
export async function getWarehouseMaterialAction(
  materialId: string
): Promise<{
  success: boolean;
  data?: WarehouseMaterial;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabase
      .from('warehouse_materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (error) {
      console.error('Error fetching warehouse material:', error);
      return { success: false, error: '获取库存材料信息失败' };
    }

    return { success: true, data: data as WarehouseMaterial };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Input type for creating warehouse materials
export interface CreateWarehouseMaterialInput {
  brand: string;
  model?: string;
  quantity: number;
  unit?: string;
  note?: string;
}

export interface UpdateWarehouseMaterialInput {
  brand?: string;
  model?: string | null;
  quantity?: number;
  unit?: string | null;
  status?: WarehouseStatus;
  note?: string | null;
}

// Create new warehouse material
export async function createWarehouseMaterialAction(
  input: CreateWarehouseMaterialInput
): Promise<{
  success: boolean;
  data?: WarehouseMaterial;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = createWarehouseMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    const { data, error } = await supabase
      .from('warehouse_materials')
      .insert({
        brand: input.brand,
        model: input.model || null,
        quantity: input.quantity,
        unit: input.unit || null,
        status: 'in_stock',
        note: input.note || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating warehouse material:', error);
      return { success: false, error: '创建库存材料失败' };
    }

    revalidatePath('/warehouse');

    return { success: true, data: data as WarehouseMaterial };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Update warehouse material
export async function updateWarehouseMaterialAction(
  materialId: string,
  input: UpdateWarehouseMaterialInput
): Promise<{
  success: boolean;
  data?: WarehouseMaterial;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = updateWarehouseMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.note !== undefined) updateData.note = input.note;

    const { data, error } = await supabase
      .from('warehouse_materials')
      .update(updateData)
      .eq('id', materialId)
      .select()
      .single();

    if (error) {
      console.error('Error updating warehouse material:', error);
      return { success: false, error: '更新库存材料失败' };
    }

    revalidatePath('/warehouse');
    revalidatePath(`/warehouse/${materialId}`);

    return { success: true, data: data as WarehouseMaterial };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Delete warehouse material
export async function deleteWarehouseMaterialAction(
  materialId: string
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
      .from('warehouse_materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      console.error('Error deleting warehouse material:', error);
      return { success: false, error: '删除库存材料失败' };
    }

    revalidatePath('/warehouse');

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get stock movements
export async function getStockMovementsAction(filters?: {
  material_id?: string;
  type?: StockMovementType;
  start_date?: string;
  end_date?: string;
}): Promise<{
  success: boolean;
  data?: StockMovement[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    let query = supabase
      .from('stock_movements')
      .select('*, material:warehouse_materials(*), customer:customers(name), operator:employees(*)')
      .order('record_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.material_id) {
      query = query.eq('material_id', filters.material_id);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.start_date) {
      query = query.gte('record_date', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('record_date', filters.end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stock movements:', error);
      return { success: false, error: '获取出入库记录失败' };
    }

    return { success: true, data: data as StockMovement[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Input type for creating stock movements
export interface CreateStockMovementInput {
  material_id: string;
  type: StockMovementType;
  quantity: number;
  customer_id?: string;
  record_date: string;
  note?: string;
}

// Create stock movement (inbound/outbound)
export async function createStockMovementAction(
  input: CreateStockMovementInput
): Promise<{
  success: boolean;
  data?: StockMovement;
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  // Input validation
  const parsed = createStockMovementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  try {
    // Get auth employee ID
    const auth = await getAuthCookie();
    if (!auth) {
      return { success: false, error: '未登录' };
    }

    // Get current material
    const { data: material, error: materialError } = await supabase
      .from('warehouse_materials')
      .select('quantity, status')
      .eq('id', input.material_id)
      .single();

    if (materialError || !material) {
      return { success: false, error: '库存材料不存在' };
    }

    // Calculate new quantity
    let newQuantity: number;
    if (input.type === 'inbound') {
      newQuantity = material.quantity + input.quantity;
    } else if (input.type === 'outbound') {
      if (material.quantity < input.quantity) {
        return { success: false, error: '库存不足' };
      }
      newQuantity = material.quantity - input.quantity;
    } else {
      // adjustment
      newQuantity = input.quantity;
    }

    // Update material quantity
    const { error: updateError } = await supabase
      .from('warehouse_materials')
      .update({
        quantity: newQuantity,
        status: newQuantity === 0 ? 'out' : newQuantity > 0 ? 'in_stock' : material.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.material_id);

    if (updateError) {
      console.error('Error updating material quantity:', updateError);
      return { success: false, error: '更新库存失败' };
    }

    // Create movement record
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        material_id: input.material_id,
        type: input.type,
        quantity: input.quantity,
        customer_id: input.customer_id || null,
        operator_id: auth.user_id,
        record_date: input.record_date,
        note: input.note || null,
      })
      .select('*, material:warehouse_materials(*), customer:customers(name), operator:employees(*)')
      .single();

    if (error) {
      console.error('Error creating stock movement:', error);
      return { success: false, error: '创建出入库记录失败' };
    }

    revalidatePath('/warehouse');
    revalidatePath(`/warehouse/${input.material_id}`);

    return { success: true, data: data as StockMovement };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get available customers for outbound selection
export async function getActiveCustomersAction(): Promise<{
  success: boolean;
  data?: { id: string; name: string; brand: string | null }[];
  error?: string;
}> {
  try {
    await refreshSessionAction();

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, brand')
      .eq('current_stage', 'ship')
      .order('name');

    if (error) {
      console.error('Error fetching active customers:', error);
      return { success: false, error: '获取客户列表失败' };
    }

    return { success: true, data: data as { id: string; name: string; brand: string | null }[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
