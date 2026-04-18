/**
 * migrate-data.js
 * 将 Excel 数据迁移到 Supabase
 *
 * 用法: node scripts/migrate-data.js
 *
 * 需要环境变量:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 数据来源: data/客户进度表(4月2日).xlsx
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('缺少环境变量: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

function excelSerialToDate(serial) {
  if (!serial || serial === '') return null;
  if (typeof serial === 'string') {
    const parsed = Date.parse(serial);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    return null;
  }
  const ms = (serial - 25569) * 86400 * 1000;
  const date = new Date(ms);
  return date.toISOString().split('T')[0];
}

function mapRowToCustomer(row) {
  const STAGE_MAP = {
    '签合同': 'sign_contract',
    '现勘': 'survey',
    '设计': 'design',
    '建档': 'record_approved',
    '备案': 'filing',
    '并网资料': 'grid_docs',
    '发货': 'shipping',
    '并网': 'grid_connection',
    '闭环': 'closed',
    '验收': 'acceptance',
  };

  const stage = row['当前阶段'] ?? row['阶段'] ?? '';
  const stageKey = STAGE_MAP[stage] ?? 'sign_contract';

  return {
    name: row['客户名称'] ?? '',
    serial_number: row['序号'] ? parseInt(row['序号']) : null,
    region: row['地区'] ?? null,
    brand: row['品牌'] ?? null,
    house_type: row['房型'] ?? null,
    project_company: row['项目公司'] ?? null,
    contract_date: excelSerialToDate(row['签合同日期']),
    survey_date: excelSerialToDate(row['现堪日期'] ?? row['现勘日期']),
    design_date: excelSerialToDate(row['设计日期']),
    record_approved_date: excelSerialToDate(row['建档日期']),
    filing_date: excelSerialToDate(row['备案日期']),
    grid_docs_date: excelSerialToDate(row['并网资料日期']),
    shipping_date: excelSerialToDate(row['发货日期']),
    grid_date: excelSerialToDate(row['并网日期']),
    closed_date: excelSerialToDate(row['闭环日期']),
    acceptance_date: excelSerialToDate(row['验收日期']),
    business_fee_status: row['业务费'] ?? null,
    panel_count: row['组串数'] ? parseInt(row['组串数']) : null,
    current_stage: stageKey,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function seedStageDefinitions() {
  const stages = [
    { stage_key: 'sign_contract', stage_name: '签合同', sequence: 1 },
    { stage_key: 'survey', stage_name: '现勘', sequence: 2, default_days: 7 },
    { stage_key: 'design', stage_name: '设计', sequence: 3, default_days: 3 },
    { stage_key: 'record_approved', stage_name: '建档', sequence: 4, default_days: 7 },
    { stage_key: 'filing', stage_name: '备案', sequence: 5, default_days: 14 },
    { stage_key: 'grid_docs', stage_name: '并网资料', sequence: 6, default_days: 7 },
    { stage_key: 'shipping', stage_name: '发货', sequence: 7 },
    { stage_key: 'grid_connection', stage_name: '并网', sequence: 8 },
    { stage_key: 'closed', stage_name: '闭环', sequence: 9 },
    { stage_key: 'acceptance', stage_name: '验收', sequence: 10 },
  ];

  console.log('正在插入阶段定义...');
  for (const stage of stages) {
    const { error } = await supabase.from('stage_definitions').upsert(stage, {
      onConflict: 'stage_key',
    });
    if (error) {
      console.error(`插入阶段 ${stage.stage_key} 失败:`, error.message);
    }
  }
  console.log('阶段定义插入完成');
}

async function migrateCustomers(xlsxPath) {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(xlsxPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`找到 ${rows.length} 条记录`);

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const customer = mapRowToCustomer(row);
    if (!customer.name) {
      skipped++;
      continue;
    }

    const { data, error } = await supabase
      .from('customers')
      .upsert(customer, { onConflict: 'serial_number' })
      .select('id')
      .single();

    if (error) {
      console.error(`导入 ${customer.name} 失败:`, error.message);
      skipped++;
    } else {
      imported++;
      if (imported % 10 === 0) {
        console.log(`已导入 ${imported} 条...`);
      }
    }
  }

  console.log(`\n导入完成: 成功 ${imported} 条, 跳过 ${skipped} 条`);
  return { imported, skipped };
}

async function main() {
  console.log('=== Supabase 数据迁移工具 ===\n');

  const xlsxPath = path.join(__dirname, '..', 'data', '客户进度表(4月2日).xlsx');
  const xlsxPath2 = path.join(__dirname, '..', 'data', '已发货未闭环客户进度(4月2日).xlsx');

  if (!fs.existsSync(xlsxPath)) {
    console.error(`文件不存在: ${xlsxPath}`);
    console.error('请将 Excel 文件放入 data/ 目录');
    process.exit(1);
  }

  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log('');

  await seedStageDefinitions();
  console.log('');

  await migrateCustomers(xlsxPath);

  if (fs.existsSync(xlsxPath2)) {
    console.log('\n检测到额外数据文件，继续导入...');
    await migrateCustomers(xlsxPath2);
  }

  console.log('\n=== 迁移完成 ===');
  console.log('现在可以运行 npm run dev 启动应用');
}

main().catch(console.error);
