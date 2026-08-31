const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});

const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Reading Excel file...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./public/templates/SECE Publications.xlsx');
  
  let pubCount = 0;
  let pubSkipped = 0;
  
  // 1. IMPORT PUBLICATIONS
  const pubSheet = workbook.getWorksheet('2024 -2025-2026');
  if (pubSheet) {
    const pubRows = [];
    pubSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const vals = row.values;
      if (!vals[2] && !vals[3]) {
        pubSkipped++;
        return; // skip empty rows
      }
      
      const getText = (val) => {
        if (!val) return null;
        if (typeof val === 'object') {
          if (val.richText) return val.richText.map(rt => rt.text).join('');
          if (val.text) return val.text;
        }
        return String(val).trim();
      };

      const title = getText(vals[3]);
      if (!title) {
        pubSkipped++;
        return;
      }

      pubRows.push({
        s_no: parseInt(vals[1]) || null,
        authors: getText(vals[2]),
        title: title,
        source_title: getText(vals[4]),
        volume: getText(vals[5]),
        issue: getText(vals[6]),
        year: parseInt(vals[7]) || null,
        doi: getText(vals[8]),
        link: getText(vals[9]),
        document_type_scopus: getText(vals[10]),
        document_type_report: getText(vals[11]),
        department: getText(vals[12]),
        faculty_name: getText(vals[13])
      });
    });

    console.log(`Found ${pubRows.length} publications to import.`);
    
    // We can delete all rows instead of TRUNCATE
    console.log('Clearing existing legacy_publications...');
    const { error: clearError } = await supabase.from('legacy_publications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (clearError) {
      console.log('Note: Error clearing publications (tables might not exist):', clearError.message);
      return;
    }
    
    const BATCH_SIZE = 200;
    for (let i = 0; i < pubRows.length; i += BATCH_SIZE) {
      const batch = pubRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('legacy_publications').insert(batch);
      if (error) {
        console.error('Error inserting pub batch:', error);
      } else {
        pubCount += batch.length;
      }
    }
  }

  // 2. IMPORT PATENTS
  let patentCount = 0;
  let patentSkipped = 0;
  const patentSheets = ['Patent - 2025', 'Patent - 2026'];
  
  for (const sheetName of patentSheets) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;
    
    const patentRows = [];
    const fallbackAcy = sheetName.includes('2025') ? '2024-2025' : '2025-2026';
    
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // skip 2 header rows
      
      const vals = row.values;
      if (!vals[2] && !vals[3] && !vals[6]) {
        patentSkipped++;
        return;
      }
      
      const getText = (val) => {
        if (!val) return null;
        if (typeof val === 'object') {
          if (val.richText) return val.richText.map(rt => rt.text).join('');
          if (val.text) return val.text;
        }
        return String(val).trim();
      };
      
      const getDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString().split('T')[0];
        try {
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        } catch(e) {}
        return null;
      };

      const title = getText(vals[7]);
      if (!title && !getText(vals[4])) {
         patentSkipped++;
         return; // If no title and no app number, skip
      }
      
      let acy = getText(vals[15]);
      if (!acy || acy.length < 4) acy = fallbackAcy;

      patentRows.push({
        department: getText(vals[3]),
        application_number: getText(vals[4]),
        status: getText(vals[5]),
        inventors: getText(vals[6]),
        title: title,
        applicants: getText(vals[8]),
        filed_date: getDate(vals[9]),
        published_or_granted_date: getDate(vals[10]),
        publication_or_grant_number: getText(vals[11]),
        assignee: getText(vals[12]),
        proof_link: getText(vals[13]),
        academic_year: acy,
      });
    });
    
    console.log(`Found ${patentRows.length} patents to import from ${sheetName}.`);
    
    if (patentRows.length > 0) {
      if (patentCount === 0) {
         console.log('Clearing existing legacy_patents...');
         const { error: clearErr } = await supabase.from('legacy_patents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
         if (clearErr) {
             console.log('Note: Error clearing patents (tables might not exist):', clearErr.message);
             return;
         }
      }
      
      const BATCH_SIZE = 200;
      for (let i = 0; i < patentRows.length; i += BATCH_SIZE) {
        const batch = patentRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('legacy_patents').insert(batch);
        if (error) {
          console.error('Error inserting patent batch:', error);
        } else {
          patentCount += batch.length;
        }
      }
    }
  }

  console.log('--- IMPORT SUMMARY ---');
  console.log(`Publications Imported: ${pubCount}`);
  console.log(`Publications Skipped: ${pubSkipped}`);
  console.log(`Patents Imported: ${patentCount}`);
  console.log(`Patents Skipped: ${patentSkipped}`);
  console.log('----------------------');
}

run();
