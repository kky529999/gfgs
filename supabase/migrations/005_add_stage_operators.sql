-- Add per-stage operator fields to customers table
-- Each stage can have a different person responsible

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS survey_operator_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS design_operator_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS filing_operator_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS record_operator_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS grid_materials_operator_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS ship_operator_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS grid_operator_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS close_operator_id UUID REFERENCES employees(id);

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_customers_survey_operator ON customers(survey_operator_id);
CREATE INDEX IF NOT EXISTS idx_customers_design_operator ON customers(design_operator_id);
CREATE INDEX IF NOT EXISTS idx_customers_filing_operator ON customers(filing_operator_id);
CREATE INDEX IF NOT EXISTS idx_customers_record_operator ON customers(record_operator_id);
CREATE INDEX IF NOT EXISTS idx_customers_grid_materials_operator ON customers(grid_materials_operator_id);
CREATE INDEX IF NOT EXISTS idx_customers_ship_operator ON customers(ship_operator_id);
CREATE INDEX IF NOT EXISTS idx_customers_grid_operator ON customers(grid_operator_id);
CREATE INDEX IF NOT EXISTS idx_customers_close_operator ON customers(close_operator_id);