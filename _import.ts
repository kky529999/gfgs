import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importCustomers() {
  // First check employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, phone');
  console.log('Employees:', JSON.stringify(employees, null, 2));
  
  // Check existing customers
  const { count } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });
  console.log('Current customers count:', count);
}

importCustomers().catch(console.error);
