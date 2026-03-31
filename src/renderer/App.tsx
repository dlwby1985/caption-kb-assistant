import React, { useState, useCallback, useEffect } from 'react'
import TitleBar from './components/layout/TitleBar'
import Sidebar from './components/layout/Sidebar'
import ProjectsPage from './components/pages/ProjectsPage'
import GlobalKBPage from './components/pages/GlobalKBPage'
import TerminologyPage from './components/pages/TerminologyPage'
import SettingsPage from './components/pages/SettingsPage'
import HelpPage from './components/pages/HelpPage'
import ProjectWorkspace from './components/workspace/ProjectWorkspace'
import Onboarding from './components/Onboarding'
import type { SidebarTab, Project } from './types'

function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('projects')
  const [openProject, setOpenProject] = useState<Project | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding-complete'))

  const handleOpenProject = useCallback((project: Project) => {
    setOpenProject(project)
  }, [])

  const handleBackToProjects = useCallback(() => {
    setOpenProject(null)
  }, [])

  const handleProjectUpdate = useCallback((updated: Project) => {
    setOpenProject(updated)
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'e') {
        // Ctrl+E: go to export step (if in workspace)
        if (openProject) {
          e.preventDefault()
          // Dispatch custom event that ProjectWorkspace listens for
          window.dispatchEvent(new CustomEvent('app:shortcut', { detail: 'export' }))
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openProject])

  // When a project is open, show workspace instead of tab content
  const showWorkspace = activeTab === 'projects' && openProject !== null

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('onboarding-complete', '1')
    setShowOnboarding(false)
  }, [])

  return (
    <div className="h-screen flex flex-col app-bg">
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setOpenProject(null) }} />

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {showWorkspace ? (
            <ProjectWorkspace
              project={openProject}
              onBack={handleBackToProjects}
              onProjectUpdate={handleProjectUpdate}
            />
          ) : (
            <>
              {activeTab === 'projects' && (
                <ProjectsPage onOpenProject={handleOpenProject} />
              )}
              {activeTab === 'global-kb' && <GlobalKBPage />}
              {activeTab === 'terminology' && <TerminologyPage />}
              {activeTab === 'settings' && <SettingsPage />}
              {activeTab === 'help' && <HelpPage />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
