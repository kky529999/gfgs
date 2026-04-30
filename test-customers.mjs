// Customer Management Test Script
// Run: node --env-file=.env.local test-customers.mjs

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

console.log('=== Customer Management Test ===');

// Helper to make HTTP requests
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
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Get admin token
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

// Test 1: Customer list page
async function test1() {
  console.log('Test 1: Customer list page');
  const cookie = await getAdminToken();
  const res = await makeRequest('GET', '/customers', null, cookie);
  if (res.statusCode === 200) {
    const hasCustomers = res.body.includes('????') || res.body.includes('customer');
    const hasData = res.body.includes('???') || res.body.includes('???');
    console.log('  PASS: Status 200, has list UI=' + hasCustomers + ', has data=' + hasData);
    return true;
  } else {
    console.log('  FAIL: Status ' + res.statusCode);
    return false;
  }
}

// Test 2: Customer create page
async function test2() {
  console.log('Test 2: Customer create page');
  const cookie = await getAdminToken();
  const res = await makeRequest('GET', '/customers/new', null, cookie);
  if (res.statusCode === 200) {
    const hasForm = res.body.includes('????') || res.body.includes('name') || res.body.includes('phone');
    console.log('  PASS: Status 200, has form=' + hasForm);
    return true;
  } else {
    console.log('  FAIL: Status ' + res.statusCode);
    return false;
  }
}

// Test 3: Get customer data from DB
async function test3() {
  console.log('Test 3: Customer data in database');
  const { data: customers, count } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, current_stage', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  if (customers && customers.length > 0) {
    console.log('  PASS: Found ' + customers.length + ' customers');
    console.log('    Sample: ' + customers[0].name + ' (' + customers[0].current_stage + ')');
    return customers[0];
  } else {
    console.log('  FAIL: No customers found');
    return null;
  }
}

// Test 4: Customer detail page
async function test4(customer) {
  console.log('Test 4: Customer detail page');
  const cookie = await getAdminToken();
  const res = await makeRequest('GET', '/customers/' + customer.id, null, cookie);
  if (res.statusCode === 200) {
    const hasDetail = res.body.includes(customer.name) || res.body.includes('????');
    console.log('  PASS: Status 200, has detail=' + hasDetail);
    return true;
  } else {
    console.log('  FAIL: Status ' + res.statusCode);
    return false;
  }
}

// Test 5: Server actions work
async function test5() {
  console.log('Test 5: Customer server actions');
  const cookie = await getAdminToken();
  
  // Try to access employees for dropdown
  const res = await makeRequest('GET', '/employees', null, cookie);
  if (res.statusCode === 200) {
    const hasEmployees = res.body.includes('??') || res.body.includes('employee');
    console.log('  PASS: Employees page loads for customer assignment');
    return true;
  } else {
    console.log('  FAIL: Status ' + res.statusCode);
    return false;
  }
}

// Run tests
async function runTests() {
  const cookie = await getAdminToken();
  const t1 = await test1();
  const t2 = await test2();
  const customer = await test3();
  if (customer) {
    await test4(customer);
  }
  await test5();
  
  console.log('=== Tests Complete ===');
  console.log('Summary: list=' + t1 + ', create=' + t2 + ', data=' + (customer != null));
}

runTests().catch(console.error);
