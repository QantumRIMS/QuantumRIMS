#!/usr/bin/env node
/**
 * peek-excel.js — quick script to print headers and first 3 rows of the Excel file
 */
const ExcelJS = require('exceljs')
const path = require('path')

const filePath = process.argv[2]
if (!filePath) { console.error('Usage: node scripts/peek-excel.js <file.xlsx>'); process.exit(1) }

async function main() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  
  wb.worksheets.forEach((ws, idx) => {
    console.log(`\n=== Sheet ${idx + 1}: "${ws.name}" (${ws.rowCount} rows) ===`)
    // Print header row
    const header = []
    ws.getRow(1).eachCell((cell, col) => { header.push(`[${col}] ${String(cell.value || '')}`) })
    console.log('Headers:', header.join(', '))
    // Print rows 2–4
    for (let r = 2; r <= Math.min(4, ws.rowCount); r++) {
      const vals = []
      ws.getRow(r).eachCell((cell, col) => { vals.push(`[${col}]=${String(cell.value || '').substring(0, 40)}`) })
      console.log(`Row ${r}:`, vals.join(', '))
    }
  })
}

main().catch(e => { console.error(e); process.exit(1) })
