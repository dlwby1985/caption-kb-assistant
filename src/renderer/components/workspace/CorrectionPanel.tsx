import React, { useState, useEffect, useCallback } from 'react'
import type { Project, LLMConfig, PromptTemplate, CostPreview, CorrectionProgress } from '../../types'

type ViewMode = 'setup' | 'running' | 'diff'

interface DiffEntry {
  index: number
  original: string
  corrected: string
  accepted: boolean
  edited: boolean
}

interface CorrectionPanelProps {
  project: Project
  onProjectUpdate: (data: Partial<Project>) => void
  onNextStep: () => void
  onPrevStep: () => void
}

export default function CorrectionPanel({ project, onProjectUpdate, onNextStep, onPrevStep }: CorrectionPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('setup')
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('basic-terminology-error-correction')
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null)
  const [costPreview, setCostPreview] = useState<CostPreview | null>(null)
  const [progress, setProgress] = useState<CorrectionProgress | null>(null)
  const [correctedText, setCorrectedText] = useState('')
  const [diffEntries, setDiffEntries] = useState<DiffEntry[]>([])
  const [error, setError] = useState('')
  const [hasCheckpoint, setHasCheckpoint] = useState(false)
  const [loading, setLoading] = useState(false)

  // Template management state
  const [showTemplateContent, setShowTemplateContent] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [editTemplateContent, setEditTemplateContent] = useState('')
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')

  // Load config and templates
  useEffect(() => {
    const load = async () => {
      try {
        const [templateList, config, checkpoint] = await Promise.all([
          window.electronAPI.templatesList(),
          window.electronAPI.configRead(),
          window.electronAPI.correctionHasCheckpoint(project.id),
        ])
        setTemplates(templateList)
        setLlmConfig(config.llm ?? { activeProvider: 'claude', claude: { model: 'claude-sonnet-4-20250514' } })
        setHasCheckpoint(checkpoint)

        // If already corrected, load diff view
        const corrected = await window.electronAPI.readText(project.id, 'corrected.txt')
        if (corrected && project.status === 'corrected') {
          setCorrectedText(corrected)
          await buildDiff(corrected)
          setViewMode('diff')
        }
      } catch (err) {
        console.error('Failed to load correction config:', err)
      }
    }
    load()
  }, [project.id, project.status])

  // Listen for progress events
  useEffect(() => {
    window.electronAPI.onCorrectionProgress((prog: CorrectionProgress) => {
      setProgress(prog)
      if (prog.status === 'completed') {
        setViewMode('diff')
      }
    })
    return () => {
      window.electronAPI.removeCorrectionProgress()
    }
  }, [])

  const buildDiff = useCallback(async (text: string) => {
    // Load original extracted text for comparison
    const original = await window.electronAPI.readText(project.id, 'extracted.txt')
    if (!original) return

    // Parse original: each block is "N: text", separated by \n\n
    const origMap = new Map<number, string>()
    for (const block of original.trim().split(/\n\n+/)) {
      const match = block.match(/^(\d+):\s*([\s\S]*)/)
      if (match) origMap.set(parseInt(match[1]), match[2].trim())
    }

    // Parse corrected: LLM may return entries separated by \n or \n\n
    // Split every "N: text" line regardless of newline style
    const corrMap = new Map<number, string>()
    const corrLines = text.trim().split(/\n/)
    for (const line of corrLines) {
      const match = line.match(/^(\d+):\s*(.*)/)
      if (match) corrMap.set(parseInt(match[1]), match[2].trim())
    }

    // Build diff entries aligned by number
    const maxIndex = Math.max(
      ...[...origMap.keys()],
      ...[...corrMap.keys()],
    )
    const entries: DiffEntry[] = []
    for (let i = 1; i <= maxIndex; i++) {
      const origText = origMap.get(i) ?? ''
      const corrText = corrMap.get(i) ?? origText
      entries.push({
        index: i,
        original: origText,
        corrected: corrText,
        accepted: true,
        edited: false,
      })
    }
    setDiffEntries(entries)
  }, [project.id])

  // Get the currently selected template object
  const currentTemplate = templates.find(t => t.slug === selectedTemplate)

  const reloadTemplates = useCallback(async () => {
    const list = await window.electronAPI.templatesList()
    setTemplates(list)
  }, [])

  const handleEditTemplate = useCallback(() => {
    if (!currentTemplate) return
    setEditTemplateContent(currentTemplate.content)
    setEditingTemplate(true)
  }, [currentTemplate])

  const handleSaveTemplate = useCallback(async () => {
    if (!currentTemplate) return
    await window.electronAPI.templatesSave(currentTemplate.name, editTemplateContent)
    setEditingTemplate(false)
    await reloadTemplates()
  }, [currentTemplate, editTemplateContent, reloadTemplates])

  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) return
    const saved = await window.electronAPI.templatesSave(newTemplateName.trim(), newTemplateContent || 'Enter your prompt template here...')
    setShowNewTemplate(false)
    setNewTemplateName('')
    setNewTemplateContent('')
    await reloadTemplates()
    setSelectedTemplate(saved.slug)
  }, [newTemplateName, newTemplateContent, reloadTemplates])

  const handleDeleteTemplate = useCallback(async () => {
    if (!currentTemplate || currentTemplate.slug === 'basic-terminology-error-correction' || currentTemplate.slug === 'advanced-full-polish-rewriting') return
    if (!confirm(`Delete template "${currentTemplate.name}"?`)) return
    await window.electronAPI.templatesDelete(currentTemplate.slug)
    setSelectedTemplate('basic-terminology-error-correction')
    await reloadTemplates()
  }, [currentTemplate, reloadTemplates])

  const handlePreviewCost = useCallback(async () => {
    if (!llmConfig) return
    setLoading(true)
    setError('')
    try {
      const preview = await window.electronAPI.correctionPreviewCost(project.id, llmConfig, selectedTemplate)
      setCostPreview(preview)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [project.id, llmConfig, selectedTemplate])

  const handleStartCorrection = useCallback(async () => {
    if (!llmConfig) return
    setViewMode('running')
    setError('')
    setProgress({ totalChunks: 0, completedChunks: 0, currentChunk: 0, status: 'running' })
    try {
      const result = await window.electronAPI.correctionRun(project.id, llmConfig, selectedTemplate)
      setCorrectedText(result)
      await buildDiff(result)
      onProjectUpdate({ status: 'corrected' })
      setViewMode('diff')
    } catch (err: any) {
      setError(err.message)
      setViewMode('setup')
    }
  }, [project.id, llmConfig, selectedTemplate, buildDiff, onProjectUpdate])

  const handleAbort = useCallback(() => {
    window.electronAPI.correctionAbort()
  }, [])

  const handleAcceptAll = useCallback(() => {
    setDiffEntries(prev => prev.map(e => ({ ...e, accepted: true })))
  }, [])

  const handleRejectAll = useCallback(() => {
    setDiffEntries(prev => prev.map(e => ({ ...e, accepted: false })))
  }, [])

  const handleToggleEntry = useCallback((index: number) => {
    setDiffEntries(prev => prev.map(e =>
      e.index === index ? { ...e, accepted: !e.accepted } : e
    ))
  }, [])

  const handleEditEntry = useCallback((index: number, newText: string) => {
    setDiffEntries(prev => prev.map(e =>
      e.index === index ? { ...e, corrected: newText, edited: true } : e
    ))
  }, [])

  const handleAddToTerminology = useCallback(async (wrong: string, correct: string) => {
    await window.electronAPI.terminologyAdd({ wrong, correct })
  }, [])

  const handleSaveCorrected = useCallback(async () => {
    // Build final corrected text from accepted entries
    const lines = diffEntries.map(e => {
      const text = e.accepted ? e.corrected : e.original
      return `${e.index}: ${text}`
    })
    const finalText = lines.join('\n\n') + '\n'
    await window.electronAPI.saveText(project.id, 'corrected.txt', finalText)
    setCorrectedText(finalText)
    onProjectUpdate({ status: 'corrected' })
  }, [diffEntries, project.id, onProjectUpdate])

  // === SETUP VIEW ===
  if (viewMode === 'setup') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-lg font-semibold text-white mb-4">AI Correction</h2>

          {/* Template selector + management */}
          <div className="gm-panel p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-white/40">Prompt Template</label>
              <div className="flex items-center gap-1">
                <button
                  className="text-xs text-brand-light/60 hover:text-brand-light px-2 py-0.5"
                  onClick={() => setShowNewTemplate(true)}
                  title="Create a new prompt template"
                >
                  + New
                </button>
                {currentTemplate && currentTemplate.slug !== 'basic-terminology-error-correction' && currentTemplate.slug !== 'advanced-full-polish-rewriting' && (
                  <button
                    className="text-xs text-red-400/60 hover:text-red-400 px-2 py-0.5"
                    onClick={handleDeleteTemplate}
                    title="Delete this template"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <select
              className="gm-input w-full mb-2"
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value)
                setShowTemplateContent(false)
                setEditingTemplate(false)
              }}
            >
              {templates.map(t => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>

            {/* Template content toggle */}
            <div className="flex items-center gap-2">
              <button
                className="text-xs text-white/40 hover:text-white/60"
                onClick={() => { setShowTemplateContent(!showTemplateContent); setEditingTemplate(false) }}
              >
                {showTemplateContent ? '▼ Hide Template Content' : '▶ Show Template Content'}
              </button>
              {showTemplateContent && !editingTemplate && (
                <button
                  className="text-xs text-brand-light/60 hover:text-brand-light"
                  onClick={handleEditTemplate}
                >
                  Edit
                </button>
              )}
            </div>

            {/* Template content display */}
            {showTemplateContent && currentTemplate && !editingTemplate && (
              <pre className="mt-2 p-3 rounded-lg bg-black/30 text-xs text-white/50 font-mono whitespace-pre-wrap max-h-60 overflow-auto border border-white/5">
                {currentTemplate.content}
              </pre>
            )}

            {/* Template editing */}
            {editingTemplate && (
              <div className="mt-2">
                <textarea
                  className="gm-input w-full h-60 font-mono text-xs resize-vertical"
                  value={editTemplateContent}
                  onChange={(e) => setEditTemplateContent(e.target.value)}
                  spellCheck={false}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button className="btn-secondary text-xs" onClick={() => setEditingTemplate(false)}>Cancel</button>
                  <button className="btn-primary text-xs" onClick={handleSaveTemplate}>Save Template</button>
                </div>
              </div>
            )}

            {/* New template dialog */}
            {showNewTemplate && (
              <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                <label className="block text-xs text-white/40 mb-1">Template Name</label>
                <input
                  className="gm-input w-full mb-2 text-xs"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Technical Documentation"
                  autoFocus
                />
                <label className="block text-xs text-white/40 mb-1">Template Content</label>
                <textarea
                  className="gm-input w-full h-40 font-mono text-xs resize-vertical"
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder={'Use placeholders:\n{GLOBAL_KB_CONTENT}\n{PROJECT_KB_CONTENT}\n{TERMINOLOGY_TABLE}'}
                  spellCheck={false}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button className="btn-secondary text-xs" onClick={() => setShowNewTemplate(false)}>Cancel</button>
                  <button className="btn-primary text-xs" onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>Create Template</button>
                </div>
              </div>
            )}
          </div>

          {/* Provider info */}
          {llmConfig && (
            <div className="gm-panel p-4 mb-4">
              <p className="text-xs text-white/40">Active Provider</p>
              <p className="text-sm text-white mt-1">
                {llmConfig.activeProvider === 'claude'
                  ? `Claude — ${llmConfig.claude?.model ?? 'claude-sonnet-4-20250514'}`
                  : `${llmConfig.openai?.providerName ?? 'OpenAI-Compatible'} — ${llmConfig.openai?.model ?? ''}`
                }
              </p>
              <p className="text-xs text-white/20 mt-1">Configure in Settings tab</p>
            </div>
          )}

          {/* Resume checkpoint */}
          {hasCheckpoint && (
            <div className="gm-panel p-4 mb-4 border-yellow-500/20 bg-yellow-500/5">
              <p className="text-sm text-yellow-400 font-medium">Checkpoint found</p>
              <p className="text-xs text-white/40 mt-1">A previous correction was interrupted. You can resume or start fresh.</p>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary text-xs" onClick={handleStartCorrection}>Resume</button>
                <button className="btn-secondary text-xs" onClick={async () => {
                  await window.electronAPI.correctionClearCheckpoint(project.id)
                  setHasCheckpoint(false)
                }}>Start Fresh</button>
              </div>
            </div>
          )}

          {/* Preview button */}
          <button
            className="btn-primary mb-4"
            onClick={handlePreviewCost}
            disabled={loading}
          >
            {loading ? 'Calculating...' : 'Preview Cost'}
          </button>

          {/* Cost preview */}
          {costPreview && (
            <div className="gm-panel p-4 mb-4 animate-fade-in">
              <h3 className="text-sm font-medium text-white mb-3">Cost Estimate</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-white/40">Subtitle entries</span>
                  <p className="text-white font-mono">{costPreview.totalEntries.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-white/40">Total characters</span>
                  <p className="text-white font-mono">{costPreview.totalChars.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-white/40">Est. input tokens</span>
                  <p className="text-brand-light font-mono">{costPreview.totalTokensEstimate.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-white/40">KB tokens</span>
                  <p className="text-brand-light font-mono">{costPreview.kbTokens.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-white/40">API calls (chunks)</span>
                  <p className="text-white font-mono">{costPreview.chunkCount}</p>
                </div>
                <div>
                  <span className="text-white/40">Model</span>
                  <p className="text-white font-mono text-[11px]">{costPreview.model}</p>
                </div>
                <div>
                  <span className="text-white/40">Est. cost</span>
                  <p className="text-brand-accent font-mono font-semibold">${costPreview.estimatedCost.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-white/40">Est. time</span>
                  <p className="text-white font-mono">{costPreview.estimatedTimeMinutes} min</p>
                </div>
              </div>

              <button
                className="btn-primary mt-4 w-full"
                onClick={handleStartCorrection}
              >
                Confirm and Start Correction
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mt-4">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <button className="btn-secondary" onClick={onPrevStep}>← Knowledge</button>
          <button className="btn-primary" onClick={onNextStep} disabled={project.status !== 'corrected'}>
            Next: Merge →
          </button>
        </div>
      </div>
    )
  }

  // === RUNNING VIEW ===
  if (viewMode === 'running') {
    const pct = progress ? Math.round((progress.completedChunks / Math.max(progress.totalChunks, 1)) * 100) : 0
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-lg font-semibold text-white mb-2">Correcting Subtitles...</h2>
          {progress && (
            <>
              <p className="text-sm text-white/60 mb-4">
                Processing chunk {progress.currentChunk} of {progress.totalChunks}
              </p>
              {/* Progress bar */}
              <div className="w-full bg-white/5 rounded-full h-2 mb-3">
                <div
                  className="bg-brand-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-white/30">{pct}% complete</p>
            </>
          )}
          <button className="btn-danger mt-6 text-xs" onClick={handleAbort}>
            Pause Correction
          </button>
        </div>
      </div>
    )
  }

  // === DIFF VIEW ===
  const changedCount = diffEntries.filter(e => e.original !== e.corrected).length
  const acceptedCount = diffEntries.filter(e => e.accepted && e.original !== e.corrected).length

  return (
    <div className="flex flex-col h-full">
      {/* Diff toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">{changedCount} changes found</span>
          <span className="text-xs text-green-400">{acceptedCount} accepted</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs py-1" onClick={handleAcceptAll}>Accept All</button>
          <button className="btn-secondary text-xs py-1" onClick={handleRejectAll}>Reject All</button>
          <button className="btn-primary text-xs py-1" onClick={handleSaveCorrected}>Save Corrected Text</button>
        </div>
      </div>

      {/* Diff entries */}
      <div className="flex-1 overflow-auto">
        {diffEntries.map((entry) => {
          const changed = entry.original !== entry.corrected
          if (!changed) return null // Only show changed entries

          return (
            <div
              key={entry.index}
              className={`border-b border-white/5 ${entry.accepted ? '' : 'opacity-50'}`}
            >
              <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.02]">
                <span className="text-xs font-mono text-white/30">#{entry.index}</span>
                <button
                  className={`text-xs px-2 py-0.5 rounded ${entry.accepted ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'}`}
                  onClick={() => handleToggleEntry(entry.index)}
                >
                  {entry.accepted ? 'Accepted' : 'Rejected'}
                </button>
                {changed && (
                  <button
                    className="text-xs text-brand-light/60 hover:text-brand-light"
                    onClick={() => {
                      // Find a meaningful term difference to add
                      const words1 = entry.original.split(/\s+/)
                      const words2 = entry.corrected.split(/\s+/)
                      // Simple heuristic: find first differing word pair
                      for (let i = 0; i < Math.min(words1.length, words2.length); i++) {
                        if (words1[i] !== words2[i]) {
                          handleAddToTerminology(words1[i], words2[i])
                          break
                        }
                      }
                    }}
                    title="Add term correction to terminology table"
                  >
                    + Terminology
                  </button>
                )}
              </div>
              <div className="flex">
                {/* Original */}
                <div className="flex-1 px-4 py-2 border-r border-white/5">
                  <p className="text-xs text-red-300/60 whitespace-pre-wrap">{entry.original}</p>
                </div>
                {/* Corrected */}
                <div className="flex-1 px-4 py-2">
                  {entry.edited ? (
                    <textarea
                      className="gm-input w-full text-xs min-h-[40px] resize-none border-0 p-0 bg-transparent text-green-300/80"
                      value={entry.corrected}
                      onChange={(e) => handleEditEntry(entry.index, e.target.value)}
                    />
                  ) : (
                    <p
                      className="text-xs text-green-300/80 whitespace-pre-wrap cursor-pointer"
                      onDoubleClick={() => handleEditEntry(entry.index, entry.corrected)}
                      title="Double-click to edit"
                    >
                      {entry.corrected}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {changedCount === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/20 text-sm">No differences found</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
        <button className="btn-secondary" onClick={onPrevStep}>← Knowledge</button>
        <button className="btn-primary" onClick={onNextStep}>
          Next: Merge →
        </button>
      </div>
    </div>
  )
}
