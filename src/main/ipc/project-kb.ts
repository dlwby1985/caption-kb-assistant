import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { getProjectDir, ensureDir } from '../services/data-path'
import { extractTextFromFile, estimateTokens } from '../services/file-extract'

export function registerProjectKBHandlers(): void {
  // List KB files for a project
  ipcMain.handle('project-kb:list', async (_e, projectId: string) => {
    const kbDir = path.join(getProjectDir(projectId), 'kb')
    ensureDir(kbDir)

    const files = fs.readdirSync(kbDir, { withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => d.name)

    const result: Array<{
      name: string
      size: number
      tokens: number
      path: string
    }> = []

    for (const name of files) {
      const filePath = path.join(kbDir, name)
      const stat = fs.statSync(filePath)
      let tokens = 0
      try {
        const text = await extractTextFromFile(filePath)
        tokens = estimateTokens(text)
      } catch { /* skip */ }

      result.push({
        name,
        size: stat.size,
        tokens,
        path: filePath,
      })
    }
    return result
  })

  // Upload files to project KB
  ipcMain.handle('project-kb:upload', async (_e, projectId: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Upload Knowledge Base File',
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'pptx', 'md', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled || !result.filePaths.length) return []

    const kbDir = path.join(getProjectDir(projectId), 'kb')
    ensureDir(kbDir)
    const uploaded: string[] = []

    for (const srcPath of result.filePaths) {
      const name = path.basename(srcPath)
      const destPath = path.join(kbDir, name)
      fs.copyFileSync(srcPath, destPath)
      uploaded.push(name)
    }
    return uploaded
  })

  // Delete a KB file
  ipcMain.handle('project-kb:delete', (_e, projectId: string, fileName: string) => {
    const filePath = path.join(getProjectDir(projectId), 'kb', fileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  })

  // Extract text from a KB file
  ipcMain.handle('project-kb:extract-text', async (_e, projectId: string, fileName: string) => {
    const filePath = path.join(getProjectDir(projectId), 'kb', fileName)
    return extractTextFromFile(filePath)
  })
}
