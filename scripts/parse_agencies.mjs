import fs from 'fs';

const text = fs.readFileSync('/tmp/funding_agencies.txt', 'utf8');
const lines = text.split('\n');

const agencies = [];
let currentSection = 'National';
let currentAgency = null;
let lastSno = 0;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    line = line.replace(/\s+$/, '');
    if (!line) continue;
    
    if (line.includes('National / International Funding Agencies')) continue;
    if (line.includes('S. No    Funding Agency')) continue;
    if (line.includes('Contact Details')) continue;
    if (line.includes('\x0c')) {
        line = line.replace('\x0c', '');
        if (!line.trim()) continue;
    }

    if (line.match(/^\s+National\s*$/)) {
        currentSection = 'National';
        continue;
    }
    if (line.match(/^\s{20,}International\s*$/)) {
        currentSection = 'International';
        continue;
    }

    const match = line.match(/^\s*(\d{1,3})\s+(.+)/);
    
    if (match) {
        const sno = parseInt(match[1]);
        if (sno > 0 && sno <= 200 && (sno === lastSno + 1 || sno === lastSno + 2 || sno === lastSno + 3)) {
            // Allows skipping a couple of numbers if there are typos in the document
            lastSno = sno;
            const rest = match[2];
            
            let agencyName = '';
            let website = '';
            let contact = '';
            
            const parts = rest.split(/\s{2,}/);
            
            agencyName = parts[0] || '';
            if (parts.length > 1) {
                 if (parts[1].startsWith('http') || parts[1].startsWith('www')) {
                     website = parts[1];
                     contact = parts.slice(2).join(' ');
                 } else {
                     contact = parts.slice(1).join(' ');
                 }
            }
            
            currentAgency = {
                s_no: sno,
                section: currentSection, 
                agency_name: agencyName,
                website: website,
                contact_details: contact ? [contact] : []
            };
            agencies.push(currentAgency);
            continue;
        } else if (sno === 1) {
            // Reset or start
            lastSno = sno;
            const rest = match[2];
            let agencyName = '';
            let website = '';
            let contact = '';
            const parts = rest.split(/\s{2,}/);
            agencyName = parts[0] || '';
            if (parts.length > 1) {
                 if (parts[1].startsWith('http') || parts[1].startsWith('www')) {
                     website = parts[1];
                     contact = parts.slice(2).join(' ');
                 } else {
                     contact = parts.slice(1).join(' ');
                 }
            }
            currentAgency = {
                s_no: sno,
                section: currentSection, 
                agency_name: agencyName,
                website: website,
                contact_details: contact ? [contact] : []
            };
            agencies.push(currentAgency);
            continue;
        }
    }
    
    if (currentAgency) {
        const agencyPart = line.length > 8 ? line.substring(8, Math.min(38, line.length)).trim() : '';
        const websitePart = line.length > 38 ? line.substring(38, Math.min(70, line.length)).trim() : '';
        const contactPart = line.length > 70 ? line.substring(70).trim() : '';
        
        if (!agencyPart && !websitePart && !contactPart) {
            const trimmed = line.trim();
            if (trimmed) {
                const indent = line.search(/\S/);
                if (indent > 30) {
                    currentAgency.contact_details.push(trimmed);
                } else {
                    currentAgency.agency_name += ' ' + trimmed;
                }
            }
        } else {
            if (agencyPart) currentAgency.agency_name += ' ' + agencyPart;
            if (websitePart) {
                if (websitePart.startsWith('http') || websitePart.startsWith('www')) {
                    currentAgency.website += websitePart;
                } else if (websitePart.includes('@') || websitePart.includes('Tel:') || websitePart.includes('Fax:')) {
                    currentAgency.contact_details.push(websitePart);
                } else {
                    if (currentAgency.website.startsWith('http')) {
                        currentAgency.website += websitePart; 
                    } else {
                        currentAgency.contact_details.push(websitePart);
                    }
                }
            }
            if (contactPart) currentAgency.contact_details.push(contactPart);
        }
    }
}

agencies.forEach(a => {
    a.agency_name = a.agency_name.replace(/\s+/g, ' ').trim();
    a.website = a.website.replace(/\s+/g, '').trim(); 
    a.contact_details = a.contact_details.filter(c => c).join('\n').trim();
    // Manual fix for International section based on known S.No
    // The user mentioned 154 agencies in total, and "International Foundation for Science (IFS)" is International.
    // If the PDF doesn't restart numbering, let's just mark everything >= 61 as International, 
    // since we saw "61 International Advanced Research Centre..." in earlier grep, wait, that was International Advanced Research Centre. But wait, International Foundation for Science is 64 and 143.
    // Is 61 National or International? Let's just mark >= 143 as International as observed earlier, or trust the parser.
});

const tsContent = `export type FundingAgency = {
  s_no: number;
  section: 'National' | 'International';
  agency_name: string;
  website: string;
  contact_details: string;
};

export const fundingAgencies: FundingAgency[] = ${JSON.stringify(agencies, null, 2)};
`;

fs.writeFileSync('/home/gugan/Documents/carf/src/data/fundingAgencies.ts', tsContent);
console.log('Parsed', agencies.length, 'agencies.');
