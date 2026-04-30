import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('supabaseUrl is required');
  return url;
}

function getSupabaseKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('supabaseAnonKey is required');
  return key;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  return key;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createClient(getSupabaseUrl(), getSupabaseKey());
    }
    return (_supabase as any)[prop];
  },
});

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient(getSupabaseUrl(), getServiceRoleKey());
    }
    return (_supabaseAdmin as any)[prop];
  },
});

export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          phone: string;
          password_hash: string;
          name: string;
          title: string;
          department_id: string | null;
          is_active: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
      };
      departments: {
        Row: {
          id: string;
          code: string;
          name: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          area: string | null;
          township: string | null;
          address: string | null;
          capacity: string | null;
          brand: string | null;
          panel_count: number | null;
          house_type: string | null;
          customer_type: string;
          dealer_id: string | null;
          survey_date: string | null;
          design_date: string | null;
          filing_date: string | null;
          record_date: string | null;
          grid_materials_date: string | null;
          ship_date: string | null;
          grid_date: string | null;
          close_date: string | null;
          user_acceptance_date: string | null;
          project_company: string | null;
          salesperson_id: string | null;
          tech_assigned_id: string | null;
          commission_locked: boolean;
          commission_price_per_panel: number | null;
          policy_snapshot: Record<string, unknown> | null;
          current_stage: string;
          stage_completed_at: string | null;
          entry_voucher_url: string | null;
          entry_voucher_uploaded_at: string | null;
          closing_video_url: string | null;
          closing_video_uploaded_at: string | null;
          commission_status: string;
          construction_labor: number | null;
          construction_material: number | null;
          construction_other: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      progress_logs: {
        Row: {
          id: string;
          customer_id: string;
          operator_id: string | null;
          from_stage: string | null;
          to_stage: string;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['progress_logs']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['progress_logs']['Insert']>;
      };
      commissions: {
        Row: {
          id: string;
          customer_id: string;
          employee_id: string;
          type: string;
          amount: number;
          status: string;
          applied_at: string | null;
          approved_at: string | null;
          paid_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['commissions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['commissions']['Insert']>;
      };
      growth_fund: {
        Row: {
          id: string;
          employee_id: string;
          amount: number;
          reason: string;
          category: string;
          recorded_by: string;
          month: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['growth_fund']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['growth_fund']['Insert']>;
      };
      social_media_posts: {
        Row: {
          id: string;
          employee_id: string;
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
        };
        Insert: Omit<Database['public']['Tables']['social_media_posts']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['social_media_posts']['Insert']>;
      };
      brand_policies: {
        Row: {
          id: string;
          version: number;
          brand: string;
          city: string | null;
          effective_from: string;
          effective_to: string | null;
          installation_fee: number;
          comprehensive_subsidy: number;
          channel_fee: number;
          install_days: number;
          grid_penalty: string | null;
          monthly_target: number | null;
          inspection_reward: number;
          quality_bond: number | null;
          note: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['brand_policies']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['brand_policies']['Insert']>;
      };
      dealers: {
        Row: {
          id: string;
          name: string;
          contact: string | null;
          phone: string | null;
          contract_no: string | null;
          contract_start: string | null;
          contract_end: string | null;
          deposit_amount: number | null;
          deposit_status: string;
          deposit_paid: number;
          fee_per_panel: number | null;
          status: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['dealers']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dealers']['Insert']>;
      };
      dealer_deposits: {
        Row: {
          id: string;
          dealer_id: string;
          amount: number;
          type: string;
          record_date: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['dealer_deposits']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dealer_deposits']['Insert']>;
      };
      brand_deposits: {
        Row: {
          id: string;
          brand: string;
          amount: number;
          pay_date: string | null;
          status: string;
          refunded: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['brand_deposits']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['brand_deposits']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          customer_id: string;
          brand: string;
          invoice_no: string | null;
          amount: number;
          invoice_date: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      monthly_target_bonus: {
        Row: {
          id: string;
          brand: string;
          year_month: string;
          target_panels: number | null;
          bonus_amount: number | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['monthly_target_bonus']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['monthly_target_bonus']['Insert']>;
      };
    };
  };
};
