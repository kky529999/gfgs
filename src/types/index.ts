// ============================================================
// 陕西智光新程能源科技有限公司 — TypeScript 类型定义
// 对应 SPEC.md 1.1-1.13 数据库 Schema
// ============================================================

// ---------- 枚举类型 ----------

export type DepartmentCode = 'admin' | 'business' | 'tech';
export type UserRole = 'admin' | 'business' | 'tech' | 'gm';

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

export type CommissionType = 'entry' | 'closing';
export type CommissionStatus = 'pending' | 'applied' | 'approved' | 'paid';

export type GrowthFundCategory =
  | '工作汇报'
  | '考勤'
  | '行为规范'
  | '卫生'
  | '其他';

export type SocialMediaPlatform = '抖音' | '快手' | '小红书' | '微信视频号';
export type SocialMediaStatus = 'pending' | 'approved' | 'paid';

export type DepositStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type DealerStatus = 'active' | 'terminated';
export type DepositType = 'pay' | 'refund';
export type BrandDepositStatus = 'paid' | 'partial_refund' | 'refunded';

// ---------- 数据库表类型 ----------

export interface Employee {
  id: string;
  phone: string;
  password_hash: string;
  name: string;
  title: string;
  department_id: string | null;
  department?: Department;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  code: DepartmentCode;
  name: string;
  created_at: string;
}

export interface Customer {
  id: string;
  // 基本信息
  name: string;
  phone: string | null;
  area: string | null;
  township: string | null;
  address: string | null;
  capacity: string | null;
  brand: string | null;
  panel_count: number | null;
  house_type: string | null;
  // 客户类型
  customer_type: CustomerType;
  dealer_id: string | null;
  dealer?: Dealer;
  // 8阶段日期
  survey_date: string | null;
  design_date: string | null;
  filing_date: string | null;
  record_date: string | null;
  grid_materials_date: string | null;
  ship_date: string | null;
  grid_date: string | null;
  close_date: string | null;
  // 用户验收
  user_acceptance_date: string | null;
  project_company: string | null;
  // 业务归属
  salesperson_id: string | null;
  salesperson?: Employee;
  tech_assigned_id: string | null;
  tech_assigned?: Employee;
  // 提成锁定价格（发货时锁定）
  commission_locked: boolean;
  commission_price_per_panel: number | null;
  // 品牌政策快照（JSONB，新建客户时自动快照）
  policy_snapshot: BrandPolicySnapshot | null;
  // 阶段状态
  current_stage: CustomerStage;
  stage_completed_at: string | null;
  // 进场凭证
  entry_voucher_url: string | null;
  entry_voucher_uploaded_at: string | null;
  // 闭环视频
  closing_video_url: string | null;
  closing_video_uploaded_at: string | null;
  // 业务费
  commission_status: CommissionStatus;
  // 成本记录
  construction_labor: number | null;
  construction_material: number | null;
  construction_other: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressLog {
  id: string;
  customer_id: string;
  customer?: Customer;
  operator_id: string | null;
  operator?: Employee;
  from_stage: CustomerStage | null;
  to_stage: CustomerStage;
  note: string | null;
  created_at: string;
}

export interface Commission {
  id: string;
  customer_id: string;
  customer?: Customer;
  employee_id: string;
  employee?: Employee;
  type: CommissionType;
  amount: number;
  status: CommissionStatus;
  applied_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthFund {
  id: string;
  employee_id: string;
  employee?: Employee;
  amount: number;
  reason: string;
  category: GrowthFundCategory;
  recorded_by: string;
  recorder?: Employee;
  month: string;
  created_at: string;
}

export interface SocialMediaPost {
  id: string;
  employee_id: string;
  employee?: Employee;
  platform: SocialMediaPlatform;
  video_url: string | null;
  duration_seconds: number | null;
  is_real_person: boolean;
  likes: number;
  views: number;
  status: SocialMediaStatus;
  reward: number | null;
  month: string;
  created_at: string;
}

export interface BrandPolicy {
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
  creator?: Employee;
  created_at: string;
  updated_at: string;
}

// 品牌政策快照（存储在 customers.policy_snapshot 中，JSONB）
export interface BrandPolicySnapshot {
  version: number;
  brand: string;
  city: string | null;
  installation_fee: number;
  comprehensive_subsidy: number;
  channel_fee: number;
  install_days: number;
  grid_penalty: string | null;
  inspection_reward: number;
}

export interface Dealer {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  contract_no: string | null;
  contract_start: string | null;
  contract_end: string | null;
  deposit_amount: number | null;
  deposit_status: DepositStatus;
  deposit_paid: number;
  fee_per_panel: number | null;
  status: DealerStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealerDeposit {
  id: string;
  dealer_id: string;
  dealer?: Dealer;
  amount: number;
  type: DepositType;
  record_date: string;
  note: string | null;
  created_by: string | null;
  creator?: Employee;
  created_at: string;
}

export interface BrandDeposit {
  id: string;
  brand: string;
  amount: number;
  pay_date: string | null;
  status: BrandDepositStatus;
  refunded: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  customer?: Customer;
  brand: string;
  invoice_no: string | null;
  amount: number;
  invoice_date: string | null;
  note: string | null;
  created_by: string | null;
  creator?: Employee;
  created_at: string;
}

export interface MonthlyDeliveryTarget {
  id: string;
  brand: string;
  year_month: string;
  target_panels: number;
  base_salary: number;
  bonus_for_meeting_target: number;
  note: string | null;
  created_by: string | null;
  creator?: Employee;
  created_at: string;
  updated_at: string;
}

export interface MonthlyDeptRules {
  id: string;
  department: string;
  year_month: string;
  // 综合部奖励
  admin_record_reward: number;
  admin_grid_reward: number;
  admin_close_reward: number;
  admin_recruit_invite_reward: number;
  admin_recruit_interview_reward: number;
  admin_recruit_probation_reward: number;
  admin_meeting_reward: number;
  admin_video_reward: number;
  admin_video_real_reward: number;
  admin_live_reward: number;
  // 综合部考核
  admin_record_penalty_days: number;
  admin_record_penalty_per_day: number;
  admin_grid_penalty_days: number;
  admin_grid_penalty_days_other: number;
  admin_grid_penalty_per_day: number;
  // 技术部奖励
  tech_survey_reward: number;
  tech_survey_reward_dealer: number;
  tech_design_own_reward: number;
  tech_design_outsource_reward: number;
  tech_grid_reward: number;
  tech_grid_reward_dealer: number;
  tech_warehouse_reward: number;
  // 技术部考核
  tech_design_penalty_days: number;
  tech_design_penalty_per_day: number;
  tech_grid_penalty_days: number;
  tech_grid_penalty_days_other: number;
  tech_grid_penalty_per_day: number;
  // 业务部奖励
  biz_commission_per_panel: number;
  biz_car_subsidy: number;
  biz_bonus_target: number;
  biz_bonus_if_met: number;
  biz_supervisor_reward_per_panel: number;
  // 业务部考核
  biz_min_ship_penalty: number;
  biz_min_ship_count: number;
  // 通用字段
  note: string | null;
  created_by: string | null;
  creator?: Employee;
  created_at: string;
  updated_at: string;
}

export interface MonthlyTargetBonus {
  id: string;
  brand: string;
  year_month: string;
  target_panels: number | null;
  bonus_amount: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type WarehouseStatus = 'in_stock' | 'reserved' | 'out';
export type StockMovementType = 'inbound' | 'outbound' | 'adjust';

export interface WarehouseMaterial {
  id: string;
  brand: string;
  model: string | null;
  quantity: number;
  unit: string | null;
  status: WarehouseStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  material_id: string;
  material?: WarehouseMaterial;
  type: StockMovementType;
  quantity: number;
  customer_id: string | null;
  customer?: Customer;
  operator_id: string | null;
  operator?: Employee;
  record_date: string;
  note: string | null;
  created_at: string;
}

// ---------- API 响应类型 ----------

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error?: string;
}

// ---------- 认证相关类型 ----------

export interface LoginInput {
  phone: string;
  password: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  title: string;
  role: UserRole;
  department_id: string | null;
  department_code: DepartmentCode | null;
  must_change_password: boolean;
}

export interface JwtPayload {
  user_id: string;
  role: UserRole;
  phone: string;
  iat: number;
  exp: number;
}

// ---------- 仪表盘类型 ----------

export interface DashboardSummary {
  total_customers: number;
  in_progress: number;
  grid_this_month: number;
  close_this_month: number;
}

export interface StageFunnelItem {
  stage: CustomerStage;
  label: string;
  count: number;
}

export interface GridAlert {
  customer_id: string;
  customer_name: string;
  brand: string;
  ship_date: string;
  deadline: string;
  days_remaining: number;
  is_overdue: boolean;
}

// ---------- 利润计算类型 ----------

export interface ProfitCalculation {
  customer_id: string;
  brand: string;
  city: string | null;
  panel_count: number;
  customer_type: CustomerType;
  dealer_id: string | null;
  brand_revenue: number;
  total_cost: number;
  dealer_fee: number;
  grid_penalty: number;
  monthly_target_bonus: number;
  net_profit: number;
}

// ---------- 8阶段配置 ----------

export const STAGE_CONFIG: Record<CustomerStage, { label: string; dept: DepartmentCode | 'gm' }> = {
  survey: { label: '现勘', dept: 'tech' },
  design: { label: '设计出图', dept: 'tech' },
  filing: { label: '建档通过', dept: 'admin' },
  record: { label: '备案', dept: 'admin' },
  grid_materials: { label: '并网资料', dept: 'admin' },
  ship: { label: '发货', dept: 'tech' },
  grid: { label: '并网', dept: 'tech' },
  close: { label: '闭环', dept: 'admin' },
};

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

// ---------- 需求反馈类型 ----------

export type RequirementType = 'feedback' | 'bug' | 'feature';
export type RequirementPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RequirementStatus = 'submitted' | 'in_progress' | 'completed' | 'confirmed' | 'rejected';

export interface Requirement {
  id: string;
  title: string;
  description: string | null;
  type: RequirementType;
  priority: RequirementPriority;
  status: RequirementStatus;
  submitter_id: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  response: string | null;
  completed_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRequirementInput {
  title: string;
  description?: string;
  type: RequirementType;
  priority: RequirementPriority;
}

export interface UpdateRequirementInput {
  title?: string;
  description?: string;
  type?: RequirementType;
  priority?: RequirementPriority;
  status?: RequirementStatus;
  assigned_to?: string | null;
  response?: string;
  confirmed_at?: string;
}
