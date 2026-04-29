// Customer stage types matching database enums
export type CustomerStage =
  | 'survey'
  | 'design'
  | 'filing'
  | 'record'
  | 'grid_materials'
  | 'ship'
  | 'grid'
  | 'close';

export type CustomerType = 'direct' | 'dealer';

export type CommissionStatus = 'pending' | 'applied' | 'approved' | 'paid';

export type CommissionType = 'entry' | 'closing';

// Stage display labels
export const STAGE_LABELS: Record<CustomerStage, string> = {
  survey: '现勘',
  design: '设计出图',
  filing: '建档通过',
  record: '备案',
  grid_materials: '并网资料',
  ship: '发货',
  grid: '并网',
  close: '闭环',
};

// Stage order for progression
export const STAGE_ORDER: CustomerStage[] = [
  'survey',
  'design',
  'filing',
  'record',
  'grid_materials',
  'ship',
  'grid',
  'close',
];

// Customer type labels
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  direct: '直客',
  dealer: '二级商客户',
};

// Commission status labels
export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: '待申请',
  applied: '已申请',
  approved: '已审批',
  paid: '已支付',
};

// Customer data interface
export interface Customer {
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
  customer_type: CustomerType;
  dealer_id: string | null;
  // 8阶段日期
  survey_date: string | null;
  design_date: string | null;
  filing_date: string | null;
  record_date: string | null;
  grid_materials_date: string | null;
  ship_date: string | null;
  grid_date: string | null;
  close_date: string | null;
  // 8阶段负责人
  survey_operator_id: string | null;
  design_operator_id: string | null;
  filing_operator_id: string | null;
  record_operator_id: string | null;
  grid_materials_operator_id: string | null;
  ship_operator_id: string | null;
  grid_operator_id: string | null;
  close_operator_id: string | null;
  // 其他字段
  user_acceptance_date: string | null;
  project_company: string | null;
  salesperson_id: string | null;
  tech_assigned_id: string | null;
  commission_locked: boolean;
  commission_price_per_panel: number | null;
  policy_snapshot: Record<string, unknown> | null;
  current_stage: CustomerStage;
  stage_completed_at: string | null;
  entry_voucher_url: string | null;
  entry_voucher_uploaded_at: string | null;
  closing_video_url: string | null;
  closing_video_uploaded_at: string | null;
  commission_status: CommissionStatus;
  construction_labor: number | null;
  construction_material: number | null;
  construction_other: number | null;
  created_at: string;
  updated_at: string;
}

// Customer with related data
export interface CustomerWithRelations extends Customer {
  salesperson?: { id: string; name: string; phone: string } | null;
  tech_assigned?: { id: string; name: string; phone: string } | null;
  dealer?: { id: string; name: string } | null;
  // 阶段负责人
  survey_operator?: { id: string; name: string; phone: string } | null;
  design_operator?: { id: string; name: string; phone: string } | null;
  filing_operator?: { id: string; name: string; phone: string } | null;
  record_operator?: { id: string; name: string; phone: string } | null;
  grid_materials_operator?: { id: string; name: string; phone: string } | null;
  ship_operator?: { id: string; name: string; phone: string } | null;
  grid_operator?: { id: string; name: string; phone: string } | null;
  close_operator?: { id: string; name: string; phone: string } | null;
}

// Input types for creating/updating customers
export interface CreateCustomerInput {
  name: string;
  phone?: string;
  area?: string;
  township?: string;
  address?: string;
  capacity?: string;
  brand?: string;
  panel_count?: number;
  house_type?: string;
  customer_type?: CustomerType;
  dealer_id?: string;
  salesperson_id?: string;
  tech_assigned_id?: string;
  current_stage?: CustomerStage;
  survey_date?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  area?: string;
  township?: string;
  address?: string;
  capacity?: string;
  brand?: string;
  panel_count?: number;
  house_type?: string;
  customer_type?: CustomerType;
  dealer_id?: string;
  salesperson_id?: string;
  tech_assigned_id?: string;
  survey_date?: string;
  design_date?: string;
  filing_date?: string;
  record_date?: string;
  grid_materials_date?: string;
  ship_date?: string;
  grid_date?: string;
  close_date?: string;
  // 阶段负责人
  survey_operator_id?: string;
  design_operator_id?: string;
  filing_operator_id?: string;
  record_operator_id?: string;
  grid_materials_operator_id?: string;
  ship_operator_id?: string;
  grid_operator_id?: string;
  close_operator_id?: string;
  // 其他字段
  user_acceptance_date?: string;
  project_company?: string;
  current_stage?: CustomerStage;
  entry_voucher_url?: string;
  closing_video_url?: string;
  construction_labor?: number;
  construction_material?: number;
  construction_other?: number;
}

// Stage progress input (advancing to next stage)
export interface AdvanceStageInput {
  customer_id: string;
  to_stage: CustomerStage;
  date?: string;
  note?: string;
}

// Dashboard statistics
export interface DashboardStats {
  totalCustomers: number;
  inProgress: number;
  gridThisMonth: number;
  closeThisMonth: number;
  stageCounts: Record<CustomerStage, number>;
}
