const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});

const { getPublicationsFromExcel } = require('../src/lib/excelParser');

async function run() {
  try {
    const data = await getPublicationsFromExcel('2021');
    console.log(`Length of 2021 data: ${data.length}`);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
