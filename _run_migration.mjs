import https from 'https';

const SUPABASE_URL = 'https://rihkdwijnrolpvayqcwz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtkd2lqbnJvbHB2YXlxY3d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMDgwOCwiZXhwIjoyMDkyMDg2ODA4fQ.UpSpclv2NJiQHHxWYX6siLekgnPlzUpPuDHbFmVXVbc';

async function execSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: SUPABASE_URL.replace('https://', ''),
      path: '/rest/v1/rpc/exec',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: responseData });
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// First check if tables exist
async function checkTables() {
  const tables = ['monthly_delivery_targets', 'monthly_dept_rules'];
  for (const table of tables) {
    const { status, data } = await new Promise((resolve) => {
      const options = {
        hostname: SUPABASE_URL.replace('https://', ''),
        path: `/rest/v1/${table}?limit=1`,
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      };
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: responseData }));
      });
      req.on('error', reject);
      req.end();
    });
    console.log(`${table}: ${status === 200 ? 'EXISTS' : status === 404 ? 'NOT FOUND' : status}`);
  }
}

checkTables().catch(console.error);
