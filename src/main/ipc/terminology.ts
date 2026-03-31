import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import {
  loadTerminology,
  addTerm,
  updateTerm,
  deleteTerm,
  exportCsv,
  importCsv,
  applyTerminology,
  type TermEntry,
} from '../services/terminology'

export function registerTerminologyHandlers(): void {
  ipcMain.handle('terminology:list', () => loadTerminology())

  ipcMain.handle('terminology:add', (_e, entry: TermEntry) => addTerm(entry))

  ipcMain.handle('terminology:update', (_e, index: number, entry: TermEntry) =>
    updateTerm(index, entry))

  ipcMain.handle('terminology:delete', (_e, index: number) => deleteTerm(index))

  // Export CSV — show save dialog
  ipcMain.handle('terminology:export-csv', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export Terminology CSV',
      defaultPath: 'terminology.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return null

    const csv = exportCsv()
    fs.writeFileSync(result.filePath, '\ufeff' + csv, 'utf-8') // BOM for Excel compatibility
    return result.filePath
  })

  // Import CSV — show open dialog
  ipcMain.handle('terminology:import-csv', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import Terminology CSV',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return null

    const csv = fs.readFileSync(result.filePaths[0], 'utf-8')
    return importCsv(csv)
  })

  // Apply terminology to text (preview)
  ipcMain.handle('terminology:apply', (_e, text: string) => applyTerminology(text))
}
