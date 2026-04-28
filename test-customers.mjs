// 测试脚本：检查客户数据是否可访问
// 运行方式：node --env-file=.env.local test-customers.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

// 使用 service role key 绕过 RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('Testing customer access...\n');

// 1. 检查客户总数
const { count, error: countError } = await supabaseAdmin
  .from('customers')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.error('Error counting customers:', countError);
} else {
  console.log(`Total customers in database: ${count}`);
}

// 2. 获取前5条客户记录
const { data: customers, error: selectError } = await supabaseAdmin
  .from('customers')
  .select('id, name, phone, current_stage, salesperson_id')
  .limit(5);

if (selectError) {
  console.error('Error fetching customers:', selectError);
} else {
  console.log('\nSample customers:');
  customers?.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} | ${c.phone || '无电话'} | ${c.current_stage} | 业务员: ${c.salesperson_id || '未分配'}`);
  });
}

// 3. 检查 RLS 配置
console.log('\nChecking RLS policies...');
const { data: policies } = await supabaseAdmin.rpc('pg_catalog.pg_policies', {
  schemaname: 'public',
  tablename: 'customers'
});

// 4. 检查 set_auth_session 函数
console.log('\nChecking auth functions...');
const { data: functions } = await supabaseAdmin
  .from('information_schema.routines')
  .select('routine_name')
  .eq('routine_schema', 'public')
  .like('routine_name', '%auth%');

console.log('Auth functions:', functions);

console.log('\n✓ Test completed');
