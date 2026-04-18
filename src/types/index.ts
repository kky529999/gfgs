export type StageKey =
  | 'sign_contract'
  | 'survey'
  | 'design'
  | 'record_approved'
  | 'filing'
  | 'grid_docs'
  | 'shipping'
  | 'grid_connection'
  | 'closed'
  | 'acceptance';

export type Brand = '天合' | '光伏星' | '其他';

export type StatusColor = 'green' | 'yellow' | 'orange' | 'red';

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: '综合部' | '业务部' | '技术部';
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  serial_number?: number;
  region?: string;
  name: string;
  salesperson_id?: string;
  panel_count?: number;
  brand?: Brand;
  house_type?: string;
  project_company?: string;
  contract_date?: string;
  survey_date?: string;
  design_date?: string;
  record_approved_date?: string;
  filing_date?: string;
  grid_docs_date?: string;
  shipping_date?: string;
  grid_date?: string;
  closed_date?: string;
  acceptance_date?: string;
  business_fee_status?: string;
  current_stage: StageKey;
  created_at: string;
  updated_at: string;
  salesperson?: Employee;
}

export interface StageDefinition {
  id: string;
  stage_key: StageKey;
  stage_name: string;
  sequence: number;
  default_days?: number;
  created_at: string;
}

export interface StageHistory {
  id: string;
  customer_id: string;
  stage_key: StageKey;
  stage_name: string;
  entered_at: string;
  exited_at?: string;
  employee_id?: string;
  notes?: string;
}

export interface CustomerWithDeadline extends Customer {
  remaining_days?: number;
  status: StatusColor;
  deadline?: string;
}
