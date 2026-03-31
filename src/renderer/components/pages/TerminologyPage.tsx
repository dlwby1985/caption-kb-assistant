import React, { useState, useEffect, useCallback } from 'react'
import type { TermCorrection } from '../../types'

export default function TerminologyPage() {
  const [entries, setEntries] = useState<TermCorrection[]>([])
  const [loading, setLoading] = useState(true)

  // New entry form
  const [newWrong, setNewWrong] = useState('')
  const [newCorrect, setNewCorrect] = useState('')
  const [newNote, setNewNote] = useState('')

  // Edit state
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editWrong, setEditWrong] = useState('')
  const [editCorrect, setEditCorrect] = useState('')
  const [editNote, setEditNote] = useState('')

  // Test/apply state
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState('')
  const [replacements, setReplacements] = useState<Array<{ wrong: string; correct: string; count: number }>>([])
  const [showTest, setShowTest] = useState(false)

  const loadEntries = useCallback(async () => {
    try {
      const list = await window.electronAPI.terminologyList()
      setEntries(list)
    } catch (err) {
      console.error('Failed to load terminology:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  const handleAdd = useCallback(async () => {
    if (!newWrong.trim() || !newCorrect.trim()) return
    const updated = await window.electronAPI.terminologyAdd({
      wrong: newWrong.trim(),
      correct: newCorrect.trim(),
      note: newNote.trim() || undefined,
    })
    setEntries(updated)
    setNewWrong('')
    setNewCorrect('')
    setNewNote('')
  }, [newWrong, newCorrect, newNote])

  const handleStartEdit = useCallback((index: number) => {
    const entry = entries[index]
    setEditIndex(index)
    setEditWrong(entry.wrong)
    setEditCorrect(entry.correct)
    setEditNote(entry.note || '')
  }, [entries])

  const handleSaveEdit = useCallback(async () => {
    if (editIndex === null) return
    const updated = await window.electronAPI.terminologyUpdate(editIndex, {
      wrong: editWrong.trim(),
      correct: editCorrect.trim(),
      note: editNote.trim() || undefined,
    })
    setEntries(updated)
    setEditIndex(null)
  }, [editIndex, editWrong, editCorrect, editNote])

  const handleDelete = useCallback(async (index: number) => {
    if (!confirm('Delete this entry?')) return
    const updated = await window.electronAPI.terminologyDelete(index)
    setEntries(updated)
    if (editIndex === index) setEditIndex(null)
  }, [editIndex])

  const handleExportCsv = useCallback(async () => {
    const filePath = await window.electronAPI.terminologyExportCsv()
    if (filePath) alert(`Exported to: ${filePath}`)
  }, [])

  const handleImportCsv = useCallback(async () => {
    const imported = await window.electronAPI.terminologyImportCsv()
    if (imported) setEntries(imported)
  }, [])

  const handleTestApply = useCallback(async () => {
    if (!testText.trim()) return
    const result = await window.electronAPI.terminologyApply(testText)
    setTestResult(result.result)
    setReplacements(result.replacements)
  }, [testText])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Terminology Table</h1>
          <p className="text-sm text-white/40 mt-1">{entries.length} entries — offline auto-replacement for subtitle correction</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs" onClick={handleImportCsv}>Import CSV</button>
          <button className="btn-secondary text-xs" onClick={handleExportCsv}>Export CSV</button>
          <button
            className={`btn-secondary text-xs ${showTest ? 'bg-brand-primary/20 text-brand-light' : ''}`}
            onClick={() => setShowTest(!showTest)}
          >
            Test Replace
          </button>
        </div>
      </div>

      {/* Test/Apply Panel */}
      {showTest && (
        <div className="gm-panel p-4 mb-4 animate-fade-in">
          <h3 className="text-sm font-medium text-white mb-3">Test Terminology Replacement</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-white/40 mb-1">Input Text</label>
              <textarea
                className="gm-input w-full h-32 font-mono text-sm resize-none"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Paste text here to test terminology replacement..."
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-white/40 mb-1">Result</label>
              <textarea
                className="gm-input w-full h-32 font-mono text-sm resize-none"
                value={testResult}
                readOnly
                placeholder="Corrected text will appear here..."
              />
            </div>
          </div>
          {replacements.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {replacements.map((r, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400">
                  "{r.wrong}" → "{r.correct}" ({r.count}x)
                </span>
              ))}
            </div>
          )}
          <div className="mt-3">
            <button className="btn-primary text-xs" onClick={handleTestApply}>Apply</button>
          </div>
        </div>
      )}

      {/* Add new entry */}
      <div className="gm-panel p-4 mb-4">
        <h3 className="text-xs font-medium text-white/50 mb-2">Add New Entry</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-white/30 mb-1">Wrong Term</label>
            <input
              className="gm-input w-full text-sm"
              value={newWrong}
              onChange={(e) => setNewWrong(e.target.value)}
              placeholder="e.g., 认同危机"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-white/30 mb-1">Correct Term</label>
            <input
              className="gm-input w-full text-sm"
              value={newCorrect}
              onChange={(e) => setNewCorrect(e.target.value)}
              placeholder="e.g., identity crisis"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="w-48">
            <label className="block text-xs text-white/30 mb-1">Note (optional)</label>
            <input
              className="gm-input w-full text-sm"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="context..."
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button className="btn-primary text-sm py-2" onClick={handleAdd}>Add</button>
        </div>
      </div>

      {/* Terminology table */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/20 text-sm">No entries yet</p>
          <p className="text-white/10 text-xs mt-1">Add terms above or import from CSV</p>
        </div>
      ) : (
        <div className="gm-panel">
          <table className="gm-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Wrong Term</th>
                <th>Correct Term</th>
                <th>Note</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={i}>
                  {editIndex === i ? (
                    <>
                      <td className="text-white/30 text-xs">{i + 1}</td>
                      <td>
                        <input className="gm-input w-full text-sm py-1" value={editWrong}
                          onChange={(e) => setEditWrong(e.target.value)} autoFocus />
                      </td>
                      <td>
                        <input className="gm-input w-full text-sm py-1" value={editCorrect}
                          onChange={(e) => setEditCorrect(e.target.value)} />
                      </td>
                      <td>
                        <input className="gm-input w-full text-sm py-1" value={editNote}
                          onChange={(e) => setEditNote(e.target.value)} />
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button className="text-xs text-green-400 hover:text-green-300" onClick={handleSaveEdit}>Save</button>
                          <button className="text-xs text-white/30 hover:text-white/50" onClick={() => setEditIndex(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-white/30 text-xs">{i + 1}</td>
                      <td className="text-red-300/70">{entry.wrong}</td>
                      <td className="text-green-300/70">{entry.correct}</td>
                      <td className="text-white/30 text-xs">{entry.note || ''}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="text-xs text-white/30 hover:text-white/60" onClick={() => handleStartEdit(i)}>Edit</button>
                          <button className="text-xs text-white/20 hover:text-red-400" onClick={() => handleDelete(i)}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
