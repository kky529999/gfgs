-- ============================================================
-- Phase 4: 新建客户页面和提成管理修改
-- 添加地址三级联动、方案类型字段
-- ============================================================

-- 1. 添加客户表新字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_district TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_detail TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS scheme_type TEXT;

-- 2. 添加索引（可选，用于按城市/区县查询）
CREATE INDEX IF NOT EXISTS idx_customers_address_city ON customers(address_city) WHERE address_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_address_district ON customers(address_district) WHERE address_district IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_scheme_type ON customers(scheme_type) WHERE scheme_type IS NOT NULL;

-- 3. 旧字段 address 保留（用于存放合并后的完整地址）
-- 新字段用于结构化存储：address_city + address_district + address_detail