import React, { useState, useCallback } from 'react'
import type { Project, SubtitleEntry, AssStyle } from '../../types'
import { useI18n } from '../../i18n'

const CJK_FONTS = ['SimHei', 'SimSun']
const LATIN_FONTS = ['Arial', 'Times New Roman']
const FONT_COLORS = [
  { label: 'White', value: 'FFFFFF' },
  { label: 'Yellow', value: 'FFFF00' },
  { label: 'Cyan', value: '00FFFF' },
  { label: 'Green', value: '00FF00' },
]
const OUTLINE_COLORS = [
  { label: 'Black', value: '000000' },
  { label: 'Dark Gray', value: '333333' },
  { label: 'Navy', value: '000066' },
]

export default function ExportPanel({ project, entries, onProjectUpdate, onPrevStep }: {
  project: Project
  entries: SubtitleEntry[]
  onProjectUpdate: (data: Partial<Project>) => void
  onPrevStep: () => void
}) {
  const { t } = useI18n()
  const [exportResult, setExportResult] = useState<{ format: string; path: string } | null>(null)
  const [style, setStyle] = useState<AssStyle>({
    fontNameCJK: 'SimHei',
    fontNameLatin: 'Arial',
    fontSize: 20,
    bold: false,
    italic: false,
    fontColor: 'FFFFFF',
    outlineColor: '000000',
    borderStyle: 'outline',
  })

  const handleExportSrt = useCallback(async () => {
    const filePath = await window.electronAPI.srtExport(project.id, entries)
    if (filePath) {
      setExportResult({ format: 'SRT', path: filePath })
      onProjectUpdate({ status: 'exported' })
    }
  }, [project.id, entries, onProjectUpdate])

  const handleExportAss = useCallback(async () => {
    const filePath = await window.electronAPI.exportAss(project.id, entries, style)
    if (filePath) {
      setExportResult({ format: 'ASS', path: filePath })
      onProjectUpdate({ status: 'exported' })
    }
  }, [project.id, entries, style, onProjectUpdate])

  const handleExportTxt = useCallback(async () => {
    const filePath = await window.electronAPI.exportTxt(project.id)
    if (filePath) setExportResult({ format: 'TXT', path: filePath })
  }, [project.id])

  const handleExportReport = useCallback(async () => {
    const filePath = await window.electronAPI.exportReport(project.id)
    if (filePath) setExportResult({ format: 'Report', path: filePath })
  }, [project.id])

  const handleOpenFolder = useCallback(async () => {
    const dataFolder = await window.electronAPI.getDataFolder()
    window.electronAPI.openInExplorer(`${dataFolder}/projects/${project.id}`)
  }, [project.id])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-white mb-6">{t('export.title')}</h2>

          {/* Export buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              className="gm-panel gm-panel-hover p-4 text-left flex items-center gap-4 transition-all"
              onClick={handleExportSrt}
              title="Save as .srt file for use in Adobe Premiere, VLC, etc."
            >
              <div className="w-12 h-12 bg-brand-primary/15 rounded-lg flex items-center justify-center text-2xl shrink-0">
                📄
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t('export.srt')}</p>
                <p className="text-xs text-white/40">{t('export.srtDesc')}</p>
              </div>
            </button>

            <button
              className="gm-panel gm-panel-hover p-4 text-left flex items-center gap-4 transition-all"
              onClick={handleExportAss}
              title="Save as .ass file with font, color, and border styling"
            >
              <div className="w-12 h-12 bg-purple-500/15 rounded-lg flex items-center justify-center text-2xl shrink-0">
                🎨
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t('export.ass')}</p>
                <p className="text-xs text-white/40">{t('export.assDesc')}</p>
              </div>
            </button>

            <button
              className="gm-panel gm-panel-hover p-4 text-left flex items-center gap-4 transition-all"
              onClick={handleExportTxt}
              title="Save corrected text without timestamps"
            >
              <div className="w-12 h-12 bg-brand-accent/15 rounded-lg flex items-center justify-center text-2xl shrink-0">
                📝
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t('export.txt')}</p>
                <p className="text-xs text-white/40">{t('export.txtDesc')}</p>
              </div>
            </button>

            <button
              className="gm-panel gm-panel-hover p-4 text-left flex items-center gap-4 transition-all"
              onClick={handleExportReport}
              title="Generate a Markdown report comparing original and corrected text"
            >
              <div className="w-12 h-12 bg-green-500/15 rounded-lg flex items-center justify-center text-2xl shrink-0">
                📊
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t('export.report')}</p>
                <p className="text-xs text-white/40">{t('export.reportDesc')}</p>
              </div>
            </button>
          </div>

          {/* ASS Styling Config */}
          <div className="gm-panel p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">{t('export.styling')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1">{t('export.fontCJK')}</label>
                <select className="gm-input w-full" value={style.fontNameCJK}
                  onChange={(e) => setStyle(s => ({ ...s, fontNameCJK: e.target.value }))}>
                  {CJK_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">{t('export.fontLatin')}</label>
                <select className="gm-input w-full" value={style.fontNameLatin}
                  onChange={(e) => setStyle(s => ({ ...s, fontNameLatin: e.target.value }))}>
                  {LATIN_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">{t('export.fontSize')} ({style.fontSize}pt)</label>
                <input type="range" min={12} max={24} step={1} value={style.fontSize}
                  onChange={(e) => setStyle(s => ({ ...s, fontSize: parseInt(e.target.value) }))}
                  className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">{t('export.borderStyle')}</label>
                <select className="gm-input w-full" value={style.borderStyle}
                  onChange={(e) => setStyle(s => ({ ...s, borderStyle: e.target.value as 'outline' | 'opaque-box' }))}>
                  <option value="outline">{t('export.outline')}</option>
                  <option value="opaque-box">{t('export.opaqueBox')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">{t('export.fontColor')}</label>
                <div className="flex gap-1">
                  {FONT_COLORS.map(c => (
                    <button key={c.value}
                      className={`w-8 h-8 rounded border-2 ${style.fontColor === c.value ? 'border-brand-primary' : 'border-white/10'}`}
                      style={{ backgroundColor: `#${c.value}` }}
                      onClick={() => setStyle(s => ({ ...s, fontColor: c.value }))}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">{t('export.outlineColor')}</label>
                <div className="flex gap-1">
                  {OUTLINE_COLORS.map(c => (
                    <button key={c.value}
                      className={`w-8 h-8 rounded border-2 ${style.outlineColor === c.value ? 'border-brand-primary' : 'border-white/10'}`}
                      style={{ backgroundColor: `#${c.value}` }}
                      onClick={() => setStyle(s => ({ ...s, outlineColor: c.value }))}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={style.bold}
                    onChange={(e) => setStyle(s => ({ ...s, bold: e.target.checked }))} />
                  <span className="text-xs text-white/60 font-bold">{t('common.bold')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={style.italic}
                    onChange={(e) => setStyle(s => ({ ...s, italic: e.target.checked }))} />
                  <span className="text-xs text-white/60 italic">{t('common.italic')}</span>
                </label>
              </div>
            </div>

            {/* Style preview */}
            <div className="mt-4 p-4 rounded-lg bg-black flex items-center justify-center min-h-[60px]">
              <span style={{
                fontFamily: `"${style.fontNameCJK}", "${style.fontNameLatin}", sans-serif`,
                fontSize: `${style.fontSize}px`,
                fontWeight: style.bold ? 'bold' : 'normal',
                fontStyle: style.italic ? 'italic' : 'normal',
                color: `#${style.fontColor}`,
                textShadow: style.borderStyle === 'outline'
                  ? `1px 1px 2px #${style.outlineColor}, -1px -1px 2px #${style.outlineColor}, 1px -1px 2px #${style.outlineColor}, -1px 1px 2px #${style.outlineColor}`
                  : 'none',
                backgroundColor: style.borderStyle === 'opaque-box' ? `#${style.outlineColor}88` : 'transparent',
                padding: style.borderStyle === 'opaque-box' ? '2px 6px' : '0',
              }}>
                Preview 字幕样式预览
              </span>
            </div>
          </div>

          {/* Open folder */}
          <button
            className="gm-panel gm-panel-hover w-full p-4 text-left flex items-center gap-4 transition-all"
            onClick={handleOpenFolder}
          >
            <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center text-2xl shrink-0">
              📂
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t('export.openFolder')}</p>
              <p className="text-xs text-white/40">{t('export.openFolderDesc')}</p>
            </div>
          </button>

          {/* Export result */}
          {exportResult && (
            <div className="gm-toast p-3 mt-4 animate-fade-in text-center">
              <p className="text-sm text-green-400">{exportResult.format} {t('export.success')}</p>
              <p className="text-xs text-white/40 mt-1 truncate">{exportResult.path}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
        <button className="btn-secondary" onClick={onPrevStep}>← Merge</button>
        <span className="text-xs text-white/30">{entries.length} {t('export.entries')}</span>
      </div>
    </div>
  )
}
