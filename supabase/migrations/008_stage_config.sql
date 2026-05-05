-- ============================================================
-- Phase 3: 配置管理 - 环节时效配置
-- stage_config 表：存储各阶段默认时效天数
-- ============================================================

-- 环节配置表
CREATE TABLE IF NOT EXISTS stage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key TEXT NOT NULL UNIQUE,
  stage_name TEXT NOT NULL,
  default_days INTEGER NOT NULL DEFAULT 7,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 初始化默认配置（8个客户阶段）
INSERT INTO stage_config (stage_key, stage_name, default_days, description) VALUES
  ('survey', '现勘', 3, '从创建到现勘完成'),
  ('design', '设计出图', 7, '从现勘到设计出图'),
  ('filing', '建档通过', 3, '从设计到建档通过'),
  ('record', '备案', 7, '从建档到备案完成'),
  ('grid_materials', '并网资料', 3, '从备案到并网资料齐备'),
  ('ship', '发货', 7, '从并网资料到发货'),
  ('grid', '并网', 28, '从发货到并网完成（默认28天，品牌特殊可覆盖）'),
  ('close', '闭环', 7, '从并网到闭环完成')
ON CONFLICT (stage_key) DO NOTHING;

-- RLS 策略
ALTER TABLE stage_config ENABLE ROW LEVEL SECURITY;

-- admin 和 gm 可读写
CREATE POLICY "admins and gm can manage stage_config"
  ON stage_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users()
      WHERE auth.uid() = get_auth_user_id()
      AND get_auth_user_role() IN ('admin', 'gm')
    )
  );

-- 更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_stage_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stage_config_timestamp
  BEFORE UPDATE ON stage_config
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_config_timestamp();