import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { Project } from '../../types'

interface ExtractPanelProps {
  project: Project
  onProjectUpdate: (data: Partial<Project>) => void
  onNextStep: () => void
  onPrevStep: () => void
}

export default function ExtractPanel({ project, onProjectUpdate, onNextStep, onPrevStep }: ExtractPanelProps) {
  const [text, setText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [srtEntryCount, setSrtEntryCount] = useState<number | null>(null)
  const [countMismatchWarning, setCountMismatchWarning] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedMatchIndex, setFocusedMatchIndex] = useState(0)

  // Compute matches
  const matchPositions = useMemo(() => {
    if (!searchQuery || !text) return []
    const q = searchQuery.toLowerCase()
    const positions: number[] = []
    let idx = text.toLowerCase().indexOf(q)
    while (idx !== -1) {
      positions.push(idx)
      idx = text.toLowerCase().indexOf(q, idx + 1)
    }
    return positions
  }, [text, searchQuery])

  // Ctrl+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && text) {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [text])

  // Scroll textarea to focused match
  useEffect(() => {
    if (!textareaRef.current || matchPositions.length === 0 || focusedMatchIndex >= matchPositions.length) return
    const pos = matchPositions[focusedMatchIndex]
    const ta = textareaRef.current
    ta.focus()
    ta.setSelectionRange(pos, pos + searchQuery.length)
    // Approximate scroll: find line number
    const linesBeforeMatch = text.substring(0, pos).split('\n').length - 1
    const lineHeight = 20 // approximate
    ta.scrollTop = Math.max(0, linesBeforeMatch * lineHeight - ta.clientHeight / 2)
  }, [focusedMatchIndex, matchPositions, searchQuery, text])

  // Load existing extracted text if available
  useEffect(() => {
    if (project.extractedTextPath) {
      window.electronAPI.readText(project.id, 'extracted.txt')
        .then((content) => { if (content) setText(content) })
        .catch(() => {})
    }
  }, [project.id, project.extractedTextPath])

  const handleExtract = useCallback(async () => {
    setExtracting(true)
    setCountMismatchWarning('')
    try {
      const result = await window.electronAPI.srtExtractText(project.id)
      setText(result.text)
      setSrtEntryCount(result.srtEntryCount)
      // Count extracted paragraphs (numbered lines like "N: text")
      const extractedCount = result.text.trim().split(/\n\n+/).filter(b => /^\d+:/.test(b.trim())).length
      if (extractedCount !== result.srtEntryCount) {
        setCountMismatchWarning(`WARNING: SRT has ${result.srtEntryCount} entries but extracted text has ${extractedCount} paragraphs. Index alignment may be broken.`)
      }
      onProjectUpdate({ status: 'extracted' })
    } catch (err) {
      console.error('Extract failed:', err)
    } finally {
      setExtracting(false)
    }
  }, [project.id, onProjectUpdate])

  const handleSave = useCallback(async () => {
    try {
      await window.electronAPI.saveText(project.id, 'extracted.txt', text)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save failed:', err)
    }
  }, [project.id, text])

  const handleDownload = useCallback(async () => {
    await window.electronAPI.saveText(project.id, 'extracted.txt', text)
    const dataFolder = await window.electronAPI.getDataFolder()
    window.electronAPI.openInExplorer(`${dataFolder}/projects/${project.id}/extracted.txt`)
  }, [project.id, text])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearch(false)
      setSearchQuery('')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matchPositions.length > 0) {
        setFocusedMatchIndex(e.shiftKey
          ? (focusedMatchIndex - 1 + matchPositions.length) % matchPositions.length
          : (focusedMatchIndex + 1) % matchPositions.length
        )
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="btn-primary text-xs py-1 px-3"
            onClick={handleExtract}
            disabled={extracting}
          >
            {extracting ? 'Extracting...' : 'Extract Text from SRT'}
          </button>
          {text && (
            <>
              <button className="btn-secondary text-xs py-1 px-3" onClick={handleSave}>
                {saved ? '✓ Saved' : 'Save'}
              </button>
              <button className="btn-secondary text-xs py-1 px-3" onClick={handleDownload}>
                Open in Explorer
              </button>
              <button
                className={`btn-secondary text-xs py-1 px-2 ${showSearch ? 'bg-brand-primary/20 text-brand-light border-brand-primary/30' : ''}`}
                onClick={() => setShowSearch(!showSearch)}
                title="Ctrl+F"
              >
                Search
              </button>
            </>
          )}
        </div>
        <span className="text-xs text-white/30">
          {text
            ? srtEntryCount != null
              ? `SRT entries: ${srtEntryCount} | Extracted paragraphs: ${text.trim().split(/\n\n+/).filter(b => /^\d+:/.test(b.trim())).length}`
              : `${text.trim().split(/\n\n+/).filter(b => /^\d+:/.test(b.trim())).length} paragraphs`
            : 'No text extracted'}
        </span>
      </div>

      {/* Count mismatch warning */}
      {countMismatchWarning && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
          <p className="text-xs text-red-400">{countMismatchWarning}</p>
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[#0f0f23]/80 border-b border-white/5 shrink-0">
          <input
            autoFocus
            className="gm-input text-xs py-1 flex-1 max-w-xs"
            placeholder="Search text... (Enter=next, Shift+Enter=prev)"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setFocusedMatchIndex(0) }}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <span className="text-xs text-white/40">
              {matchPositions.length > 0
                ? `${focusedMatchIndex + 1} of ${matchPositions.length} matches`
                : 'No matches'
              }
            </span>
          )}
          <button
            className="text-xs text-white/30 hover:text-white/60 px-1"
            onClick={() => { setShowSearch(false); setSearchQuery('') }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Text editor */}
      <div className="flex-1 overflow-hidden p-4">
        {text ? (
          <textarea
            ref={textareaRef}
            className="gm-input w-full h-full font-mono text-sm resize-none"
            value={text}
            onChange={(e) => {
              const val = e.target.value
              setText(val)
              setSaved(false)
              if (debounceRef.current) clearTimeout(debounceRef.current)
              debounceRef.current = setTimeout(() => {
                window.electronAPI.saveText(project.id, 'extracted.txt', val)
                  .then(() => setSaved(true))
                  .catch(() => {})
              }, 1000)
            }}
            spellCheck={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-white/30 text-sm mb-2">No text extracted yet</p>
              <p className="text-white/20 text-xs">Click "Extract Text from SRT" to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 shrink-0">
        <button className="btn-secondary" onClick={onPrevStep}>← Import</button>
        <button className="btn-primary" onClick={onNextStep}>
          Next: Knowledge Base →
        </button>
      </div>
    </div>
  )
}
