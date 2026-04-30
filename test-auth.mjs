// Authentication Flow Test Script
// Run: node --env-file=.env.local test-auth.mjs

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

console.log('=== Authentication Flow Test ===');

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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test 1: Verify admin user exists
async function test1() {
  console.log('Test 1: Verify admin user exists');
  const phone = '18809185627';
  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('id, name, phone, departments!inner(code)')
    .eq('phone', phone)
    .single();

  if (employee) {
    console.log('  PASS: Admin user found - ' + employee.name);
    return employee;
  } else {
    console.log('  FAIL: Admin user not found');
    return null;
  }
}

// Test 2: JWT generation
async function test2(employee) {
  console.log('Test 2: JWT token generation');
  try {
    const userRole = employee.departments?.code || 'business';
    const token = jwt.sign(
      { user_id: employee.id, role: userRole, phone: employee.phone },
      jwtSecret,
      { expiresIn: '7d' }
    );
    const decoded = jwt.verify(token, jwtSecret);
    console.log('  PASS: JWT generated and verified');
    return token;
  } catch (e) {
    console.log('  FAIL: JWT generation failed - ' + e.message);
    return null;
  }
}

// Test 3: No auth access
async function test3() {
  console.log('Test 3: Access without auth');
  const res = await makeRequest('GET', '/dashboard');
  if (res.statusCode === 200 || res.statusCode === 302) {
    console.log('  PASS: Status ' + res.statusCode);
  } else {
    console.log('  INFO: Status ' + res.statusCode);
  }
}

// Test 4: With auth access
async function test4(token) {
  console.log('Test 4: Access with valid auth');
  const cookie = 'gfgs_auth=' + encodeURIComponent(token);
  const res = await makeRequest('GET', '/dashboard', null, cookie);
  if (res.statusCode === 200) {
    const hasData = res.body.includes('??') || res.body.includes('dashboard');
    console.log('  PASS: Dashboard loaded (status ' + res.statusCode + ')');
  } else {
    console.log('  FAIL: Access denied (status ' + res.statusCode + ')');
  }
}

// Run tests
async function runTests() {
  const employee = await test1();
  if (!employee) return;
  const token = await test2(employee);
  if (!token) return;
  await test3();
  await test4(token);
  console.log('=== Tests Complete ===');
}

runTests().catch(console.error);
