/**
 * migrate-data.js
 * 将 Excel 数据迁移到 Supabase
 *
 * 用法: node scripts/migrate-data.js
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
  if (!serial || serial === '' || serial === '/') return null;
  if (typeof serial === 'string') {
    const parsed = Date.parse(serial);
    if (!isNaN(parsed)) return new Date(parsed).toISOString().split('T')[0];
    return null;
  }
  if (typeof serial !== 'number') return null;
  const ms = (serial - 25569) * 86400 * 1000;
  return new Date(ms).toISOString().split('T')[0];
}

function detectCurrentStage(row) {
  // 从右往左判断当前阶段
  if (row['__EMPTY_17']) return 'acceptance';
  if (row['__EMPTY_15']) return 'closed';
  if (row['__EMPTY_14']) return 'grid_connection';
  if (row['__EMPTY_12']) return 'shipping';
  if (row['__EMPTY_11']) return 'grid_docs';
  if (row['__EMPTY_10']) return 'filing';
  if (row['__EMPTY_9']) return 'record_approved';
  if (row['__EMPTY_8']) return 'design';
  if (row['__EMPTY_7']) return 'survey';
  return 'sign_contract';
}

function mapRowToCustomer(row) {
  const region = row['__EMPTY'] ? String(row['__EMPTY']) : '';
  const town = row['__EMPTY_1'] ? String(row['__EMPTY_1']) : '';
  const fullRegion = [region, town].filter(Boolean).join(' ');
  const stage = detectCurrentStage(row);

  return {
    name: row['__EMPTY_2'] ? String(row['__EMPTY_2']).trim() : '',
    serial_number: row['客户跟进情况记录表'] ? parseInt(row['客户跟进情况记录表']) : null,
    region: fullRegion || null,
    brand: row['__EMPTY_5'] ? String(row['__EMPTY_5']).trim() : null,
    house_type: row['__EMPTY_6'] ? String(row['__EMPTY_6']).trim() : null,
    project_company: row['__EMPTY_18'] ? String(row['__EMPTY_18']).trim() : null,
    contract_date: null,
    survey_date: excelSerialToDate(row['__EMPTY_7']),
    design_date: excelSerialToDate(row['__EMPTY_8']),
    record_approved_date: excelSerialToDate(row['__EMPTY_9']),
    filing_date: excelSerialToDate(row['__EMPTY_10']),
    grid_docs_date: excelSerialToDate(row['__EMPTY_11']),
    shipping_date: excelSerialToDate(row['__EMPTY_12']),
    grid_date: excelSerialToDate(row['__EMPTY_14']),
    closed_date: excelSerialToDate(row['__EMPTY_15']),
    acceptance_date: excelSerialToDate(row['__EMPTY_17']),
    business_fee_status: row['__EMPTY_19'] ? String(row['__EMPTY_19']).trim() : null,
    panel_count: row['__EMPTY_4'] ? parseInt(row['__EMPTY_4']) : null,
    current_stage: stage,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function migrateFile(xlsxPath) {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(xlsxPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  // 跳过第一行（表头）
  const dataRows = rows.slice(1);
  console.log(`  找到 ${dataRows.length} 条记录`);

  let imported = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const customer = mapRowToCustomer(row);
    if (!customer.name) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('customers')
      .upsert(customer, { onConflict: 'serial_number' });

    if (error) {
      console.error(`  导入失败 [${customer.serial_number}] ${customer.name}:`, error.message);
      skipped++;
    } else {
      imported++;
      if (imported % 10 === 0) console.log(`  已导入 ${imported} 条...`);
    }
  }

  console.log(`  结果: 成功 ${imported} 条, 跳过 ${skipped} 条`);
  return { imported, skipped };
}

async function main() {
  console.log('=== Supabase 数据迁移工具 ===\n');
  console.log(`Supabase URL: ${supabaseUrl}`);

  const xlsxPath = path.join(__dirname, '..', 'data', '客户进度表(4月2日).xlsx');
  const xlsxPath2 = path.join(__dirname, '..', 'data', '已发货未闭环客户进度(4月2日).xlsx');

  if (!fs.existsSync(xlsxPath)) {
    console.error(`文件不存在: ${xlsxPath}`);
    process.exit(1);
  }

  console.log('\n[主数据文件] 客户进度表(4月2日).xlsx');
  const r1 = await migrateFile(xlsxPath);

  if (fs.existsSync(xlsxPath2)) {
    console.log('\n[额外文件] 已发货未闭环客户进度(4月2日).xlsx');
    const r2 = await migrateFile(xlsxPath2);
    console.log(`\n总计: 成功 ${r1.imported + r2.imported} 条`);
  }

  console.log('\n=== 迁移完成 ===');
  console.log('运行 npm run dev 启动应用');
}

main().catch(console.error);
