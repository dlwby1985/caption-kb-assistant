import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { getGlobalKBDir } from './data-path'

export interface TermEntry {
  wrong: string
  correct: string
  note?: string
}

function termFilePath(): string {
  return path.join(getGlobalKBDir(), 'terminology.yaml')
}

/** Load all terminology entries */
export function loadTerminology(): TermEntry[] {
  const p = termFilePath()
  if (!fs.existsSync(p)) return []
  try {
    const data = yaml.load(fs.readFileSync(p, 'utf-8'))
    return (Array.isArray(data) ? data : []) as TermEntry[]
  } catch {
    return []
  }
}

/** Save all terminology entries */
export function saveTerminology(entries: TermEntry[]): void {
  const p = termFilePath()
  fs.writeFileSync(p, yaml.dump(entries, { lineWidth: -1 }), 'utf-8')
}

/** Add a single entry */
export function addTerm(entry: TermEntry): TermEntry[] {
  const entries = loadTerminology()
  entries.push(entry)
  saveTerminology(entries)
  return entries
}

/** Update an entry by index */
export function updateTerm(index: number, entry: TermEntry): TermEntry[] {
  const entries = loadTerminology()
  if (index >= 0 && index < entries.length) {
    entries[index] = entry
    saveTerminology(entries)
  }
  return entries
}

/** Delete an entry by index */
export function deleteTerm(index: number): TermEntry[] {
  const entries = loadTerminology()
  if (index >= 0 && index < entries.length) {
    entries.splice(index, 1)
    saveTerminology(entries)
  }
  return entries
}

/** Export to CSV string */
export function exportCsv(): string {
  const entries = loadTerminology()
  const header = 'wrong,correct,note'
  const rows = entries.map(e =>
    `"${escapeCsv(e.wrong)}","${escapeCsv(e.correct)}","${escapeCsv(e.note || '')}"`
  )
  return [header, ...rows].join('\n')
}

/** Import from CSV string */
export function importCsv(csv: string): TermEntry[] {
  const lines = csv.trim().split(/\r?\n/)
  const entries: TermEntry[] = []

  // Skip header if present
  const start = lines[0]?.toLowerCase().includes('wrong') ? 1 : 0

  for (let i = start; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    if (fields.length >= 2 && fields[0].trim()) {
      entries.push({
        wrong: fields[0].trim(),
        correct: fields[1].trim(),
        note: fields[2]?.trim() || undefined,
      })
    }
  }

  // Merge with existing
  const existing = loadTerminology()
  const existingWrong = new Set(existing.map(e => e.wrong))
  for (const entry of entries) {
    if (!existingWrong.has(entry.wrong)) {
      existing.push(entry)
    }
  }
  saveTerminology(existing)
  return existing
}

/** Apply terminology replacements to text. Returns { result, replacements } */
export function applyTerminology(text: string, entries?: TermEntry[]): {
  result: string
  replacements: Array<{ wrong: string; correct: string; count: number }>
} {
  const terms = entries || loadTerminology()
  const replacements: Array<{ wrong: string; correct: string; count: number }> = []

  let result = text
  for (const term of terms) {
    if (!term.wrong) continue
    // Escape regex special characters
    const escaped = term.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'g')
    const matches = result.match(regex)
    if (matches && matches.length > 0) {
      replacements.push({ wrong: term.wrong, correct: term.correct, count: matches.length })
      result = result.replace(regex, term.correct)
    }
  }

  return { result, replacements }
}

function escapeCsv(s: string): string {
  return s.replace(/"/g, '""')
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}
