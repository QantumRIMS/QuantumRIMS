import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import WebSocket from 'ws';

Object.assign(global, { WebSocket });

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeName(name) {
  if (!name) return '';
  return name.replace(/^(Dr\.|Mr\.|Ms\.|Prof\.)\s*/i, '') // remove prefix
             .replace(/\s+/g, ' ') // collapse whitespace
             .trim()
             .toLowerCase();
}

const SKIP_DEPT = new Set(['', 'RS', 'RF - S & H (Physics)', 'RF - S & H (Chemistry)']);

const DEPT_MAP = {
  'AIDS':           'AIDS',
  'AIML':           'AIML',
  'CCE':            'CCE',
  'CSBS':           'CSBS',
  'CSE':            'CSE',
  'Cyber Security': 'Cyber Security',
  'ECE':            'ECE',
  'EEE':            'EEE',
  'IT':             'IT',
  'MECH':           'Mech',
  'Mech':           'Mech',
  'S & H (Phy)':   'S & H (Phy)',
  'S & H (Maths)': 'S & H (Maths)',
  'S & H (Che)':   'S & H (Che)',
  'S&H (Che)':     'S & H (Che)',
  'S & H (Eng)':   'S & H (Eng)',
};

async function main() {
  // Load 2025 (from the report we used before)
  const wb2025 = XLSX.readFile('public/templates/Faculty - Publication Status Report - 2026.xlsx');
  const ws2025 = wb2025.Sheets[wb2025.SheetNames[0]];
  const raw2025 = XLSX.utils.sheet_to_json(ws2025, { defval: '' });

  const list2025 = raw2025
    .filter(r => !SKIP_DEPT.has(r['Dept']) && DEPT_MAP[r['Dept']])
    .map(r => ({
      name: (r['Name of the Faculty'] || '').trim(),
      normName: normalizeName(r['Name of the Faculty']),
      dept: DEPT_MAP[r['Dept']],
      designation: r['Designation in 2026'] || 'Faculty'
    }))
    .filter(r => r.name);

  // Since 2025 doesn't have emp_id, we fetch the existing master_faculty to map them to emp_ids
  const { data: mfDB } = await supabase.from('master_faculty').select('emp_id, name, dept');
  
  // Assign emp_id to 2025 list if possible (should match perfectly since we seeded it)
  for (const f of list2025) {
    const dbMatch = mfDB.find(db => normalizeName(db.name) === f.normName);
    if (dbMatch) {
      f.emp_id = dbMatch.emp_id;
    }
  }

  // Load 2026
  const wb2026 = XLSX.readFile('public/templates/2026 factly list.ods');
  const ws2026 = wb2026.Sheets[wb2026.SheetNames[0]];
  const raw2026 = XLSX.utils.sheet_to_json(ws2026, { defval: '' });

  const list2026 = raw2026
    .filter(r => !SKIP_DEPT.has(r['Dept.']) && DEPT_MAP[r['Dept.']])
    .map(r => ({
      emp_id: (r['Emp.ID'] || '').trim(),
      name: (r['Name of the Faculty'] || '').trim(),
      normName: normalizeName(r['Name of the Faculty']),
      dept: DEPT_MAP[r['Dept.']],
      designation: r['Designation'] || 'Faculty'
    }))
    .filter(r => r.name);

  const continuing = [];
  const newFaculty = [];
  const relieved = [];

  const matched2025 = new Set();

  for (const f2026 of list2026) {
    let match = null;
    
    // 1. Try to match by emp_id first
    if (f2026.emp_id) {
      match = list2025.find(f => f.emp_id === f2026.emp_id);
    }
    
    // 2. Fallback: normalized name
    if (!match) {
      match = list2025.find(f => f.normName === f2026.normName);
    }

    if (match) {
      continuing.push({ ...f2026, old_dept: match.dept, old_desig: match.designation });
      matched2025.add(match);
    } else {
      newFaculty.push(f2026);
    }
  }

  for (const f2025 of list2025) {
    if (!matched2025.has(f2025)) {
      relieved.push(f2025);
    }
  }

  console.log(`\n=== COUNTS ===`);
  console.log(`2025 Total (valid): ${list2025.length}`);
  console.log(`2026 Total (valid): ${list2026.length}`);
  console.log(`CONTINUING: ${continuing.length}`);
  console.log(`NEW: ${newFaculty.length}`);
  console.log(`RELIEVED: ${relieved.length}`);

  console.log(`\n=== NEW FACULTY (${newFaculty.length}) ===`);
  newFaculty.forEach(f => console.log(`- ${f.name} (${f.dept}) [EmpID: ${f.emp_id}]`));

  console.log(`\n=== RELIEVED FACULTY (${relieved.length}) ===`);
  relieved.forEach(f => console.log(`- ${f.name} (${f.dept}) [EmpID: ${f.emp_id || 'Missing'}]`));
}

main().catch(console.error);
