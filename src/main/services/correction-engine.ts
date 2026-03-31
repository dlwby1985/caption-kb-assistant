import fs from 'fs'
import path from 'path'
import { getActiveProvider, type LLMConfig, type LLMMessage, MODEL_PRICING } from './llm-provider'
import { getTemplate, ensureDefaultTemplate } from './templates'
import { getGlobalKBDir, getProjectDir, ensureDir } from './data-path'
import { extractTextFromFile, estimateTokens } from './file-extract'
import { loadTerminology, type TermEntry } from './terminology'
import { extractText, type SubtitleEntry } from '../srt-parser'

const CHUNK_SIZE = 90          // entries per chunk
const OVERLAP_SIZE = 5         // entries from previous chunk as context
const MAX_RETRIES = 2
const TIMEOUT_MS = 90_000      // 90s per chunk

export interface CorrectionProgress {
  totalChunks: number
  completedChunks: number
  currentChunk: number
  status: 'running' | 'paused' | 'completed' | 'error'
  error?: string
}

export interface CostPreview {
  totalEntries: number
  totalChars: number
  totalTokensEstimate: number
  kbTokens: number
  chunkCount: number
  estimatedCost: number       // in USD
  estimatedTimeMinutes: number
  model: string
}

// In-memory state for current correction run
let correctionState: {
  projectId: string
  chunks: string[][]           // each chunk is array of numbered lines
  completedResults: Map<number, string>  // chunkIndex → corrected text
  progress: CorrectionProgress
  aborted: boolean
} | null = null

/** Build the knowledge base context string */
async function buildKBContext(projectId: string): Promise<{ globalKB: string; projectKB: string; terminology: string; totalTokens: number }> {
  let globalKB = ''
  let projectKB = ''

  // Global profile
  const profilePath = path.join(getGlobalKBDir(), 'personal-profile.md')
  if (fs.existsSync(profilePath)) {
    globalKB += fs.readFileSync(profilePath, 'utf-8') + '\n\n'
  }

  // Global reference files
  const globalFilesDir = path.join(getGlobalKBDir(), 'files')
  if (fs.existsSync(globalFilesDir)) {
    const files = fs.readdirSync(globalFilesDir).filter(f => !f.startsWith('.'))
    for (const file of files) {
      try {
        const text = await extractTextFromFile(path.join(globalFilesDir, file))
        if (text) globalKB += `### ${file}\n${text}\n\n`
      } catch { /* skip */ }
    }
  }

  // Project KB files
  const projectKBDir = path.join(getProjectDir(projectId), 'kb')
  if (fs.existsSync(projectKBDir)) {
    const files = fs.readdirSync(projectKBDir).filter(f => !f.startsWith('.'))
    for (const file of files) {
      try {
        const text = await extractTextFromFile(path.join(projectKBDir, file))
        if (text) projectKB += `### ${file}\n${text}\n\n`
      } catch { /* skip */ }
    }
  }

  // Terminology table
  const terms = loadTerminology()
  let terminology = ''
  if (terms.length > 0) {
    terminology = terms.map(t => `${t.wrong} → ${t.correct}${t.note ? ` (${t.note})` : ''}`).join('\n')
  }

  const totalTokens = estimateTokens(globalKB) + estimateTokens(projectKB) + estimateTokens(terminology)
  return { globalKB, projectKB, terminology, totalTokens }
}

/** Split subtitle text into chunks of ~CHUNK_SIZE entries */
function splitIntoChunks(entries: SubtitleEntry[]): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunkEntries = entries.slice(i, i + CHUNK_SIZE)
    const lines = chunkEntries.map((e, idx) => `${i + idx + 1}: ${e.text}`)
    chunks.push(lines)
  }
  return chunks
}

/** Build overlap context from previous chunk's last N entries */
function getOverlapContext(chunks: string[][], chunkIndex: number): string {
  if (chunkIndex === 0) return ''
  const prevChunk = chunks[chunkIndex - 1]
  const overlapLines = prevChunk.slice(-OVERLAP_SIZE)
  return `[Context from previous batch for continuity:]\n${overlapLines.join('\n')}\n\n[Now correct the following batch:]`
}

/** Preview cost before starting correction */
export async function previewCost(projectId: string, entries: SubtitleEntry[], llmConfig: LLMConfig, templateSlug: string): Promise<CostPreview> {
  const { totalTokens: kbTokens } = await buildKBContext(projectId)
  const chunks = splitIntoChunks(entries)
  const totalChars = entries.reduce((sum, e) => sum + e.text.length, 0)

  // Estimate: system prompt tokens (template + KB) + user message tokens per chunk
  const template = getTemplate(templateSlug)
  const templateTokens = estimateTokens(template?.content ?? '')
  const avgChunkTokens = totalChars / chunks.length * 1.5 // rough estimate
  const tokensPerCall = templateTokens + kbTokens + avgChunkTokens
  const totalTokensEstimate = tokensPerCall * chunks.length

  // Get model for pricing
  const model = llmConfig.activeProvider === 'claude'
    ? (llmConfig.claude?.model ?? 'claude-sonnet-4-20250514')
    : (llmConfig.openai?.model ?? 'qwen-plus')

  const pricing = MODEL_PRICING[model] ?? { input: 3, output: 15 }
  // Estimate output tokens as ~80% of input text tokens (correction shrinks text slightly)
  const outputTokens = totalChars * 1.2
  const estimatedCost = (totalTokensEstimate * pricing.input + outputTokens * pricing.output) / 1_000_000

  return {
    totalEntries: entries.length,
    totalChars,
    totalTokensEstimate: Math.ceil(totalTokensEstimate),
    kbTokens,
    chunkCount: chunks.length,
    estimatedCost: Math.round(estimatedCost * 1000) / 1000,
    estimatedTimeMinutes: Math.ceil(chunks.length * 0.5), // ~30s per chunk
    model,
  }
}

/** Run correction with chunking, interrupt/resume support */
export async function runCorrection(
  projectId: string,
  entries: SubtitleEntry[],
  llmConfig: LLMConfig,
  templateSlug: string,
  onProgress: (progress: CorrectionProgress) => void,
): Promise<string> {
  const { globalKB, projectKB, terminology } = await buildKBContext(projectId)
  const chunks = splitIntoChunks(entries)
  const provider = getActiveProvider(llmConfig)

  ensureDefaultTemplate()
  const template = getTemplate(templateSlug)
  if (!template) throw new Error(`Template not found: ${templateSlug}`)

  // Build system prompt from template
  const systemPrompt = template.content
    .replace('{GLOBAL_KB_CONTENT}', globalKB || '(none)')
    .replace('{PROJECT_KB_CONTENT}', projectKB || '(none)')
    .replace('{TERMINOLOGY_TABLE}', terminology || '(none)')

  // Load checkpoint if resuming
  const checkpointPath = path.join(getProjectDir(projectId), 'correction-checkpoint.json')
  let completedResults = new Map<number, string>()
  if (fs.existsSync(checkpointPath)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'))
      for (const [k, v] of Object.entries(checkpoint)) {
        completedResults.set(parseInt(k), v as string)
      }
    } catch { /* start fresh */ }
  }

  // Set up state
  correctionState = {
    projectId,
    chunks,
    completedResults,
    progress: {
      totalChunks: chunks.length,
      completedChunks: completedResults.size,
      currentChunk: 0,
      status: 'running',
    },
    aborted: false,
  }

  // Process chunks sequentially
  for (let i = 0; i < chunks.length; i++) {
    if (correctionState.aborted) {
      correctionState.progress.status = 'paused'
      onProgress({ ...correctionState.progress })
      break
    }

    // Skip already completed chunks
    if (completedResults.has(i)) {
      continue
    }

    correctionState.progress.currentChunk = i + 1
    onProgress({ ...correctionState.progress })

    const overlapCtx = getOverlapContext(chunks, i)
    const userMessage = overlapCtx
      ? `${overlapCtx}\n\n${chunks[i].join('\n')}`
      : chunks[i].join('\n')

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    let result: string | null = null
    let lastError: string = ''

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const llmResult = await provider.generate(messages, { maxTokens: 4096, temperature: 0.3 })
        clearTimeout(timer)
        result = llmResult.content
        break
      } catch (err: any) {
        lastError = err.message
        if (attempt < MAX_RETRIES) {
          // Wait before retry (exponential backoff)
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000))
        }
      }
    }

    if (result) {
      completedResults.set(i, result)
    } else {
      // Mark as needing manual review
      completedResults.set(i, `[CHUNK ${i + 1} FAILED — NEEDS MANUAL REVIEW]\n${lastError}\n\n${chunks[i].join('\n')}`)
    }

    correctionState.progress.completedChunks = completedResults.size
    onProgress({ ...correctionState.progress })

    // Save checkpoint after each chunk
    const checkpoint: Record<string, string> = {}
    for (const [k, v] of completedResults) {
      checkpoint[String(k)] = v
    }
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint), 'utf-8')
  }

  // Assemble final corrected text
  const resultParts: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    resultParts.push(completedResults.get(i) ?? chunks[i].join('\n'))
  }
  const correctedText = resultParts.join('\n\n')

  // Save corrected.txt
  const correctedPath = path.join(getProjectDir(projectId), 'corrected.txt')
  fs.writeFileSync(correctedPath, correctedText, 'utf-8')

  // Clean up checkpoint on completion
  if (!correctionState.aborted && fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath)
  }

  correctionState.progress.status = correctionState.aborted ? 'paused' : 'completed'
  onProgress({ ...correctionState.progress })

  correctionState = null
  return correctedText
}

/** Abort current correction run */
export function abortCorrection(): void {
  if (correctionState) {
    correctionState.aborted = true
  }
}

/** Check if a checkpoint exists for resume */
export function hasCheckpoint(projectId: string): boolean {
  const checkpointPath = path.join(getProjectDir(projectId), 'correction-checkpoint.json')
  return fs.existsSync(checkpointPath)
}

/** Clear checkpoint */
export function clearCheckpoint(projectId: string): void {
  const checkpointPath = path.join(getProjectDir(projectId), 'correction-checkpoint.json')
  if (fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath)
  }
}
