import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let dataFolder: string | null = null

/** Get the user data folder. Defaults to appData/caption-kb-assistant */
export function getDataFolder(): string {
  if (dataFolder) return dataFolder

  // Check config for custom path
  const configPath = path.join(app.getPath('userData'), 'app-config.json')
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.dataFolder && fs.existsSync(config.dataFolder)) {
        dataFolder = config.dataFolder
        return dataFolder
      }
    }
  } catch { /* use default */ }

  // Default location
  dataFolder = path.join(app.getPath('userData'), 'data')
  return dataFolder
}

/** Set the user data folder and persist to config */
export function setDataFolder(folderPath: string): void {
  dataFolder = folderPath
  const configPath = path.join(app.getPath('userData'), 'app-config.json')
  let config: any = {}
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch { /* start fresh */ }
  config.dataFolder = folderPath
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

/** Ensure a directory exists */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true })
}

/** Get path to projects directory */
export function getProjectsDir(): string {
  const dir = path.join(getDataFolder(), 'projects')
  ensureDir(dir)
  return dir
}

/** Get path to a specific project directory */
export function getProjectDir(projectId: string): string {
  return path.join(getProjectsDir(), projectId)
}

/** Get path to global-kb directory */
export function getGlobalKBDir(): string {
  const dir = path.join(getDataFolder(), 'global-kb')
  ensureDir(dir)
  return dir
}

/** Get path to templates directory */
export function getTemplatesDir(): string {
  const dir = path.join(getDataFolder(), 'templates')
  ensureDir(dir)
  return dir
}
