import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { parse } from '../srt-parser'
import { getProject, updateProject } from '../services/project'
import { getProjectDir } from '../services/data-path'
import {
  previewCost,
  runCorrection,
  abortCorrection,
  hasCheckpoint,
  clearCheckpoint,
  type CorrectionProgress,
} from '../services/correction-engine'
import type { LLMConfig } from '../services/llm-provider'

export function registerCorrectionHandlers(): void {
  // Cost preview
  ipcMain.handle('correction:preview-cost', async (_e, projectId: string, llmConfig: LLMConfig, templateSlug: string) => {
    const project = getProject(projectId)
    if (!project.originalSrtPath || !fs.existsSync(project.originalSrtPath)) {
      throw new Error('No SRT file imported')
    }
    const entries = parse(project.originalSrtPath)
    return previewCost(projectId, entries, llmConfig, templateSlug)
  })

  // Run correction
  ipcMain.handle('correction:run', async (event, projectId: string, llmConfig: LLMConfig, templateSlug: string) => {
    const project = getProject(projectId)
    if (!project.originalSrtPath || !fs.existsSync(project.originalSrtPath)) {
      throw new Error('No SRT file imported')
    }
    const entries = parse(project.originalSrtPath)

    updateProject(projectId, { status: 'correcting' })

    const onProgress = (progress: CorrectionProgress) => {
      // Send progress to renderer
      const win = BrowserWindow.getFocusedWindow()
      if (win) {
        win.webContents.send('correction:progress', progress)
      }
    }

    try {
      const correctedText = await runCorrection(projectId, entries, llmConfig, templateSlug, onProgress)
      updateProject(projectId, {
        status: 'corrected',
        correctedTextPath: path.join(getProjectDir(projectId), 'corrected.txt'),
      })
      return correctedText
    } catch (err: any) {
      updateProject(projectId, { status: 'extracted' })
      throw err
    }
  })

  // Abort correction
  ipcMain.handle('correction:abort', () => {
    abortCorrection()
  })

  // Check if checkpoint exists (for resume)
  ipcMain.handle('correction:has-checkpoint', (_e, projectId: string) => {
    return hasCheckpoint(projectId)
  })

  // Clear checkpoint
  ipcMain.handle('correction:clear-checkpoint', (_e, projectId: string) => {
    clearCheckpoint(projectId)
  })
}
