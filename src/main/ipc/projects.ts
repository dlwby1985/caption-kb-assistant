import { ipcMain } from 'electron'
import { listProjects, createProject, getProject, updateProject, deleteProject } from '../services/project'

export function registerProjectHandlers(): void {
  ipcMain.handle('project:list', () => listProjects())

  ipcMain.handle('project:get', (_e, id: string) => getProject(id))

  ipcMain.handle('project:create', (_e, name: string, language: 'zh' | 'en' | 'zh-en-mixed') =>
    createProject(name, language))

  ipcMain.handle('project:update', (_e, id: string, data: any) => updateProject(id, data))

  ipcMain.handle('project:delete', (_e, id: string) => deleteProject(id))
}
