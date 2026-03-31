export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  language: 'zh' | 'en' | 'zh-en-mixed'
  originalSrtPath: string
  extractedTextPath: string
  correctedTextPath: string
  finalSrtPath: string
  knowledgeBaseFiles: string[]
  status: ProjectStatus
}

export type ProjectStatus = 'imported' | 'extracted' | 'correcting' | 'corrected' | 'merged' | 'exported'

export interface SubtitleEntry {
  index: number
  startTime: string   // "HH:MM:SS,mmm"
  endTime: string     // "HH:MM:SS,mmm"
  text: string
}

export interface TermCorrection {
  wrong: string
  correct: string
  note?: string
}

export interface AssStyle {
  fontNameCJK: string
  fontNameLatin: string
  fontSize: number
  bold: boolean
  italic: boolean
  fontColor: string
  outlineColor: string
  borderStyle: 'outline' | 'opaque-box'
}

export interface KBFileInfo {
  name: string
  size: number
  tokens: number
  path: string
}

export interface PromptTemplate {
  slug: string
  name: string
  content: string
}

export interface LLMConfig {
  activeProvider: 'claude' | 'openai-compatible'
  claude?: { model: string }
  openai?: { baseUrl: string; model: string; providerName: string }
}

export interface CostPreview {
  totalEntries: number
  totalChars: number
  totalTokensEstimate: number
  kbTokens: number
  chunkCount: number
  estimatedCost: number
  estimatedTimeMinutes: number
  model: string
}

export interface CorrectionProgress {
  totalChunks: number
  completedChunks: number
  currentChunk: number
  status: 'running' | 'paused' | 'completed' | 'error'
  error?: string
}

export type SidebarTab = 'projects' | 'global-kb' | 'terminology' | 'settings' | 'help'

export type WorkspaceStep = 'import' | 'extract' | 'knowledge' | 'correct' | 'merge' | 'export'

// IPC API exposed via preload
export interface ElectronAPI {
  ping: () => Promise<string>

  // Window controls
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>

  // Projects
  projectList: () => Promise<Project[]>
  projectGet: (id: string) => Promise<Project>
  projectCreate: (name: string, language: Project['language']) => Promise<Project>
  projectDelete: (id: string) => Promise<void>
  projectUpdate: (id: string, data: Partial<Project>) => Promise<Project>

  // SRT operations
  srtImport: (projectId: string) => Promise<{ entries: SubtitleEntry[]; filePath: string }>
  srtParse: (projectId: string) => Promise<SubtitleEntry[]>
  srtExtractText: (projectId: string) => Promise<{ text: string; srtEntryCount: number }>
  srtGenerate: (projectId: string, entries: SubtitleEntry[]) => Promise<string>
  srtApplyOffset: (projectId: string, offsetMs: number) => Promise<SubtitleEntry[]>
  srtMergeText: (projectId: string, correctedText: string) => Promise<{ entries: SubtitleEntry[]; warnings: string[] }>
  srtExport: (projectId: string, entries: SubtitleEntry[]) => Promise<string>

  // File operations
  saveText: (projectId: string, fileName: string, content: string) => Promise<void>
  readText: (projectId: string, fileName: string) => Promise<string>
  selectDataFolder: () => Promise<string | null>
  getDataFolder: () => Promise<string>
  openInExplorer: (filePath: string) => Promise<void>

  // Config
  configRead: () => Promise<any>
  configWrite: (config: any) => Promise<void>

  // Global KB — Profile
  globalKBProfileRead: () => Promise<string>
  globalKBProfileWrite: (content: string) => Promise<void>
  globalKBProfileTokens: () => Promise<number>

  // Global KB — Reference Files
  globalKBFileList: () => Promise<KBFileInfo[]>
  globalKBFileUpload: () => Promise<string[]>
  globalKBFileDelete: (fileName: string) => Promise<void>
  globalKBFileExtractText: (fileName: string) => Promise<string>

  // Project KB
  projectKBList: (projectId: string) => Promise<KBFileInfo[]>
  projectKBUpload: (projectId: string) => Promise<string[]>
  projectKBDelete: (projectId: string, fileName: string) => Promise<void>
  projectKBExtractText: (projectId: string, fileName: string) => Promise<string>

  // Terminology
  terminologyList: () => Promise<TermCorrection[]>
  terminologyAdd: (entry: TermCorrection) => Promise<TermCorrection[]>
  terminologyUpdate: (index: number, entry: TermCorrection) => Promise<TermCorrection[]>
  terminologyDelete: (index: number) => Promise<TermCorrection[]>
  terminologyExportCsv: () => Promise<string | null>
  terminologyImportCsv: () => Promise<TermCorrection[] | null>
  terminologyApply: (text: string) => Promise<{
    result: string
    replacements: Array<{ wrong: string; correct: string; count: number }>
  }>

  // Templates
  templatesList: () => Promise<PromptTemplate[]>
  templatesGet: (slug: string) => Promise<PromptTemplate | null>
  templatesSave: (name: string, content: string) => Promise<PromptTemplate>
  templatesDelete: (slug: string) => Promise<void>

  // LLM
  llmSetApiKey: (provider: 'anthropic' | 'openai', key: string) => Promise<{ success: boolean }>
  llmHasApiKey: (provider: 'anthropic' | 'openai') => Promise<boolean>
  llmDeleteApiKey: (provider: 'anthropic' | 'openai') => Promise<{ success: boolean }>
  llmTestConnection: (llmConfig: LLMConfig) => Promise<{ success: boolean; error?: string }>

  // Correction
  correctionPreviewCost: (projectId: string, llmConfig: LLMConfig, templateSlug: string) => Promise<CostPreview>
  correctionRun: (projectId: string, llmConfig: LLMConfig, templateSlug: string) => Promise<string>
  correctionAbort: () => Promise<void>
  correctionHasCheckpoint: (projectId: string) => Promise<boolean>
  correctionClearCheckpoint: (projectId: string) => Promise<void>

  // Export
  exportAss: (projectId: string, entries: SubtitleEntry[], style?: Partial<AssStyle>) => Promise<string | null>
  exportTxt: (projectId: string) => Promise<string | null>
  exportReport: (projectId: string) => Promise<string | null>

  // Events
  onCorrectionProgress: (callback: (progress: CorrectionProgress) => void) => void
  removeCorrectionProgress: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
