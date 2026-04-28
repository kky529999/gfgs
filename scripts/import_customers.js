const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function readEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local file');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  return envVars;
}

const envVars = readEnvFile();
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Convert Excel serial number to ISO date string
// Excel serial number: days since 1900-01-01 (with leap year bug)
function excelSerialToDate(serial) {
  if (serial === null || serial === undefined) return null;
  const s = String(serial).trim();
  if (s === '' || s === '/' || s === '-' || s === '\\') return null;
  const n = Number(s);
  if (isNaN(n)) return null;
  // Excel epoch is 1900-01-01 (but has leap year bug, so add 1 for dates after 1900-02-28)
  const excelEpoch = new Date(1900, 0, 1);
  excelEpoch.setDate(excelEpoch.getDate() + n - 1);
  return excelEpoch.toISOString().split('T')[0];
}

// Map stage from date fields (matching database enum: survey, design, filing, record, grid_materials, ship, grid, close)
function getStage(dates) {
  const stages = ['survey', 'design', 'filing', 'record', 'grid_materials', 'ship', 'grid', 'close'];
  for (let i = 0; i < 8; i++) {
    if (dates[i] && dates[i] !== '/' && dates[i] !== '-') {
      return stages[i];
    }
  }
  return 'survey';
}

// Map salesperson name to employee ID
async function getEmployeeId(salespersonName) {
  if (!salespersonName || salespersonName === '/') return null;
  const { data } = await supabase
    .from('employees')
    .select('id')
    .ilike('name', `%${salespersonName}%`)
    .single();
  return data?.id || null;
}

async function importCustomers() {
  // Read Excel file
  const workbook = XLSX.readFile('data/客户进度表(4月2日).xlsx');
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // Parse customer data (skip header row)
  // Column mapping based on header analysis:
  // seq: main key (客户跟进情况记录表)
  // district: __EMPTY
  // town: __EMPTY_1
  // customer_name: __EMPTY_2
  // salesperson: __EMPTY_3
  // panel_count: __EMPTY_4
  // brand: __EMPTY_5
  // house_type: __EMPTY_6
  // dates: __EMPTY_7 (__EMPTY_7 to __EMPTY_15)
  // shipping_date: __EMPTY_12
  // grid_date: __EMPTY_14
  // closed_date: __EMPTY_15
  // user_acceptance: __EMPTY_17
  // project_company: __EMPTY_18
  // business_fee: __EMPTY_19

  const customers = data.slice(1)
    .filter(row => row['客户跟进情况记录表']) // Skip empty rows
    .map(row => {
      const seq = row['客户跟进情况记录表'];
      // Map to actual database columns: area, township, user_acceptance_date, close_date, etc.
      const district = row['__EMPTY'] || '';
      const township = row['__EMPTY_1'] || '';
      const name = row['__EMPTY_2'] || '';
      const salesperson = row['__EMPTY_3'] || '';
      const panelCount = Number(row['__EMPTY_4']) || 0;
      const brand = row['__EMPTY_5'] || '';
      const houseType = row['__EMPTY_6'] || '';

      const surveyDate = excelSerialToDate(row['__EMPTY_7']);
      const designDate = excelSerialToDate(row['__EMPTY_8']);
      const filingDate = excelSerialToDate(row['__EMPTY_9']);
      const recordDate = excelSerialToDate(row['__EMPTY_10']); // 备案 date
      const gridMaterialsDate = excelSerialToDate(row['__EMPTY_11']); // 并网资料 date
      const shipDate = excelSerialToDate(row['__EMPTY_12']); // 发货 date
      const shippingDays = row['__EMPTY_13'];
      const gridDate = excelSerialToDate(row['__EMPTY_14']); // 并网 date
      const closeDate = excelSerialToDate(row['__EMPTY_15']); // 闭环 date
      const closureDays = row['__EMPTY_16'];
      const userAcceptanceRaw = row['__EMPTY_17'];
      const projectCompany = row['__EMPTY_18'] || '';
      const businessFee = row['__EMPTY_19'] || ''; // Not in DB schema

      const dates = [surveyDate, designDate, filingDate, recordDate, gridMaterialsDate, shipDate, gridDate, closeDate];
      const stage = getStage(dates);

      return {
        seq,
        area: district,
        township,
        name,
        salesperson,
        panel_count: panelCount,
        brand,
        house_type: houseType,
        survey_date: surveyDate,
        design_date: designDate,
        filing_date: filingDate,
        record_date: recordDate,
        grid_materials_date: gridMaterialsDate,
        ship_date: shipDate,
        grid_date: gridDate,
        close_date: closeDate,
        stage,
        // Skip user_acceptance_date for now - contains mixed data types
        project_company: projectCompany,
        // business_fee: removed - not in database schema
      };
    })
    .filter(c => c.name && c.name !== '/');

  console.log(`Found ${customers.length} customers in Excel file`);
  console.log('Sample customer:', JSON.stringify(customers[0], null, 2));

  // Get employee IDs for salespersons
  console.log('\n--- Getting salesperson IDs ---');
  const salespersonNames = [...new Set(customers.map(c => c.salesperson).filter(Boolean))];
  const employeeMap = {};

  for (const name of salespersonNames) {
    employeeMap[name] = await getEmployeeId(name);
    if (employeeMap[name]) {
      console.log(`  ${name} -> ${employeeMap[name]}`);
    } else {
      console.log(`  ${name} -> NOT FOUND (will use null)`);
    }
  }

  console.log('\n--- Importing customers ---');

  const imported = [];
  const errors = [];

  for (const cust of customers) {
    const salespersonId = employeeMap[cust.salesperson] || null;

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        name: cust.name,
        area: cust.area,
        township: cust.township,
        salesperson_id: salespersonId,
        panel_count: cust.panel_count,
        brand: cust.brand,
        house_type: cust.house_type,
        current_stage: cust.stage,
        survey_date: cust.survey_date,
        design_date: cust.design_date,
        filing_date: cust.filing_date,
        record_date: cust.record_date,
        grid_materials_date: cust.grid_materials_date,
        ship_date: cust.ship_date,
        grid_date: cust.grid_date,
        close_date: cust.close_date,
        user_acceptance_date: cust.user_acceptance_date,
        project_company: cust.project_company,
      })
      .select()
      .single();

    if (error) {
      console.log(`  [ERROR] ${cust.name}:`, error.message);
      errors.push({ name: cust.name, error: error.message });
    } else {
      console.log(`  [OK] ${cust.seq}. ${cust.name} (${cust.brand}, ${cust.stage}) - 业务员: ${cust.salesperson}`);
      imported.push(newCustomer);
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total in Excel: ${customers.length}`);
  console.log(`Successfully imported: ${imported.length}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nFailed imports:');
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }
}

importCustomers().catch(console.error);
