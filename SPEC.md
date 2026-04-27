# SPEC：陕西智光新程能源科技有限公司业务管理系统

> **版本**：v0.1
> **状态**：待开发

---

## 1. 数据库 Schema（Supabase / PostgreSQL）

### 1.1 employees（员工表）

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(11) UNIQUE NOT NULL,     -- 登录手机号
  password_hash TEXT NOT NULL,            -- bcrypt 哈希
  name VARCHAR(50) NOT NULL,              -- 姓名
  title VARCHAR(50) NOT NULL,             -- 职位：副总经理/综合主管/综合文员/技术主管/技术员/业务主管/业务员
  department_id UUID REFERENCES departments(id), -- 部门ID
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT true,  -- 首次登录强制修改
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 departments（部门表）

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,   -- admin/business/tech
  name VARCHAR(50) NOT NULL,           -- 综合管理部/业务开发部/技术方案部
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 customers（客户表）

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 基本信息
  name VARCHAR(100) NOT NULL,          -- 客户姓名
  phone VARCHAR(11),                   -- 客户电话
  area VARCHAR(50),                    -- 区域
  township VARCHAR(50),                 -- 乡镇
  address TEXT,                        -- 详细地址
  capacity VARCHAR(20),                -- 装机容量
  brand VARCHAR(50),                   -- 品牌（天合/其他）
  panel_count INTEGER,                 -- 组件数量
  house_type VARCHAR(50),              -- 户型

  -- 客户类型
  customer_type VARCHAR(20) DEFAULT 'direct',  -- direct（直销）/ dealer（二级商）
  dealer_id UUID REFERENCES dealers(id),       -- 二级商（仅二级商客户填写）

  -- 8阶段日期
  survey_date DATE,                    -- 现勘日期
  design_date DATE,                   -- 设计出图日期
  filing_date DATE,                    -- 建档通过日期
  record_date DATE,                    -- 备案日期（网上申报）
  grid_materials_date DATE,           -- 并网资料+网上国网提交日期
  ship_date DATE,                      -- 发货日期
  grid_date DATE,                      -- 并网日期
  close_date DATE,                     -- 闭环日期

  -- 用户验收（不在主流程内，供参考）
  user_acceptance_date DATE,           -- 用户验收日期
  project_company VARCHAR(100),         -- 项目公司

  -- 业务归属
  salesperson_id UUID REFERENCES employees(id),  -- 业务员
  tech_assigned_id UUID REFERENCES employees(id), -- 分配的技术人员

  -- 提成锁定价格（发货时锁定）
  commission_locked BOOLEAN DEFAULT false,
  commission_price_per_panel DECIMAL(10,2),  -- 锁定单价

  -- 品牌政策快照（发货时复制当时的品牌政策）
  policy_snapshot JSONB,                     -- 快照品牌政策（JSON，包含 version/brand/city/installation_fee/comprehensive_subsidy/channel_fee/install_days/grid_penalty 等）

  -- 阶段状态
  current_stage VARCHAR(20) DEFAULT 'survey',  -- survey/design/filing/record/grid_materials/ship/grid/close
  stage_completed_at TIMESTAMPTZ,

  -- 进场凭证
  entry_voucher_url TEXT,              -- 进场凭证文件URL
  entry_voucher_uploaded_at TIMESTAMPTZ,

  -- 闭环视频
  closing_video_url TEXT,              -- 闭环视频URL
  closing_video_uploaded_at TIMESTAMPTZ,

  -- 业务费
  commission_status VARCHAR(20) DEFAULT 'pending',  -- pending/entry_paid/closed_paid/fully_paid

  -- 成本记录（用于利润计算）
  construction_labor DECIMAL(10,2),    -- 人工费
  construction_material DECIMAL(10,2), -- 材料费
  construction_other DECIMAL(10,2),     -- 其他费用

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.4 progress_logs（进度日志表）

```sql
CREATE TABLE progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES employees(id),
  from_stage VARCHAR(20),
  to_stage VARCHAR(20) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.5 commissions（提成表）

```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  type VARCHAR(20) NOT NULL,           -- entry（进场50%）/ closing（闭环50%）
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending/applied/approved/paid
  applied_at TIMESTAMPTZ,             -- 钉钉提交时间
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.6 growth_fund（成长基金表）

```sql
CREATE TABLE growth_fund (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  amount DECIMAL(10,2) NOT NULL,      -- 正数=奖励，负数=罚款
  reason VARCHAR(200) NOT NULL,        -- 原因
  category VARCHAR(50),                -- 分类：工作汇报/考勤/行为规范/卫生/其他
  recorded_by UUID REFERENCES employees(id),
  month DATE NOT NULL,                 -- 记录所属月份（便于汇总）
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.7 自媒体记录表

```sql
CREATE TABLE social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  platform VARCHAR(20) NOT NULL,       -- 抖音/快手/小红书/微信视频号
  video_url TEXT,
  duration_seconds INTEGER,            -- 时长（秒）
  is_real_person BOOLEAN DEFAULT false, -- 是否真人出镜
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',  -- pending/approved/paid
  reward DECIMAL(10,2),               -- 奖励金额
  month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.8 品牌政策配置表

```sql
CREATE TABLE brand_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER DEFAULT 1,             -- 版本号（同一品牌+城市递增）
  brand VARCHAR(50) NOT NULL,             -- 天合/正泰/其他
  city VARCHAR(50),                      -- 适用城市（如：宝鸡，留空表示通用）
  effective_from DATE NOT NULL,          -- 生效日期
  effective_to DATE,                     -- 失效日期（NULL表示永久生效）
  installation_fee DECIMAL(10,2),        -- 安装服务费（元/块）
  comprehensive_subsidy DECIMAL(10,2),   -- 综合补贴（元/块）
  channel_fee DECIMAL(10,2),            -- 渠道提点（元/块）
  install_days INTEGER,                  -- 报装周期（天）
  grid_penalty TEXT,                     -- 并网考核规则（如：超期扣10元/块/天）
  monthly_target INTEGER,                -- 月度送量（块）
  inspection_reward DECIMAL(10,2),       -- 验收奖励（元/户）
  quality_bond DECIMAL(10,2),            -- 质保金（元）
  note TEXT,
  is_active BOOLEAN DEFAULT true,        -- 是否当前有效版本
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 唯一约束：同一品牌+城市+版本唯一
  UNIQUE(brand, city, version)
);
```

### 1.9 二级商表

```sql
CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,         -- 二级商名称
  contact VARCHAR(50),                -- 联系人
  phone VARCHAR(11),                   -- 联系电话
  contract_no VARCHAR(50),            -- 合同编号
  contract_start DATE,                -- 合同开始日期
  contract_end DATE,                  -- 合同结束日期
  deposit_amount DECIMAL(10,2),       -- 押金金额
  deposit_status VARCHAR(20) DEFAULT 'unpaid',  -- unpaid/partial/paid/refunded
  deposit_paid DECIMAL(10,2) DEFAULT 0, -- 已付押金
  fee_per_panel DECIMAL(10,2),         -- 每块板子费用（元）
  status VARCHAR(20) DEFAULT 'active',  -- active/terminated
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.10 二级商押金记录表

```sql
CREATE TABLE dealer_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id),
  amount DECIMAL(10,2) NOT NULL,       -- 金额
  type VARCHAR(20) NOT NULL,          -- pay/refund
  record_date DATE NOT NULL,
  note TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.11 品牌方押金表

```sql
CREATE TABLE brand_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(50) NOT NULL,         -- 天合/正泰
  amount DECIMAL(10,2) NOT NULL,      -- 押金金额
  pay_date DATE,                      -- 缴纳日期
  status VARCHAR(20) DEFAULT 'paid',  -- paid/partial_refund/refunded
  refunded DECIMAL(10,2) DEFAULT 0,   -- 已退金额
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.12 发票表

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  brand VARCHAR(50) NOT NULL,         -- 哪个品牌
  invoice_no VARCHAR(50),             -- 发票号
  amount DECIMAL(10,2) NOT NULL,      -- 开票金额
  invoice_date DATE,                  -- 开票日期
  note TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.13 月度达量奖励表

```sql
CREATE TABLE monthly_target_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(50) NOT NULL,         -- 天合/正泰
  year_month DATE NOT NULL,           -- 年月（2025-01-01格式，取1号）
  target_panels INTEGER,              -- 目标板数
  bonus_amount DECIMAL(10,2),        -- 奖励金额（达成目标后发放）
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.15 索引

```sql
-- 客户相关查询优化
CREATE INDEX idx_customers_salesperson ON customers(salesperson_id);
CREATE INDEX idx_customers_tech_assigned ON customers(tech_assigned_id);
CREATE INDEX idx_customers_dealer ON customers(dealer_id);
CREATE INDEX idx_customers_brand ON customers(brand);
CREATE INDEX idx_customers_current_stage ON customers(current_stage);
CREATE INDEX idx_customers_ship_date ON customers(ship_date);
CREATE INDEX idx_customers_grid_date ON customers(grid_date);
CREATE INDEX idx_customers_close_date ON customers(close_date);

-- 提成和成长基金按员工查询
CREATE INDEX idx_commissions_employee ON commissions(employee_id);
CREATE INDEX idx_commissions_customer ON commissions(customer_id);
CREATE INDEX idx_growth_fund_employee ON growth_fund(employee_id);
CREATE INDEX idx_growth_fund_month ON growth_fund(month);

-- 品牌政策查询
CREATE INDEX idx_brand_policies_brand ON brand_policies(brand);
CREATE INDEX idx_brand_policies_active ON brand_policies(is_active);

-- 二级商
CREATE INDEX idx_dealers_status ON dealers(status);
CREATE INDEX idx_dealer_deposits_dealer ON dealer_deposits(dealer_id);

-- 时间范围查询
CREATE INDEX idx_customers_created ON customers(created_at);
CREATE INDEX idx_progress_logs_customer ON progress_logs(customer_id);
CREATE INDEX idx_progress_logs_created ON progress_logs(created_at);
```

---

## 2. API 设计（Next.js Server Actions）

### 2.0 认证实现说明（自定义密码校验）

本系统使用自定义认证，不使用 Supabase Auth。

**登录流程：**
1. 前端调用 `auth.login(phone, password)` Server Action
2. 后端 bcrypt 比对 `employees.password_hash`
3. 验证通过后，返回自定义 JWT（payload 包含 `user_id` + `role`）
4. 前端将 JWT 存入 httpOnly Cookie
5. 后续所有请求从 Cookie 读取 JWT，解析出 `user_id` 和 `role`

**RLS session 设置（关键）：**
由于 Supabase 的 RLS 不能直接读取我们的自定义 Cookie，
需要在 Supabase Database 中创建一个 helper function：

```sql
CREATE OR REPLACE FUNCTION set_auth_session(p_user_id UUID, p_role TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('auth.user_id', p_user_id::TEXT, true);
  PERFORM set_config('auth.user_role', p_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

然后在每个 Server Action 或 API 路由中，验证 JWT 后调用：
```sql
SELECT set_auth_session('uuid-here', 'business');
```

这样 RLS 策略就能读到 session 变量了。

**密码规则：** 默认 `123456`，首次登录强制修改为强密码。

| Action | 说明 |
|--------|------|
| `auth.login(phone, password)` | 登录，返回 JWT token |
| `auth.changePassword(oldPwd, newPwd)` | 修改密码 |
| `auth.getProfile()` | 获取当前用户信息 |

### 2.1 客户管理

| Action | 说明 |
|--------|------|
| `customers.list({ page, pageSize, filters })` | 列表（分页，page从1开始，默认pageSize=20）|
| `customers.get(id)` | 详情 |
| `customers.create(data)` | 新建（业务部录入新客户基本信息：姓名、电话、区域、乡镇、地址、容量、品牌、板数、户型）|
| `customers.update(id, data)` | 更新基本信息（仅创建者或综合部可编辑）|
| `customers.assignSalesperson(customerId, employeeId)` | 分配业务员（业务主管/综合部）|
| `customers.assignTech(customerId, employeeId)` | 分配技术员（技术主管/综合部）|

### 2.3 8阶段进度录入

每个阶段由负责部门录入，不可跨部门操作。

| Action | 说明 | 负责部门 |
|--------|------|---------|
| `customers.setSurveyDate(customerId, date)` | 录入现勘日期 | 技术部 |
| `customers.setDesignDate(customerId, date)` | 录入设计出图日期 | 技术部 |
| `customers.setFilingDate(customerId, date)` | 录入建档通过日期 | 综合部 |
| `customers.setRecordDate(customerId, date)` | 录入备案日期（网上申报）| 综合部 |
| `customers.setGridMaterialsDate(customerId, date)` | 录入并网资料+网上国网提交日期 | 综合部 |
| `customers.setShipDate(customerId, date, commissionPrice)` | 录入发货日期，**同时锁定提成单价** | 技术部 |
| `customers.setGridDate(customerId, date)` | 录入并网日期 | 技术部 |
| `customers.setCloseDate(customerId, date)` | 录入闭环日期 | 综合部 |

> **品牌政策快照时机**：客户新建时，根据品牌+城市自动获取当前生效的品牌政策版本，
> 存入 `policy_snapshot` 字段。后续利润计算均使用此快照，不受政策变更影响。
> 政策管理页面（品牌政策配置）可查看/新增/编辑历史版本。

### 2.4 附件上传

| Action | 说明 |
|--------|------|
| `customers.uploadEntryVoucher(customerId, fileUrl)` | 上传进场凭证（业务部/综合部）|
| `customers.uploadClosingVideo(customerId, fileUrl)` | 上传闭环视频（业务部）|
| `customers.calculateGridDeadline(customerId)` | 计算并网截止日（天合43天/其他28天，自动计算）|

### 2.5 仪表盘

| Action | 说明 |
|--------|------|
| `dashboard.summary()` | 全局汇总（总客户/在途/本月并网/本月闭环）|
| `dashboard.funnel()` | 8阶段漏斗 |
| `dashboard.alerts()` | 逾期预警列表 |
| `dashboard.deptSummary(dept)` | 部门汇总 |

### 2.5 提成管理

| Action | 说明 |
|--------|------|
| `commissions.list(filters)` | 列表 |
| `commissions.apply(id)` | 申请发放（钉钉提交标记）|
| `commissions.calculate(customerId, type)` | 计算应发金额 |

### 2.6 成长基金

| Action | 说明 |
|--------|------|
| `growthFund.list(month)` | 月度列表 |
| `growthFund.record(data)` | 记录奖惩 |
| `growthFund.monthlySummary(month)` | 月度汇总 |

### 2.6 品牌政策配置

| Action | 说明 |
|--------|------|
| `brandPolicies.list()` | 列表（所有政策）|
| `brandPolicies.get(brand, city)` | 获取指定品牌+城市的政策 |
| `brandPolicies.create(data)` | 新增政策（综合部/总经理）|
| `brandPolicies.update(id, data)` | 更新政策（综合部/总经理）|
| `brandPolicies.delete(id)` | 删除政策（综合部/总经理）|

### 2.7 二级商管理

| Action | 说明 |
|--------|------|
| `dealers.list()` | 列表 |
| `dealers.get(id)` | 详情（含押金记录）|
| `dealers.create(data)` | 新建二级商 |
| `dealers.update(id, data)` | 更新二级商信息 |
| `dealers.recordDeposit(dealerId, data)` | 记录押金缴纳/退还 |
| `dealers.getCustomers(dealerId)` | 获取该二级商所有客户 |

### 2.8 押金台账

| Action | 说明 |
|--------|------|
| `deposits.listBrandDeposits()` | 品牌方押金列表 |
| `deposits.updateBrandDeposit(id, data)` | 更新品牌方押金 |
| `deposits.listDealerDeposits(dealerId)` | 二级商押金记录列表 |

### 2.9 客户利润计算

| Action | 说明 |
|--------|------|
| `profits.calculate(customerId)` | 计算单个客户利润明细 |
| `profits.list(filters)` | 利润列表（支持按月/品牌筛选）|
| `profits.export(filters)` | 导出利润报表 |

### 2.10 发票管理

| Action | 说明 |
|--------|------|
| `invoices.list(customerId)` | 按客户查发票 |
| `invoices.create(data)` | 录入发票 |
| `invoices.update(id, data)` | 更新发票 |

### 2.11 月度达量奖励

| Action | 说明 |
|--------|------|
| `monthlyBonuses.list(year, month)` | 查指定月份的奖励配置 |
| `monthlyBonuses.set(data)` | 设置某月的目标/奖励（综合部）|
| `monthlyBonuses.calculate(brand, year, month)` | 计算某月是否达成目标并应发奖励 |

---

## 3. 页面结构（菜单分类）

```
📊 工作台
└── /dashboard              全局仪表盘（所有人可见）
    ├── 全局视图
    ├── 综合部视图
    ├── 业务部视图
    └── 技术部视图

📋 运营管理
├── /customers              客户列表（按角色过滤）
│   ├── /[id]              客户详情 + 8阶段进度 + 利润明细
│   └── /new               新建客户
├── /commissions            提成管理
└── /growth-fund           成长基金（全员可见汇总，个人明细隔离）

👥 人力资源
├── /admin/employees        员工管理（综合部/总经理）
└── /admin/salary           薪资汇总（综合部/总经理）

📹 自媒体宣传
└── /admin/social-media     自媒体记录（综合部/总经理）

📦 仓储管理
└── /admin/warehouse        仓库台账（技术部/综合部）

💰 代理商管理
├── /admin/dealers          二级商列表 + 详情 + 押金记录
├── /admin/brand-policies   品牌政策配置（CRUD）
└── /admin/deposits         押金台账（品牌方 + 二级商）

🔧 系统设置
├── /settings               个人设置（所有人）
└── /admin                  管理后台（综合部/总经理）
```

### 菜单权限对照

| 菜单分类 | 可见范围 |
|---------|---------|
| 工作台 | 所有人 |
| 运营管理 | 所有人（数据范围按角色过滤）|
| 人力资源 | 综合部 + 总经理 |
| 自媒体宣传 | 综合部 + 总经理 |
| 仓储管理 | 技术部 + 综合部 |
| 代理商管理 | 综合部 + 总经理 |
| 系统设置 | 所有人（个人设置），管理后台仅综合部/总经理 |

---

## 4. 关键业务逻辑

### 4.1 并网截止日计算

```typescript
function getGridDeadline(shipDate: Date, brand: string): Date {
  const days = brand === '天合' ? 43 : 28;
  return addDays(shipDate, days);
}
```

### 4.2 提成计算

```typescript
function calculateCommission(panelCount: number, pricePerPanel: number, type: 'entry' | 'closing'): number {
  const total = panelCount * pricePerPanel;
  return type === 'entry' ? total * 0.5 : total * 0.5;
}
```

### 4.3 阶段推进规则

| 当前阶段 | 可推进至 | 所需字段 |
|----------|---------|---------|
| survey | design | survey_date |
| design | filing | design_date |
| filing | record | filing_date |
| record | grid_materials | record_date |
| grid_materials | ship | grid_materials_date |
| ship | grid | ship_date, grid_date |
| grid | close | grid_date, close_date, closing_video_url |

### 4.4 客户利润计算

```typescript
interface ProfitCalculation {
  customerId: string;
  brand: string;
  city: string;
  panelCount: number;
  customerType: 'direct' | 'dealer';  // 直销/二级商
  dealerId?: string;  // 二级商客户才填

  // 品牌方结算（客户闭环后）
  brandPolicy: BrandPolicy;
  brandRevenue: number;    // 品牌方给我们的钱 = (安装费+综合补贴+渠道提点)×板数 + 验收奖励

  // 成本（并网后录入）
  constructionLabor: number;    // 人工费
  constructionMaterial: number; // 材料费
  constructionOther: number;   // 其他费用
  totalCost: number;           // 成本合计

  // 二级商分成（二级商客户才计算，直销为0）
  dealerFee: number;

  // 奖励/扣款
  gridPenalty: number;     // 并网逾期扣款
  monthlyTargetBonus: number; // 月度达量奖励（按月配置）

  // 净利润
  netProfit: number;
}

function calculateCustomerProfit(customer: Customer, brandPolicy: BrandPolicy, dealer?: Dealer): ProfitCalculation {
  const panelCount = customer.panel_count;

  // 品牌方结算 = (安装服务费 + 综合补贴 + 渠道提点) × 板数 + 验收奖励
  const brandRevenue = (
    brandPolicy.installation_fee +
    brandPolicy.comprehensive_subsidy +
    brandPolicy.channel_fee
  ) * panelCount + brandPolicy.inspection_reward;

  // 成本（并网后录入）
  const totalCost =
    (customer.construction_labor || 0) +
    (customer.construction_material || 0) +
    (customer.construction_other || 0);

  // 二级商分成（直销=0）
  const dealerFee = customer.customer_type === 'dealer' && dealer
    ? dealer.fee_per_panel * panelCount
    : 0;

  // 并网逾期扣款（如果超期）
  let gridPenalty = 0;
  if (customer.grid_date && customer.ship_date) {
    const deadline = getGridDeadline(customer.ship_date, customer.brand);
    if (customer.grid_date > deadline) {
      const overdueDays = differenceInDays(customer.grid_date, deadline);
      const penaltyRule = brandPolicy.grid_penalty;
      gridPenalty = calculatePenalty(penaltyRule, overdueDays, panelCount);
    }
  }

  // 净利润 = 品牌方结算 - 成本 - 二级商分成 - 逾期扣款
  const netProfit = brandRevenue - totalCost - dealerFee - gridPenalty;

  return {
    customerId: customer.id,
    brand: customer.brand,
    panelCount,
    customerType: customer.customer_type,
    dealerId: customer.dealer_id,
    brandPolicy,
    brandRevenue,
    totalCost,
    dealerFee,
    gridPenalty,
    monthlyTargetBonus: 0,  // 月度奖励单独统计
    netProfit
  };
}
```

### 4.5 并网截止日计算（使用配置）

```typescript
async function getGridDeadline(shipDate: Date, brand: string, city?: string): Promise<Date> {
  const policy = await getBrandPolicy(brand, city);
  const days = policy?.install_days || (brand === '天合' ? 43 : 28);
  return addDays(shipDate, days);
}
```

### 4.6 成本录入规则

- **录入时机**：并网日期（grid_date）录入后，才允许填写施工成本
- **录入人**：财务或综合部
- **字段**：人工费、材料费、其他费用
- **流程**：并网 → 填成本 → 品牌打款（约2周）→ 开票

### 4.7 月度达量奖励

月度送量奖励按月配置，不同月份可能不同：
- 需新增 `monthly_target_bonuses` 表，按【品牌+月份】配置奖励金额
- 或在 brand_policies 中添加默认奖励值，实际按月调整

### 4.8 发票规则

- 每客户开一张发票
- 发票金额 = 该客户品牌方结算金额（brandRevenue）
- 发票号、金额、日期记录到 invoices 表

---

## 5. 数据迁移

来源文件：`data/客户进度表(4月2日).xlsx`（55行数据）

目标：将 Excel 中以下字段导入 customers 表：
- 序号 → 保留
- 区域 → area
- 乡镇 → township
- 客户名称 → name
- 业务员 → salesperson_id（需映射为 employees.id）
- 板数 → panel_count
- 品牌 → brand
- 户型 → house_type
- 现勘 → survey_date
- 设计出图 → design_date
- 建档通过 → filing_date
- 备案 → record_date
- 并网资料+网上国网 → grid_materials_date
- 发货日期 → ship_date
- 并网日期 → grid_date
- 闭环日期 → close_date
- 用户验收 → user_acceptance_date
- 项目公司 → project_company
- 业务费 → commission_status

注：55行客户均为直销（customer_type = 'direct'，无 dealer_id）
    发货至并网天数、并网到闭环天数为 Excel 计算列，跳过。

---

## 6. 第一阶段交付物

1. Supabase 项目 + 完整 Schema + RLS 配置
2. 员工账号初始化（11人）
3. Excel 数据导入（55行客户）
4. 登录 + 强制改密
5. 客户 CRUD + 8 阶段推进
6. 全局仪表盘
7. 各部门视图

---

## 7. 技术决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| UI 框架 | Tailwind + Headless UI | 快速开发，维护成本低 |
| 状态管理 | React Context + Server Actions | 简单够用 |
| 表格 | TanStack Table | 灵活、TypeScript 支持好 |
| 日期处理 | date-fns | 轻量、tree-shakable |
| 图表 | Recharts | 轻量、React 原生 |
| 文件存储 | Supabase Storage | 与数据库同一家，集成方便 |
| 密码哈希 | bcrypt | 标准、安全 |
| 认证方式 | 自定义 JWT（不使用 Supabase Auth） | 用户选择自行实现密码校验，配合 employees 表的 password_hash |
| 并网截止日计算 | 自然日（不扣除节假日） | 简化实现，与按天罚款逻辑一致 |
| 品牌政策管理 | 版本化管理 | 同一品牌城市可有多版本，通过 effective_from/effective_to 控制生效期 |
| 进场凭证 | 照片上传 | 最简方案，可后续迭代 |
| 满意视频验收 | 人工确认 | 视频验收本质是主观判断，自动化不现实 |
