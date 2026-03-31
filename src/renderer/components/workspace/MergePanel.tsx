import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { Project, SubtitleEntry } from '../../types'
import VirtualSubtitleTable, { SubtitleSearchBar } from './VirtualSubtitleTable'

interface MergePanelProps {
  project: Project
  onProjectUpdate: (data: Partial<Project>) => void
  onEntriesChange: (entries: SubtitleEntry[]) => void
  onNextStep: () => void
  onPrevStep: () => void
}

export default function MergePanel({ project, onProjectUpdate, onEntriesChange, onNextStep, onPrevStep }: MergePanelProps) {
  const [correctedText, setCorrectedText] = useState('')
  const [mergedEntries, setMergedEntries] = useState<SubtitleEntry[]>([])
  const [originalEntries, setOriginalEntries] = useState<SubtitleEntry[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [merged, setMerged] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedMatchIndex, setFocusedMatchIndex] = useState(0)

  // Ctrl+F to toggle search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && originalEntries.length > 0) {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [originalEntries.length])

  // Load corrected text and original entries
  useEffect(() => {
    const loadData = async () => {
      // Load corrected or extracted text
      let text = await window.electronAPI.readText(project.id, 'corrected.txt')
      if (!text) text = await window.electronAPI.readText(project.id, 'extracted.txt')
      if (text) setCorrectedText(text)

      // Load original entries for preview comparison
      try {
        const entries = await window.electronAPI.srtParse(project.id)
        setOriginalEntries(entries)
      } catch { /* no SRT yet */ }
    }
    loadData()
  }, [project.id])

  const handleMerge = useCallback(async () => {
    try {
      const result = await window.electronAPI.srtMergeText(project.id, correctedText)
      setMergedEntries(result.entries)
      setWarnings(result.warnings || [])
      setMerged(true)
      onEntriesChange(result.entries)
      onProjectUpdate({ status: 'merged' })
    } catch (err) {
      console.error('Merge failed:', err)
    }
  }, [project.id, correctedText, onEntriesChange, onProjectUpdate])

  // Parse corrected text into a map for side-by-side display
  // Handle both \n and \n\n separated entries from LLM output
  const correctedMap = new Map<number, string>()
  for (const line of correctedText.trim().split(/\n/)) {
    const match = line.match(/^(\d+):\s*(.*)/)
    if (match) correctedMap.set(parseInt(match[1]), match[2].trim())
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white">Merge Corrected Text with Timestamps</h3>
          {merged && <span className="badge badge-merged">Merged</span>}
          <button
            className={`btn-secondary text-xs py-1 px-2 ${showSearch ? 'bg-brand-primary/20 text-brand-light border-brand-primary/30' : ''}`}
            onClick={() => setShowSearch(!showSearch)}
            title="Ctrl+F"
          >
            Search
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary text-xs py-1 px-3" onClick={handleMerge}>
            {merged ? 'Re-merge' : 'Merge Now'}
          </button>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-400">{w}</p>
          ))}
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <SubtitleSearchBar
          entries={originalEntries}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          focusedMatchIndex={focusedMatchIndex}
          setFocusedMatchIndex={setFocusedMatchIndex}
          onClose={() => { setShowSearch(false); setSearchQuery('') }}
        />
      )}

      {/* Side-by-side merge preview — virtualized */}
      <div className="flex-1 min-h-0">
        {originalEntries.length > 0 ? (
          <VirtualSubtitleTable
            entries={originalEntries}
            rowHeight={44}
            searchQuery={searchQuery}
            focusedMatchIndex={showSearch ? focusedMatchIndex : undefined}
            highlightRow={(entry, i) => {
              const corrected = correctedMap.get(i + 1) ?? ''
              return !!(corrected && corrected !== entry.text)
            }}
            columns={[
              { key: 'index', label: '#', width: '48px', render: (e) => <span className="text-white/30 font-mono text-xs">{e.index}</span> },
              { key: 'time', label: 'Timestamp', width: '144px', render: (e) => <span className="text-brand-light font-mono text-[10px] leading-relaxed">{e.startTime} {e.endTime}</span> },
              { key: 'original', label: 'Original', width: '35%', render: (e, i) => {
                const corrected = correctedMap.get(i + 1) ?? ''
                const changed = corrected && corrected !== e.text
                return <span className={`text-sm ${changed ? 'text-red-300/60' : 'text-white/60'}`}>{e.text}</span>
              }},
              { key: 'corrected', label: 'Corrected', width: '35%', render: (e, i) => {
                const corrected = correctedMap.get(i + 1) ?? ''
                const changed = corrected && corrected !== e.text
                const mergedText = merged ? (mergedEntries[i]?.text ?? e.text) : ''
                return <span className={`text-sm ${changed ? 'text-green-300/80' : 'text-white/60'}`}>{merged ? mergedText : (corrected || e.text)}</span>
              }},
            ]}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/20 text-sm">Import an SRT file first to see the merge preview</p>
          </div>
        )}
      </div>

      {/* Editable corrected text (collapsible) */}
      <details className="border-t border-white/5">
        <summary className="px-4 py-2 text-xs text-white/40 cursor-pointer hover:text-white/60">
          Edit corrected text manually
        </summary>
        <div className="px-4 pb-3">
          <textarea
            className="gm-input w-full h-40 font-mono text-xs resize-vertical"
            value={correctedText}
            onChange={(e) => {
              const val = e.target.value
              setCorrectedText(val)
              setMerged(false)
              if (debounceRef.current) clearTimeout(debounceRef.current)
              debounceRef.current = setTimeout(() => {
                window.electronAPI.saveText(project.id, 'corrected.txt', val).catch(() => {})
              }, 1000)
            }}
            spellCheck={false}
          />
        </div>
      </details>

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
        <button className="btn-secondary" onClick={onPrevStep}>← Correct</button>
        <button className="btn-primary" onClick={onNextStep} disabled={!merged}>
          Next: Export →
        </button>
      </div>
    </div>
  )
}
