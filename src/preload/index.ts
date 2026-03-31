import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  ping: () => ipcRenderer.invoke('ping'),

  // Window controls (custom title bar)
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Projects
  projectList: () => ipcRenderer.invoke('project:list'),
  projectGet: (id: string) => ipcRenderer.invoke('project:get', id),
  projectCreate: (name: string, language: string) =>
    ipcRenderer.invoke('project:create', name, language),
  projectDelete: (id: string) => ipcRenderer.invoke('project:delete', id),
  projectUpdate: (id: string, data: any) => ipcRenderer.invoke('project:update', id, data),

  // SRT operations
  srtImport: (projectId: string) => ipcRenderer.invoke('srt:import', projectId),
  srtParse: (projectId: string) => ipcRenderer.invoke('srt:parse', projectId),
  srtExtractText: (projectId: string) => ipcRenderer.invoke('srt:extract-text', projectId),
  srtGenerate: (projectId: string, entries: any[]) =>
    ipcRenderer.invoke('srt:generate', projectId, entries),
  srtApplyOffset: (projectId: string, offsetMs: number) =>
    ipcRenderer.invoke('srt:apply-offset', projectId, offsetMs),
  srtMergeText: (projectId: string, correctedText: string) =>
    ipcRenderer.invoke('srt:merge-text', projectId, correctedText),
  srtExport: (projectId: string, entries: any[]) =>
    ipcRenderer.invoke('srt:export', projectId, entries),

  // File operations
  saveText: (projectId: string, fileName: string, content: string) =>
    ipcRenderer.invoke('file:save-text', projectId, fileName, content),
  readText: (projectId: string, fileName: string) =>
    ipcRenderer.invoke('file:read-text', projectId, fileName),
  selectDataFolder: () => ipcRenderer.invoke('file:select-data-folder'),
  getDataFolder: () => ipcRenderer.invoke('file:get-data-folder'),
  openInExplorer: (filePath: string) => ipcRenderer.invoke('file:open-in-explorer', filePath),

  // Config
  configRead: () => ipcRenderer.invoke('config:read'),
  configWrite: (config: any) => ipcRenderer.invoke('config:write', config),

  // Global KB — Profile
  globalKBProfileRead: () => ipcRenderer.invoke('global-kb:profile-read'),
  globalKBProfileWrite: (content: string) => ipcRenderer.invoke('global-kb:profile-write', content),
  globalKBProfileTokens: () => ipcRenderer.invoke('global-kb:profile-tokens'),

  // Global KB — Reference Files
  globalKBFileList: () => ipcRenderer.invoke('global-kb:file-list'),
  globalKBFileUpload: () => ipcRenderer.invoke('global-kb:file-upload'),
  globalKBFileDelete: (fileName: string) => ipcRenderer.invoke('global-kb:file-delete', fileName),
  globalKBFileExtractText: (fileName: string) => ipcRenderer.invoke('global-kb:file-extract-text', fileName),

  // Project KB
  projectKBList: (projectId: string) => ipcRenderer.invoke('project-kb:list', projectId),
  projectKBUpload: (projectId: string) => ipcRenderer.invoke('project-kb:upload', projectId),
  projectKBDelete: (projectId: string, fileName: string) =>
    ipcRenderer.invoke('project-kb:delete', projectId, fileName),
  projectKBExtractText: (projectId: string, fileName: string) =>
    ipcRenderer.invoke('project-kb:extract-text', projectId, fileName),

  // Terminology
  terminologyList: () => ipcRenderer.invoke('terminology:list'),
  terminologyAdd: (entry: any) => ipcRenderer.invoke('terminology:add', entry),
  terminologyUpdate: (index: number, entry: any) =>
    ipcRenderer.invoke('terminology:update', index, entry),
  terminologyDelete: (index: number) => ipcRenderer.invoke('terminology:delete', index),
  terminologyExportCsv: () => ipcRenderer.invoke('terminology:export-csv'),
  terminologyImportCsv: () => ipcRenderer.invoke('terminology:import-csv'),
  terminologyApply: (text: string) => ipcRenderer.invoke('terminology:apply', text),

  // Templates
  templatesList: () => ipcRenderer.invoke('templates:list'),
  templatesGet: (slug: string) => ipcRenderer.invoke('templates:get', slug),
  templatesSave: (name: string, content: string) => ipcRenderer.invoke('templates:save', name, content),
  templatesDelete: (slug: string) => ipcRenderer.invoke('templates:delete', slug),

  // LLM
  llmSetApiKey: (provider: 'anthropic' | 'openai', key: string) =>
    ipcRenderer.invoke('llm:set-api-key', provider, key),
  llmHasApiKey: (provider: 'anthropic' | 'openai') =>
    ipcRenderer.invoke('llm:has-api-key', provider),
  llmDeleteApiKey: (provider: 'anthropic' | 'openai') =>
    ipcRenderer.invoke('llm:delete-api-key', provider),
  llmTestConnection: (llmConfig: any) => ipcRenderer.invoke('llm:test-connection', llmConfig),

  // Correction
  correctionPreviewCost: (projectId: string, llmConfig: any, templateSlug: string) =>
    ipcRenderer.invoke('correction:preview-cost', projectId, llmConfig, templateSlug),
  correctionRun: (projectId: string, llmConfig: any, templateSlug: string) =>
    ipcRenderer.invoke('correction:run', projectId, llmConfig, templateSlug),
  correctionAbort: () => ipcRenderer.invoke('correction:abort'),
  correctionHasCheckpoint: (projectId: string) =>
    ipcRenderer.invoke('correction:has-checkpoint', projectId),
  correctionClearCheckpoint: (projectId: string) =>
    ipcRenderer.invoke('correction:clear-checkpoint', projectId),

  // Export
  exportAss: (projectId: string, entries: any[], style?: any) =>
    ipcRenderer.invoke('export:ass', projectId, entries, style),
  exportTxt: (projectId: string) => ipcRenderer.invoke('export:txt', projectId),
  exportReport: (projectId: string) => ipcRenderer.invoke('export:report', projectId),

  // IPC event listeners (for progress updates from main)
  onCorrectionProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('correction:progress', (_event, progress) => callback(progress))
  },
  removeCorrectionProgress: () => {
    ipcRenderer.removeAllListeners('correction:progress')
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
