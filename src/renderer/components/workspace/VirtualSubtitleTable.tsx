import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { List, useListRef } from 'react-window'
import type { SubtitleEntry } from '../../types'

interface Column {
  key: string
  label: string
  width: string
  render: (entry: SubtitleEntry, index: number) => React.ReactNode
}

interface VirtualSubtitleTableProps {
  entries: SubtitleEntry[]
  columns: Column[]
  rowHeight?: number
  searchQuery?: string
  /** Index of the currently focused match (0-based within matchIndices) */
  focusedMatchIndex?: number
  highlightRow?: (entry: SubtitleEntry, index: number) => boolean
}

export default function VirtualSubtitleTable({
  entries,
  columns,
  rowHeight = 40,
  searchQuery,
  focusedMatchIndex,
  highlightRow,
}: VirtualSubtitleTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(400)
  const listRef = useListRef(null)

  // Find matching entry indices (into the full entries array)
  const matchIndices = useMemo(() => {
    if (!searchQuery) return []
    const q = searchQuery.toLowerCase()
    const indices: number[] = []
    entries.forEach((e, i) => {
      if (e.text.toLowerCase().includes(q)) indices.push(i)
    })
    return indices
  }, [entries, searchQuery])

  const matchSet = useMemo(() => new Set(matchIndices), [matchIndices])

  // Scroll to focused match
  useEffect(() => {
    if (focusedMatchIndex != null && matchIndices[focusedMatchIndex] != null) {
      listRef.current?.scrollToRow({
        index: matchIndices[focusedMatchIndex],
        align: 'center',
      })
    }
  }, [focusedMatchIndex, matchIndices, listRef])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height
      if (h && h > 0) setHeight(h)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const colStyle = (col: Column): React.CSSProperties =>
    col.width === 'auto'
      ? { flex: 1, minWidth: 0 }
      : { width: col.width, minWidth: col.width, flexShrink: 0 }

  // The focused row index in the entries array
  const focusedRowIndex = focusedMatchIndex != null ? matchIndices[focusedMatchIndex] : -1

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center border-b border-white/10 bg-[#0f0f23] shrink-0">
        {columns.map(col => (
          <div key={col.key} style={colStyle(col)} className="px-3 py-2 text-xs font-medium text-white/40 uppercase tracking-wider">
            {col.label}
          </div>
        ))}
      </div>

      {/* Virtualized rows */}
      <div ref={containerRef} className="flex-1 min-h-0">
        <List
          listRef={listRef}
          rowCount={entries.length}
          rowHeight={rowHeight}
          style={{ height, width: '100%' }}
          rowProps={{} as Record<string, never>}
          rowComponent={({ index, style }: any) => {
            const entry = entries[index]
            const isMatch = searchQuery && matchSet.has(index)
            const isFocusedMatch = index === focusedRowIndex
            const highlighted = highlightRow?.(entry, index)

            let bgClass = index % 2 === 0 ? '' : 'bg-white/[0.01]'
            if (isFocusedMatch) bgClass = 'bg-brand-primary/15'
            else if (isMatch) bgClass = 'bg-yellow-500/10'
            else if (highlighted) bgClass = 'bg-yellow-500/[0.03]'

            return (
              <div
                style={style}
                className={`flex items-center border-b border-white/5 text-sm ${bgClass}`}
              >
                {columns.map(col => (
                  <div key={col.key} style={colStyle(col)} className="px-3 truncate">
                    {col.render(entry, index)}
                  </div>
                ))}
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}

/** Reusable search bar for subtitle panels */
export function SubtitleSearchBar({
  entries,
  searchQuery,
  setSearchQuery,
  focusedMatchIndex,
  setFocusedMatchIndex,
  onClose,
}: {
  entries: SubtitleEntry[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  focusedMatchIndex: number
  setFocusedMatchIndex: (i: number) => void
  onClose: () => void
}) {
  const matchCount = useMemo(() => {
    if (!searchQuery) return 0
    const q = searchQuery.toLowerCase()
    return entries.filter(e => e.text.toLowerCase().includes(q)).length
  }, [entries, searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matchCount > 0) {
        setFocusedMatchIndex(e.shiftKey
          ? (focusedMatchIndex - 1 + matchCount) % matchCount
          : (focusedMatchIndex + 1) % matchCount
        )
      }
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-[#0f0f23]/80 border-b border-white/5 shrink-0">
      <input
        autoFocus
        className="gm-input text-xs py-1 flex-1 max-w-xs"
        placeholder="Search subtitles... (Enter=next, Shift+Enter=prev)"
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setFocusedMatchIndex(0) }}
        onKeyDown={handleKeyDown}
      />
      {searchQuery && (
        <span className="text-xs text-white/40">
          {matchCount > 0
            ? `${focusedMatchIndex + 1} of ${matchCount} matches`
            : 'No matches'
          }
        </span>
      )}
      <button
        className="text-xs text-white/30 hover:text-white/60 px-1"
        onClick={onClose}
        title="Close search (Esc)"
      >
        ✕
      </button>
    </div>
  )
}
