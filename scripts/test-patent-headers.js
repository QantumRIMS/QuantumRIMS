const ExcelJS = require('exceljs');
async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./public/templates/SECE Publications.xlsx');
  const sheet = workbook.getWorksheet('Patent - 2026');
  if (sheet) {
    const row = sheet.getRow(2);
    console.log("Headers:");
    row.values.forEach((v, i) => console.log(`Col ${i}: ${v}`));
  }
}
run();
