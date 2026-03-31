import fs from 'fs'
import iconv from 'iconv-lite'

export interface SubtitleEntry {
  index: number
  startTime: string   // "HH:MM:SS,mmm"
  endTime: string     // "HH:MM:SS,mmm"
  text: string
}

/**
 * Detect encoding of a file buffer.
 * Checks for UTF-8 BOM, then tries UTF-8 validation, falls back to GBK.
 */
function detectEncoding(buffer: Buffer): string {
  // UTF-8 BOM
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf-8'
  }
  // Try UTF-8: check if the buffer is valid UTF-8
  if (isValidUtf8(buffer)) {
    return 'utf-8'
  }
  return 'gbk'
}

function isValidUtf8(buffer: Buffer): boolean {
  let i = 0
  while (i < buffer.length) {
    const byte = buffer[i]
    let bytesNeeded = 0
    if (byte <= 0x7F) { bytesNeeded = 0 }
    else if ((byte & 0xE0) === 0xC0) { bytesNeeded = 1 }
    else if ((byte & 0xF0) === 0xE0) { bytesNeeded = 2 }
    else if ((byte & 0xF8) === 0xF0) { bytesNeeded = 3 }
    else { return false }

    if (i + bytesNeeded >= buffer.length) return false
    for (let j = 1; j <= bytesNeeded; j++) {
      if ((buffer[i + j] & 0xC0) !== 0x80) return false
    }
    i += bytesNeeded + 1
  }
  return true
}

/**
 * Normalize timestamp format: accept both comma and period as ms separator.
 * Returns "HH:MM:SS,mmm" format.
 */
function normalizeTimestamp(ts: string): string {
  return ts.trim().replace('.', ',')
}

/**
 * Parse an SRT file into SubtitleEntry array.
 * Error-tolerant: skips malformed entries.
 */
export function parse(filePath: string): SubtitleEntry[] {
  const buffer = fs.readFileSync(filePath)
  const encoding = detectEncoding(buffer)
  let content: string
  if (encoding === 'utf-8') {
    content = buffer.toString('utf-8')
    // Strip BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1)
    }
  } else {
    content = iconv.decode(buffer, encoding)
  }

  // Normalize line endings to LF
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const entries: SubtitleEntry[] = []
  // Split on double newlines (or more) to get blocks
  const blocks = content.split(/\n\n+/).filter(b => b.trim())

  const timestampRegex = /^(\d{1,2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{3})/

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue

    // Find the timestamp line (could be line 0 or line 1)
    let tsLineIdx = -1
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      if (timestampRegex.test(lines[i].trim())) {
        tsLineIdx = i
        break
      }
    }
    if (tsLineIdx === -1) continue

    const tsMatch = lines[tsLineIdx].trim().match(timestampRegex)
    if (!tsMatch) continue

    // Index is usually the line before the timestamp
    let index = entries.length + 1
    if (tsLineIdx > 0) {
      const parsed = parseInt(lines[tsLineIdx - 1].trim(), 10)
      if (!isNaN(parsed)) index = parsed
    }

    // Text is everything after the timestamp line (preserve empty entries for 1:1 alignment)
    const textLines = lines.slice(tsLineIdx + 1)
    const text = textLines.join(' ').trim()

    entries.push({
      index,
      startTime: normalizeTimestamp(tsMatch[1]),
      endTime: normalizeTimestamp(tsMatch[2]),
      text,
    })
  }

  return entries
}

/**
 * Generate SRT format string from SubtitleEntry array.
 * Uses UTF-8 encoding, LF line endings.
 */
export function generate(entries: SubtitleEntry[]): string {
  return entries.map((entry, i) => {
    const idx = entry.index || (i + 1)
    return `${idx}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
  }).join('\n\n') + '\n'
}

/**
 * Extract plain text from subtitle entries.
 * Numbers each paragraph for 1:1 correspondence with original.
 */
export function extractText(entries: SubtitleEntry[]): string {
  return entries.map((entry, i) => {
    return `${i + 1}: ${entry.text}`
  }).join('\n\n') + '\n'
}

/**
 * Parse timestamp string "HH:MM:SS,mmm" to milliseconds.
 */
export function timestampToMs(ts: string): number {
  const match = ts.match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!match) return 0
  const [, h, m, s, ms] = match
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms)
}

/**
 * Convert milliseconds to timestamp string "HH:MM:SS,mmm".
 */
export function msToTimestamp(ms: number): string {
  if (ms < 0) ms = 0
  const h = Math.floor(ms / 3600000)
  ms %= 3600000
  const m = Math.floor(ms / 60000)
  ms %= 60000
  const s = Math.floor(ms / 1000)
  const mmm = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(mmm).padStart(3, '0')}`
}

/**
 * Apply a timing offset (in milliseconds) to all entries.
 * Returns new array with adjusted timestamps.
 */
export function applyOffset(entries: SubtitleEntry[], offsetMs: number): SubtitleEntry[] {
  return entries.map(entry => ({
    ...entry,
    startTime: msToTimestamp(timestampToMs(entry.startTime) + offsetMs),
    endTime: msToTimestamp(timestampToMs(entry.endTime) + offsetMs),
  }))
}

/**
 * Merge corrected text back with original timestamps.
 * Expects numbered paragraphs like "1: corrected text".
 * Returns new entries with corrected text and original timestamps.
 */
export function mergeText(originalEntries: SubtitleEntry[], correctedText: string): {
  entries: SubtitleEntry[]
  warnings: string[]
} {
  const warnings: string[] = []
  const correctedMap = new Map<number, string>()

  // Parse line-by-line to handle both \n and \n\n separated LLM output
  for (const line of correctedText.trim().split(/\n/)) {
    const match = line.match(/^(\d+):\s*(.*)/)
    if (match) {
      correctedMap.set(parseInt(match[1]), match[2].trim())
    }
  }

  if (correctedMap.size < originalEntries.length) {
    warnings.push(`Corrected text has ${correctedMap.size} entries, original has ${originalEntries.length}. Unmatched entries keep original text.`)
  }
  if (correctedMap.size > originalEntries.length) {
    warnings.push(`Corrected text has ${correctedMap.size} entries, original has ${originalEntries.length}. Excess entries ignored.`)
  }

  const entries = originalEntries.map((entry, i) => {
    const corrected = correctedMap.get(i + 1)
    return {
      ...entry,
      text: corrected ?? entry.text,
    }
  })

  return { entries, warnings }
}
