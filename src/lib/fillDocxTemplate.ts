import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
// @ts-ignore
import libre from 'libreoffice-convert'

const convertAsync = promisify(libre.convert)

export function fillTemplate(templatePath: string, data: Record<string, any>): Buffer {
  // Read template
  const content = fs.readFileSync(path.resolve(templatePath), 'binary')
  const zip = new PizZip(content)
  
  if (data._isConsultancyForm) {
     let docXml = zip.file('word/document.xml')!.asText()
     
     if (data._payment_terms === 'advance') {
        docXml = docXml.replace(/<w:t>☐<\/w:t>(<\/w:r><w:r[^>]*><w:t[^>]*>\s*100% Advance)/, '<w:t>☒</w:t>$1')
     } else if (data._payment_terms === 'installments' || data._payment_terms === 'instalments') {
        const schedule = data.payment_terms_schedule ? data.payment_terms_schedule : '___________________'
        docXml = docXml.replace(/<w:t>☐<\/w:t>(<\/w:r><w:r[^>]*><w:t[^>]*>\s*Instalments \(Specify Schedule\):\s*)_+/, `<w:t>☒</w:t>$1${schedule}`)
     } else if (data._payment_terms === 'after_completion') {
        docXml = docXml.replace(/<w:t>☐<\/w:t>(<\/w:r><w:r[^>]*><w:t[^>]*>\s*After Project Completion)/, '<w:t>☒</w:t>$1')
     }

     if (data._involves_ip) {
        docXml = docXml.replace(/(IP\/Patentable Work\?.*?<w:t>)☐(<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>\s*Yes)/, '$1☒$2')
     } else {
        docXml = docXml.replace(/(IP\/Patentable Work\?.*?<w:t>☐<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>\s*Yes\s*<\/w:t><\/w:r><w:r[^>]*><w:rPr>.*?<\/w:rPr><w:t>)☐(<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>\s*No)/, '$1☒$2')
     }

     if (data._requires_ethics) {
        docXml = docXml.replace(/(Ethics Approval\?.*?<w:t>)☐(<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>\s*Yes)/, '$1☒$2')
     } else {
        docXml = docXml.replace(/(Ethics Approval\?.*?<w:t>☐<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>\s*Yes\s*<\/w:t><\/w:r><w:r[^>]*><w:rPr>.*?<\/w:rPr><w:t>)☐(<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>\s*No)/, '$1☒$2')
     }
     
     zip.file('word/document.xml', docXml)
  }
  
  // Initialize docxtemplater
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
    nullGetter() {
      return '' // Replace missing/null tags with empty string
    }
  })
  
  // Fill data
  doc.render(data)
  
  // Get filled document as buffer
  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
  
  return buf
}

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const ext = '.pdf'
  return await convertAsync(docxBuffer, ext, undefined)
}
