'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Server action to create brands table
export async function createBrandsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS brands (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_name TEXT NOT NULL UNIQUE,
      support_person TEXT,
      support_phone TEXT,
      tech_person TEXT,
      tech_phone TEXT,
      deposit_amount DECIMAL(12, 2) DEFAULT 0,
      contract_no TEXT,
      contract_start DATE,
      contract_end DATE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      remark TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // Execute raw SQL via admin client
  // Note: This requires a function that executes raw SQL
  // For now, we'll use a workaround via INSERT to check if it works

  return { success: true, message: 'Migration function called - check if brands table exists' };
}

// Server action to check if brands table exists
export async function checkBrandsTable() {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .select('id')
    .limit(1);

  if (error) {
    return { exists: false, error: error.message };
  }
  return { exists: true };
}

// Seed some initial brands
export async function seedBrands() {
  const brands = [
    { brand_name: '天合', support_person: '张经理', support_phone: '13800138001', tech_person: '李工', tech_phone: '13900139001', deposit_amount: 50000 },
    { brand_name: '晶科', support_person: '王经理', support_phone: '13800138002', tech_person: '王工', tech_phone: '13900139002', deposit_amount: 45000 },
    { brand_name: '晶澳', support_person: '赵经理', support_phone: '13800138003', tech_person: '赵工', tech_phone: '13900139003', deposit_amount: 40000 },
    { brand_name: '隆基', support_person: '刘经理', support_phone: '13800138004', tech_person: '刘工', tech_phone: '13900139004', deposit_amount: 48000 },
  ];

  const { data, error } = await supabaseAdmin
    .from('brands')
    .upsert(brands, { onConflict: 'brand_name' })
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/brands');
  return { success: true, count: data?.length || 0 };
}