// 测试脚本：完整模拟 getCustomersAction 的 auth flow
// 运行方式：node --env-file=.env.local test-full-auth.mjs <手机号>

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const phone = process.argv[2] || '18809185627';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('=== Simulating getCustomersAction flow ===\n');

// 1. 模拟登录获取 JWT
console.log('1. Simulating login...');
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
console.log(`   Employee: ${employee.name} (${employee.id})`);
console.log(`   Role from department: ${userRole}`);

// 2. 生成 JWT token（模拟 signToken）
const token = jwt.sign(
  {
    user_id: employee.id,
    role: userRole,
    phone: employee.phone
  },
  jwtSecret,
  { expiresIn: '7d' }
);

console.log(`   JWT generated successfully (${token.length} chars)`);

// 3. 验证 JWT token（模拟 verifyToken）
const decoded = jwt.verify(token, jwtSecret);
console.log(`   JWT verified: user_id=${decoded.user_id}, role=${decoded.role}`);

// 4. 设置 RLS session（模拟 refreshSessionAction）
console.log('\n2. Setting RLS session...');
await supabaseAdmin.rpc('set_auth_session', {
  p_user_id: employee.id,
  p_role: userRole
});
console.log(`   RLS session set: user_id=${employee.id}, role=${userRole}`);

// 5. 执行查询（模拟 getCustomersAction）
console.log('\n3. Querying customers...');

let query = supabaseAdmin
  .from('customers')
  .select(`
    *,
    salesperson:employees!salesperson_id(id, name, phone),
    tech_assigned:employees!tech_assigned_id(id, name, phone)
  `)
  .order('created_at', { ascending: false });

// Apply role-based filtering
if (userRole === 'business') {
  query = query.eq('salesperson_id', employee.id);
  console.log('   Applied business filter: salesperson_id =', employee.id);
} else if (userRole === 'tech') {
  query = query.eq('tech_assigned_id', employee.id);
  console.log('   Applied tech filter: tech_assigned_id =', employee.id);
} else {
  console.log('   Admin/GM - no filter applied');
}

const { data: customers, error, count } = await query;

if (error) {
  console.error('   Query error:', error);
} else {
  console.log(`\n4. Results: ${count || customers?.length || 0} customers`);
  if (customers && customers.length > 0) {
    console.log('   First 3 customers:');
    customers.slice(0, 3).forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.name} | ${c.current_stage} | 业务员: ${c.salesperson?.name || '未分配'}`);
    });
  }
}

console.log('\n✓ Test completed');
