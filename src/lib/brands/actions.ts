'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase';

export type Brand = Database['public']['Tables']['brands']['Row'];
export type BrandInsert = Database['public']['Tables']['brands']['Insert'];
export type BrandUpdate = Database['public']['Tables']['brands']['Update'];

export async function getBrands(options?: {
  includeInactive?: boolean;
}): Promise<{ data: Brand[]; error: string | null }> {
  let query = supabaseAdmin
    .from('brands')
    .select('*')
    .order('brand_name', { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as Brand[], error: null };
}

export async function getBrand(id: string): Promise<{ data: Brand | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Brand, error: null };
}

export async function getBrandByName(name: string): Promise<{ data: Brand | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .select('*')
    .eq('brand_name', name)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Brand, error: null };
}

export async function createBrand(brand: BrandInsert): Promise<{ data: Brand | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .insert(brand)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/brands');
  revalidatePath('/customers');

  return { data: data as Brand, error: null };
}

export async function updateBrand(id: string, updates: BrandUpdate): Promise<{ data: Brand | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/brands');
  revalidatePath('/customers');

  return { data: data as Brand, error: null };
}

export async function deleteBrand(id: string): Promise<{ success: boolean; error: string | null }> {
  // Soft delete by setting status to inactive
  const { error } = await supabaseAdmin
    .from('brands')
    .update({ status: 'inactive' })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/brands');

  return { success: true, error: null };
}

export async function seedBrands(): Promise<{ success: boolean; count: number; error: string | null }> {
  const brands: BrandInsert[] = [
    {
      brand_name: '天合',
      support_person: '张经理',
      support_phone: '13800138001',
      tech_person: '李工',
      tech_phone: '13900139001',
      deposit_amount: 50000,
      contract_no: null,
      contract_start: null,
      contract_end: null,
      status: 'active',
      remark: null,
    },
    {
      brand_name: '晶科',
      support_person: '王经理',
      support_phone: '13800138002',
      tech_person: '王工',
      tech_phone: '13900139002',
      deposit_amount: 45000,
      contract_no: null,
      contract_start: null,
      contract_end: null,
      status: 'active',
      remark: null,
    },
    {
      brand_name: '晶澳',
      support_person: '赵经理',
      support_phone: '13800138003',
      tech_person: '赵工',
      tech_phone: '13900139003',
      deposit_amount: 40000,
      contract_no: null,
      contract_start: null,
      contract_end: null,
      status: 'active',
      remark: null,
    },
    {
      brand_name: '隆基',
      support_person: '刘经理',
      support_phone: '13800138004',
      tech_person: '刘工',
      tech_phone: '13900139004',
      deposit_amount: 48000,
      contract_no: null,
      contract_start: null,
      contract_end: null,
      status: 'active',
      remark: null,
    },
  ];

  const { data, error } = await supabaseAdmin
    .from('brands')
    .upsert(brands, { onConflict: 'brand_name' })
    .select();

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  revalidatePath('/brands');

  return { success: true, count: data?.length || 0, error: null };
}
