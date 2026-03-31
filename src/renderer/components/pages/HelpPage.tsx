import React from 'react'

export default function HelpPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Help</h1>

      <div className="space-y-4 max-w-2xl">
        <div className="gm-panel p-4">
          <h3 className="text-sm font-medium text-white mb-2">Getting Started</h3>
          <ol className="text-xs text-white/60 space-y-2 list-decimal list-inside">
            <li>Create a new project from the Projects tab</li>
            <li>Import an SRT file (from Adobe Premiere, Subtitle Edit, etc.)</li>
            <li>Extract plain text from the subtitle entries</li>
            <li>Edit the text in-app or download, edit externally, and re-upload</li>
            <li>Merge corrected text back with original timestamps</li>
            <li>Export the final SRT file</li>
          </ol>
        </div>

        <div className="gm-panel p-4">
          <h3 className="text-sm font-medium text-white mb-2">Workflow Steps</h3>
          <div className="text-xs text-white/60 space-y-2">
            <p><strong className="text-white/80">Step 1 — Import:</strong> Load an SRT file. View subtitle list with timestamps. Adjust timing offset if needed.</p>
            <p><strong className="text-white/80">Step 2 — Extract:</strong> Extract plain text from subtitles. Edit in the built-in editor.</p>
            <p><strong className="text-white/80">Step 3 — Knowledge:</strong> (Phase 2) Upload reference files for AI correction context.</p>
            <p><strong className="text-white/80">Step 4 — Correct:</strong> (Phase 3) AI-powered correction using knowledge base.</p>
            <p><strong className="text-white/80">Step 5 — Merge:</strong> Merge corrected text back with original SRT timestamps.</p>
            <p><strong className="text-white/80">Step 6 — Export:</strong> Export as SRT, ASS, or plain text.</p>
          </div>
        </div>

        <div className="gm-panel p-4">
          <h3 className="text-sm font-medium text-white mb-2">Timing Offset</h3>
          <p className="text-xs text-white/60">
            Enter a positive or negative millisecond value to shift all subtitle timestamps.
            This is useful when the SRT file is slightly out of sync with the video.
          </p>
        </div>

        <div className="gm-panel p-4">
          <h3 className="text-sm font-medium text-white mb-2">Keyboard Shortcuts</h3>
          <div className="text-xs text-white/60 space-y-1">
            <p><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70 font-mono text-[10px]">Ctrl+Shift+I</kbd> — Toggle Developer Tools</p>
            <p><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70 font-mono text-[10px]">F11</kbd> — Toggle Fullscreen</p>
          </div>
        </div>
      </div>
    </div>
  )
}
