import React, { useState, useEffect, useCallback } from 'react'
import type { LLMConfig } from '../../types'
import { useI18n, type Locale } from '../../i18n'

const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Balanced)', tier: '$3/$15' },
  { id: 'claude-haiku-4-20250506', label: 'Claude Haiku 4 (Low cost)', tier: '$0.80/$4' },
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4 (Expensive)', tier: '$15/$75' },
]

const OPENAI_PRESETS = [
  { name: 'DashScope/Qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { name: 'Custom', baseUrl: '', model: '' },
]

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n()
  const [dataFolder, setDataFolder] = useState('')
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    activeProvider: 'claude',
    claude: { model: 'claude-sonnet-4-20250514' },
    openai: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', providerName: 'DashScope/Qwen' },
  })
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [folder, config, hasAnthropic, hasOpenAI] = await Promise.all([
          window.electronAPI.getDataFolder(),
          window.electronAPI.configRead(),
          window.electronAPI.llmHasApiKey('anthropic'),
          window.electronAPI.llmHasApiKey('openai'),
        ])
        setDataFolder(folder)
        if (config.llm) setLlmConfig(config.llm)
        setHasAnthropicKey(hasAnthropic)
        setHasOpenAIKey(hasOpenAI)
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    load()
  }, [])

  const handleSaveConfig = useCallback(async () => {
    setSaving(true)
    try {
      const config = await window.electronAPI.configRead()
      config.llm = llmConfig
      await window.electronAPI.configWrite(config)
    } catch (err) {
      console.error('Failed to save config:', err)
    } finally {
      setSaving(false)
      setTimeout(() => setSaving(false), 1000)
    }
  }, [llmConfig])

  const handleSetApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return
    const provider = llmConfig.activeProvider === 'claude' ? 'anthropic' : 'openai'
    await window.electronAPI.llmSetApiKey(provider as 'anthropic' | 'openai', apiKeyInput.trim())
    setApiKeyInput('')
    if (provider === 'anthropic') setHasAnthropicKey(true)
    else setHasOpenAIKey(true)
  }, [apiKeyInput, llmConfig.activeProvider])

  const handleDeleteApiKey = useCallback(async () => {
    const provider = llmConfig.activeProvider === 'claude' ? 'anthropic' : 'openai'
    await window.electronAPI.llmDeleteApiKey(provider as 'anthropic' | 'openai')
    if (provider === 'anthropic') setHasAnthropicKey(false)
    else setHasOpenAIKey(false)
  }, [llmConfig.activeProvider])

  const handleTestConnection = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.electronAPI.llmTestConnection(llmConfig)
      setTestResult(result)
    } catch (err: any) {
      setTestResult({ success: false, error: err.message })
    } finally {
      setTesting(false)
    }
  }, [llmConfig])

  const handleSelectFolder = useCallback(async () => {
    const folder = await window.electronAPI.selectDataFolder()
    if (folder) setDataFolder(folder)
  }, [])

  const currentKeyExists = llmConfig.activeProvider === 'claude' ? hasAnthropicKey : hasOpenAIKey

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      {/* LLM Provider */}
      <div className="gm-panel p-4 mb-4">
        <h3 className="text-sm font-medium text-white mb-3">LLM Provider</h3>

        {/* Provider selector */}
        <div className="flex gap-3 mb-4">
          <button
            className={`flex-1 gm-panel p-3 text-left transition-all ${llmConfig.activeProvider === 'claude' ? 'border-brand-primary bg-brand-primary/10' : ''}`}
            onClick={() => setLlmConfig(prev => ({ ...prev, activeProvider: 'claude' }))}
          >
            <p className="text-sm font-medium text-white">Claude (Anthropic)</p>
            <p className="text-xs text-white/30 mt-0.5">High quality, best for complex reasoning</p>
          </button>
          <button
            className={`flex-1 gm-panel p-3 text-left transition-all ${llmConfig.activeProvider === 'openai-compatible' ? 'border-brand-primary bg-brand-primary/10' : ''}`}
            onClick={() => setLlmConfig(prev => ({ ...prev, activeProvider: 'openai-compatible' }))}
          >
            <p className="text-sm font-medium text-white">OpenAI-Compatible</p>
            <p className="text-xs text-white/30 mt-0.5">DashScope/Qwen, OpenAI, custom endpoints</p>
          </button>
        </div>

        {/* Claude config */}
        {llmConfig.activeProvider === 'claude' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Model</label>
              <select
                className="gm-input w-full"
                value={llmConfig.claude?.model ?? 'claude-sonnet-4-20250514'}
                onChange={(e) => setLlmConfig(prev => ({ ...prev, claude: { model: e.target.value } }))}
              >
                {CLAUDE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label} — {m.tier}/1M tokens</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* OpenAI-compatible config */}
        {llmConfig.activeProvider === 'openai-compatible' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Preset</label>
              <div className="flex gap-2">
                {OPENAI_PRESETS.map(p => (
                  <button
                    key={p.name}
                    className={`btn-secondary text-xs ${llmConfig.openai?.providerName === p.name ? 'bg-brand-primary/20 text-brand-light border-brand-primary/30' : ''}`}
                    onClick={() => setLlmConfig(prev => ({
                      ...prev,
                      openai: { baseUrl: p.baseUrl || prev.openai?.baseUrl || '', model: p.model || prev.openai?.model || '', providerName: p.name },
                    }))}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Base URL</label>
              <input
                className="gm-input w-full"
                value={llmConfig.openai?.baseUrl ?? ''}
                onChange={(e) => setLlmConfig(prev => ({
                  ...prev,
                  openai: { ...prev.openai!, baseUrl: e.target.value },
                }))}
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Model</label>
              <input
                className="gm-input w-full"
                value={llmConfig.openai?.model ?? ''}
                onChange={(e) => setLlmConfig(prev => ({
                  ...prev,
                  openai: { ...prev.openai!, model: e.target.value },
                }))}
                placeholder="qwen-plus"
              />
            </div>
          </div>
        )}

        {/* API Key */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-white/40 mb-1">
                API Key {currentKeyExists && <span className="text-green-400">(configured)</span>}
              </label>
              <input
                className="gm-input w-full"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={currentKeyExists ? '••••••••••' : 'Enter API key...'}
                onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
              />
            </div>
            <button className="btn-primary text-xs mt-4" onClick={handleSetApiKey} disabled={!apiKeyInput.trim()}>
              Save Key
            </button>
            {currentKeyExists && (
              <button className="btn-danger text-xs mt-4" onClick={handleDeleteApiKey}>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-primary text-xs" onClick={handleSaveConfig}>
            {saving ? '✓ Saved' : 'Save Config'}
          </button>
          <button className="btn-secondary text-xs" onClick={handleTestConnection} disabled={testing}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <span className={`text-xs ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {testResult.success ? '✓ Connected' : `✗ ${testResult.error}`}
            </span>
          )}
        </div>
      </div>

      {/* Data folder */}
      <div className="gm-panel p-4 mb-4">
        <h3 className="text-sm font-medium text-white mb-2">Data Folder</h3>
        <p className="text-xs text-white/40 mb-3">All projects and knowledge base files are stored here.</p>
        <div className="flex items-center gap-3">
          <input className="gm-input flex-1 text-xs" value={dataFolder} readOnly />
          <button className="btn-secondary text-xs" onClick={handleSelectFolder}>Change</button>
          <button className="btn-secondary text-xs" onClick={() => window.electronAPI.openInExplorer(dataFolder)}>Open</button>
        </div>
      </div>

      {/* Language */}
      <div className="gm-panel p-4 mb-4">
        <h3 className="text-sm font-medium text-white mb-2">{t('settings.language')}</h3>
        <div className="flex gap-2">
          <button
            className={`btn-secondary text-xs ${locale === 'en' ? 'bg-brand-primary/20 text-brand-light border-brand-primary/30' : ''}`}
            onClick={() => setLocale('en')}
          >
            English
          </button>
          <button
            className={`btn-secondary text-xs ${locale === 'zh' ? 'bg-brand-primary/20 text-brand-light border-brand-primary/30' : ''}`}
            onClick={() => setLocale('zh')}
          >
            简体中文
          </button>
        </div>
      </div>

      {/* About */}
      <div className="gm-panel p-4">
        <h3 className="text-sm font-medium text-white mb-2">About</h3>
        <p className="text-xs text-white/40">Caption KB Assistant v0.1.0</p>
        <p className="text-xs text-white/30 mt-1">Built {__BUILD_DATE__}</p>
      </div>
    </div>
  )
}
