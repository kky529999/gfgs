// 测试脚本：检查页面 HTML 内容
// 运行方式：node --env-file=.env.local test-page-content.mjs

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

console.log('=== Checking Page Content ===\n');

// 1. 获取员工信息并生成 token
const phone = '18809185627';
const { data: employee } = await supabaseAdmin
  .from('employees')
  .select('id, name, departments!inner(code)')
  .eq('phone', phone)
  .single();

const userRole = employee.departments?.code || 'business';
const token = jwt.sign(
  { user_id: employee.id, role: userRole, phone: employee.phone },
  jwtSecret,
  { expiresIn: '7d' }
);

console.log(`Testing with: ${employee.name} (${userRole})`);

// 2. 发送请求并获取完整响应
const makeRequest = (path, cookie) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: cookie ? { 'Cookie': cookie } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
};

// 3. 测试 /dashboard 页面（也应该显示客户数据）
const cookie = `gfgs_auth=${encodeURIComponent(token)}`;

console.log('\n--- Checking /dashboard page ---');
try {
  const res = await makeRequest('/dashboard', cookie);
  console.log(`Status: ${res.statusCode}`);
  console.log(`Body length: ${res.body.length} chars`);

  // 搜索关键词
  const keywords = ['客户', 'customer', '林广明', '孔宝良', '暂无', '错误', '未登录'];
  for (const kw of keywords) {
    const count = (res.body.match(new RegExp(kw, 'g')) || []).length;
    if (count > 0) {
      console.log(`  "${kw}": ${count} occurrences`);
    }
  }

  // 查找 HTML 中的客户名称
  const nameMatch = res.body.match(/林广明|孔宝良|耿建华/g);
  if (nameMatch) {
    console.log('\n✓ Found customer names in HTML');
  } else {
    console.log('\n✗ No customer names found in HTML');
    console.log('  HTML preview (around 2000 chars):');
    console.log(res.body.substring(1500, 3500));
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}

console.log('\n--- Checking /customers page ---');
try {
  const res = await makeRequest('/customers', cookie);
  console.log(`Status: ${res.statusCode}`);
  console.log(`Body length: ${res.body.length} chars`);

  // 搜索关键词
  const keywords = ['客户列表', 'customer', '暂无客户', '林广明', '错误', '未登录'];
  for (const kw of keywords) {
    const count = (res.body.match(new RegExp(kw, 'g')) || []).length;
    if (count > 0) {
      console.log(`  "${kw}": ${count} occurrences`);
    }
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}

console.log('\n✓ Test completed');