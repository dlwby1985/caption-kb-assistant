import fs from 'fs'
import path from 'path'
import { getTemplatesDir, ensureDir } from './data-path'

export interface PromptTemplate {
  slug: string
  name: string
  content: string
}

const BASIC_TEMPLATE_SLUG = 'basic-terminology-error-correction'
const BASIC_TEMPLATE_NAME = 'Basic — Terminology & Error Correction'
const BASIC_TEMPLATE_CONTENT = `You are a subtitle proofreading assistant.
Correct the following subtitle text based on the knowledge base provided.

## Knowledge Base
{GLOBAL_KB_CONTENT}
{PROJECT_KB_CONTENT}

## Terminology Table
{TERMINOLOGY_TABLE}

## Correction Rules
1. Fix misspelled words and typos from ASR errors
2. Fix person names, institution names, and proper nouns based on knowledge base
3. Fix technical terms and academic vocabulary based on knowledge base and terminology table
4. Fix punctuation errors (use Chinese full-width punctuation for Chinese text)
5. Preserve English academic terms as-is (e.g., identity crisis, bicultural identity)
6. Do NOT remove filler words
7. Do NOT rewrite sentences or change sentence structure
8. Do NOT convert spoken style to written style
9. Keep each paragraph in 1:1 correspondence with original — do NOT merge or split
10. Remove ASR hallucination text (unrelated content like ads or random repetitions)

## Output Format
Number each paragraph. Output corrected text only.`

const ADVANCED_TEMPLATE_SLUG = 'advanced-full-polish-rewriting'
const ADVANCED_TEMPLATE_NAME = 'Advanced — Full Polish & Rewriting'
const ADVANCED_TEMPLATE_CONTENT = `You are a Chinese academic lecture subtitle polishing expert.
Polish the following subtitle text for readability and clarity,
based on the knowledge base provided.

## Knowledge Base
{GLOBAL_KB_CONTENT}
{PROJECT_KB_CONTENT}

## Terminology Table
{TERMINOLOGY_TABLE}

## Polishing Rules
1. Fix all ASR errors: misspelled words, wrong characters, incorrect terms
2. Fix person names, institution names, and proper nouns based on knowledge base
3. Fix technical terms based on knowledge base and terminology table
4. Remove filler words and verbal tics (嗯, 啊, 然后, 就是, 对吧, 这个, 那个, etc.)
5. Remove ASR hallucination text (unrelated content)
6. Convert spoken/colloquial expressions to fluent written style
7. Ensure logical flow and coherence within each subtitle entry
8. Fix punctuation (use Chinese full-width punctuation for Chinese text)
9. Preserve English academic terms as-is (e.g., identity crisis, bicultural identity)
10. Keep the natural tone of an academic lecture — do not make it overly formal
11. Keep each paragraph in 1:1 correspondence with original — do NOT merge or split

## Output Format
Number each paragraph. Output polished text only.`

const DEFAULT_TEMPLATES = [
  { slug: BASIC_TEMPLATE_SLUG, name: BASIC_TEMPLATE_NAME, content: BASIC_TEMPLATE_CONTENT },
  { slug: ADVANCED_TEMPLATE_SLUG, name: ADVANCED_TEMPLATE_NAME, content: ADVANCED_TEMPLATE_CONTENT },
]

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/** Ensure default templates exist */
export function ensureDefaultTemplate(): void {
  const dir = getTemplatesDir()
  for (const t of DEFAULT_TEMPLATES) {
    const p = path.join(dir, `${t.slug}.md`)
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, t.content, 'utf-8')
    }
  }
}

/** List all templates */
export function listTemplates(): PromptTemplate[] {
  const dir = getTemplatesDir()
  ensureDir(dir)
  ensureDefaultTemplate()

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort()

  return files.map(f => {
    const slug = f.replace(/\.md$/, '')
    const content = fs.readFileSync(path.join(dir, f), 'utf-8')
    // Check if it's a built-in template for its display name
    const builtIn = DEFAULT_TEMPLATES.find(t => t.slug === slug)
    const name = builtIn
      ? builtIn.name
      : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return { slug, name, content }
  })
}

/** Get a single template */
export function getTemplate(slug: string): PromptTemplate | null {
  const filePath = path.join(getTemplatesDir(), `${slug}.md`)
  if (!fs.existsSync(filePath)) return null
  const content = fs.readFileSync(filePath, 'utf-8')
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return { slug, name, content }
}

/** Save a template (create or update) */
export function saveTemplate(name: string, content: string): PromptTemplate {
  const slug = slugify(name)
  const filePath = path.join(getTemplatesDir(), `${slug}.md`)
  fs.writeFileSync(filePath, content, 'utf-8')
  return { slug, name, content }
}

/** Delete a template */
export function deleteTemplate(slug: string): void {
  if (DEFAULT_TEMPLATES.some(t => t.slug === slug)) throw new Error('Cannot delete built-in template')
  const filePath = path.join(getTemplatesDir(), `${slug}.md`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}
