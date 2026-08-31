const ExcelJS = require('exceljs');
async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./public/templates/SECE Publications.xlsx');
  const sheet = workbook.getWorksheet('2024 -2025-2026');
  
  let total = 0;
  const byYear = {};
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = row.values;
    if (!vals[2] && !vals[3]) return;
    
    const getText = (val) => {
      if (!val) return null;
      if (typeof val === 'object') {
        if (val.richText) return val.richText.map(rt => rt.text).join('');
        if (val.text) return val.text;
      }
      return String(val).trim();
    };

    const title = getText(vals[3]);
    if (!title) return;
    
    const yearStr = getText(vals[7]);
    const year = yearStr ? parseInt(yearStr) : null;
    
    total++;
    byYear[year] = (byYear[year] || 0) + 1;
  });
  
  console.log(`Total parsed: ${total}`);
  console.log('By Year:', byYear);
}
run();
