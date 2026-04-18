/**
 * run-schema.js
 * 使用 Supabase Management API 执行 SQL Schema
 */
const https = require('https');

const TOKEN = 'sbp_51d37b45d6ca1a46f3d6279a30cb38e072ca7f5e';
const REF = 'rihkdwijnrolpvayqcwz';
const API_HOST = 'api.supabase.com';
const API_PATH = `/v1/projects/${REF}/database/query`;

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: API_HOST,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const statements = [
  // employees 表
  `CREATE TABLE IF NOT EXISTS public.employees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    position text NOT NULL,
    department text NOT NULL CHECK (department IN ('综合部','业务部','技术部')),
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,

  // stage_definitions 表
  `CREATE TABLE IF NOT EXISTS public.stage_definitions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_key text UNIQUE NOT NULL,
    stage_name text NOT NULL,
    sequence integer NOT NULL,
    default_days integer,
    created_at timestamptz DEFAULT now()
  )`,

  // customers 表
  `CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_number integer UNIQUE,
    region text,
    name text NOT NULL,
    salesperson_id uuid REFERENCES public.employees(id),
    panel_count integer,
    brand text,
    house_type text,
    project_company text,
    contract_date date,
    survey_date date,
    design_date date,
    record_approved_date date,
    filing_date date,
    grid_docs_date date,
    shipping_date date,
    grid_date date,
    closed_date date,
    acceptance_date date,
    business_fee_status text,
    current_stage text NOT NULL DEFAULT 'sign_contract',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,

  // stage_history 表
  `CREATE TABLE IF NOT EXISTS public.stage_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    stage_key text NOT NULL,
    stage_name text,
    entered_at timestamptz DEFAULT now(),
    exited_at timestamptz,
    employee_id uuid REFERENCES public.employees(id),
    notes text
  )`,

  // 开启 RLS
  `ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.stage_definitions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY`,

  // RLS 策略
  `CREATE POLICY public_all ON public.employees FOR ALL USING (true) WITH CHECK (true)`,
  `CREATE POLICY public_all ON public.stage_definitions FOR ALL USING (true) WITH CHECK (true)`,
  `CREATE POLICY public_all ON public.customers FOR ALL USING (true) WITH CHECK (true)`,
  `CREATE POLICY public_all ON public.stage_history FOR ALL USING (true) WITH CHECK (true)`,

  // 自动更新 updated_at
  `CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$`,
  `DROP TRIGGER IF EXISTS customers_updated_at ON public.customers`,
  `CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()`,
  `DROP TRIGGER IF EXISTS employees_updated_at ON public.employees`,
  `CREATE TRIGGER employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()`,

  // 创建索引
  `CREATE INDEX IF NOT EXISTS idx_customers_current_stage ON public.customers(current_stage)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_serial_number ON public.customers(serial_number)`,
  `CREATE INDEX IF NOT EXISTS idx_stage_history_customer_id ON public.stage_history(customer_id)`,

  // 插入阶段定义
  `INSERT INTO public.stage_definitions (stage_key, stage_name, sequence, default_days) VALUES
    ('sign_contract', '签合同', 1, NULL),
    ('survey', '现勘', 2, 7),
    ('design', '设计', 3, 3),
    ('record_approved', '建档', 4, 7),
    ('filing', '备案', 5, 14),
    ('grid_docs', '并网资料', 6, 7),
    ('shipping', '发货', 7, NULL),
    ('grid_connection', '并网', 8, NULL),
    ('closed', '闭环', 9, NULL),
    ('acceptance', '验收', 10, NULL)
  ON CONFLICT (stage_key) DO NOTHING`,
];

async function main() {
  console.log('=== 开始执行 SQL Schema ===\n');
  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    const short = sql.substring(0, 60).replace(/\s+/g, ' ');
    process.stdout.write(`[${i + 1}/${statements.length}] ${short}... `);
    try {
      await runSql(sql);
      console.log('OK');
      success++;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== 完成: 成功 ${success}/${statements.length} ===`);
  if (failed > 0) {
    console.log(`失败 ${failed} 条`);
  }
}

main().catch(console.error);
