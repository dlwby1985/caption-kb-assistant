import React, { useState, useCallback, useEffect } from 'react'
import type { Project, SubtitleEntry, WorkspaceStep } from '../../types'
import StepIndicator from './StepIndicator'
import ImportPanel from './ImportPanel'
import ExtractPanel from './ExtractPanel'
import MergePanel from './MergePanel'
import ExportPanel from './ExportPanel'
import KnowledgePanel from './KnowledgePanel'
import CorrectionPanel from './CorrectionPanel'


interface ProjectWorkspaceProps {
  project: Project
  onBack: () => void
  onProjectUpdate: (project: Project) => void
}

export default function ProjectWorkspace({ project, onBack, onProjectUpdate }: ProjectWorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<WorkspaceStep>('import')
  const [entries, setEntries] = useState<SubtitleEntry[]>([])
  const [completedSteps, setCompletedSteps] = useState<Set<WorkspaceStep>>(new Set())

  // Load existing entries if project already has SRT
  useEffect(() => {
    if (project.originalSrtPath) {
      window.electronAPI.srtParse(project.id)
        .then(setEntries)
        .catch(() => {})
    }
    // Set completed steps based on project status
    const statusOrder: WorkspaceStep[] = ['import', 'extract', 'knowledge', 'correct', 'merge', 'export']
    const statusMap: Record<string, number> = {
      imported: 0, extracted: 1, correcting: 2, corrected: 3, merged: 4, exported: 5,
    }
    const idx = statusMap[project.status] ?? -1
    const completed = new Set<WorkspaceStep>()
    for (let i = 0; i <= idx; i++) completed.add(statusOrder[i])
    setCompletedSteps(completed)
  }, [project.id, project.originalSrtPath, project.status])

  const handleProjectUpdate = useCallback(async (data: Partial<Project>) => {
    try {
      const updated = await window.electronAPI.projectUpdate(project.id, data)
      onProjectUpdate(updated)
    } catch (err) {
      console.error('Project update failed:', err)
    }
  }, [project.id, onProjectUpdate])

  const markComplete = useCallback((step: WorkspaceStep) => {
    setCompletedSteps(prev => new Set([...prev, step]))
  }, [])

  const goToStep = useCallback((step: WorkspaceStep) => setCurrentStep(step), [])

  // Listen for app-level shortcuts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === 'export') setCurrentStep('export')
    }
    window.addEventListener('app:shortcut', handler)
    return () => window.removeEventListener('app:shortcut', handler)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Workspace header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 shrink-0">
        <button
          className="text-white/40 hover:text-white text-sm transition-colors"
          onClick={onBack}
        >
          ← Projects
        </button>
        <span className="text-white/10">|</span>
        <h2 className="text-sm font-medium text-white truncate">{project.name}</h2>
        <span className={`badge badge-${project.status}`}>{project.status}</span>
      </div>

      {/* Step indicator */}
      <div className="border-b border-white/5 shrink-0">
        <StepIndicator
          currentStep={currentStep}
          onStepChange={goToStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        {currentStep === 'import' && (
          <ImportPanel
            project={project}
            entries={entries}
            onEntriesChange={(e) => { setEntries(e); markComplete('import') }}
            onProjectUpdate={handleProjectUpdate}
            onNextStep={() => goToStep('extract')}
          />
        )}
        {currentStep === 'extract' && (
          <ExtractPanel
            project={project}
            onProjectUpdate={handleProjectUpdate}
            onNextStep={() => goToStep('knowledge')}
            onPrevStep={() => goToStep('import')}
          />
        )}
        {currentStep === 'knowledge' && (
          <KnowledgePanel
            project={project}
            onPrevStep={() => goToStep('extract')}
            onNextStep={() => goToStep('correct')}
          />
        )}
        {currentStep === 'correct' && (
          <CorrectionPanel
            project={project}
            onProjectUpdate={handleProjectUpdate}
            onPrevStep={() => goToStep('knowledge')}
            onNextStep={() => goToStep('merge')}
          />
        )}
        {currentStep === 'merge' && (
          <MergePanel
            project={project}
            onProjectUpdate={handleProjectUpdate}
            onEntriesChange={(e) => { setEntries(e); markComplete('merge') }}
            onNextStep={() => goToStep('export')}
            onPrevStep={() => goToStep('correct')}
          />
        )}
        {currentStep === 'export' && (
          <ExportPanel
            project={project}
            entries={entries}
            onProjectUpdate={handleProjectUpdate}
            onPrevStep={() => goToStep('merge')}
          />
        )}
      </div>
    </div>
  )
}
