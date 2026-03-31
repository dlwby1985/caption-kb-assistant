# Caption KB Assistant — CLAUDE.md

## What this project is

An Electron desktop app for correcting ASR-generated subtitle (SRT) files using AI + knowledge bases. Built for bilingual (Chinese-English) academic lecture subtitles. Users import SRT files, attach reference materials, run AI correction, review diffs, and export styled subtitle files.

## Tech stack

- **Runtime**: Electron 35 + Node.js
- **Renderer**: React 19 + TypeScript + Vite 6 + Tailwind CSS 4
- **Build**: vite-plugin-electron (three entry points: main, preload, renderer)
- **Packaging**: electron-builder (NSIS installer + portable)

## Project structure

```
src/
  main/           # Electron main process
    index.ts      # App entry, window creation, IPC handler registration
    srt-parser.ts # Core SRT engine (parse, generate, merge, offset)
    ipc/          # IPC handler modules (one per domain)
    services/     # Business logic (data-path, project, file-extract, terminology,
                  #   secure-storage, llm-provider, templates, correction-engine,
                  #   ass-generator, correction-report)
  preload/
    index.ts      # contextBridge — all IPC methods exposed as window.electronAPI
  renderer/
    App.tsx       # Root component with sidebar + workspace
    types.ts      # All TypeScript interfaces + ElectronAPI declaration
    styles/globals.css  # Design system (glassmorphism, dark theme)
    components/
      layout/     # TitleBar, Sidebar
      pages/      # ProjectsPage, GlobalKBPage, TerminologyPage, SettingsPage, HelpPage
      workspace/  # ProjectWorkspace, StepIndicator, ImportPanel, ExtractPanel,
                  #   KnowledgePanel, CorrectionPanel, MergePanel, ExportPanel,
                  #   VirtualSubtitleTable
```

## Architecture patterns

- **IPC**: Renderer calls `window.electronAPI.methodName()` → preload `ipcRenderer.invoke('channel')` → main `ipcMain.handle('channel')`
- **Data storage**: Local files in user-chosen data folder. Projects stored as YAML (`project.yaml`). Text files (extracted.txt, corrected.txt). SRT files copied into project folder.
- **API key security**: Electron safeStorage (preferred) with AES-256-GCM fallback. Never stored in plaintext config.
- **LLM providers**: Claude (Anthropic Messages API) and OpenAI-compatible (DashScope/Qwen, etc). Configurable in Settings.
- **Chunking**: 90 entries per API call, 5-entry overlap, checkpoint save/resume on interruption.

## Key commands

```bash
npm run dev        # Start Vite dev server + Electron
npm run build      # Production build (renderer + main + preload)
npx tsc --noEmit   # Type check without emitting
```

## Important constraints

- `package.json` must NOT have `"type": "module"` — causes `__dirname` to be undefined in Electron main process
- Config files that need ESM syntax use `.mjs` extension (postcss.config.mjs, tailwind.config.mjs)
- Externals in vite.config.ts: `['electron', 'js-yaml', 'iconv-lite', 'mammoth', 'pdf-parse']`
- Window is frameless (`frame: false`) — custom title bar in TitleBar.tsx
- All new IPC channels need: handler in `src/main/ipc/`, registration in `src/main/index.ts`, preload bridge in `src/preload/index.ts`, type in `ElectronAPI` interface in `src/renderer/types.ts`
