import React, { useState, useCallback, useEffect } from 'react'
import type { SubtitleEntry, Project } from '../../types'
import VirtualSubtitleTable, { SubtitleSearchBar } from './VirtualSubtitleTable'

interface ImportPanelProps {
  project: Project
  entries: SubtitleEntry[]
  onEntriesChange: (entries: SubtitleEntry[]) => void
  onProjectUpdate: (data: Partial<Project>) => void
  onNextStep: () => void
}

export default function ImportPanel({ project, entries, onEntriesChange, onProjectUpdate, onNextStep }: ImportPanelProps) {
  const [importing, setImporting] = useState(false)
  const [offsetMs, setOffsetMs] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [focusedMatchIndex, setFocusedMatchIndex] = useState(0)

  // Ctrl+F to toggle search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && entries.length > 0) {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [entries.length])

  const handleImport = useCallback(async () => {
    setImporting(true)
    try {
      const result = await window.electronAPI.srtImport(project.id)
      if (result) {
        onEntriesChange(result.entries)
        onProjectUpdate({ status: 'imported', originalSrtPath: result.filePath })
      }
    } catch (err) {
      console.error('Import failed:', err)
    } finally {
      setImporting(false)
    }
  }, [project.id, onEntriesChange, onProjectUpdate])

  const handleApplyOffset = useCallback(async () => {
    if (offsetMs === 0) return
    try {
      const adjusted = await window.electronAPI.srtApplyOffset(project.id, offsetMs)
      onEntriesChange(adjusted)
      setOffsetMs(0)
    } catch (err) {
      console.error('Offset failed:', err)
    }
  }, [project.id, offsetMs, onEntriesChange])

  return (
    <div className="flex flex-col h-full">
      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="drop-zone w-full max-w-md" onClick={handleImport}>
            {importing ? (
              <div className="py-4">
                <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/40 text-sm">Importing...</p>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-3 opacity-30">📄</div>
                <p className="text-white/60 text-sm font-medium mb-1">Import SRT File</p>
                <p className="text-white/30 text-xs">Click to browse or drag and drop an SRT file</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">{entries.length} entries</span>
              <button className="btn-secondary text-xs py-1 px-3" onClick={handleImport} title="Replace the current SRT file with a new one">
                Re-import
              </button>
              <button
                className={`btn-secondary text-xs py-1 px-2 ${showSearch ? 'bg-brand-primary/20 text-brand-light border-brand-primary/30' : ''}`}
                onClick={() => setShowSearch(!showSearch)}
                title="Ctrl+F"
              >
                Search
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/40">Offset (ms):</label>
              <input
                type="number"
                className="gm-input w-24 text-xs py-1"
                value={offsetMs}
                onChange={(e) => setOffsetMs(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
              <button
                className="btn-secondary text-xs py-1 px-3"
                onClick={handleApplyOffset}
                disabled={offsetMs === 0}
              >
                Apply Offset
              </button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <SubtitleSearchBar
              entries={entries}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              focusedMatchIndex={focusedMatchIndex}
              setFocusedMatchIndex={setFocusedMatchIndex}
              onClose={() => { setShowSearch(false); setSearchQuery('') }}
            />
          )}

          {/* Subtitle table */}
          <div className="flex-1 min-h-0">
            <VirtualSubtitleTable
              entries={entries}
              searchQuery={searchQuery}
              focusedMatchIndex={showSearch ? focusedMatchIndex : undefined}
              columns={[
                { key: 'index', label: '#', width: '56px', render: (e) => <span className="text-white/30 font-mono text-xs">{e.index}</span> },
                { key: 'start', label: 'Start', width: '144px', render: (e) => <span className="text-brand-light font-mono text-xs">{e.startTime}</span> },
                { key: 'end', label: 'End', width: '144px', render: (e) => <span className="text-brand-light font-mono text-xs">{e.endTime}</span> },
                { key: 'text', label: 'Text', width: 'auto', render: (e) => <span className="text-white/80">{e.text}</span> },
              ]}
            />
          </div>

          <div className="flex items-center justify-end px-4 py-3 border-t border-white/5 shrink-0">
            <button className="btn-primary" onClick={onNextStep}>
              Next: Extract Text →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
