// Corrected Module Test Script

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import http from 'http';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const port = 3000;

console.log('=== Corrected Module Tests ===');

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
  const cookie = await getAdminToken();
  const res = await makeRequest('GET', path, null, cookie);
  const status = res.statusCode === 200 ? 'PASS' : 'FAIL';
  const hasUI = keywords.some(k => res.body.includes(k));
  console.log('  ' + status + ': ' + name + ' page (status ' + res.statusCode + ', UI=' + hasUI + ')');
  return res.statusCode === 200;
}

async function testDB(name, table, cols) {
  const { data, count, error } = await supabaseAdmin.from(table).select(cols, { count: 'exact' }).limit(3);
  if (error) {
    console.log('  ERROR: ' + name + ' table - ' + error.message);
    return false;
  }
  const sample = data && data.length > 0 ? JSON.stringify(data[0]).substring(0, 60) : 'empty';
  console.log('  OK: ' + name + ' has ' + (count || 0) + ' rows');
  return true;
}

async function runTests() {
  console.log('--- Page Tests ---');
  await testPage('Dealers', '/dealers', ['???', 'dealer']);
  await testPage('Brand Policies', '/brand-policies', ['??', '??', 'brand']);
  await testPage('Dashboard', '/dashboard', ['???', 'dashboard', '??']);
  await testPage('Commission', '/salary', ['??', 'commission', 'salary']);
  await testPage('Growth Fund', '/growth-fund', ['????', 'growth']);
  await testPage('Deposits', '/deposits', ['??', 'deposit']);
  await testPage('Invoices', '/invoices', ['??', 'invoice']);
  await testPage('Social Media', '/social-media', ['????', 'social']);

  console.log('\n--- Database Tests ---');
  await testDB('Customers', 'customers', 'id, name');
  await testDB('Employees', 'employees', 'id, name');
  await testDB('Dealers', 'dealers', 'id, name');
  await testDB('Brand Policies', 'brand_policies', 'id, brand_name');
  await testDB('Brand Deposits', 'brand_deposits', 'id');
  await testDB('Social Media', 'social_media_posts', 'id');
  await testDB('Invoices', 'invoices', 'id');
  await testDB('Commissions', 'commissions', 'id');
  await testDB('Growth Fund', 'growth_fund', 'id');

  console.log('\n=== All Tests Complete ===');
}

runTests().catch(console.error);
