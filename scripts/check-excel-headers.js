const ExcelJS = require('exceljs');
async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./public/templates/SECE Publications.xlsx');
  const sheet = workbook.getWorksheet('2024 -2025-2026');
  const row = sheet.getRow(1);
  console.log("Headers:");
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    console.log(`Col ${colNumber}: ${cell.value}`);
  });
}
run();
