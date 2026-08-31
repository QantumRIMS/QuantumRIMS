import ExcelJS from 'exceljs';

async function test() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('/home/gugan/Downloads/Reseach Publications - SECE total.txt.xlsx');
  const worksheet = workbook.worksheets[0];
  let rows = [];
  
  const headers = worksheet.getRow(1).values;
  const colMap = {};
  for(let i=1; i<headers.length; i++) {
     if(headers[i]) colMap[headers[i].toString().trim().toLowerCase()] = i;
  }
  
  const doiCol = colMap['doi'];
  const linkCol = colMap['link'];
  const titleCol = colMap['title'];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values;
    rows.push({
       s_no: rowNumber - 1,
       doi: values[doiCol]?.toString() || '',
       link: values[linkCol]?.text || values[linkCol]?.hyperlink || values[linkCol]?.toString() || '',
       title: values[titleCol]?.toString() || ''
    });
  });
  
  let existingDois = new Set();
  let existingLinks = new Set();
  let existingLinksNoDoi = new Set();
  let existingTitles = new Set();
  let existingTitlesNoLink = new Set();
  let existingTitlesNoDoiNoLink = new Set();

  const addToSets = (d, l, t) => {
    if (d) existingDois.add(d);
    if (l) {
      existingLinks.add(l);
      if (!d) existingLinksNoDoi.add(l);
    }
    if (t) {
      existingTitles.add(t);
      if (!l) existingTitlesNoLink.add(t);
      if (!d && !l) existingTitlesNoDoiNoLink.add(t);
    }
  };

  const newRows = [];
  const dupList = [];
  
  for (const row of rows) {
    const cleanDoi = row.doi.trim().toLowerCase();
    const cleanLink = row.link.trim().toLowerCase();
    const cleanTitle = row.title.trim().toLowerCase();
    
    let isDuplicate = false;
    let matchType = '';

    if (cleanDoi) {
      if (existingDois.has(cleanDoi)) {
        matchType = 'DOI';
        isDuplicate = true;
      } else if (cleanLink && existingLinksNoDoi.has(cleanLink)) {
        matchType = 'Link';
        isDuplicate = true;
      } else if (cleanTitle && existingTitlesNoDoiNoLink.has(cleanTitle)) {
        matchType = 'Title';
        isDuplicate = true;
      }
    } else if (cleanLink) {
      if (existingLinks.has(cleanLink)) {
        matchType = 'Link';
        isDuplicate = true;
      } else if (cleanTitle && existingTitlesNoLink.has(cleanTitle)) {
        matchType = 'Title';
        isDuplicate = true;
      }
    } else if (cleanTitle) {
      if (existingTitles.has(cleanTitle)) {
        matchType = 'Title';
        isDuplicate = true;
      }
    }

    if (isDuplicate) {
       dupList.push({ s_no: row.s_no, matchType, doi: cleanDoi });
       continue;
    }
    
    addToSets(cleanDoi, cleanLink, cleanTitle);
    newRows.push(row);
  }

  console.log('Sample of true duplicate DOIs dropped (first 5):', dupList.slice(0, 5));
}
test();
