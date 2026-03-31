import React, { useState, useEffect, useCallback } from 'react'
import type { KBFileInfo } from '../../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function GlobalKBPage() {
  const [profile, setProfile] = useState('')
  const [profileTokens, setProfileTokens] = useState(0)
  const [profileSaved, setProfileSaved] = useState(false)
  const [files, setFiles] = useState<KBFileInfo[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [profileText, fileList, tokens] = await Promise.all([
        window.electronAPI.globalKBProfileRead(),
        window.electronAPI.globalKBFileList(),
        window.electronAPI.globalKBProfileTokens(),
      ])
      setProfile(profileText)
      setFiles(fileList)
      setProfileTokens(tokens)
    } catch (err) {
      console.error('Failed to load global KB:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveProfile = useCallback(async () => {
    await window.electronAPI.globalKBProfileWrite(profile)
    const tokens = await window.electronAPI.globalKBProfileTokens()
    setProfileTokens(tokens)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }, [profile])

  const handleUpload = useCallback(async () => {
    const uploaded = await window.electronAPI.globalKBFileUpload()
    if (uploaded.length > 0) {
      const fileList = await window.electronAPI.globalKBFileList()
      setFiles(fileList)
    }
  }, [])

  const handleDeleteFile = useCallback(async (fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return
    await window.electronAPI.globalKBFileDelete(fileName)
    const fileList = await window.electronAPI.globalKBFileList()
    setFiles(fileList)
  }, [])

  const totalTokens = profileTokens + files.reduce((sum, f) => sum + f.tokens, 0)

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
          <h1 className="text-xl font-semibold text-white">Global Knowledge Base</h1>
          <p className="text-sm text-white/40 mt-1">Personal profile and reference files used across all projects</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-white/30">Total estimated tokens</span>
          <p className="text-sm font-mono text-brand-light">{totalTokens.toLocaleString()}</p>
        </div>
      </div>

      {/* Personal Profile */}
      <div className="gm-panel p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-white">Personal Profile</h3>
            <p className="text-xs text-white/30 mt-0.5">Your name, title, institution, research area — included as context for every AI correction</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 font-mono">{profileTokens} tokens</span>
            <button className="btn-primary text-xs py-1 px-3" onClick={handleSaveProfile}>
              {profileSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>
        <textarea
          className="gm-input w-full h-40 font-mono text-sm resize-vertical"
          value={profile}
          onChange={(e) => { setProfile(e.target.value); setProfileSaved(false) }}
          placeholder={"# Personal Profile\n\nName: \nTitle: \nInstitution: \nResearch Area: \nLanguage: Chinese / English / Mixed\n\n(This information will be included as context in every AI correction call.)"}
          spellCheck={false}
        />
      </div>

      {/* Reference Files */}
      <div className="gm-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-white">Reference Files</h3>
            <p className="text-xs text-white/30 mt-0.5">Upload PDF, DOCX, MD, TXT — used as context for AI correction</p>
          </div>
          <button className="btn-primary text-xs py-1 px-3" onClick={handleUpload}>
            + Upload Files
          </button>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/20 text-sm">No reference files yet</p>
            <p className="text-white/10 text-xs mt-1">Upload documents to provide context for AI correction</p>
          </div>
        ) : (
          <table className="gm-table">
            <thead>
              <tr>
                <th>File</th>
                <th className="w-24">Size</th>
                <th className="w-28">Est. Tokens</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.name}>
                  <td className="text-white/80">{file.name}</td>
                  <td className="text-white/40 font-mono text-xs">{formatSize(file.size)}</td>
                  <td className="text-brand-light font-mono text-xs">{file.tokens.toLocaleString()}</td>
                  <td>
                    <button
                      className="text-white/20 hover:text-red-400 transition-colors text-xs"
                      onClick={() => handleDeleteFile(file.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
