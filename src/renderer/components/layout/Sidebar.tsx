import React from 'react'
import type { SidebarTab } from '../../types'
import { useI18n } from '../../i18n'

interface SidebarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { t } = useI18n()

  const tabs: Array<{ id: SidebarTab; labelKey: Parameters<typeof t>[0]; icon: string }> = [
    { id: 'projects',    labelKey: 'sidebar.projects',    icon: '📁' },
    { id: 'global-kb',   labelKey: 'sidebar.globalKB',    icon: '📚' },
    { id: 'terminology', labelKey: 'sidebar.terminology',  icon: '📖' },
    { id: 'settings',    labelKey: 'sidebar.settings',     icon: '⚙' },
    { id: 'help',        labelKey: 'sidebar.help',         icon: '❓' },
  ]

  return (
    <aside className="gm-sidebar">
      <div className="flex flex-col items-center mb-2">
        <div className="w-9 h-9 bg-brand-primary rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-extrabold text-sm leading-none">C</span>
        </div>
      </div>

      <nav className="flex flex-col items-center gap-1 flex-1 w-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`gm-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span>{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
