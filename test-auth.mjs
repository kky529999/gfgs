// 测试脚本：检查用户角色和数据可见性
// 运行方式：node --env-file=.env.local test-auth.mjs <手机号>

import { createClient } from '@supabase/supabase-js';

const phone = process.argv[2] || '18809185627'; // 默认测试王总

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log(`Testing login and customer visibility for: ${phone}\n`);

// 1. 查找员工
const { data: employee, error: empError } = await supabaseAdmin
  .from('employees')
  .select('id, name, phone, title, department_id, departments!inner(code, name)')
  .eq('phone', phone)
  .single();

if (empError || !employee) {
  console.error('Employee not found');
  process.exit(1);
}

console.log('Employee:', employee.name, '|', employee.phone);
console.log('Department:', employee.departments?.name, '| Code:', employee.departments?.code);

// 2. 检查 RLS 可见性（模拟 business 角色）
console.log('\n=== Testing RLS Visibility ===');

// 设置 RLS session 模拟 business 角色
await supabaseAdmin.rpc('set_auth_session', {
  p_user_id: employee.id,
  p_role: employee.departments?.code || 'business'
});

const { data: businessVisible, count: businessCount } = await supabaseAdmin
  .from('customers')
  .select('*', { count: 'exact', head: true })
  .eq('salesperson_id', employee.id);

console.log(`As ${employee.departments?.code} (business role): ${businessCount} customers visible`);

// 设置 RLS session 模拟 admin 角色
await supabaseAdmin.rpc('set_auth_session', {
  p_user_id: employee.id,
  p_role: 'admin'
});

const { data: adminVisible, count: adminCount } = await supabaseAdmin
  .from('customers')
  .select('*', { count: 'exact', head: true });

console.log(`As admin (bypassing salesperson filter): ${adminCount} customers visible`);

// 3. 检查服务角色（绕过 RLS）
const { count: totalCount } = await supabaseAdmin
  .from('customers')
  .select('*', { count: 'exact', head: true });

console.log(`\nTotal customers (service role): ${totalCount}`);

// 4. 检查是否有客户分配给这个员工
const { data: assignedCustomers } = await supabaseAdmin
  .from('customers')
  .select('id, name')
  .eq('salesperson_id', employee.id);

console.log(`\nCustomers assigned to ${employee.name}:`, assignedCustomers?.length || 0);
assignedCustomers?.slice(0, 5).forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.name} (${c.id})`);
});

console.log('\n✓ Test completed');
