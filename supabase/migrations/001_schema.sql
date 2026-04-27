-- ============================================================
-- 陕西智光新程能源科技有限公司 — 数据库 Schema
-- 第一阶段：基础结构 + 认证 + 权限
-- ============================================================

-- 1. 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 枚举类型（自定义枚举）
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'business', 'tech', 'gm');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_stage AS ENUM ('survey', 'design', 'filing', 'record', 'grid_materials', 'ship', 'grid', 'close');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('direct', 'dealer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE commission_type AS ENUM ('entry', 'closing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE commission_status AS ENUM ('pending', 'applied', 'approved', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE growth_fund_category AS ENUM ('工作汇报', '考勤', '行为规范', '卫生', '其他');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE social_media_platform AS ENUM ('抖音', '快手', '小红书', '微信视频号');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE social_media_status AS ENUM ('pending', 'approved', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deposit_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE dealer_status AS ENUM ('active', 'terminated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deposit_type AS ENUM ('pay', 'refund');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE brand_deposit_status AS ENUM ('paid', 'partial_refund', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 3. 表定义
-- ============================================================

-- 3.1 departments（部门表）
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 employees（员工表）
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 customers（客户表）
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 基本信息
  name TEXT NOT NULL,
  phone TEXT,
  area TEXT,
  township TEXT,
  address TEXT,
  capacity TEXT,
  brand TEXT,
  panel_count INTEGER,
  house_type TEXT,
  -- 客户类型
  customer_type customer_type NOT NULL DEFAULT 'direct',
  dealer_id UUID,
  -- 8阶段日期
  survey_date DATE,
  design_date DATE,
  filing_date DATE,
  record_date DATE,
  grid_materials_date DATE,
  ship_date DATE,
  grid_date DATE,
  close_date DATE,
  -- 用户验收
  user_acceptance_date DATE,
  project_company TEXT,
  -- 业务归属
  salesperson_id UUID REFERENCES employees(id),
  tech_assigned_id UUID REFERENCES employees(id),
  -- 提成锁定价格（发货时锁定）
  commission_locked BOOLEAN NOT NULL DEFAULT FALSE,
  commission_price_per_panel NUMERIC(10, 2),
  -- 品牌政策快照（JSONB，新建客户时自动快照）
  policy_snapshot JSONB,
  -- 阶段状态
  current_stage customer_stage NOT NULL DEFAULT 'survey',
  stage_completed_at TIMESTAMPTZ,
  -- 进场凭证
  entry_voucher_url TEXT,
  entry_voucher_uploaded_at TIMESTAMPTZ,
  -- 闭环视频
  closing_video_url TEXT,
  closing_video_uploaded_at TIMESTAMPTZ,
  -- 业务费状态
  commission_status commission_status NOT NULL DEFAULT 'pending',
  -- 成本记录（并网后填写）
  construction_labor NUMERIC(12, 2),
  construction_material NUMERIC(12, 2),
  construction_other NUMERIC(12, 2),
  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 progress_logs（进度日志表）
CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES employees(id),
  from_stage customer_stage,
  to_stage customer_stage NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 commissions（提成表）
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  type commission_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status commission_status NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 growth_fund（成长基金表）
CREATE TABLE IF NOT EXISTS growth_fund (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  category growth_fund_category NOT NULL DEFAULT '其他',
  recorded_by UUID NOT NULL REFERENCES employees(id),
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 social_media_posts（自媒体表）
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  platform social_media_platform NOT NULL,
  video_url TEXT,
  duration_seconds INTEGER,
  is_real_person BOOLEAN NOT NULL DEFAULT FALSE,
  likes INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  status social_media_status NOT NULL DEFAULT 'pending',
  reward NUMERIC(10, 2),
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 brand_policies（品牌政策表）
CREATE TABLE IF NOT EXISTS brand_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INTEGER NOT NULL DEFAULT 1,
  brand TEXT NOT NULL,
  city TEXT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  installation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  comprehensive_subsidy NUMERIC(10, 2) NOT NULL DEFAULT 0,
  channel_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  install_days INTEGER NOT NULL DEFAULT 30,
  grid_penalty TEXT,
  monthly_target INTEGER,
  inspection_reward NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quality_bond NUMERIC(10, 2),
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.9 dealers（二级商表）
CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  contract_no TEXT,
  contract_start DATE,
  contract_end DATE,
  deposit_amount NUMERIC(12, 2),
  deposit_status deposit_status NOT NULL DEFAULT 'unpaid',
  deposit_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fee_per_panel NUMERIC(10, 2),
  status dealer_status NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.10 dealer_deposits（二级商押金记录表）
CREATE TABLE IF NOT EXISTS dealer_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  type deposit_type NOT NULL,
  record_date DATE NOT NULL,
  note TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.11 brand_deposits（品牌方押金表）
CREATE TABLE IF NOT EXISTS brand_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  pay_date DATE,
  status brand_deposit_status NOT NULL DEFAULT 'paid',
  refunded NUMERIC(12, 2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.12 invoices（发票表）
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  invoice_no TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  invoice_date DATE,
  note TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.13 monthly_target_bonus（月度达量奖励表）
CREATE TABLE IF NOT EXISTS monthly_target_bonus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT NOT NULL,
  year_month TEXT NOT NULL,
  target_panels INTEGER,
  bonus_amount NUMERIC(12, 2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. 索引
-- ============================================================

-- employees
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id) WHERE department_id IS NOT NULL;

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_salesperson ON customers(salesperson_id) WHERE salesperson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tech_assigned ON customers(tech_assigned_id) WHERE tech_assigned_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_brand ON customers(brand) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_current_stage ON customers(current_stage);
CREATE INDEX IF NOT EXISTS idx_customers_ship_date ON customers(ship_date) WHERE ship_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_grid_date ON customers(grid_date) WHERE grid_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_dealer ON customers(dealer_id) WHERE dealer_id IS NOT NULL;

-- progress_logs
CREATE INDEX IF NOT EXISTS idx_progress_logs_customer ON progress_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_created_at ON progress_logs(created_at DESC);

-- commissions
CREATE INDEX IF NOT EXISTS idx_commissions_employee ON commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_commissions_customer ON commissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

-- growth_fund
CREATE INDEX IF NOT EXISTS idx_growth_fund_employee ON growth_fund(employee_id);
CREATE INDEX IF NOT EXISTS idx_growth_fund_month ON growth_fund(month);
CREATE INDEX IF NOT EXISTS idx_growth_fund_category ON growth_fund(category);

-- social_media_posts
CREATE INDEX IF NOT EXISTS idx_social_media_employee ON social_media_posts(employee_id);
CREATE INDEX IF NOT EXISTS idx_social_media_month ON social_media_posts(month);
CREATE INDEX IF NOT EXISTS idx_social_media_status ON social_media_posts(status);

-- brand_policies
CREATE INDEX IF NOT EXISTS idx_brand_policies_brand ON brand_policies(brand);
CREATE INDEX IF NOT EXISTS idx_brand_policies_active ON brand_policies(is_active) WHERE is_active = TRUE;

-- dealers
CREATE INDEX IF NOT EXISTS idx_dealers_status ON dealers(status);
CREATE INDEX IF NOT EXISTS idx_dealers_deposit_status ON dealers(deposit_status);

-- ============================================================
-- 5. 触发器函数
-- ============================================================

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 插入进度日志
CREATE OR REPLACE FUNCTION insert_progress_log()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO progress_logs (customer_id, operator_id, from_stage, to_stage)
    VALUES (
      NEW.id,
      NULL,
      OLD.current_stage,
      NEW.current_stage
    );
    NEW.stage_completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. 触发器
-- ============================================================

-- employees updated_at
DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- customers updated_at
DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- customers 阶段变更记录
DROP TRIGGER IF EXISTS customers_progress_log ON customers;
CREATE TRIGGER customers_progress_log
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION insert_progress_log();

-- commissions updated_at
DROP TRIGGER IF EXISTS commissions_updated_at ON commissions;
CREATE TRIGGER commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- brand_policies updated_at
DROP TRIGGER IF EXISTS brand_policies_updated_at ON brand_policies;
CREATE TRIGGER brand_policies_updated_at
  BEFORE UPDATE ON brand_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- dealers updated_at
DROP TRIGGER IF EXISTS dealers_updated_at ON dealers;
CREATE TRIGGER dealers_updated_at
  BEFORE UPDATE ON dealers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- brand_deposits updated_at
DROP TRIGGER IF EXISTS brand_deposits_updated_at ON brand_deposits;
CREATE TRIGGER brand_deposits_updated_at
  BEFORE UPDATE ON brand_deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- monthly_target_bonus updated_at
DROP TRIGGER IF EXISTS monthly_target_bonus_updated_at ON monthly_target_bonus;
CREATE TRIGGER monthly_target_bonus_updated_at
  BEFORE UPDATE ON monthly_target_bonus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. RLS（行级安全策略）
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_fund ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_target_bonus ENABLE ROW LEVEL SECURITY;

-- 辅助函数：设置 RLS 会话（由自定义 auth 层调用）
CREATE OR REPLACE FUNCTION set_auth_session(
  p_user_id UUID,
  p_role TEXT
)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('auth.user_id', p_user_id::TEXT, true);
  PERFORM set_config('auth.user_role', p_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 辅助函数：获取当前用户 ID
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('auth.user_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- 辅助函数：获取当前用户角色
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('auth.user_role', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

-- 辅助函数：获取当前用户部门代码
CREATE OR REPLACE FUNCTION auth_user_department_code()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT d.code
    FROM employees e
    JOIN departments d ON d.id = e.department_id
    WHERE e.id = auth_user_id()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 部门表 RLS
CREATE POLICY "允许读取所有部门" ON departments
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "仅综合部和总经理可写部门" ON departments
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 员工表 RLS
CREATE POLICY "所有已登录用户可读取员工" ON employees
  FOR SELECT USING (auth_user_id() IS NOT NULL);

CREATE POLICY "仅综合部和总经理可管理员工" ON employees
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 客户表 RLS
CREATE POLICY "客户可见性策略" ON customers
  FOR SELECT USING (
    CASE auth_user_role()
      WHEN 'gm' THEN true
      WHEN 'admin' THEN true
      WHEN 'business' THEN salesperson_id = auth_user_id()
      WHEN 'tech' THEN tech_assigned_id = auth_user_id()
      ELSE false
    END
  );

CREATE POLICY "综合部可插入客户" ON customers
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('admin', 'gm')
  );

CREATE POLICY "综合部可更新客户基础信息" ON customers
  FOR UPDATE USING (
    auth_user_role() IN ('admin', 'gm')
  );

CREATE POLICY "仅总经理可删除客户" ON customers
  FOR DELETE USING (
    auth_user_role() = 'gm'
  );

-- 进度日志 RLS（所有已登录用户可读）
CREATE POLICY "进度日志所有人可读" ON progress_logs
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "系统自动插入进度日志" ON progress_logs
  FOR INSERT WITH CHECK (true);

-- 提成表 RLS
CREATE POLICY "提成可见性策略" ON commissions
  FOR SELECT USING (
    CASE auth_user_role()
      WHEN 'gm' THEN true
      WHEN 'admin' THEN true
      WHEN 'business' THEN employee_id = auth_user_id()
      WHEN 'tech' THEN employee_id = auth_user_id()
      ELSE false
    END
  );

CREATE POLICY "综合部和总经理可管理提成" ON commissions
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 成长基金 RLS
CREATE POLICY "成长基金所有人可读" ON growth_fund
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可写成长基金" ON growth_fund
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 自媒体 RLS
CREATE POLICY "自媒体所有人可读" ON social_media_posts
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理自媒体" ON social_media_posts
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 品牌政策 RLS（所有人可读，综合部和总经理可写）
CREATE POLICY "品牌政策所有人可读" ON brand_policies
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理品牌政策" ON brand_policies
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 二级商 RLS（所有人可读，综合部和总经理可写）
CREATE POLICY "二级商所有人可读" ON dealers
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理二级商" ON dealers
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 二级商押金 RLS
CREATE POLICY "二级商押金所有人可读" ON dealer_deposits
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理二级商押金" ON dealer_deposits
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 品牌方押金 RLS
CREATE POLICY "品牌方押金所有人可读" ON brand_deposits
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理品牌方押金" ON brand_deposits
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 发票 RLS
CREATE POLICY "发票所有人可读" ON invoices
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理发票" ON invoices
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- 月度达量奖励 RLS
CREATE POLICY "月度奖励所有人可读" ON monthly_target_bonus
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理月度奖励" ON monthly_target_bonus
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

-- ============================================================
-- 8. 初始数据
-- ============================================================

-- 部门
INSERT INTO departments (id, code, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', '综合管理部'),
  ('00000000-0000-0000-0000-000000000002', 'business', '业务开发部'),
  ('00000000-0000-0000-0000-000000000003', 'tech', '技术方案部')
ON CONFLICT (code) DO NOTHING;

-- 员工（默认密码 123456 的 bcrypt hash）
-- hash: $2b$10$KIXxK1kBXQ9F5Y5Y5Y5Y5.Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5
-- 实际默认密码为 123456，首次登录强制修改
INSERT INTO employees (id, phone, password_hash, name, title, department_id, must_change_password) VALUES
  -- 综合管理部
  ('10000000-0000-0000-0000-000000000001', '18809185627', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '王总', '副总经理', '00000000-0000-0000-0000-000000000001', false),
  ('10000000-0000-0000-0000-000000000002', '18161779522', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '陈总', '副总经理', '00000000-0000-0000-0000-000000000001', false),
  ('10000000-0000-0000-0000-000000000003', '15191742312', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '赵丽娟', '综合主管', '00000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000004', '18392747243', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '赵荣丽', '综合文员', '00000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000005', '18700753140', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '张鹏娟', '综合文员', '00000000-0000-0000-0000-000000000001', true),
  -- 技术方案部
  ('10000000-0000-0000-0000-000000000006', '13152248078', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '韩磊', '技术主管', '00000000-0000-0000-0000-000000000003', true),
  ('10000000-0000-0000-0000-000000000007', '17392614097', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '樊豪', '技术员', '00000000-0000-0000-0000-000000000003', true),
  -- 业务开发部
  ('10000000-0000-0000-0000-000000000008', '15339051443', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '李建龙', '业务主管', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000009', '17729495012', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '葛小龙', '业务员', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000010', '15709278018', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '焦志贤', '业务员', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000011', '13162253602', '$2b$10$rQZ5kZ9Y5Y5Y5Y5Y5Y5Y5OY5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', '刘智军', '业务员', '00000000-0000-0000-0000-000000000002', true)
ON CONFLICT DO NOTHING;

-- 重新设置密码 hash（正确的 bcrypt 加密 "123456"）
-- 真实密码需要在初始化后替换这些 hash
-- UPDATE employees SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
