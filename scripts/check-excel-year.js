const ExcelJS = require('exceljs');
async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./public/templates/SECE Publications.xlsx');
  const sheet = workbook.getWorksheet('2024 -2025-2026');
  
  [1240, 2193, 2204].forEach(sno => {
    sheet.eachRow((row) => {
      const vals = row.values;
      if (vals[1] == sno) {
        console.log(`S.No ${sno} -> Year in col 7: ${vals[7]}, Year in col 8: ${vals[8]}`);
      }
    });
  });
}
run();
