const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
// Read .env.local file directly
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

// Map titles to departments
function getDepartment(title) {
  if (!title) return null;
  if (title.includes('业务') || title.includes('销售')) {
    return 'business'; // 业务开发部
  }
  if (title.includes('技术')) {
    return 'tech'; // 技术方案部
  }
  if (title.includes('综合') || title.includes('行政')) {
    return 'admin'; // 综合管理部
  }
  if (title.includes('副总') || title.includes('总经理')) {
    return 'gm'; // 总经理
  }
  return 'business'; // default
}

// Determine initial role based on title
function getRole(title) {
  if (!title) return 'business';
  if (title.includes('副总') || title.includes('总经理') || title.includes('主管')) {
    // Check if it's business, tech, or admin department
    if (title.includes('业务')) return 'gm';
    if (title.includes('技术')) return 'tech';
    if (title.includes('综合')) return 'admin';
  }
  return 'business';
}

async function importEmployees() {
  // Read Excel file
  const workbook = XLSX.readFile('data/公司通讯录.xls');
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // Parse employee data (skip header row)
  const employees = data.slice(1)
    .map((row) => ({
      name: (row.__EMPTY || row['姓  名'])?.replace(/\s+/g, '').trim(),
      title: row.__EMPTY_1 || row['职   位'],
      phone: String(row.__EMPTY_2 || row['联系电话']).replace(/\s+/g, '').trim()
    }))
    .filter(e => e.name && e.phone && e.phone !== '/' && e.phone !== '联系电话');

  console.log(`Found ${employees.length} employees in Excel file:`);
  employees.forEach(e => console.log(`  - ${e.name} (${e.title}) - ${e.phone}`));

  // First, check if departments exist
  console.log('\n--- Checking departments ---');
  const { data: existingDepts, error: deptError } = await supabase
    .from('departments')
    .select('id, code, name');

  if (deptError) {
    console.error('Error fetching departments:', deptError);
  } else {
    console.log('Existing departments:', existingDepts);
  }

  // Get department IDs
  const deptMap = {};
  if (existingDepts && existingDepts.length > 0) {
    existingDepts.forEach(d => {
      deptMap[d.code] = d.id;
    });
  } else {
    // Create default departments
    console.log('\n--- Creating default departments ---');
    const defaultDepts = [
      { code: 'admin', name: '综合管理部' },
      { code: 'business', name: '业务开发部' },
      { code: 'tech', name: '技术方案部' },
      { code: 'gm', name: '管理层' }
    ];

    for (const dept of defaultDepts) {
      const { data: newDept, error } = await supabase
        .from('departments')
        .insert(dept)
        .select()
        .single();

      if (error) {
        console.error(`Error creating department ${dept.code}:`, error);
      } else {
        console.log(`Created department: ${dept.name} (${dept.code})`);
        deptMap[dept.code] = newDept.id;
      }
    }
  }

  // Hash default password
  const defaultPassword = '123456';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  console.log('\n--- Importing employees ---');

  const importedEmployees = [];
  const errors = [];

  for (const emp of employees) {
    // Check if phone already exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('phone', emp.phone)
      .single();

    if (existing) {
      console.log(`  [SKIP] ${emp.name} (${emp.phone}) - already exists`);
      continue;
    }

    // Determine role and department
    const role = getRole(emp.title);
    const deptCode = getDepartment(emp.title);
    const department_id = deptMap[deptCode] || null;

    // Create employee
    const { data: newEmployee, error } = await supabase
      .from('employees')
      .insert({
        name: emp.name,
        phone: emp.phone,
        title: emp.title,
        department_id: department_id,
        is_active: true,
        password_hash: passwordHash,
        must_change_password: true
      })
      .select()
      .single();

    if (error) {
      console.error(`  [ERROR] ${emp.name} (${emp.phone}):`, error.message);
      errors.push({ name: emp.name, phone: emp.phone, error: error.message });
    } else {
      console.log(`  [OK] ${emp.name} (${emp.title}) - ${emp.phone} - role: ${role}, dept: ${deptCode}`);
      importedEmployees.push(newEmployee);
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total in Excel: ${employees.length}`);
  console.log(`Successfully imported: ${importedEmployees.length}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nFailed imports:');
    errors.forEach(e => console.log(`  - ${e.name} (${e.phone}): ${e.error}`));
  }

  console.log('\nDefault password for all imported employees: 123456');
  console.log('(They will be prompted to change password on first login)');
}

importEmployees().catch(console.error);
