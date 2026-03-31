# Caption KB Assistant — Coding Plan

## Project Overview

**Name**: Caption KB Assistant
**Purpose**: AI-powered desktop tool for correcting and polishing ASR-generated subtitle files using knowledge bases. Import SRT files from Adobe Premiere or other tools, correct them with AI + domain knowledge, export high-quality SRT files.
**Core principle**: This software handles subtitles only — never video. Video ASR and final styling happen in external tools (Adobe Premiere, etc.).

## Tech Stack

Reuse Email KB Assistant architecture:

- **Platform**: Electron desktop app (Windows .exe)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **AI**: Multi-LLM provider (Claude API primary, OpenAI-compatible secondary)
- **Storage**: Local files (YAML + Markdown + JSON + SRT + TXT), user-specified folder
- **Build**: electron-builder (NSIS installer + portable)

## Data Directory Structure

```
user-data-folder/
├── global-kb/
│   ├── personal-profile.md         # User's personal info (name, title, institution, research area)
│   ├── terminology.yaml            # Term correction table (wrong → correct)
│   └── files/                      # Uploaded reference files (PDF, DOCX, etc.)
├── templates/
│   ├── academic-lecture.md          # Default prompt template
│   └── ...                         # User-created templates
├── projects/
│   ├── 2026-03-24-zhao-xian/
│   │   ├── project.yaml            # Project metadata
│   │   ├── original.srt            # Imported SRT
│   │   ├── extracted.txt           # Extracted plain text
│   │   ├── corrected.txt           # AI-corrected text
│   │   ├── final.srt               # Merged final SRT
│   │   ├── final.ass               # Final ASS with styling (optional)
│   │   ├── correction-report.md    # Diff report
│   │   └── kb/                     # Project-specific knowledge base files
│   └── ...
└── config.yaml                     # App config (NO API keys — use Electron safeStorage)
```

## Navigation Structure

```
Sidebar Tabs:
├── Projects          # Project list (create, open, delete)
├── Global KB         # Global knowledge base management
├── Terminology       # Term correction table
├── Settings          # API keys, LLM config, data path, language
└── Help              # User guide
```

Project workspace (after opening a project) uses step-based navigation:

```
Step 1: Import       → Import SRT, view subtitle list, adjust timing offset
Step 2: Extract      → Extract plain text, edit in-app or download
Step 3: Knowledge    → Upload project KB files (PDF, PPTX, DOCX, TXT)
Step 4: Correct      → AI correction (cost preview → execute → diff view → confirm)
Step 5: Merge        → Merge corrected text with original timestamps → final SRT
Step 6: Export       → Style settings + export SRT/ASS/TXT
```

## Core Data Model

```typescript
interface Project {
  id: string;
  name: string;
  createdAt: string;           // ISO date
  updatedAt: string;           // ISO date
  language: 'zh' | 'en' | 'zh-en-mixed';
  originalSrtPath: string;
  extractedTextPath: string;
  correctedTextPath: string;
  finalSrtPath: string;
  knowledgeBaseFiles: string[];
  status: 'imported' | 'extracted' | 'correcting' | 'corrected' | 'merged' | 'exported';
}

interface SubtitleEntry {
  index: number;
  startTime: string;           // "HH:MM:SS,mmm"
  endTime: string;             // "HH:MM:SS,mmm"
  text: string;
}

interface TermCorrection {
  wrong: string;
  correct: string;
  note?: string;
}
```

---

## Phase 1: Scaffold + Core File Processing

**Goal**: Electron app shell + SRT import/export + plain text extraction + basic project management.

### 1.1 Electron Scaffold

- Vite + React + TypeScript + Tailwind CSS setup
- Follow Email KB Assistant's vite-plugin-electron configuration
- IPC four-file registration pattern: `preload.ts` / `main-handler.ts` / `renderer-api.ts` / `types.ts`
- Custom title bar (no system menu bar)
- Sidebar tab navigation (5 tabs: Projects, Global KB, Terminology, Settings, Help)

### 1.2 SRT Parser Engine

Create `src/main/srt-parser.ts`:

- **parse(filePath) → SubtitleEntry[]**
  - Auto-detect encoding: UTF-8, UTF-8-BOM, GBK
  - Auto-handle line endings: CRLF and LF
  - Handle timestamp format variations (comma vs period for milliseconds)
  - Error-tolerant: skip malformed entries, do not abort entire parse
  - Return array of `SubtitleEntry` objects

- **generate(entries: SubtitleEntry[]) → string**
  - Convert SubtitleEntry array back to SRT format string
  - Use UTF-8 encoding, LF line endings

- **extractText(entries: SubtitleEntry[]) → string**
  - Extract plain text from entries (strip index and timestamps)
  - Separate paragraphs with blank lines
  - Number each paragraph (e.g., "1: text content")

### 1.3 Project Management

- Project CRUD operations (create, read, update, delete)
- Store project metadata in `project.yaml`
- Project list page: display all projects sorted by date, show status badge
- Each project is a folder under `projects/`

### 1.4 Project Workspace UI

- **Import panel**: File picker + drag-and-drop for SRT files
- **Subtitle list view**: Table with columns (index | start time | end time | text)
- **Plain text panel**: Right-side editor showing extracted text, editable
- **Download buttons**: For each artifact (original SRT, extracted text, etc.)
- **Upload/replace**: Allow user to download, edit externally, and re-upload

### 1.5 Timing Offset Adjustment

- Input field: offset in milliseconds (positive or negative)
- Preview before applying
- Apply to all entries at once
- Save adjusted SRT

### Phase 1 Acceptance Criteria

- [ ] Import SRT file from Adobe Premiere or Subtitle Edit
- [ ] View subtitle list with timestamps
- [ ] Extract plain text with one click
- [ ] Edit plain text in-app
- [ ] Adjust timing offset
- [ ] Merge plain text back into SRT (manual, no AI)
- [ ] Export final SRT
- [ ] All operations work offline (no API required)

---

## Phase 2: Knowledge Base System

**Goal**: Global KB + project KB + terminology table with offline auto-replacement.

### 2.1 Global Knowledge Base

Storage location: `global-kb/` in user data folder.

- **Personal Profile** (`personal-profile.md`):
  - Markdown editor for user's name, title, institution, research area
  - Loaded as context for every AI correction call
  - Reference: Email KB Assistant's My Profile feature

- **Reference Files** (`global-kb/files/`):
  - Upload PDF, DOCX, MD, TXT files
  - File list with toggle (include/exclude from AI context)
  - Display estimated token count per file

### 2.2 Project Knowledge Base

Storage location: `projects/<project>/kb/`

- Upload project-specific files: PDF, PPTX, DOCX, MD, TXT
- File content extraction:
  - PDF → text via `pdf-parse`
  - PPTX → slide text via `pptx` parser library
  - DOCX → text via `mammoth`
  - MD/TXT → read directly
- File list with checkboxes (select which files to include in AI context)
- Token estimation per file and total

### 2.3 Terminology Table

Storage: `global-kb/terminology.yaml`

- Table UI: columns (Wrong Term | Correct Term | Note)
- CRUD operations: add, edit, delete individual entries
- Import from CSV / Export to CSV
- "Add to terminology" button (available in diff view after AI correction)
- **Offline auto-replacement**: Apply terminology table to plain text without API
  - Show diff preview before applying
  - User confirms before saving

### Phase 2 Acceptance Criteria

- [ ] Create and edit personal profile
- [ ] Upload and manage global reference files
- [ ] Upload and manage project KB files (PDF, PPTX, DOCX, TXT)
- [ ] Maintain terminology table (add, edit, delete, import/export CSV)
- [ ] Apply terminology auto-replacement to plain text (offline, no API)
- [ ] View diff of terminology replacements before confirming
- [ ] Token estimation displayed for all KB content

---

## Phase 3: AI Correction Engine

**Goal**: Multi-LLM support + automatic chunking + prompt templates + diff view.

### 3.1 LLM Provider System

Reuse Email KB Assistant's `LLMProvider` interface:

- **Claude API**: Primary provider
- **OpenAI-compatible API**: Secondary (supports DashScope/Qwen, MiniMax, etc.)
- Settings page:
  - Provider selection dropdown
  - API key input (stored via Electron safeStorage, NOT in config.yaml)
  - Model selection dropdown
  - Base URL field (for third-party compatible endpoints)
- Test connection button

### 3.2 Automatic Chunking

The core engineering challenge: 27,000 characters cannot be corrected in one API call.

- Split subtitle entries into chunks of 80-100 entries each
- Each chunk builds an independent API request:
  - **System prompt**: Prompt template + global KB content + project KB content + terminology table
  - **User message**: Current chunk's subtitle text (numbered paragraphs)
- **Context overlap**: Include last 5 entries of previous chunk as context for continuity
- Sequential processing: one chunk at a time
- Progress display: "Processing batch X of Y — estimated Z minutes remaining"
- **Interrupt and resume**: Save completed chunks; if interrupted, resume from last completed chunk
- **Error handling**: Retry failed chunk 2 times; if still fails, skip and mark as "needs manual review"

### 3.3 Prompt Template System

- Default built-in template (validated in our testing):

```
You are a Chinese academic lecture subtitle proofreading expert.
Correct the following subtitle text based on the knowledge base provided.

## Knowledge Base
{GLOBAL_KB_CONTENT}
{PROJECT_KB_CONTENT}

## Terminology Table
{TERMINOLOGY_TABLE}

## Correction Rules
1. Fix ASR-misrecognized technical terms
2. Fix person names and institution names
3. Remove filler words (嗯, 啊, 然后, 就是, 对吧, 这个, etc.)
4. Remove ASR hallucination text (unrelated ads, repetitions)
5. Convert spoken language to written style while keeping natural lecture tone
6. Fix punctuation (use Chinese full-width punctuation)
7. Preserve English academic terms as-is (identity crisis, bicultural identity, etc.)
8. Keep each paragraph in 1:1 correspondence with original — do NOT merge or split

## Output Format
Number each paragraph. Output corrected text only. No original text comparison needed.
```

- User can create, edit, save, delete custom templates
- Templates stored as Markdown files in `templates/` directory
- Template selector dropdown in correction step

### 3.4 Cost Preview

Before starting correction, display:

- Total subtitle entries count
- Total character count / estimated tokens
- Knowledge base token count
- Estimated API call count (based on chunking)
- Estimated total cost (based on selected model pricing)
- Estimated processing time
- **User must click "Confirm and Start" to proceed**

### 3.5 Diff View

After correction completes:

- Side-by-side view: original text (left) | corrected text (right)
- Differences highlighted (insertions in green, deletions in red, changes in yellow)
- Navigation: jump to next/previous change
- Per-entry actions:
  - Accept change (default)
  - Reject change (revert to original)
  - Edit corrected text manually
  - "Add to terminology" button for term corrections
- Bulk actions: Accept all, Reject all
- Save finalized corrected text

### Phase 3 Acceptance Criteria

- [ ] Configure Claude API and OpenAI-compatible API
- [ ] Preview cost before starting correction
- [ ] One-click correction with automatic chunking and progress display
- [ ] Interrupt and resume from last checkpoint
- [ ] Diff view with per-entry accept/reject
- [ ] Edit corrected text in diff view
- [ ] Add corrections to terminology table from diff view
- [ ] Save corrected text as `corrected.txt`

---

## Phase 4: Merge + Export + Styling

**Goal**: Merge corrected text with original timestamps, export in multiple formats, basic subtitle styling.

### 4.1 Merge Engine

- Input: `corrected.txt` (numbered paragraphs) + `original.srt` (timestamps)
- Output: `final.srt` (original timestamps + corrected text)
- Mismatch handling:
  - If corrected text has fewer entries than SRT: keep original text for unmatched entries
  - If corrected text has more entries than SRT: ignore excess and show warning
  - Display warning with details for user to review
- Merge preview: table showing (index | timestamp | original text | corrected text)
- Confirm button to generate final SRT

### 4.2 Subtitle Styling (Minimal)

Font options:

- Chinese fonts: SimSun (宋体), SimHei (黑体)
- English fonts: Times New Roman, Arial
- Font size: 12pt – 24pt, step 1pt
- Styles: Bold, Italic
- Colors: Font color (default white), Outline color (default black)
- Border: Outline mode or Opaque box mode
- Style preview panel (simulated dark background)

Implementation:

- SRT export: no styling (plain SRT for Premiere import)
- ASS export: embed styling metadata (for standalone use)
- Both formats available as export options

### 4.3 Export Options

- **SRT** (recommended): Universal format, import into Adobe Premiere
- **ASS**: Styled subtitles with font/color/border info
- **TXT**: Corrected plain text only
- **Correction Report** (Markdown): List of all changes made
- All export paths recorded in `project.yaml`

### Phase 4 Acceptance Criteria

- [ ] One-click merge corrected text with original SRT timestamps
- [ ] Merge preview with side-by-side comparison
- [ ] Handle entry count mismatches gracefully
- [ ] Configure subtitle font, size, style, color
- [ ] Export SRT (no styling)
- [ ] Export ASS (with styling)
- [ ] Export TXT (plain text)
- [ ] Export correction report (Markdown)

---

## Phase 5: Polish + Help + Build

**Goal**: Performance optimization, help system, bilingual UI, packaging.

### 5.1 Performance

- Virtual scrolling for subtitle list (react-window): required for 700+ entries
- Lazy loading for knowledge base file previews
- Debounced text editor updates

### 5.2 UI Polish

- Bilingual interface: English / 简体中文
- Keyboard shortcuts: Ctrl+S save, Ctrl+Z undo, Ctrl+E export, Ctrl+F search
- Search within subtitle list (by text content)
- Status indicators for each project (imported → extracted → corrected → merged → exported)

### 5.3 Help System

- Built-in help page (reference: Email KB Assistant USER-GUIDE.md)
- First-use onboarding walkthrough
- Tooltip hints on each functional area
- Link to user guide document

### 5.4 Build and Package

- electron-builder configuration for Windows
- NSIS installer + portable version
- API key security: Electron safeStorage (never plaintext in config)
- npm audit: 0 vulnerabilities target
- Application icon and metadata

### 5.5 CLAUDE.md Project Knowledge File

Create `CLAUDE.md` in project root containing:

- Architecture overview
- IPC four-file registration pattern
- Vite externals rules (list all native modules)
- LLM Provider system description
- Prompt assembly order: template → global KB → project KB → terminology → subtitle text
- Known issues and pitfalls
- Development rules (adding feature / fixing bug / refactoring / never do)
- Build commands

### Phase 5 Acceptance Criteria

- [ ] Subtitle list renders smoothly with 700+ entries
- [ ] Bilingual UI toggle works
- [ ] Help page accessible
- [ ] First-use onboarding shown on first launch
- [ ] Windows installer builds successfully
- [ ] Portable version builds successfully
- [ ] npm audit shows 0 vulnerabilities
- [ ] CLAUDE.md complete and accurate

---

## Key Design Decisions

| Decision | Choice | Rationale |
|:---------|:-------|:----------|
| Architecture | Electron desktop app | Reuse Email KB Assistant stack; local data storage |
| Video handling | None | Video work done in Premiere; this tool handles subtitles only |
| Data storage | Local files (YAML + MD + SRT + TXT) | Consistent with Email KB Assistant; Obsidian-compatible |
| API chunking | 80-100 entries per batch | Avoid LLM output length limits; context overlap for continuity |
| Terminology | Standalone, works offline | Useful even without API key |
| Knowledge base | Two-tier (global + project) | Personal info reused across projects; course materials per-project |
| Subtitle styling | Minimal set | Complex styling done in Premiere |
| Offline capability | Everything except AI correction | No API key = still works as SRT editor + terminology tool |
| Language support | Chinese-English mixed as default | Primary use case is bilingual academic lectures |
| Font options | SimSun, SimHei, Times New Roman, Arial | Minimal, most common; advanced styling in Premiere |

## Known Risks and Pitfalls (from Email KB Assistant)

1. **ESM/CJS conflict**: Vite + Electron module system conflicts. Follow Email KB Assistant's externals config exactly.
2. **vite-plugin-electron paths**: Built paths may break. Test with both dev and production builds early.
3. **Large list performance**: 700+ subtitle entries need virtual scrolling. Do NOT render all rows in DOM.
4. **API timeout**: Long text chunks may timeout. Set reasonable timeout (60s per chunk) and implement retry.
5. **PPTX parsing in Electron**: PPTX parser library may need to be added to vite externals.
6. **PDF parsing in Electron**: pdf-parse compatibility with Electron needs testing in Phase 2.
7. **SRT encoding diversity**: Different software exports different encodings. Parser MUST auto-detect.
8. **electron-builder symlinks**: Requires Administrator privileges for symlink creation during packaging.
9. **API key security**: Use Electron safeStorage. NEVER store in config.yaml plaintext.
10. **Chunk boundary context**: When splitting subtitles into chunks, include last 5 entries of previous chunk as overlap context to maintain continuity across chunk boundaries.
