import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { getDataFolder, ensureDir } from '../services/data-path'

function configPath(): string {
  return path.join(getDataFolder(), 'config.yaml')
}

export function registerConfigHandlers(): void {
  ipcMain.handle('config:read', () => {
    const p = configPath()
    if (!fs.existsSync(p)) return {}
    try {
      return yaml.load(fs.readFileSync(p, 'utf-8')) || {}
    } catch {
      return {}
    }
  })

  ipcMain.handle('config:write', (_e, config: any) => {
    const p = configPath()
    ensureDir(path.dirname(p))
    fs.writeFileSync(p, yaml.dump(config, { lineWidth: -1 }), 'utf-8')
  })
}
