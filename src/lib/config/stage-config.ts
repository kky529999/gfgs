'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase';

export type StageConfig = Database['public']['Tables']['stage_config']['Row'];
export type StageConfigUpdate = Database['public']['Tables']['stage_config']['Update'];

export async function getStageConfigs(): Promise<{ data: StageConfig[]; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('stage_config')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching stage configs:', error);
    return { data: null as unknown as StageConfig[], error: error.message };
  }

  return { data: data || [], error: null };
}

export async function getStageConfig(
  stageKey: string
): Promise<{ data: StageConfig | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('stage_config')
    .select('*')
    .eq('stage_key', stageKey)
    .single();

  if (error) {
    console.error('Error fetching stage config:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateStageConfig(
  stageKey: string,
  updates: { default_days: number; description?: string }
): Promise<{ data: StageConfig | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('stage_config')
    .update({
      default_days: updates.default_days,
      description: updates.description,
      updated_at: new Date().toISOString(),
    })
    .eq('stage_key', stageKey)
    .select()
    .single();

  if (error) {
    console.error('Error updating stage config:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/config/stages');
  return { data, error: null };
}

export async function getGridDeadlineDays(brand: string): Promise<number> {
  const brandLower = brand.toLowerCase();
  if (brandLower.includes('天合')) {
    return 43;
  }
  const { data } = await supabaseAdmin
    .from('stage_config')
    .select('default_days')
    .eq('stage_key', 'grid')
    .single();
  return data?.default_days || 28;
}
