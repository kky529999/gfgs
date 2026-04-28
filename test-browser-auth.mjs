// 测试脚本：模拟完整浏览器请求流程
// 运行方式：node --env-file=.env.local test-browser-auth.mjs

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

console.log('=== Testing Browser Auth Flow ===\n');

// 1. 获取员工信息
const phone = '18809185627'; // 王总
const { data: employee, error: empError } = await supabaseAdmin
  .from('employees')
  .select('id, name, phone, department_id, departments!inner(code)')
  .eq('phone', phone)
  .single();

if (empError || !employee) {
  console.error('Employee not found');
  process.exit(1);
}

const userRole = employee.departments?.code || 'business';
console.log(`Employee: ${employee.name}`);
console.log(`Role: ${userRole}`);

// 2. 生成 JWT（模拟登录）
const token = jwt.sign(
  { user_id: employee.id, role: userRole, phone: employee.phone },
  jwtSecret,
  { expiresIn: '7d' }
);

console.log(`JWT generated: ${token.substring(0, 50)}...`);

// 3. 模拟 HTTP 请求到 Next.js
const makeRequest = (path, cookie) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Node.js Test Script'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 500) // 限制输出
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
};

// 4. 测试不同场景
console.log('\n--- Test 1: No cookie (should redirect to /login) ---');
try {
  const res1 = await makeRequest('/customers', '');
  console.log(`Status: ${res1.statusCode}`);
  console.log(`Redirect: ${res1.headers.location || 'none'}`);
} catch (e) {
  console.log(`Error: ${e.message}`);
}

console.log('\n--- Test 2: Valid cookie (admin role) ---');
try {
  const cookie = `gfgs_auth=${encodeURIComponent(token)}`;
  const res2 = await makeRequest('/customers', cookie);
  console.log(`Status: ${res2.statusCode}`);
  if (res2.headers.location) {
    console.log(`Redirect: ${res2.headers.location}`);
  } else {
    // 检查是否返回了客户列表
    const hasCustomerData = res2.body.includes('客户') || res2.body.includes('customer');
    console.log(`Has customer data: ${hasCustomerData}`);
    console.log(`Body preview: ${res2.body.substring(0, 200)}...`);
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}

console.log('\n--- Test 3: Check .env.local cookie config ---');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const secureMatch = envContent.match(/NODE_ENV=(\S+)/);
const nodeEnv = secureMatch ? secureMatch[1] : 'unknown';
console.log(`NODE_ENV: ${nodeEnv}`);
console.log(`Cookie secure flag would be: ${nodeEnv === 'production'}`);

console.log('\n✓ Test completed');