import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { getGlobalKBDir, ensureDir } from '../services/data-path'
import { extractTextFromFile, estimateTokens } from '../services/file-extract'

export function registerGlobalKBHandlers(): void {
  // --- Personal Profile ---
  ipcMain.handle('global-kb:profile-read', () => {
    const profilePath = path.join(getGlobalKBDir(), 'personal-profile.md')
    if (!fs.existsSync(profilePath)) return ''
    return fs.readFileSync(profilePath, 'utf-8')
  })

  ipcMain.handle('global-kb:profile-write', (_e, content: string) => {
    const profilePath = path.join(getGlobalKBDir(), 'personal-profile.md')
    fs.writeFileSync(profilePath, content, 'utf-8')
  })

  // --- Reference Files ---
  ipcMain.handle('global-kb:file-list', async () => {
    const filesDir = path.join(getGlobalKBDir(), 'files')
    ensureDir(filesDir)
    const files = fs.readdirSync(filesDir, { withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => d.name)

    const result: Array<{
      name: string
      size: number
      tokens: number
      path: string
    }> = []

    for (const name of files) {
      const filePath = path.join(filesDir, name)
      const stat = fs.statSync(filePath)
      let tokens = 0
      try {
        const text = await extractTextFromFile(filePath)
        tokens = estimateTokens(text)
      } catch { /* skip token count */ }

      result.push({
        name,
        size: stat.size,
        tokens,
        path: filePath,
      })
    }
    return result
  })

  ipcMain.handle('global-kb:file-upload', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Upload Reference File',
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'md', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled || !result.filePaths.length) return []

    const filesDir = path.join(getGlobalKBDir(), 'files')
    ensureDir(filesDir)
    const uploaded: string[] = []

    for (const srcPath of result.filePaths) {
      const name = path.basename(srcPath)
      const destPath = path.join(filesDir, name)
      fs.copyFileSync(srcPath, destPath)
      uploaded.push(name)
    }
    return uploaded
  })

  ipcMain.handle('global-kb:file-delete', (_e, fileName: string) => {
    const filePath = path.join(getGlobalKBDir(), 'files', fileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  })

  ipcMain.handle('global-kb:file-extract-text', async (_e, fileName: string) => {
    const filePath = path.join(getGlobalKBDir(), 'files', fileName)
    return extractTextFromFile(filePath)
  })

  // Token estimate for profile
  ipcMain.handle('global-kb:profile-tokens', () => {
    const profilePath = path.join(getGlobalKBDir(), 'personal-profile.md')
    if (!fs.existsSync(profilePath)) return 0
    const text = fs.readFileSync(profilePath, 'utf-8')
    return estimateTokens(text)
  })
}
