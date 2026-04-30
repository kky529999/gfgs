/**
 * Script to reset all employee passwords to "123456"
 * Usage: node reset-all-passwords.js
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rihkdwijnrolpvayqcwz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtkd2lqbnJvbHB2YXlxY3d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMDgwOCwiZXhwIjoyMDkyMDg2ODA4fQ.UpSpclv2NJiQHHxWYX6siLekgnPlzUpPuDHbFmVXVbc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetAllPasswords() {
  const newPassword = '123456';
  const saltRounds = 10;

  console.log('Hashing password...');
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);
  console.log('Hash generated.');

  console.log('Fetching all employees...');
  const { data: employees, error: fetchError } = await supabase
    .from('employees')
    .select('id, name, phone');

  if (fetchError) {
    console.error('Error fetching employees:', fetchError);
    return;
  }

  console.log(`Found ${employees.length} employees:`);
  employees.forEach(emp => {
    console.log(`  - ${emp.name} (${emp.phone})`);
  });

  console.log('\nUpdating all passwords...');
  const { error: updateError } = await supabase
    .from('employees')
    .update({
      password_hash: passwordHash,
      must_change_password: false,
      updated_at: new Date().toISOString()
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

  if (updateError) {
    console.error('Error updating passwords:', updateError);
    return;
  }

  console.log(`\n✅ Successfully reset ${employees.length} employee passwords to: ${newPassword}`);
}

resetAllPasswords().catch(console.error);
