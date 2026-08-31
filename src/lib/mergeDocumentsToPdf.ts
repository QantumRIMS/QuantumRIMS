/**
 * mergeDocumentsToPdf.ts
 *
 * Reusable helper: fetches an array of { label, url } documents (PDF or
 * DOCX/Office format), converts non-PDF files using LibreOffice, inserts a
 * clear divider page before each document, and merges everything into one
 * combined PDF buffer via pdf-lib.
 *
 * Resilient: if any individual document fails to fetch or convert, it inserts
 * a placeholder "could not be loaded" divider page and continues — the admin
 * always gets a usable combined PDF.
 *
 * File-type detection: uses BOTH the URL extension AND the actual HTTP
 * Content-Type header returned by the server, so Cloudinary-hosted DOCX/PPTX
 * files (which have opaque URLs without extensions) are handled correctly.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { convertDocxToPdf } from '@/lib/fillDocxTemplate'

export interface DocumentInput {
  label: string
  url: string | null | undefined
  index?: number // 1-based display number (optional — used on divider pages)
}

// MIME types that LibreOffice can convert to PDF
const OFFICE_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/msword', // doc
  'application/vnd.ms-powerpoint', // ppt
  'application/vnd.ms-excel', // xls
  'application/vnd.oasis.opendocument.text', // odt
  'application/vnd.oasis.opendocument.presentation', // odp
  'application/vnd.oasis.opendocument.spreadsheet', // ods
  'application/octet-stream', // generic binary — many platforms use this for docx
])

// URL-based extension fallback (for when Content-Type is wrong/missing)
const OFFICE_EXTENSIONS = ['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.odt', '.ods', '.odp']

function isOfficeMime(contentType: string | null): boolean {
  if (!contentType) return false
  const base = contentType.split(';')[0].trim().toLowerCase()
  return OFFICE_MIME_TYPES.has(base)
}

function isOfficeExtension(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0]
  return OFFICE_EXTENSIONS.some(ext => lower.endsWith(ext))
}

/**
 * Strip control characters that WinAnsi (pdf-lib StandardFonts) cannot encode.
 * This includes newlines, carriage returns, tabs, and all other C0/C1 controls.
 */
function sanitize(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/ {2,}/g, ' ').trim()
}

/** Create a divider page PDF with centred bold text (takes pre-built lines) */
async function makeDividerPage(lines: string[], isError = false): Promise<PDFDocument> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()

  page.drawRectangle({ x: 0, y: 0, width, height, color: isError ? rgb(0.98, 0.95, 0.95) : rgb(0.95, 0.97, 1.0) })
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: isError ? rgb(0.8, 0.2, 0.2) : rgb(0.24, 0.48, 0.80) })
  page.drawRectangle({ x: 0, y: 0, width, height: 8, color: isError ? rgb(0.8, 0.2, 0.2) : rgb(0.24, 0.48, 0.80) })

  const fontSize = 22
  const lineHeight = fontSize * 1.4
  const blockHeight = lines.length * lineHeight
  let y = height / 2 + blockHeight / 2

  for (const line of lines) {
    if (!line.trim()) { y -= lineHeight; continue }
    const textWidth = font.widthOfTextAtSize(line, fontSize)
    page.drawText(line, {
      x: (width - textWidth) / 2,
      y,
      size: fontSize,
      font,
      color: isError ? rgb(0.7, 0.1, 0.1) : rgb(0.1, 0.2, 0.5),
    })
    y -= lineHeight
  }

  const watermarkFont = await doc.embedFont(StandardFonts.Helvetica)
  const watermark = 'SECTION DIVIDER'
  const wSize = 9
  const wWidth = watermarkFont.widthOfTextAtSize(watermark, wSize)
  page.drawText(watermark, { x: (width - wWidth) / 2, y: height - 40, size: wSize, font: watermarkFont, color: rgb(0.6, 0.6, 0.7), opacity: 0.7 })

  return doc
}

type EmbeddedFont = Awaited<ReturnType<PDFDocument['embedFont']>>

/**
 * Build word-wrapped lines from a raw text string (may contain \n).
 * All output strings are sanitized — safe to pass to pdf-lib drawText.
 */
function buildLines(text: string, font: EmbeddedFont, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.split(/\r?\n/)
  const result: string[] = []

  for (const para of paragraphs) {
    const clean = sanitize(para)
    if (!clean) { result.push(''); continue }
    const words = clean.split(' ').filter(Boolean)
    let current = ''
    for (const word of words) {
      const safeWord = word.slice(0, 60)
      const test = current ? `${current} ${safeWord}` : safeWord
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
        if (current) result.push(current)
        current = font.widthOfTextAtSize(safeWord, fontSize) > maxWidth
          ? safeWord.slice(0, 35) + '...'
          : safeWord
      } else {
        current = test
      }
    }
    if (current) result.push(current)
  }
  return result
}

interface FetchResult {
  buffer: Buffer
  contentType: string | null
}

/**
 * Fetch a URL, returning the buffer AND the Content-Type header.
 * Content-Type is used to reliably detect Office files even when the URL
 * has no extension (e.g. Cloudinary delivery URLs).
 */
async function fetchBufferWithType(url: string): Promise<FetchResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type')
    return { buffer, contentType }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Merge an array of documents into a single PDF.
 *
 * @param documents  Array of { label, url, index } — url may be null to skip
 * @param title      Used only in logs for debugging
 * @returns          A Buffer containing the merged PDF
 */
export async function mergeDocumentsToPdf(
  documents: DocumentInput[],
  title = 'merged'
): Promise<Buffer> {
  const merged = await PDFDocument.create()
  // Embed a font in a helper doc just to measure text widths for word-wrapping
  const helperDoc = await PDFDocument.create()
  const measureFont = await helperDoc.embedFont(StandardFonts.HelveticaBold)

  const fontSize = 22
  const maxWidth = 595 - 80 // A4 width minus margins

  for (let i = 0; i < documents.length; i++) {
    const { label, url, index } = documents[i]
    const displayNum = index ?? i + 1
    const displayLabel = `${displayNum}. ${label}`

    // ── Case 1: No URL — placeholder divider ──────────────────────────────
    if (!url) {
      const textLines = buildLines(displayLabel, measureFont, fontSize, maxWidth)
      textLines.push('[No document uploaded]')
      const divider = await makeDividerPage(textLines, true)
      const [divPage] = await merged.copyPages(divider, [0])
      merged.addPage(divPage)
      console.log(`[mergeDocumentsToPdf] Skipped (no URL): ${label}`)
      continue
    }

    // ── Insert divider page ───────────────────────────────────────────────
    const dividerLines = buildLines(displayLabel, measureFont, fontSize, maxWidth)
    const divider = await makeDividerPage(dividerLines)
    const [divPage] = await merged.copyPages(divider, [0])
    merged.addPage(divPage)

    // ── Fetch + detect type + optionally convert ──────────────────────────
    try {
      const { buffer: rawBuffer, contentType } = await fetchBufferWithType(url)

      let pdfBuffer: Buffer

      // Determine if conversion is needed using BOTH Content-Type AND extension.
      // Content-Type takes priority since URL extensions are unreliable on Cloudinary.
      const needsConversion = isOfficeMime(contentType) || isOfficeExtension(url)

      if (needsConversion) {
        console.log(`[mergeDocumentsToPdf] Converting (mime: ${contentType}): ${label}`)
        pdfBuffer = await convertDocxToPdf(rawBuffer)
      } else {
        pdfBuffer = rawBuffer
      }

      const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
      const pageCount = srcDoc.getPageCount()
      const copiedPages = await merged.copyPages(srcDoc, [...Array(pageCount).keys()])
      copiedPages.forEach(p => merged.addPage(p))
      console.log(`[mergeDocumentsToPdf] OK (${pageCount}p): ${label}`)
    } catch (err: any) {
      const errMsg = sanitize(err?.message || 'unknown error').slice(0, 80)
      console.error(`[mergeDocumentsToPdf] FAILED: ${label} — ${errMsg}`)

      // Replace the divider we just added with an error version
      const pageCount = merged.getPageCount()
      merged.removePage(pageCount - 1)

      const errLines = buildLines(displayLabel, measureFont, fontSize, maxWidth)
      errLines.push(`[Could not load document: ${errMsg}]`)
      const errDivider = await makeDividerPage(errLines, true)
      const [errPage] = await merged.copyPages(errDivider, [0])
      merged.addPage(errPage)
    }
  }

  const bytes = await merged.save()
  return Buffer.from(bytes)
}
