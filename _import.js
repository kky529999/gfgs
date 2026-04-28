const XLSX = require('xlsx');
const https = require('https');

// Supabase config
const SUPABASE_URL = 'https://rihkdwijnrolpvayqcwz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtkd2lqbnJvbHB2YXlxY3d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMDgwOCwiZXhwIjoyMDkyMDg2ODA4fQ.UpSpclv2NJiQHHxWYX6siLekgnPlzUpPuDHbFmVXVbc';

// Excel serial date to JS Date
function excelSerialToDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 25569) return null;
  const days = serial - 25569;
  const date = new Date(days * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

// Make Supabase REST API request
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

// Headers are in row 2 (index 1)
const headers = rows[1];

// Column indices (from analysis)
const COL = {
  SEQUENCE: 0,
  AREA: 1,
  CUSTOMER_NAME: 3,  // "客户\n名称"
  SALESPERSON: 4,    // "业务员"
  PANEL_COUNT: 5,
  BRAND: 6,
  HOUSE_TYPE: 7,     // "户型"
  SURVEY: 8,         // "现堪"
  DESIGN: 9,         // "设计\n出图"
  FILING: 10,        // "建档通过"
  RECORD: 11,        // "备案"
  GRID_MATERIALS: 12, // "并网资料\n+网上国网"
  SHIP: 13,          // "发货日期"
  GRID: 15,          // "并网日期"
  CLOSE: 16,         // "闭环日期"
  ACCEPTANCE: 18,    // "用户验收"
  COMPANY: 19,       // "项目\n公司"
  COMMISSION: 20     // "业务费"
};

// Data starts from row 3 (index 2)
const dataRows = rows.slice(2).filter(row => row && row[COL.CUSTOMER_NAME]);

console.log(`Found ${dataRows.length} customer records to import`);

// Parse all rows
const customers = dataRows.map((row, idx) => {
  // Determine current stage from dates
  let currentStage = 'survey';
  const stageColumns = [
    { idx: COL.SURVEY, stage: 'survey' },
    { idx: COL.DESIGN, stage: 'design' },
    { idx: COL.FILING, stage: 'filing' },
    { idx: COL.RECORD, stage: 'record' },
    { idx: COL.GRID_MATERIALS, stage: 'grid_materials' },
    { idx: COL.SHIP, stage: 'ship' },
    { idx: COL.GRID, stage: 'grid' },
    { idx: COL.CLOSE, stage: 'close' }
  ];
  
  for (const sc of stageColumns) {
    if (row[sc.idx]) {
      currentStage = sc.stage;
    }
  }

  return {
    name: String(row[COL.CUSTOMER_NAME] || '').trim(),
    phone: null,
    area: String(row[COL.AREA] || '').trim(),
    address: String(row[2] || '').trim(),  // 峡石镇
    capacity: null,
    brand: String(row[COL.BRAND] || '').trim(),
    panel_count: parseInt(row[COL.PANEL_COUNT]) || null,
    house_type: String(row[COL.HOUSE_TYPE] || '').trim(),
    customer_type: 'direct',
    current_stage: currentStage,
    survey_date: excelSerialToDate(row[COL.SURVEY]),
    salesperson_name: String(row[COL.SALESPERSON] || '').trim(),
    company: String(row[COL.COMPANY] || '').trim(),
    commission: String(row[COL.COMMISSION] || '').trim()
  };
});

// Get unique salesperson names
const salespersonNames = [...new Set(customers.map(c => c.salesperson_name).filter(n => n))];
console.log('Salespersons found:', salespersonNames);

// Get existing employees
const { data: existingEmployees } = await supabaseRequest('employees?select=id,name,phone', 'GET');
console.log('Existing employees:', existingEmployees?.map(e => e.name));

// Create missing employees
const employeeMap = new Map();
existingEmployees?.forEach(e => employeeMap.set(e.name, e.id));

for (const name of salespersonNames) {
  if (!employeeMap.has(name)) {
    console.log(`Creating employee: ${name}`);
    const { data: newEmp, status } = await supabaseRequest('employees', 'POST', {
      name: name,
      phone: '13800000000', // Placeholder
      password_hash: '$2a$10$abcdefghijklmnopqrstuv', // Placeholder hash
      is_active: true,
      must_change_password: true
    });
    if (status === 201 && newEmp?.[0]?.id) {
      employeeMap.set(name, newEmp[0].id);
      console.log(`  Created with ID: ${newEmp[0].id}`);
    }
  }
}

// Prepare customers for insert (without salesperson_name)
const customersToInsert = customers.map(c => ({
  name: c.name,
  area: c.area || null,
  address: c.address || null,
  brand: c.brand || null,
  panel_count: c.panel_count || null,
  house_type: c.house_type || null,
  customer_type: 'direct',
  current_stage: c.current_stage,
  survey_date: c.survey_date || null,
  salesperson_id: employeeMap.get(c.salesperson_name) || null,
  commission_note: c.commission || null,
  project_company: c.company || null
}));

console.log(`\nPreparing to insert ${customersToInsert.length} customers...`);

// Insert customers
const { status, data: insertResult } = await supabaseRequest('customers', 'POST', customersToInsert);

if (status === 201) {
  console.log(`✅ Successfully imported ${customersToInsert.length} customers!`);
} else {
  console.log(`❌ Import failed:`, insertResult);
}
