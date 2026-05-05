// Migration script to create brands table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const migrationSQL = `
-- Create brands table for brand management feature
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL UNIQUE,
  support_person TEXT,
  support_phone TEXT,
  tech_person TEXT,
  tech_phone TEXT,
  deposit_amount DECIMAL(12, 2) DEFAULT 0,
  contract_no TEXT,
  contract_start DATE,
  contract_end DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS policies: all authenticated users can read, admins can write
CREATE POLICY "Brands are viewable by all authenticated users" ON brands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Brands are insertable by admins only" ON brands
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'gm')
    )
  );

CREATE POLICY "Brands are updatable by admins only" ON brands
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'gm')
    )
  );

CREATE POLICY "Brands are deletable by admins only" ON brands
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'gm')
    )
  );

-- Add index on brand_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_brand_name ON brands(brand_name);
CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

async function runMigration() {
  console.log('Running brands table migration...');

  const { data, error } = await supabase.rpc('exec', { query: migrationSQL });

  if (error) {
    // Try direct SQL execution
    const { error: sqlError } = await supabase.query(migrationSQL);
    if (sqlError) {
      console.error('Migration failed:', sqlError);
      process.exit(1);
    }
  }

  console.log('Migration completed successfully!');
}

runMigration().catch(console.error);