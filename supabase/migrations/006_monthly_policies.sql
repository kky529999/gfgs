-- Monthly Brand Delivery Targets (月度达量配置)
-- Key: (brand, year_month)
-- Stores:送货量, 底薪, 送够奖励 per brand per month

CREATE TABLE monthly_delivery_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(100) NOT NULL,
  year_month VARCHAR(7) NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  target_panels INTEGER NOT NULL DEFAULT 0,
  base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  bonus_for_meeting_target DECIMAL(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand, year_month)
);

CREATE INDEX idx_monthly_delivery_targets_brand ON monthly_delivery_targets(brand);
CREATE INDEX idx_monthly_delivery_targets_year_month ON monthly_delivery_targets(year_month);

COMMENT ON TABLE monthly_delivery_targets IS '月度达量配置 - 每个品牌每月的送货量目标、底薪和达标奖励';
COMMENT ON COLUMN monthly_delivery_targets.target_panels IS '送货量目标（块数）';
COMMENT ON COLUMN monthly_delivery_targets.base_salary IS '底薪（元）';
COMMENT ON COLUMN monthly_delivery_targets.bonus_for_meeting_target IS '送够奖励（元）- 达到送货量目标后的额外奖励';

-- Monthly Department Reward Rules (月度部门奖励考核配置)
-- Key: (department, year_month)
-- Stores all department-specific reward/penalty rules for a month

CREATE TABLE monthly_dept_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department VARCHAR(50) NOT NULL,
  year_month VARCHAR(7) NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  -- 综合部奖励
  admin_record_reward DECIMAL(10,2) NOT NULL DEFAULT 0,        -- 备案奖励（元/户）
  admin_grid_reward DECIMAL(10,2) NOT NULL DEFAULT 0,            -- 并网奖励（元/户）
  admin_close_reward DECIMAL(10,2) NOT NULL DEFAULT 0,          -- 闭环奖励（元/户）
  admin_recruit_invite_reward DECIMAL(10,2) NOT NULL DEFAULT 0, -- 招聘邀约奖励（元/人）
  admin_recruit_interview_reward DECIMAL(10,2) NOT NULL DEFAULT 0, -- 招聘面试奖励（元/人）
  admin_recruit_probation_reward DECIMAL(10,2) NOT NULL DEFAULT 0, -- 招聘转正奖励（元/人）
  admin_meeting_reward DECIMAL(10,2) NOT NULL DEFAULT 0,        -- 会议组织奖励（元/场）
  admin_video_reward DECIMAL(10,2) NOT NULL DEFAULT 0,          -- 自媒体视频奖励（元/条）
  admin_video_real_reward DECIMAL(10,2) NOT NULL DEFAULT 0,     -- 真人出镜视频奖励（元/条）
  admin_live_reward DECIMAL(10,2) NOT NULL DEFAULT 0,           -- 直播宣传奖励（元/场）
  -- 综合部考核
  admin_record_penalty_days INTEGER NOT NULL DEFAULT 0,          -- 备案超时考核开始天数
  admin_record_penalty_per_day DECIMAL(10,2) NOT NULL DEFAULT 0, -- 备案超时每天考核金额
  admin_grid_penalty_days INTEGER NOT NULL DEFAULT 0,            -- 并网超时考核开始天数（天合）
  admin_grid_penalty_days_other INTEGER NOT NULL DEFAULT 0,      -- 并网超时考核开始天数（其他品牌）
  admin_grid_penalty_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,   -- 并网超时每天考核金额
  -- 技术部奖励
  tech_survey_reward DECIMAL(10,2) NOT NULL DEFAULT 0,           -- 现勘奖励（元/组件）- 直销
  tech_survey_reward_dealer DECIMAL(10,2) NOT NULL DEFAULT 0,    -- 现勘奖励（元/组件）- 二级
  tech_design_own_reward DECIMAL(10,2) NOT NULL DEFAULT 0,       -- 出图奖励（元/组件）- 自主出图
  tech_design_outsource_reward DECIMAL(10,2) NOT NULL DEFAULT 0, -- 出图奖励（元/户）- 外委
  tech_grid_reward DECIMAL(10,2) NOT NULL DEFAULT 0,             -- 并网奖励（元/组件）- 直销
  tech_grid_reward_dealer DECIMAL(10,2) NOT NULL DEFAULT 0,     -- 并网奖励（元/组件）- 二级
  tech_warehouse_reward DECIMAL(10,2) NOT NULL DEFAULT 0,        -- 仓库管理奖励（元/月）
  -- 技术部考核
  tech_design_penalty_days INTEGER NOT NULL DEFAULT 0,           -- 出图超时考核开始天数
  tech_design_penalty_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 出图超时每天考核金额
  tech_grid_penalty_days INTEGER NOT NULL DEFAULT 0,             -- 并网超时考核开始天数（天合）
  tech_grid_penalty_days_other INTEGER NOT NULL DEFAULT 0,       -- 并网超时考核开始天数（其他品牌）
  tech_grid_penalty_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,    -- 并网超时每天考核金额
  -- 业务部奖励
  biz_commission_per_panel DECIMAL(10,2) NOT NULL DEFAULT 0,     -- 业务提成（元/组件）
  biz_car_subsidy DECIMAL(10,2) NOT NULL DEFAULT 0,              -- 车补（元/户）
  biz_bonus_target INTEGER NOT NULL DEFAULT 0,                   -- 达标发货户数阈值
  biz_bonus_if_met DECIMAL(10,2) NOT NULL DEFAULT 0,             -- 达标时额外奖励（元）
  biz_supervisor_reward_per_panel DECIMAL(10,2) NOT NULL DEFAULT 0, -- 业务主管提成（元/组件）
  -- 业务部考核
  biz_min_ship_penalty DECIMAL(10,2) NOT NULL DEFAULT 0,         -- 未达发货量考核金额
  biz_min_ship_count INTEGER NOT NULL DEFAULT 0,                -- 最低发货量要求
  -- 通用字段
  note TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department, year_month)
);

CREATE INDEX idx_monthly_dept_rules_department ON monthly_dept_rules(department);
CREATE INDEX idx_monthly_dept_rules_year_month ON monthly_dept_rules(year_month);

COMMENT ON TABLE monthly_dept_rules IS '月度部门奖励考核配置 - 每个部门每月的各项奖励和考核标准';