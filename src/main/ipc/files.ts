import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { getProjectDir, getDataFolder, setDataFolder, ensureDir } from '../services/data-path'

export function registerFileHandlers(): void {
  // Save text content to a file in the project directory
  ipcMain.handle('file:save-text', (_e, projectId: string, fileName: string, content: string) => {
    const filePath = path.join(getProjectDir(projectId), fileName)
    fs.writeFileSync(filePath, content, 'utf-8')
  })

  // Read text content from a file in the project directory
  ipcMain.handle('file:read-text', (_e, projectId: string, fileName: string) => {
    const filePath = path.join(getProjectDir(projectId), fileName)
    if (!fs.existsSync(filePath)) return ''
    return fs.readFileSync(filePath, 'utf-8')
  })

  // Select data folder via dialog
  ipcMain.handle('file:select-data-folder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select Data Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return null

    const folder = result.filePaths[0]
    setDataFolder(folder)
    // Ensure structure
    ensureDir(path.join(folder, 'projects'))
    ensureDir(path.join(folder, 'global-kb', 'files'))
    ensureDir(path.join(folder, 'templates'))
    return folder
  })

  // Get current data folder path
  ipcMain.handle('file:get-data-folder', () => getDataFolder())

  // Open path in file explorer
  ipcMain.handle('file:open-in-explorer', (_e, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}
