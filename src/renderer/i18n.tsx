import React, { createContext, useContext, useState, useCallback } from 'react'

export type Locale = 'en' | 'zh'

const translations = {
  // Sidebar
  'sidebar.projects': { en: 'Projects', zh: '项目' },
  'sidebar.globalKB': { en: 'Global KB', zh: '全局知识库' },
  'sidebar.terminology': { en: 'Terminology', zh: '术语表' },
  'sidebar.settings': { en: 'Settings', zh: '设置' },
  'sidebar.help': { en: 'Help', zh: '帮助' },

  // Projects page
  'projects.title': { en: 'Projects', zh: '项目列表' },
  'projects.create': { en: 'New Project', zh: '新建项目' },
  'projects.name': { en: 'Project Name', zh: '项目名称' },
  'projects.language': { en: 'Language', zh: '语言' },
  'projects.delete': { en: 'Delete', zh: '删除' },
  'projects.open': { en: 'Open', zh: '打开' },
  'projects.empty': { en: 'No projects yet. Create one to get started.', zh: '暂无项目，请新建一个项目开始。' },
  'projects.confirmDelete': { en: 'Delete this project?', zh: '确认删除此项目？' },

  // Workspace steps
  'step.import': { en: 'Import', zh: '导入' },
  'step.extract': { en: 'Extract', zh: '提取' },
  'step.knowledge': { en: 'Knowledge', zh: '知识库' },
  'step.correct': { en: 'Correct', zh: '校正' },
  'step.merge': { en: 'Merge', zh: '合并' },
  'step.export': { en: 'Export', zh: '导出' },

  // Import panel
  'import.title': { en: 'Import SRT File', zh: '导入 SRT 文件' },
  'import.click': { en: 'Click to browse or drag and drop an SRT file', zh: '点击浏览或拖放 SRT 文件' },
  'import.reimport': { en: 'Re-import', zh: '重新导入' },
  'import.importing': { en: 'Importing...', zh: '导入中...' },
  'import.entries': { en: 'entries', zh: '条字幕' },
  'import.search': { en: 'Search', zh: '搜索' },
  'import.searchPlaceholder': { en: 'Search subtitles...', zh: '搜索字幕...' },
  'import.offset': { en: 'Offset (ms):', zh: '偏移 (ms):' },
  'import.applyOffset': { en: 'Apply Offset', zh: '应用偏移' },

  // Extract panel
  'extract.title': { en: 'Extract Text', zh: '提取文本' },
  'extract.button': { en: 'Extract Text from SRT', zh: '从 SRT 提取文本' },
  'extract.save': { en: 'Save', zh: '保存' },
  'extract.openInExplorer': { en: 'Open in Explorer', zh: '在资源管理器中打开' },

  // Knowledge panel
  'knowledge.title': { en: 'Project Knowledge Base', zh: '项目知识库' },
  'knowledge.upload': { en: 'Upload Files', zh: '上传文件' },
  'knowledge.noFiles': { en: 'No files uploaded yet', zh: '暂无上传文件' },
  'knowledge.tokens': { en: 'tokens', zh: 'tokens' },

  // Correction panel
  'correction.title': { en: 'AI Correction', zh: 'AI 校正' },
  'correction.template': { en: 'Prompt Template', zh: '提示词模板' },
  'correction.provider': { en: 'Active Provider', zh: '当前模型' },
  'correction.configInSettings': { en: 'Configure in Settings tab', zh: '在设置页配置' },
  'correction.checkpoint': { en: 'Checkpoint found', zh: '发现检查点' },
  'correction.checkpointDesc': { en: 'A previous correction was interrupted. You can resume or start fresh.', zh: '上次校正被中断，可以继续或重新开始。' },
  'correction.resume': { en: 'Resume', zh: '继续' },
  'correction.startFresh': { en: 'Start Fresh', zh: '重新开始' },
  'correction.previewCost': { en: 'Preview Cost', zh: '预估费用' },
  'correction.calculating': { en: 'Calculating...', zh: '计算中...' },
  'correction.costEstimate': { en: 'Cost Estimate', zh: '费用预估' },
  'correction.confirm': { en: 'Confirm and Start Correction', zh: '确认并开始校正' },
  'correction.running': { en: 'Correcting Subtitles...', zh: '正在校正字幕...' },
  'correction.processing': { en: 'Processing chunk', zh: '正在处理块' },
  'correction.of': { en: 'of', zh: '/' },
  'correction.complete': { en: 'complete', zh: '完成' },
  'correction.pause': { en: 'Pause Correction', zh: '暂停校正' },
  'correction.changesFound': { en: 'changes found', zh: '处修改' },
  'correction.accepted': { en: 'accepted', zh: '已接受' },
  'correction.acceptAll': { en: 'Accept All', zh: '全部接受' },
  'correction.rejectAll': { en: 'Reject All', zh: '全部拒绝' },
  'correction.saveCorrected': { en: 'Save Corrected Text', zh: '保存校正文本' },
  'correction.noDiff': { en: 'No differences found', zh: '未发现差异' },

  // Merge panel
  'merge.title': { en: 'Merge Corrected Text with Timestamps', zh: '将校正文本与时间轴合并' },
  'merge.merged': { en: 'Merged', zh: '已合并' },
  'merge.button': { en: 'Merge Now', zh: '立即合并' },
  'merge.remerge': { en: 'Re-merge', zh: '重新合并' },
  'merge.editManually': { en: 'Edit corrected text manually', zh: '手动编辑校正文本' },
  'merge.noSrt': { en: 'Import an SRT file first to see the merge preview', zh: '请先导入 SRT 文件以预览合并结果' },

  // Export panel
  'export.title': { en: 'Export', zh: '导出' },
  'export.srt': { en: 'Export SRT', zh: '导出 SRT' },
  'export.srtDesc': { en: 'Universal format — for Adobe Premiere', zh: '通用格式 - 适用于 Adobe Premiere' },
  'export.ass': { en: 'Export ASS', zh: '导出 ASS' },
  'export.assDesc': { en: 'Styled subtitles with font/color', zh: '带字体/颜色样式的字幕' },
  'export.txt': { en: 'Export Plain Text', zh: '导出纯文本' },
  'export.txtDesc': { en: 'Corrected text only, no timestamps', zh: '仅校正文本，不含时间戳' },
  'export.report': { en: 'Correction Report', zh: '校正报告' },
  'export.reportDesc': { en: 'Markdown diff of all changes made', zh: '所有修改的 Markdown 差异报告' },
  'export.openFolder': { en: 'Open Project Folder', zh: '打开项目文件夹' },
  'export.openFolderDesc': { en: 'View all project files in Explorer', zh: '在资源管理器中查看项目文件' },
  'export.success': { en: 'exported successfully', zh: '导出成功' },
  'export.styling': { en: 'Subtitle Styling (ASS export)', zh: '字幕样式 (ASS 导出)' },
  'export.fontCJK': { en: 'Chinese Font', zh: '中文字体' },
  'export.fontLatin': { en: 'English Font', zh: '英文字体' },
  'export.fontSize': { en: 'Font Size', zh: '字体大小' },
  'export.borderStyle': { en: 'Border Style', zh: '边框样式' },
  'export.fontColor': { en: 'Font Color', zh: '字体颜色' },
  'export.outlineColor': { en: 'Outline Color', zh: '描边颜色' },
  'export.outline': { en: 'Outline', zh: '描边' },
  'export.opaqueBox': { en: 'Opaque Box', zh: '不透明背景' },
  'export.entries': { en: 'subtitle entries', zh: '条字幕' },

  // Settings page
  'settings.title': { en: 'Settings', zh: '设置' },
  'settings.llmProvider': { en: 'LLM Provider', zh: 'LLM 模型提供商' },
  'settings.apiKey': { en: 'API Key', zh: 'API 密钥' },
  'settings.apiKeySet': { en: 'API key is set', zh: 'API 密钥已设置' },
  'settings.apiKeyNotSet': { en: 'API key not set', zh: 'API 密钥未设置' },
  'settings.save': { en: 'Save Key', zh: '保存密钥' },
  'settings.delete': { en: 'Delete Key', zh: '删除密钥' },
  'settings.test': { en: 'Test Connection', zh: '测试连接' },
  'settings.testing': { en: 'Testing...', zh: '测试中...' },
  'settings.dataFolder': { en: 'Data Folder', zh: '数据目录' },
  'settings.changeFolder': { en: 'Change', zh: '更改' },
  'settings.language': { en: 'Interface Language', zh: '界面语言' },

  // Global KB page
  'globalKB.title': { en: 'Global Knowledge Base', zh: '全局知识库' },
  'globalKB.profile': { en: 'Personal Profile', zh: '个人简介' },
  'globalKB.profileDesc': { en: 'Information about yourself that applies to all projects', zh: '适用于所有项目的个人信息' },
  'globalKB.files': { en: 'Reference Files', zh: '参考文件' },
  'globalKB.upload': { en: 'Upload', zh: '上传' },

  // Terminology page
  'terminology.title': { en: 'Terminology', zh: '术语表' },
  'terminology.add': { en: 'Add Term', zh: '添加术语' },
  'terminology.wrong': { en: 'Wrong', zh: '错误词' },
  'terminology.correct': { en: 'Correct', zh: '正确词' },
  'terminology.note': { en: 'Note', zh: '备注' },
  'terminology.importCsv': { en: 'Import CSV', zh: '导入 CSV' },
  'terminology.exportCsv': { en: 'Export CSV', zh: '导出 CSV' },
  'terminology.testReplace': { en: 'Test Replace', zh: '测试替换' },
  'terminology.empty': { en: 'No terminology entries yet', zh: '暂无术语条目' },

  // Help page
  'help.title': { en: 'Help & Getting Started', zh: '帮助与入门' },

  // Common
  'common.back': { en: '← Back', zh: '← 返回' },
  'common.next': { en: 'Next', zh: '下一步' },
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.confirm': { en: 'Confirm', zh: '确认' },
  'common.save': { en: 'Save', zh: '保存' },
  'common.bold': { en: 'Bold', zh: '粗体' },
  'common.italic': { en: 'Italic', zh: '斜体' },

  // Onboarding
  'onboarding.welcome': { en: 'Welcome to Caption KB Assistant', zh: '欢迎使用字幕知识库助手' },
  'onboarding.welcomeDesc': { en: 'An AI-powered desktop tool for correcting ASR-generated subtitle files using your knowledge base.', zh: '一款基于 AI 的桌面工具，利用知识库校正 ASR 生成的字幕文件。' },
  'onboarding.step2': { en: 'Import & Extract', zh: '导入与提取' },
  'onboarding.step2Desc': { en: 'Start by creating a project, importing an SRT file, and extracting its text. The app auto-detects encoding (UTF-8, BOM, GBK).', zh: '首先创建项目、导入 SRT 文件并提取文本。应用自动检测编码（UTF-8、BOM、GBK）。' },
  'onboarding.step3': { en: 'Knowledge Base', zh: '知识库' },
  'onboarding.step3Desc': { en: 'Upload reference files (PDF, DOCX, TXT, MD) to your Global KB or per-project KB. Add terminology corrections for offline auto-replacement.', zh: '上传参考文件（PDF、DOCX、TXT、MD）到全局或项目知识库。添加术语校正实现离线自动替换。' },
  'onboarding.step4': { en: 'AI Correction', zh: 'AI 校正' },
  'onboarding.step4Desc': { en: 'Send subtitle text + knowledge base to Claude or any OpenAI-compatible API. Review changes in a diff view, accept or reject each one.', zh: '将字幕文本和知识库发送给 Claude 或任何 OpenAI 兼容 API。在差异视图中审查、接受或拒绝每处修改。' },
  'onboarding.step5': { en: 'Merge & Export', zh: '合并与导出' },
  'onboarding.step5Desc': { en: 'Merge corrected text back into timestamps. Export as SRT, styled ASS, plain text, or a correction report.', zh: '将校正文本与时间轴合并。导出为 SRT、ASS 样式字幕、纯文本或校正报告。' },
  'onboarding.skip': { en: 'Skip', zh: '跳过' },
  'onboarding.next': { en: 'Next', zh: '下一步' },
  'onboarding.getStarted': { en: 'Get Started', zh: '开始使用' },
} as const

type TranslationKey = keyof typeof translations

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem('locale') as Locale) || 'en'
  })

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem('locale', l)
    setLocaleState(l)
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key]
    return entry?.[locale] ?? key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
