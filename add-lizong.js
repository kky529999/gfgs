const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase credentials from env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Find 综合部 department
  const { data: dept } = await supabase
    .from('departments')
    .select('id, name')
    .ilike('name', '%综合%')
    .single();

  if (!dept) {
    console.error('综合部 not found, creating...');
    const { data: newDept } = await supabase
      .from('departments')
      .insert({ name: '综合管理部', code: 'admin' })
      .select()
      .single();
    console.log('Created department:', newDept);
  }

  // Hash default password
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

  // Create 李总 as gm role
  const { data: employee, error } = await supabase
    .from('employees')
    .insert({
      name: '李总',
      phone: '17729581562',
      title: '总经理',
      department_id: dept?.id || null,
      password_hash: passwordHash,
      is_active: true,
      must_change_password: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    process.exit(1);
  }

  console.log('Created employee:', employee);
  console.log('Default password: ChangeMe123!');
}

main();
