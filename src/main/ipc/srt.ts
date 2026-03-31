import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { parse, generate, extractText, applyOffset, mergeText } from '../srt-parser'
import { getProjectDir } from '../services/data-path'
import { updateProject, getProject } from '../services/project'

export function registerSrtHandlers(): void {
  // Import SRT file (opens file dialog, copies to project dir)
  ipcMain.handle('srt:import', async (_e, projectId: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import SRT File',
      filters: [
        { name: 'SRT Subtitle', extensions: ['srt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return null

    const srcPath = result.filePaths[0]
    const projectDir = getProjectDir(projectId)
    const destPath = path.join(projectDir, 'original.srt')

    // Copy file to project directory
    fs.copyFileSync(srcPath, destPath)

    // Parse the file
    const entries = parse(destPath)

    // Update project metadata
    updateProject(projectId, {
      originalSrtPath: destPath,
      status: 'imported',
    })

    return { entries, filePath: destPath }
  })

  // Parse existing SRT in project
  ipcMain.handle('srt:parse', (_e, projectId: string) => {
    const project = getProject(projectId)
    if (!project.originalSrtPath || !fs.existsSync(project.originalSrtPath)) {
      throw new Error('No SRT file imported for this project')
    }
    return parse(project.originalSrtPath)
  })

  // Extract plain text from SRT
  ipcMain.handle('srt:extract-text', (_e, projectId: string) => {
    const project = getProject(projectId)
    if (!project.originalSrtPath || !fs.existsSync(project.originalSrtPath)) {
      throw new Error('No SRT file imported for this project')
    }
    const entries = parse(project.originalSrtPath)
    const text = extractText(entries)

    // Save extracted text
    const textPath = path.join(getProjectDir(projectId), 'extracted.txt')
    fs.writeFileSync(textPath, text, 'utf-8')

    updateProject(projectId, {
      extractedTextPath: textPath,
      status: 'extracted',
    })

    return { text, srtEntryCount: entries.length }
  })

  // Generate SRT from entries
  ipcMain.handle('srt:generate', (_e, _projectId: string, entries: any[]) => {
    return generate(entries)
  })

  // Apply timing offset
  ipcMain.handle('srt:apply-offset', (_e, projectId: string, offsetMs: number) => {
    const project = getProject(projectId)
    if (!project.originalSrtPath || !fs.existsSync(project.originalSrtPath)) {
      throw new Error('No SRT file imported for this project')
    }
    const entries = parse(project.originalSrtPath)
    const adjusted = applyOffset(entries, offsetMs)

    // Save adjusted SRT
    const srtContent = generate(adjusted)
    fs.writeFileSync(project.originalSrtPath, srtContent, 'utf-8')

    return adjusted
  })

  // Merge corrected text with original timestamps
  ipcMain.handle('srt:merge-text', (_e, projectId: string, correctedText: string) => {
    const project = getProject(projectId)
    if (!project.originalSrtPath || !fs.existsSync(project.originalSrtPath)) {
      throw new Error('No SRT file imported for this project')
    }
    const originalEntries = parse(project.originalSrtPath)
    const { entries, warnings } = mergeText(originalEntries, correctedText)

    // Save final SRT
    const finalPath = path.join(getProjectDir(projectId), 'final.srt')
    fs.writeFileSync(finalPath, generate(entries), 'utf-8')

    updateProject(projectId, {
      finalSrtPath: finalPath,
      status: 'merged',
    })

    return { entries, warnings }
  })

  // Export SRT (save-as dialog)
  ipcMain.handle('srt:export', async (_e, projectId: string, entries: any[]) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export SRT File',
      defaultPath: `${projectId}-final.srt`,
      filters: [
        { name: 'SRT Subtitle', extensions: ['srt'] },
      ],
    })
    if (result.canceled || !result.filePath) return null

    const srtContent = generate(entries)
    fs.writeFileSync(result.filePath, srtContent, 'utf-8')

    updateProject(projectId, { status: 'exported' })

    return result.filePath
  })
}
