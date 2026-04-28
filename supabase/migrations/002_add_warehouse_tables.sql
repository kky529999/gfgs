-- ============================================================
-- 陕西智光新程能源科技有限公司 — 仓储表
-- ============================================================

-- warehouse_materials（库存材料表）
CREATE TABLE IF NOT EXISTS warehouse_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'in_stock',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- stock_movements（出入库记录表）
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES warehouse_materials(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  customer_id UUID REFERENCES customers(id),
  operator_id UUID REFERENCES employees(id),
  record_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_warehouse_materials_brand ON warehouse_materials(brand);
CREATE INDEX IF NOT EXISTS idx_warehouse_materials_status ON warehouse_materials(status);

CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_customer ON stock_movements(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_record_date ON stock_movements(record_date DESC);

-- ============================================================
-- 触发器
-- ============================================================

DROP TRIGGER IF EXISTS warehouse_materials_updated_at ON warehouse_materials;
CREATE TRIGGER warehouse_materials_updated_at
  BEFORE UPDATE ON warehouse_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE warehouse_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "仓储材料所有人可读" ON warehouse_materials
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理仓储材料" ON warehouse_materials
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );

CREATE POLICY "出入库记录所有人可读" ON stock_movements
  FOR SELECT USING (
    auth_user_id() IS NOT NULL
  );

CREATE POLICY "综合部和总经理可管理出入库记录" ON stock_movements
  FOR ALL USING (
    auth_user_role() IN ('admin', 'gm')
  );
