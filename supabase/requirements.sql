-- 需求反馈表
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,           -- 标题
  description TEXT,                        -- 详细描述
  type VARCHAR(50) NOT NULL DEFAULT 'feedback',  -- 类型: feedback/bug/feature
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',  -- 优先级: low/medium/high/urgent
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',  -- 状态
  submitter_id UUID REFERENCES employees(id), -- 提交人
  submitter_name VARCHAR(100),              -- 提交人姓名（冗余存储）
  submitter_phone VARCHAR(20),              -- 提交人手机（冗余）
  assigned_to UUID REFERENCES employees(id), -- 处理人
  assigned_name VARCHAR(100),              -- 处理人姓名
  response TEXT,                           -- 处理回复
  completed_at TIMESTAMPTZ,                -- 完成时间
  confirmed_at TIMESTAMPTZ,                -- 确认时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_submitter ON requirements(submitter_id);
CREATE INDEX IF NOT EXISTS idx_requirements_created ON requirements(created_at DESC);

-- 允许提交人修改自己提交的需求（用于确认）
-- 允许处理人更新需求状态
-- 管理员可以管理所有需求

-- RLS 策略
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

-- 任何人可以提交需求
CREATE POLICY "Anyone can insert requirements" ON requirements
  FOR INSERT WITH CHECK (true);

-- 提交人只能查看自己的需求
CREATE POLICY "Submitter can view own requirements" ON requirements
  FOR SELECT USING (submitter_id = current_setting('request.jwt.claim.employee_id', true)::uuid);

-- 提交人可以更新自己的需求（确认功能）
CREATE POLICY "Submitter can update own requirements" ON requirements
  FOR UPDATE USING (submitter_id = current_setting('request.jwt.claim.employee_id', true)::uuid);

-- 处理人/管理员可以查看所有需求
CREATE POLICY "Handler can view all requirements" ON requirements
  FOR SELECT USING (
    assigned_to = current_setting('request.jwt.claim.employee_id', true)::uuid
    OR current_setting('request.jwt.claim.role', true) IN ('admin', 'gm')
  );

-- 处理人/管理员可以更新需求
CREATE POLICY "Handler can update all requirements" ON requirements
  FOR UPDATE USING (
    assigned_to = current_setting('request.jwt.claim.employee_id', true)::uuid
    OR current_setting('request.jwt.claim.role', true) IN ('admin', 'gm')
  );

COMMENT ON TABLE requirements IS '需求反馈表 - 存储员工提交的问题和需求';
