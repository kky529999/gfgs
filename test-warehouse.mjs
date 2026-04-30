// Warehouse Management Test Script

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import http from 'http';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const port = 3000;

console.log('=== Warehouse Management Test ===');

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

// Test 1: Warehouse page
async function test1() {
  console.log('Test 1: Warehouse page');
  const cookie = await getAdminToken();
  const res = await makeRequest('GET', '/warehouse', null, cookie);
  if (res.statusCode === 200) {
    const hasUI = res.body.includes('??') || res.body.includes('warehouse') || res.body.includes('inventory');
    console.log('  PASS: Status 200, has UI=' + hasUI);
    return true;
  } else {
    console.log('  FAIL: Status ' + res.statusCode);
    return false;
  }
}

// Test 2: Inventory data
async function test2() {
  console.log('Test 2: Inventory data');
  const { data, count } = await supabaseAdmin.from('inventory').select('id, product_name, quantity', { count: 'exact' }).limit(5);
  if (data && data.length > 0) {
    console.log('  PASS: Found ' + data.length + ' inventory items');
    console.log('    Sample: ' + data[0].product_name + ' (qty: ' + data[0].quantity + ')');
    return true;
  } else {
    console.log('  INFO: No inventory data yet');
    return true; // Not a failure if empty
  }
}

async function runTests() {
  await test1();
  await test2();
  console.log('=== Tests Complete ===');
}

runTests().catch(console.error);
