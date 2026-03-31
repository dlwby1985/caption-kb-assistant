import React, { useEffect, useState, useCallback } from 'react'
import type { Project } from '../../types'
import { useI18n } from '../../i18n'

interface ProjectsPageProps {
  onOpenProject: (project: Project) => void
}

export default function ProjectsPage({ onOpenProject }: ProjectsPageProps) {
  const { t } = useI18n()
  const [projects, setProjects] = useState<Project[]>([])
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLanguage, setNewLanguage] = useState<Project['language']>('zh-en-mixed')
  const [loading, setLoading] = useState(true)

  const loadProjects = useCallback(async () => {
    try {
      const list = await window.electronAPI.projectList()
      setProjects(list)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const project = await window.electronAPI.projectCreate(newName.trim(), newLanguage)
      setNewName('')
      setShowNewDialog(false)
      await loadProjects()
      onOpenProject(project)
    } catch (err) {
      console.error('Failed to create project:', err)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this project and all its files?')) return
    try {
      await window.electronAPI.projectDelete(id)
      await loadProjects()
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const statusBadge = (status: Project['status']) => {
    const cls = `badge badge-${status}`
    return <span className={cls}>{status}</span>
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">{t('projects.title')}</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowNewDialog(true)}>
          + {t('projects.create')}
        </button>
      </div>

      {/* New project dialog */}
      {showNewDialog && (
        <div className="gm-panel p-4 mb-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-3">Create New Project</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-white/40 mb-1">{t('projects.name')}</label>
              <input
                className="gm-input w-full"
                placeholder="e.g., Lecture on Identity Crisis"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">{t('projects.language')}</label>
              <select
                className="gm-input"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value as Project['language'])}
              >
                <option value="zh-en-mixed">Chinese-English Mixed</option>
                <option value="zh">Chinese</option>
                <option value="en">English</option>
              </select>
            </div>
            <button className="btn-primary" onClick={handleCreate}>Create</button>
            <button className="btn-secondary" onClick={() => setShowNewDialog(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/30 text-sm">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-lg mb-2">{t('projects.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="gm-panel gm-panel-hover p-4 cursor-pointer transition-all"
              onClick={() => onOpenProject(project)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-white truncate">{project.name}</h3>
                    {statusBadge(project.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-white/30">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-white/30">
                      {project.language === 'zh' ? 'Chinese' : project.language === 'en' ? 'English' : 'Mixed'}
                    </span>
                    <span className="text-xs text-white/20">{project.id}</span>
                  </div>
                </div>
                <button
                  className="text-white/20 hover:text-red-400 transition-colors p-2"
                  onClick={(e) => handleDelete(e, project.id)}
                  title="Delete project"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
