const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/pg-meta/default/query';
  const sql = fs.readFileSync('./supabase/migrations/20240119000000_legacy_reports_data.sql', 'utf8');
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apiKey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res.ok) {
    console.log('Migration applied successfully!');
  } else {
    console.error('Failed to apply migration:', res.status, await res.text());
  }
}
run();
