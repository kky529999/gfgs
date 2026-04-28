import { z } from 'zod';

// ==================== Auth Validators ====================

export const loginSchema = z.object({
  phone: z.string()
    .min(1, '请输入手机号')
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  password: z.string()
    .min(1, '请输入密码'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, '请输入当前密码'),
  newPassword: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/\d/, '密码需包含数字'),
  confirmPassword: z.string()
    .min(1, '请确认新密码'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// ==================== Employee Validators ====================

export const createEmployeeSchema = z.object({
  name: z.string()
    .min(1, '请输入员工姓名')
    .max(50, '姓名不能超过50个字符'),
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  department: z.enum(['admin', 'business', 'tech'] as const, {
    error: '请选择部门',
  }),
  role: z.enum(['admin', 'business', 'tech', 'gm'] as const, {
    error: '请选择角色',
  }),
  position: z.string().max(100).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const resetPasswordSchema = z.object({
  employeeId: z.string()
    .uuid('无效的员工ID'),
});

// ==================== Customer Validators ====================

export const customerBaseSchema = z.object({
  name: z.string()
    .min(1, '请输入客户姓名')
    .max(100, '姓名不能超过100个字符'),
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  address: z.string()
    .max(500, '地址不能超过500个字符')
    .optional()
    .or(z.literal('')),
  village: z.string()
    .max(200, '村庄名称不能超过200个字符')
    .optional()
    .or(z.literal('')),
  town: z.string()
    .max(100, '乡镇名称不能超过100个字符')
    .optional()
    .or(z.literal('')),
  county: z.string()
    .max(100, '区县名称不能超过100个字符')
    .optional()
    .or(z.literal('')),
  city: z.string()
    .max(100, '城市名称不能超过100个字符')
    .optional()
    .or(z.literal('')),
  roofArea: z.number({ error: '请输入屋顶面积' })
    .positive('屋顶面积必须为正数')
    .max(10000, '屋顶面积不能超过10000平方米')
    .optional()
    .nullable(),
  roofType: z.enum(['砖混', '钢结构', '木结构', '其他'] as const, {
    error: '请选择屋顶类型',
  }).optional().nullable(),
  brand: z.string()
    .max(100, '品牌名称不能超过100个字符')
    .optional()
    .or(z.literal('')),
  capacity: z.number({ error: '请输入装机容量' })
    .positive('装机容量必须为正数')
    .max(1000, '装机容量不能超过1000kW')
    .optional()
    .nullable(),
  currentStage: z.enum([
    'survey', 'design', 'filing', 'record',
    'grid_materials', 'ship', 'grid', 'close'
  ] as const, { error: '请选择当前阶段' }),
  salespersonId: z.string()
    .uuid('无效的业务员ID')
    .optional()
    .nullable(),
  techAssignedId: z.string()
    .uuid('无效的技术员ID')
    .optional()
    .nullable(),
  surveyDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  designDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  filingDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  recordDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  gridMaterialsDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  shipDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  gridDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  closeDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  notes: z.string()
    .max(5000, '备注不能超过5000个字符')
    .optional()
    .or(z.literal('')),
});

export const createCustomerSchema = customerBaseSchema;

export const updateCustomerSchema = customerBaseSchema.partial();

export const customerSearchSchema = z.object({
  search: z.string().max(200).optional(),
  stage: z.enum([
    'survey', 'design', 'filing', 'record',
    'grid_materials', 'ship', 'grid', 'close'
  ] as const).optional(),
  salespersonId: z.string().uuid().optional(),
  techAssignedId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ==================== Commission Validators ====================

export const createCommissionSchema = z.object({
  customerId: z.string()
    .uuid('无效的客户ID'),
  employeeId: z.string()
    .uuid('无效的员工ID'),
  amount: z.number({ error: '请输入提成金额' })
    .min(0, '提成金额不能为负数'),
  type: z.enum(['advance', 'final'] as const, {
    error: '请选择提成类型',
  }),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
});

export const updateCommissionSchema = z.object({
  amount: z.number({ error: '请输入提成金额' })
    .min(0, '提成金额不能为负数')
    .optional(),
  status: z.enum(['pending', 'approved', 'paid', 'rejected'] as const, {
    error: '请选择状态',
  }).optional(),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional(),
  paidDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
});

// ==================== Growth Fund Validators ====================

export const createGrowthFundSchema = z.object({
  employeeId: z.string()
    .uuid('无效的员工ID'),
  amount: z.number({ error: '请输入金额' })
    .min(0, '金额不能为负数'),
  type: z.enum(['contribution', 'withdrawal', 'adjustment'] as const, {
    error: '请选择类型',
  }),
  period: z.string()
    .regex(/^\d{4}-\d{2}$/, '请输入正确的期间格式（YYYY-MM）')
    .optional(),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
});

export const updateGrowthFundSchema = z.object({
  amount: z.number({ error: '请输入金额' })
    .min(0, '金额不能为负数')
    .optional(),
  status: z.enum(['pending', 'approved', 'paid'] as const, {
    error: '请选择状态',
  }).optional(),
});

// ==================== Warehouse Validators ====================

export const createWarehouseMaterialSchema = z.object({
  name: z.string()
    .min(1, '请输入材料名称')
    .max(200, '名称不能超过200个字符'),
  category: z.enum(['solar_panel', 'inverter', 'bracket', 'cable', 'meter', 'other'] as const, {
    error: '请选择材料类别',
  }),
  unit: z.string()
    .min(1, '请输入单位')
    .max(20, '单位不能超过20个字符'),
  quantity: z.number({ error: '请输入数量' })
    .int('数量必须为整数')
    .min(0, '数量不能为负数'),
  minQuantity: z.number({ error: '请输入最小库存' })
    .int('最小库存必须为整数')
    .min(0, '最小库存不能为负数')
    .optional()
    .nullable(),
  price: z.number({ error: '请输入单价' })
    .min(0, '单价不能为负数')
    .optional()
    .nullable(),
  supplier: z.string()
    .max(200, '供应商名称不能超过200个字符')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
});

export const updateWarehouseMaterialSchema = createWarehouseMaterialSchema.partial();

export const warehouseInOutSchema = z.object({
  materialId: z.string()
    .uuid('无效的材料ID'),
  type: z.enum(['in', 'out'] as const, {
    error: '请选择类型',
  }),
  quantity: z.number({ error: '请输入数量' })
    .int('数量必须为整数')
    .positive('数量必须为正数'),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
});

// ==================== Invoice Validators ====================

export const createInvoiceSchema = z.object({
  customerId: z.string()
    .uuid('无效的客户ID'),
  invoiceNumber: z.string()
    .min(1, '请输入发票号码')
    .max(100, '发票号码不能超过100个字符'),
  amount: z.number({ error: '请输入发票金额' })
    .positive('发票金额必须为正数'),
  taxAmount: z.number({ error: '请输入税额' })
    .min(0, '税额不能为负数')
    .optional()
    .nullable(),
  type: z.enum(['normal', 'special'] as const, {
    error: '请选择发票类型',
  }),
  issueDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期'),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
});

// ==================== Deposit Validators ====================

export const createDepositSchema = z.object({
  customerId: z.string()
    .uuid('无效的客户ID'),
  dealerId: z.string()
    .uuid('无效的二级商ID')
    .optional()
    .nullable(),
  amount: z.number({ error: '请输入押金金额' })
    .positive('押金金额必须为正数'),
  type: z.enum(['deposit', 'refund'] as const, {
    error: '请选择类型',
  }),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期'),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
});

export const updateDepositSchema = z.object({
  status: z.enum(['pending', 'completed'] as const, {
    error: '请选择状态',
  }).optional(),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional(),
});

// ==================== Salary Validators ====================

export const createSalarySchema = z.object({
  employeeId: z.string()
    .uuid('无效的员工ID'),
  month: z.string()
    .regex(/^\d{4}-\d{2}$/, '请输入正确的月份格式（YYYY-MM）'),
  baseSalary: z.number({ error: '请输入基本工资' })
    .min(0, '基本工资不能为负数'),
  commission: z.number({ error: '请输入提成' })
    .min(0, '提成不能为负数')
    .optional()
    .default(0),
  bonus: z.number({ error: '请输入奖金' })
    .min(0, '奖金不能为负数')
    .optional()
    .default(0),
  deductions: z.number({ error: '请输入扣款' })
    .min(0, '扣款不能为负数')
    .optional()
    .default(0),
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional()
    .or(z.literal('')),
});

// ==================== Social Media Validators ====================

export const createSocialMediaSchema = z.object({
  title: z.string()
    .min(1, '请输入标题')
    .max(200, '标题不能超过200个字符'),
  platform: z.enum(['wechat', 'tiktok', 'xiaohongshu', 'douyin', 'weibo', 'other'] as const, {
    error: '请选择平台',
  }),
  type: z.enum(['video', 'article', 'image'] as const, {
    error: '请选择内容类型',
  }),
  publishDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期')
    .optional()
    .nullable(),
  views: z.number({ error: '请输入播放量' })
    .int('播放量必须为整数')
    .min(0, '播放量不能为负数')
    .optional()
    .nullable(),
  likes: z.number({ error: '请输入点赞数' })
    .int('点赞数必须为整数')
    .min(0, '点赞数不能为负数')
    .optional()
    .nullable(),
  shares: z.number({ error: '请输入分享数' })
    .int('分享数必须为整数')
    .min(0, '分享数不能为负数')
    .optional()
    .nullable(),
  notes: z.string()
    .max(1000, '备注不能超过1000个字符')
    .optional()
    .or(z.literal('')),
});

// ==================== Utility Functions ====================

export type ValidationError = {
  field: string;
  message: string;
};

export function getValidationErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

export function formatZodError(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (firstIssue) {
    return firstIssue.message;
  }
  return '输入验证失败';
}
