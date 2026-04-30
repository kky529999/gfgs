// Employee Management Test Script
// Run: node --env-file=.env.local test-employees.mjs

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import http from 'http';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const port = 3000;

console.log('=== Employee Management Test ===');

function makeRequest(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { 'Cookie': cookie }),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getAdminToken() {
  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('id, name, departments!inner(code)')
    .eq('phone', '18809185627')
    .single();

  const token = jwt.sign(
    { user_id: employee.id, role: employee.departments?.code || 'admin', phone: employee.phone },
    jwtSecret,
    { expiresIn: '7d' }
  );
  return 'gfgs_auth=' + encodeURIComponent(token);
}

// Test 1: Employee list page
async function test1() {
  console.log('Test 1: Employee list page');
  const cookie = await getAdminToken();
  const res = await makeRequest('GET', '/employees', null, cookie);
  if (res.statusCode === 200) {
    const hasUI = res.body.includes('??') || res.body.includes('employee') || res.body.includes('employees');
    console.log('  PASS: Status 200, has UI=' + hasUI);
    return true;
  } else {
    console.log('  FAIL: Status ' + res.statusCode);
    return false;
  }
}

// Test 2: Employee data in DB
async function test2() {
  console.log('Test 2: Employee data in database');
  const { data: employees, count } = await supabaseAdmin
    .from('employees')
    .select('id, name, phone, is_active', { count: 'exact' })
    .order('name');

  if (employees && employees.length > 0) {
    console.log('  PASS: Found ' + employees.length + ' employees');
    console.log('    Sample: ' + employees[0].name + ' (' + employees[0].phone + ')');
    return true;
  } else {
    console.log('  FAIL: No employees found');
    return false;
  }
}

// Test 3: Department data in DB
async function test3() {
  console.log('Test 3: Department data');
  const { data: depts, count } = await supabaseAdmin
    .from('departments')
    .select('id, name, code', { count: 'exact' })
    .order('name');

  if (depts && depts.length > 0) {
    console.log('  PASS: Found ' + depts.length + ' departments');
    console.log('    ' + depts.map(d => d.name + '(' + d.code + ')').join(', '));
    return true;
  } else {
    console.log('  FAIL: No departments found');
    return false;
  }
}

async function runTests() {
  await test1();
  await test2();
  await test3();
  console.log('=== Tests Complete ===');
}

runTests().catch(console.error);
