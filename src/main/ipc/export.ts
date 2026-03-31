import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { generate } from '../srt-parser'
import { generateAss, type AssStyle } from '../services/ass-generator'
import { generateCorrectionReport } from '../services/correction-report'
import { getProjectDir } from '../services/data-path'
import { updateProject } from '../services/project'

export function registerExportHandlers(): void {
  // Export ASS with styling
  ipcMain.handle('export:ass', async (_e, projectId: string, entries: any[], style?: Partial<AssStyle>) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export ASS Subtitle',
      defaultPath: `${projectId}-final.ass`,
      filters: [{ name: 'ASS Subtitle', extensions: ['ass'] }],
    })
    if (result.canceled || !result.filePath) return null

    const assContent = generateAss(entries, style)
    fs.writeFileSync(result.filePath, assContent, 'utf-8')

    // Also save in project dir
    const localPath = path.join(getProjectDir(projectId), 'final.ass')
    fs.writeFileSync(localPath, assContent, 'utf-8')

    updateProject(projectId, { status: 'exported' })
    return result.filePath
  })

  // Export plain text
  ipcMain.handle('export:txt', async (_e, projectId: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export Plain Text',
      defaultPath: `${projectId}-corrected.txt`,
      filters: [{ name: 'Text', extensions: ['txt'] }],
    })
    if (result.canceled || !result.filePath) return null

    // Try corrected first, then extracted
    const projectDir = getProjectDir(projectId)
    let textPath = path.join(projectDir, 'corrected.txt')
    if (!fs.existsSync(textPath)) {
      textPath = path.join(projectDir, 'extracted.txt')
    }
    if (!fs.existsSync(textPath)) throw new Error('No text to export')

    const text = fs.readFileSync(textPath, 'utf-8')
    // Strip number prefixes for clean export
    const clean = text.replace(/^\d+:\s*/gm, '')
    fs.writeFileSync(result.filePath, clean, 'utf-8')

    return result.filePath
  })

  // Export correction report (Markdown)
  ipcMain.handle('export:report', async (_e, projectId: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export Correction Report',
      defaultPath: `${projectId}-correction-report.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (result.canceled || !result.filePath) return null

    const report = generateCorrectionReport(projectId)
    fs.writeFileSync(result.filePath, report, 'utf-8')

    // Also save in project dir
    const localPath = path.join(getProjectDir(projectId), 'correction-report.md')
    fs.writeFileSync(localPath, report, 'utf-8')

    return result.filePath
  })
}
