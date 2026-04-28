import { z } from 'zod';

// ============================================================
// Common Schemas
// ============================================================

export const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号');

export const uuidSchema = z.string().uuid('无效的ID格式');

export const emailSchema = z.string().email('请输入有效的邮箱地址').optional().or(z.literal(''));

export const passwordSchema = z
  .string()
  .min(8, '密码至少8位')
  .regex(/[A-Z]/, '密码需包含大写字母')
  .regex(/[a-z]/, '密码需包含小写字母')
  .regex(/\d/, '密码需包含数字');

export const strongPasswordSchema = passwordSchema;

// ============================================================
// Customer Schemas
// ============================================================

export const customerBaseSchema = z.object({
  name: z.string().min(1, '客户姓名不能为空').max(100),
  phone: phoneSchema.optional().or(z.literal('')),
  area: z.string().max(50).optional(),
  township: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
  capacity: z.string().max(50).optional(),
  brand: z.string().max(50).optional(),
  panel_count: z.number().int().positive().optional(),
  house_type: z.string().max(50).optional(),
});

export const createCustomerSchema = customerBaseSchema.extend({
  customer_type: z.enum(['direct', 'dealer']).default('direct'),
  dealer_id: uuidSchema.optional(),
  salesperson_id: uuidSchema.optional(),
});

export const updateCustomerSchema = customerBaseSchema.partial().extend({
  salesperson_id: uuidSchema.optional().nullable(),
  tech_assigned_id: uuidSchema.optional().nullable(),
  commission_price_per_panel: z.number().positive().optional(),
  construction_labor: z.number().nonnegative().optional(),
  construction_material: z.number().nonnegative().optional(),
  construction_other: z.number().nonnegative().optional(),
});

// ============================================================
// Employee Schemas
// ============================================================

export const createEmployeeSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50),
  phone: phoneSchema,
  title: z.string().max(50).optional(),
  department_id: uuidSchema.optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
  title: z.string().max(50).optional(),
  department_id: uuidSchema.optional().nullable(),
  is_active: z.boolean().optional(),
});

// ============================================================
// Commission Schemas
// ============================================================

export const updateCommissionStatusSchema = z.object({
  status: z.enum(['pending', 'applied', 'approved', 'paid']),
});

// ============================================================
// Growth Fund Schemas
// ============================================================

export const createGrowthFundSchema = z.object({
  employee_id: uuidSchema,
  amount: z.number(),
  reason: z.string().min(1, '奖惩原因不能为空').max(500),
  category: z.enum(['工作汇报', '考勤', '行为规范', '卫生', '其他']),
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式错误'),
});

// ============================================================
// Social Media Schemas
// ============================================================

export const createSocialMediaPostSchema = z.object({
  employee_id: uuidSchema,
  platform: z.enum(['抖音', '快手', '小红书', '微信视频号']),
  video_url: z.string().url().optional().or(z.literal('')),
  duration_seconds: z.number().int().positive().optional(),
  is_real_person: z.boolean().default(false),
  likes: z.number().int().nonnegative().default(0),
  views: z.number().int().nonnegative().default(0),
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式错误'),
});

// ============================================================
// Brand Policy Schemas
// ============================================================

export const createBrandPolicySchema = z.object({
  brand: z.string().min(1, '品牌不能为空').max(50),
  city: z.string().max(50).optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误'),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  installation_fee: z.number().nonnegative().default(0),
  comprehensive_subsidy: z.number().nonnegative().default(0),
  channel_fee: z.number().nonnegative().default(0),
  install_days: z.number().int().positive().default(30),
  grid_penalty: z.string().max(200).optional(),
  monthly_target: z.number().int().positive().optional(),
  inspection_reward: z.number().nonnegative().default(0),
  quality_bond: z.number().nonnegative().optional(),
  note: z.string().max(500).optional(),
});

// ============================================================
// Dealer Schemas
// ============================================================

export const createDealerSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  contact: z.string().max(50).optional(),
  phone: phoneSchema.optional().or(z.literal('')),
  contract_no: z.string().max(50).optional(),
  contract_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  contract_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  deposit_amount: z.number().nonnegative().optional(),
  deposit_status: z.enum(['unpaid', 'partial', 'paid', 'refunded']).default('unpaid'),
  fee_per_panel: z.number().nonnegative().optional(),
  status: z.enum(['active', 'terminated']).default('active'),
  note: z.string().max(500).optional(),
});

// ============================================================
// Deposit Schemas
// ============================================================

export const createDealerDepositSchema = z.object({
  dealer_id: uuidSchema,
  amount: z.number().positive('金额必须为正数'),
  type: z.enum(['pay', 'refund']),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误'),
  note: z.string().max(500).optional(),
});

export const createBrandDepositSchema = z.object({
  brand: z.string().min(1).max(50),
  amount: z.number().positive('金额必须为正数'),
  pay_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  status: z.enum(['paid', 'partial_refund', 'refunded']).default('paid'),
  refunded: z.number().nonnegative().default(0),
  note: z.string().max(500).optional(),
});

// ============================================================
// Invoice Schemas
// ============================================================

export const createInvoiceSchema = z.object({
  customer_id: uuidSchema,
  brand: z.string().min(1).max(50),
  invoice_no: z.string().max(50).optional(),
  amount: z.number().positive('金额必须为正数'),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  note: z.string().max(500).optional(),
});

// ============================================================
// Warehouse Schemas
// ============================================================

export const createWarehouseMaterialSchema = z.object({
  brand: z.string().min(1, '品牌不能为空').max(50),
  model: z.string().max(50).optional(),
  quantity: z.number().int().nonnegative('数量不能为负数'),
  unit: z.string().max(20).optional(),
  note: z.string().max(500).optional(),
});

export const createStockMovementSchema = z.object({
  material_id: uuidSchema,
  type: z.enum(['inbound', 'outbound', 'adjust']),
  quantity: z.number().int().positive('数量必须为正数'),
  customer_id: uuidSchema.optional(),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误'),
  note: z.string().max(500).optional(),
});

// ============================================================
// Stage Update Schemas
// ============================================================

export const stageUpdateSchema = z.object({
  stage: z.enum(['survey', 'design', 'filing', 'record', 'grid_materials', 'ship', 'grid', 'close']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误'),
});

// ============================================================
// Utility Functions
// ============================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errors?: Record<string, string> };

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }

  return {
    success: false,
    error: result.error.issues[0]?.message || '验证失败',
    errors,
  };
}

export function validatePhone(phone: unknown): boolean {
  return phoneSchema.safeParse(phone).success;
}

export function validateUUID(id: unknown): boolean {
  return uuidSchema.safeParse(id).success;
}

export function validatePassword(password: unknown): boolean {
  return strongPasswordSchema.safeParse(password).success;
}
