# Caption KB Assistant

AI-powered desktop tool for correcting and polishing ASR-generated subtitle files using knowledge bases.

Built for academic lecture videos with mixed Chinese-English content. Import subtitle files from Adobe Premiere or other tools, correct them with AI + domain knowledge, export high-quality subtitle files.

## The Problem

Auto-generated subtitles for Chinese academic lectures are full of errors — misspelled terms, wrong proper nouns, garbled English vocabulary, filler words, and ASR hallucinations. Manual correction of a 60-minute lecture takes hours. Professional subtitle services cost hundreds of dollars per video.

## The Solution

Caption KB Assistant uses AI (Claude API / OpenAI-compatible API) combined with your own knowledge base (lecture slides, posters, terminology lists) to automatically correct subtitle text. A 60-minute lecture costs ~$0.30–0.50 in API fees and takes 3–5 minutes to process.

## Features

- **SRT Import/Export**: Import subtitle files from Adobe Premiere, Subtitle Edit, CapCut, or any SRT-compatible tool
- **Plain Text Extraction**: Extract text from SRT for editing or external processing
- **Two-Tier Knowledge Base**:
  - *Global KB*: Personal profile, institution info, research area — reused across all projects
  - *Project KB*: Lecture-specific materials (PDF, PPTX, DOCX, TXT) — per video
- **Terminology Table**: Maintain a growing list of ASR error → correct term mappings; works offline without API
- **AI Correction with Two Modes**:
  - *Basic*: Fix typos, correct terminology and proper nouns from knowledge base only
  - *Advanced*: Full polish — remove filler words, rewrite for fluency, improve logical flow
- **Automatic Chunking**: Handles long lectures (27,000+ characters) by splitting into batches with context overlap
- **Diff View**: Side-by-side comparison of original vs. corrected text with accept/reject per entry
- **Timing Offset Adjustment**: Fix systematic time drift in exported SRT files
- **Subtitle Styling**: Basic font, size, color, and border settings (Chinese: SimSun/SimHei; English: Times New Roman/Arial)
- **Multiple Export Formats**: SRT, ASS (with styling), TXT, Markdown correction report
- **Multi-LLM Support**: Claude API (primary), OpenAI-compatible API (secondary)
- **Fully Local Data**: All files stored locally — nothing uploaded to cloud except API calls
- **Bilingual UI**: English / 简体中文

## Workflow

```
Adobe Premiere (generate ASR subtitles)
        ↓ Export SRT
Caption KB Assistant (AI-powered correction)
        ↓ Export corrected SRT
Adobe Premiere (import corrected SRT, adjust styling, export video)
```

### Inside Caption KB Assistant:

```
Step 1: Import    → Load SRT file, view subtitle list, adjust timing
Step 2: Extract   → Extract plain text for review and editing
Step 3: Knowledge → Upload lecture materials (PDF, PPTX, DOCX)
Step 4: Correct   → AI correction with cost preview, diff view, accept/reject
Step 5: Merge     → Combine corrected text with original timestamps
Step 6: Export    → Download SRT/ASS/TXT files
```

## Installation

### Option 1: Installer (Recommended)

Download `Caption KB Assistant Setup x.x.x.exe` from [Releases](https://github.com/dlwby1985/caption-kb-assistant/releases). Run the installer and follow the prompts.

### Option 2: Portable

Download `Caption KB Assistant x.x.x.exe` from [Releases](https://github.com/dlwby1985/caption-kb-assistant/releases). No installation needed — just run the exe.

## Quick Start

1. **Open the app** and go to **Settings**
2. **Set your data folder** — where project files will be stored
3. **Enter your API key** — Claude API key (get one from [Anthropic Console](https://console.anthropic.com/))
4. **Go to Global KB** — fill in your personal profile (name, institution, research area)
5. **Create a new project** — import an SRT file from Adobe Premiere
6. **Upload knowledge base** — add lecture poster, slides, or scripts
7. **Run AI correction** — choose Basic or Advanced mode
8. **Review the diff** — accept, reject, or edit changes
9. **Merge and export** — download the corrected SRT file
10. **Import back into Premiere** — File → Import → select the corrected SRT

## Tech Stack

- **Platform**: Electron (Windows)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **AI**: Claude API, OpenAI-compatible API
- **Storage**: Local files (YAML, Markdown, SRT, TXT)
- **Build**: electron-builder (NSIS + portable)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Package for Windows
npx electron-builder --win --x64
```

## Background

This project grew out of a real need: producing Chinese subtitles for academic lecture videos at Arizona State University. After testing five different auto-captioning tools (Camtasia, Adobe Premiere, CapCut English, CapCut Chinese, Subtitle Edit + Whisper) on the same 60-minute lecture, we found that:

- No single tool produced usable Chinese subtitles out of the box
- English academic terms mixed into Chinese speech were consistently garbled
- Proper nouns (researcher names, university names) were almost always wrong
- AI correction using knowledge base context (lecture slides, posters) dramatically improved accuracy

This tool automates the correction workflow that was previously done manually in Claude's chat interface.

## Related Project

- [Email KB Assistant](https://github.com/dlwby1985/email-kb-assistant) — AI-powered email drafting tool with knowledge base, built with the same tech stack

## License

[MIT](LICENSE)
