import React, { useState, useEffect, useCallback } from 'react'
import type { Project, KBFileInfo } from '../../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface KnowledgePanelProps {
  project: Project
  onNextStep: () => void
  onPrevStep: () => void
}

export default function KnowledgePanel({ project, onNextStep, onPrevStep }: KnowledgePanelProps) {
  const [files, setFiles] = useState<KBFileInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState('')

  const loadFiles = useCallback(async () => {
    try {
      const list = await window.electronAPI.projectKBList(project.id)
      setFiles(list)
    } catch (err) {
      console.error('Failed to load project KB:', err)
    } finally {
      setLoading(false)
    }
  }, [project.id])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleUpload = useCallback(async () => {
    const uploaded = await window.electronAPI.projectKBUpload(project.id)
    if (uploaded.length > 0) {
      await loadFiles()
    }
  }, [project.id, loadFiles])

  const handleDelete = useCallback(async (fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return
    await window.electronAPI.projectKBDelete(project.id, fileName)
    await loadFiles()
    if (previewFile === fileName) {
      setPreviewFile(null)
      setPreviewText('')
    }
  }, [project.id, loadFiles, previewFile])

  const handlePreview = useCallback(async (fileName: string) => {
    if (previewFile === fileName) {
      setPreviewFile(null)
      setPreviewText('')
      return
    }
    try {
      const text = await window.electronAPI.projectKBExtractText(project.id, fileName)
      setPreviewFile(fileName)
      setPreviewText(text)
    } catch (err) {
      console.error('Failed to extract text:', err)
    }
  }, [project.id, previewFile])

  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white">Project Knowledge Base</h3>
          <span className="text-xs text-white/30">{files.length} files</span>
          <span className="text-xs font-mono text-brand-light">{totalTokens.toLocaleString()} tokens</span>
        </div>
        <button className="btn-primary text-xs py-1 px-3" onClick={handleUpload}>
          + Upload Files
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* File list */}
        <div className={`${previewFile ? 'w-1/2' : 'flex-1'} overflow-auto border-r border-white/5`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-white/30 text-sm mb-2">No knowledge base files</p>
                <p className="text-white/20 text-xs">Upload PDF, DOCX, PPTX, MD, or TXT files</p>
                <p className="text-white/10 text-xs mt-1">These provide context for AI correction</p>
              </div>
            </div>
          ) : (
            <table className="gm-table">
              <thead className="sticky top-0 bg-[#0f0f23]">
                <tr>
                  <th>File</th>
                  <th className="w-20">Size</th>
                  <th className="w-24">Tokens</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.name} className={previewFile === file.name ? 'bg-brand-primary/5' : ''}>
                    <td className="text-white/80">{file.name}</td>
                    <td className="text-white/40 font-mono text-xs">{formatSize(file.size)}</td>
                    <td className="text-brand-light font-mono text-xs">{file.tokens.toLocaleString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="text-xs text-white/30 hover:text-white/60"
                          onClick={() => handlePreview(file.name)}
                        >
                          {previewFile === file.name ? 'Hide' : 'Preview'}
                        </button>
                        <button
                          className="text-xs text-white/20 hover:text-red-400"
                          onClick={() => handleDelete(file.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Preview panel */}
        {previewFile && (
          <div className="w-1/2 flex flex-col overflow-hidden animate-fade-in">
            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs text-white/50 truncate">{previewFile}</span>
              <button
                className="text-xs text-white/30 hover:text-white/50"
                onClick={() => { setPreviewFile(null); setPreviewText('') }}
              >
                Close
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs text-white/60 font-mono whitespace-pre-wrap">
              {previewText}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
        <button className="btn-secondary" onClick={onPrevStep}>← Extract</button>
        <button className="btn-primary" onClick={onNextStep}>Next: Correct →</button>
      </div>
    </div>
  )
}
