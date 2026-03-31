import { app, BrowserWindow, ipcMain, Menu, globalShortcut } from 'electron'
import path from 'path'

import { registerProjectHandlers } from './ipc/projects'
import { registerSrtHandlers } from './ipc/srt'
import { registerFileHandlers } from './ipc/files'
import { registerConfigHandlers } from './ipc/config'
import { registerGlobalKBHandlers } from './ipc/global-kb'
import { registerProjectKBHandlers } from './ipc/project-kb'
import { registerTerminologyHandlers } from './ipc/terminology'
import { registerTemplateHandlers } from './ipc/templates'
import { registerCorrectionHandlers } from './ipc/correction'
import { registerLLMHandlers } from './ipc/llm'
import { registerExportHandlers } from './ipc/export'
import { getDataFolder, ensureDir } from './services/data-path'

let mainWindow: BrowserWindow | null = null

// Remove default Electron menu bar
Menu.setApplicationMenu(null)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Caption KB Assistant',
    icon: path.join(__dirname, '../../build/icon.ico'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // In dev, load from Vite dev server; in production, load built index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Register all IPC handlers
ipcMain.handle('ping', () => 'pong')

// Window control handlers (for custom title bar)
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

registerProjectHandlers()
registerSrtHandlers()
registerFileHandlers()
registerConfigHandlers()
registerGlobalKBHandlers()
registerProjectKBHandlers()
registerTerminologyHandlers()
registerTemplateHandlers()
registerCorrectionHandlers()
registerLLMHandlers()
registerExportHandlers()

app.whenReady().then(() => {
  createWindow()

  // Register keyboard shortcuts
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools()
  })
  globalShortcut.register('F11', () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })

  // Ensure data directory structure on launch
  const dataFolder = getDataFolder()
  ensureDir(path.join(dataFolder, 'projects'))
  ensureDir(path.join(dataFolder, 'global-kb', 'files'))
  ensureDir(path.join(dataFolder, 'templates'))
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
