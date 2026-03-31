import React from 'react'

export default function TitleBar() {
  return (
    <div className="h-8 flex items-center justify-between bg-black/40 select-none shrink-0"
         style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Left: app name */}
      <div className="flex items-center gap-2 px-3">
        <div className="w-5 h-5 bg-brand-primary rounded flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">C</span>
        </div>
        <span className="text-white/50 text-xs font-medium">Caption KB Assistant</span>
      </div>

      {/* Right: window controls */}
      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={() => window.electronAPI.windowMinimize()}
          className="h-8 w-12 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.windowMaximize()}
          className="h-8 w-12 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.windowClose()}
          className="h-8 w-12 flex items-center justify-center text-white/40 hover:bg-red-500 hover:text-white transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  )
}
