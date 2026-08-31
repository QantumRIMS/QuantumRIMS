import fs from 'fs'

const supervisorFile = 'src/app/api/admin/reports/supervisors/import/route.ts';
const scholarFile = 'src/app/api/admin/reports/scholars/import/route.ts';

function updateSupervisorImport() {
    let content = fs.readFileSync(supervisorFile, 'utf8');
    content = content.replace(
        /const isSupervisorSheet = sheet\.name\.toLowerCase\(\)\.includes\('supervisor'\);/g,
        `const lName = sheet.name.toLowerCase();\n      const isSupervisorSheet = lName.includes('supervisor') && !lName.includes('scholar');`
    );
    fs.writeFileSync(supervisorFile, content, 'utf8');
}

function updateScholarImport() {
    let content = fs.readFileSync(scholarFile, 'utf8');
    content = content.replace(
        /const isScholarSheet = sheet\.name\.toLowerCase\(\)\.includes\('scholar'\);/g,
        `const lName = sheet.name.toLowerCase();\n      const isScholarSheet = lName.includes('scholar') && !lName.includes('supervisor');`
    );
    fs.writeFileSync(scholarFile, content, 'utf8');
}

updateSupervisorImport();
updateScholarImport();
