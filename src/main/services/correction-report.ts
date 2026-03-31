import fs from 'fs'
import path from 'path'
import { parse, extractText } from '../srt-parser'
import { getProjectDir } from './data-path'
import { getProject } from './project'

/**
 * Generate a correction report as Markdown.
 * Compares extracted.txt (original) with corrected.txt and lists all changes.
 */
export function generateCorrectionReport(projectId: string): string {
  const project = getProject(projectId)
  const projectDir = getProjectDir(projectId)

  const originalPath = path.join(projectDir, 'extracted.txt')
  const correctedPath = path.join(projectDir, 'corrected.txt')

  if (!fs.existsSync(originalPath) || !fs.existsSync(correctedPath)) {
    return '# Correction Report\n\nNo comparison data available.\n'
  }

  const originalText = fs.readFileSync(originalPath, 'utf-8')
  const correctedText = fs.readFileSync(correctedPath, 'utf-8')

  const origLines = originalText.trim().split(/\n\n+/)
  const corrLines = correctedText.trim().split(/\n\n+/)

  const changes: Array<{ index: number; original: string; corrected: string }> = []
  const count = Math.max(origLines.length, corrLines.length)

  for (let i = 0; i < count; i++) {
    const orig = (origLines[i] || '').replace(/^\d+:\s*/, '').trim()
    const corr = (corrLines[i] || '').replace(/^\d+:\s*/, '').trim()
    if (orig !== corr) {
      changes.push({ index: i + 1, original: orig, corrected: corr })
    }
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  let report = `# Correction Report\n\n`
  report += `**Project**: ${project.name}\n`
  report += `**Date**: ${now}\n`
  report += `**Total entries**: ${count}\n`
  report += `**Changes made**: ${changes.length}\n`
  report += `**Unchanged**: ${count - changes.length}\n\n`
  report += `---\n\n`

  if (changes.length === 0) {
    report += 'No changes were made.\n'
  } else {
    report += `## Changes\n\n`
    for (const change of changes) {
      report += `### Entry #${change.index}\n\n`
      report += `**Original:**\n> ${change.original}\n\n`
      report += `**Corrected:**\n> ${change.corrected}\n\n`
    }
  }

  return report
}
