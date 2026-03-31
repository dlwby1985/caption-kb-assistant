import { ipcMain } from 'electron'
import { listTemplates, getTemplate, saveTemplate, deleteTemplate, ensureDefaultTemplate } from '../services/templates'

export function registerTemplateHandlers(): void {
  ipcMain.handle('templates:list', () => {
    ensureDefaultTemplate()
    return listTemplates()
  })

  ipcMain.handle('templates:get', (_e, slug: string) => getTemplate(slug))

  ipcMain.handle('templates:save', (_e, name: string, content: string) =>
    saveTemplate(name, content))

  ipcMain.handle('templates:delete', (_e, slug: string) => deleteTemplate(slug))
}
