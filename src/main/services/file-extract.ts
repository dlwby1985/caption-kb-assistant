import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

/**
 * Extract plain text from various file types.
 * Supported: .pdf, .docx, .md, .txt
 * PPTX support deferred — marked as unsupported for now.
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()

  switch (ext) {
    case '.txt':
    case '.md':
      return fs.readFileSync(filePath, 'utf-8')

    case '.docx': {
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value
    }

    case '.pdf': {
      const buffer = fs.readFileSync(filePath)
      const data = await pdfParse(buffer)
      return data.text
    }

    case '.pptx':
      // PPTX extraction requires a dedicated parser — placeholder for now
      return `[PPTX file: ${path.basename(filePath)} — text extraction not yet supported. Please convert to PDF or DOCX first.]`

    default:
      // Try reading as text
      try {
        return fs.readFileSync(filePath, 'utf-8')
      } catch {
        return `[Unsupported file type: ${ext}]`
      }
  }
}

/**
 * Estimate token count from text.
 * Rough heuristic: ~1.5 tokens per CJK character, ~0.75 tokens per word for English.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  // Count CJK characters
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
  // Count non-CJK words
  const nonCjk = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ')
  const words = nonCjk.split(/\s+/).filter(w => w.length > 0).length
  return Math.ceil(cjkChars * 1.5 + words * 0.75)
}
