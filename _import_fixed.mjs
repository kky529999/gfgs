import XLSX from 'xlsx';
import https from 'https';

const SUPABASE_URL = 'https://rihkdwijnrolpvayqcwz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtkd2lqbnJvbHB2YXlxY3d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMDgwOCwiZXhwIjoyMDkyMDg2ODA4fQ.UpSpclv2NJiQHHxWYX6siLekgnPlzUpPuDHbFmVXVbc';

// Excel serial date to JS Date
function excelSerialToDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 25569) return null;
  const days = serial - 25569;
  const date = new Date(days * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

async function supabaseRequest(table, method, body = null) {
  return new Promise((resolve, reject) => {
    const path = `/rest/v1/${table}`;
    const data = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: SUPABASE_URL.replace('https://', ''),
      path: path,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Read Excel
const workbook = XLSX.readFile('./data/客户进度表(4月2日).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headers = rows[1];

// Column indices (from analysis)
const COL = {
  SEQUENCE: 0,
  AREA: 1,
  TOWNSHIP: 2,
  CUSTOMER_NAME: 3,
  SALESPERSON: 4,
  PANEL_COUNT: 5,
  BRAND: 6,
  HOUSE_TYPE: 7,
  SURVEY: 8,
  DESIGN: 9,
  FILING: 10,
  RECORD: 11,
  GRID_MATERIALS: 12,
  SHIP: 13,
  GRID: 15,
  CLOSE: 16,
  ACCEPTANCE: 18,
  COMPANY: 19
};

// Data starts from row 3 (index 2)
const dataRows = rows.slice(2).filter(row => row && row[COL.CUSTOMER_NAME]);

console.log(`Found ${dataRows.length} customer records`);

// Parse all rows
const customers = dataRows.map((row, idx) => {
  let currentStage = 'survey';
  const stageColumns = [
    { idx: COL.SURVEY, stage: 'survey', col: 'survey_date' },
    { idx: COL.DESIGN, stage: 'design', col: 'design_date' },
    { idx: COL.FILING, stage: 'filing', col: 'filing_date' },
    { idx: COL.RECORD, stage: 'record', col: 'record_date' },
    { idx: COL.GRID_MATERIALS, stage: 'grid_materials', col: 'grid_materials_date' },
    { idx: COL.SHIP, stage: 'ship', col: 'ship_date' },
    { idx: COL.GRID, stage: 'grid', col: 'grid_date' },
    { idx: COL.CLOSE, stage: 'close', col: 'close_date' }
  ];
  
  for (const sc of stageColumns) {
    if (row[sc.idx]) {
      currentStage = sc.stage;
    }
  }

  const surveyDate = excelSerialToDate(row[COL.SURVEY]);
  const designDate = excelSerialToDate(row[COL.DESIGN]);
  const filingDate = excelSerialToDate(row[COL.FILING]);
  const recordDate = excelSerialToDate(row[COL.RECORD]);
  const gridMaterialsDate = excelSerialToDate(row[COL.GRID_MATERIALS]);
  const shipDate = excelSerialToDate(row[COL.SHIP]);
  const gridDate = excelSerialToDate(row[COL.GRID]);
  const closeDate = excelSerialToDate(row[COL.CLOSE]);
  const acceptanceDate = excelSerialToDate(row[COL.ACCEPTANCE]);

  return {
    name: String(row[COL.CUSTOMER_NAME] || '').trim(),
    phone: null,
    area: String(row[COL.AREA] || '').trim(),
    township: String(row[COL.TOWNSHIP] || '').trim(),
    capacity: null,
    brand: String(row[COL.BRAND] || '').trim(),
    panel_count: parseInt(row[COL.PANEL_COUNT]) || null,
    house_type: String(row[COL.HOUSE_TYPE] || '').trim(),
    customer_type: 'direct',
    current_stage: currentStage,
    salesperson_name: String(row[COL.SALESPERSON] || '').trim(),
    project_company: String(row[COL.COMPANY] || '').trim(),
    // Individual date columns
    survey_date: surveyDate,
    design_date: designDate,
    filing_date: filingDate,
    record_date: recordDate,
    grid_materials_date: gridMaterialsDate,
    ship_date: shipDate,
    grid_date: gridDate,
    close_date: closeDate,
    user_acceptance_date: acceptanceDate
  };
});

// Get unique salesperson names
const salespersonNames = [...new Set(customers.map(c => c.salesperson_name).filter(n => n))];
console.log('Salespersons:', salespersonNames);

// Get existing employees
const { data: existingEmployees } = await supabaseRequest('employees?select=id,name', 'GET');

// Create missing employees
const employeeMap = new Map();
existingEmployees?.forEach(e => employeeMap.set(e.name, e.id));

for (const name of salespersonNames) {
  if (!employeeMap.has(name)) {
    console.log(`Creating employee: ${name}`);
    const { data: newEmp, status } = await supabaseRequest('employees', 'POST', {
      name: name,
      phone: '13800000000',
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      is_active: true,
      must_change_password: true
    });
    if (status === 201 && newEmp?.[0]?.id) {
      employeeMap.set(name, newEmp[0].id);
    }
  }
}

// Prepare customers for insert
const customersToInsert = customers.map(c => ({
  name: c.name,
  area: c.area || null,
  township: c.township || null,
  brand: c.brand || null,
  panel_count: c.panel_count || null,
  house_type: c.house_type || null,
  customer_type: 'direct',
  current_stage: c.current_stage,
  project_company: c.project_company || null,
  salesperson_id: employeeMap.get(c.salesperson_name) || null,
  // Date columns
  survey_date: c.survey_date,
  design_date: c.design_date,
  filing_date: c.filing_date,
  record_date: c.record_date,
  grid_materials_date: c.grid_materials_date,
  ship_date: c.ship_date,
  grid_date: c.grid_date,
  close_date: c.close_date,
  user_acceptance_date: c.user_acceptance_date
}));

console.log(`\nInserting ${customersToInsert.length} customers...`);

const { status, data: insertResult } = await supabaseRequest('customers', 'POST', customersToInsert);

if (status === 201) {
  console.log(`SUCCESS: Imported ${customersToInsert.length} customers!`);
} else {
  console.log(`FAILED:`, insertResult);
}
