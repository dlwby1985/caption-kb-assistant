import { ipcMain } from 'electron'
import { setApiKey, getApiKey, hasApiKey, deleteApiKey } from '../services/secure-storage'
import { getActiveProvider, type LLMConfig } from '../services/llm-provider'

export function registerLLMHandlers(): void {
  // Set API key (write-only from renderer)
  ipcMain.handle('llm:set-api-key', (_e, provider: 'anthropic' | 'openai', key: string) => {
    setApiKey(provider, key.trim())
    return { success: true }
  })

  // Check if API key exists (never returns the key itself)
  ipcMain.handle('llm:has-api-key', (_e, provider: 'anthropic' | 'openai') => {
    return hasApiKey(provider)
  })

  // Delete API key
  ipcMain.handle('llm:delete-api-key', (_e, provider: 'anthropic' | 'openai') => {
    deleteApiKey(provider)
    return { success: true }
  })

  // Test connection with current config
  ipcMain.handle('llm:test-connection', async (_e, llmConfig: LLMConfig) => {
    try {
      const provider = getActiveProvider(llmConfig)
      return await provider.testConnection()
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
