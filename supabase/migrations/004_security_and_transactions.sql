-- ============================================================
-- 安全日志表 + 交易事务函数
-- ============================================================

-- 1. 安全事件日志表
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id UUID,
  user_phone TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 安全事件索引
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);

-- 启用 RLS 并创建策略
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "安全日志admin可读" ON security_events
  FOR SELECT USING (
    auth_user_id() IS NOT NULL AND auth_user_role() IN ('admin', 'gm')
  );

CREATE POLICY "系统可写入安全日志" ON security_events
  FOR INSERT WITH CHECK (true);

-- 2. 二级商押金事务函数（原子操作：插入押金记录 + 更新二级商余额）
CREATE OR REPLACE FUNCTION create_dealer_deposit_with_balance(
  p_dealer_id UUID,
  p_amount NUMERIC(12, 2),
  p_type TEXT,
  p_record_date DATE,
  p_note TEXT,
  p_created_by UUID
)
RETURNS TABLE (
  deposit_id UUID,
  new_deposit_paid NUMERIC(12, 2),
  new_deposit_status TEXT
) AS $$
DECLARE
  v_deposit_id UUID;
  v_current_paid NUMERIC(12, 2);
  v_deposit_amount NUMERIC(12, 2);
  v_new_paid NUMERIC(12, 2);
  v_new_status TEXT;
BEGIN
  -- 获取当前二级商押金信息
  SELECT deposit_paid, deposit_amount INTO v_current_paid, v_deposit_amount
  FROM dealers WHERE id = p_dealer_id
  FOR UPDATE;

  IF v_current_paid IS NULL THEN
    RAISE EXCEPTION 'Dealer not found';
  END IF;

  -- 计算新押金余额
  IF p_type = 'pay' THEN
    v_new_paid := v_current_paid + p_amount;
  ELSIF p_type = 'refund' THEN
    v_new_paid := v_current_paid - p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid deposit type: %', p_type;
  END IF;

  -- 计算新状态
  IF v_deposit_amount IS NULL OR v_new_paid <= 0 THEN
    v_new_status := 'unpaid';
  ELSIF v_new_paid >= v_deposit_amount THEN
    v_new_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'refunded';
  END IF;

  -- 插入押金记录
  INSERT INTO dealer_deposits (dealer_id, amount, type, record_date, note, created_by)
  VALUES (p_dealer_id, p_amount, p_type::deposit_type, p_record_date, p_note, p_created_by)
  RETURNING id INTO v_deposit_id;

  -- 更新二级商余额
  UPDATE dealers
  SET deposit_paid = v_new_paid, deposit_status = v_new_status
  WHERE id = p_dealer_id;

  -- 返回结果
  RETURN QUERY SELECT v_deposit_id, v_new_paid, v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
