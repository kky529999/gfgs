// Multiple Module Test Script

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import http from 'http';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const port = 3000;

console.log('=== Module Tests ===');

function makeRequest(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie && { 'Cookie': cookie }) },
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
  const { data: employee } = await supabaseAdmin.from('employees').select('id, departments!inner(code)').eq('phone', '18809185627').single();
  const token = jwt.sign({ user_id: employee.id, role: employee.departments?.code || 'admin', phone: employee.phone }, jwtSecret, { expiresIn: '7d' });
  return 'gfgs_auth=' + encodeURIComponent(token);
}

async function testPage(name, path, keywords) {
  console.log('Test ' + name + ' page');
  const cookie = await getAdminToken();
  const res = await makeRequest('GET', path, null, cookie);
  if (res.statusCode === 200) {
    const hasUI = keywords.some(k => res.body.includes(k));
    console.log('  PASS: Status 200, UI=' + hasUI);
    return true;
  } else {
    console.log('  FAIL: Status ' + res.statusCode);
    return false;
  }
}

async function testDB(name, table, cols) {
  console.log('Test ' + name + ' data');
  const { data, count } = await supabaseAdmin.from(table).select(cols, { count: 'exact' }).limit(5);
  if (data !== null) {
    console.log('  PASS: ' + data.length + ' records' + (data.length > 0 ? ', sample: ' + JSON.stringify(data[0]).substring(0, 80) : ''));
    return true;
  } else {
    console.log('  FAIL: Query error');
    return false;
  }
}

async function runTests() {
  // Dealers (Task 34)
  await testPage('Dealers', '/dealers', ['???', 'dealer']);
  await testDB('Dealers', 'dealers', 'id, name');
  
  // Brand Policies (Task 35)
  await testPage('Brand Policies', '/brand-policies', ['??', '??', 'brand']);
  await testDB('Brand Policies', 'brand_policies', 'id, brand_name');
  
  // Dashboard (Task 30)
  await testPage('Dashboard', '/dashboard', ['???', 'dashboard', '??']);
  await testDB('Dashboard customers', 'customers', 'id, current_stage');
  
  // Salary/Commission (Task 25)
  await testPage('Commission', '/salary', ['??', 'commission', 'salary']);
  await testDB('Commission', 'commissions', 'id');
  
  // Growth Fund (Task 26)
  await testPage('Growth Fund', '/growth-fund', ['????', 'growth']);
  await testDB('Growth Fund', 'growth_fund', 'id');
  
  // Deposits (Task 29)
  await testPage('Deposits', '/deposits', ['??', 'deposit']);
  await testDB('Deposits', 'deposits', 'id');
  
  // Invoices (Task 24)
  await testPage('Invoices', '/invoices', ['??', 'invoice']);
  await testDB('Invoices', 'invoices', 'id');
  
  // Social Media (Task 28)
  await testPage('Social Media', '/social-media', ['????', 'social']);
  await testDB('Social Media', 'social_media', 'id');

  console.log('=== All Tests Complete ===');
}

runTests().catch(console.error);
