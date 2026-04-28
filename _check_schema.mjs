import https from 'https';

const SUPABASE_URL = 'https://rihkdwijnrolpvayqcwz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtkd2lqbnJvbHB2YXlxY3d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMDgwOCwiZXhwIjoyMDkyMDg2ODA4fQ.UpSpclv2NJiQHHxWYX6siLekgnPlzUpPuDHbFmVXVbc';

async function supabaseRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: SUPABASE_URL.replace('https://', ''),
      path: path,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Check customers table columns
const { data, status } = await supabaseRequest('/rest/v1/customers?select=*&limit=1', 'GET');
console.log('Status:', status);
console.log('Columns in customers table:', Object.keys(data?.[0] || {}));
