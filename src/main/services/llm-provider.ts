import { getApiKey } from './secure-storage'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResult {
  content: string
  inputTokens: number
  outputTokens: number
}

export interface LLMProvider {
  name: string
  generate(messages: LLMMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<LLMResult>
  testConnection(): Promise<{ success: boolean; error?: string }>
}

export interface LLMConfig {
  activeProvider: 'claude' | 'openai-compatible'
  claude?: {
    model: string
  }
  openai?: {
    baseUrl: string
    model: string
    providerName: string
  }
}

// --- Claude Provider ---

class ClaudeProvider implements LLMProvider {
  name = 'Claude'
  private model: string

  constructor(model: string) {
    this.model = model
  }

  async generate(messages: LLMMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<LLMResult> {
    const apiKey = getApiKey('anthropic')
    if (!apiKey) throw new Error('Anthropic API key not configured')

    // Separate system prompt from conversation messages
    const systemMessages = messages.filter(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    const body: any = {
      model: this.model,
      max_tokens: options?.maxTokens ?? 4096,
      messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature
    }
    if (systemMessages.length > 0) {
      body.system = systemMessages.map(m => m.content).join('\n\n')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Claude API error (${response.status}): ${err}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text ?? ''

    return {
      content,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.generate([{ role: 'user', content: 'Hi' }], { maxTokens: 10 })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

// --- OpenAI-Compatible Provider ---

class OpenAICompatibleProvider implements LLMProvider {
  name: string
  private baseUrl: string
  private model: string

  constructor(baseUrl: string, model: string, providerName: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.model = model
    this.name = providerName || 'OpenAI-Compatible'
  }

  async generate(messages: LLMMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<LLMResult> {
    const apiKey = getApiKey('openai')
    if (!apiKey) throw new Error('OpenAI-compatible API key not configured')

    const body: any = {
      model: this.model,
      max_tokens: options?.maxTokens ?? 4096,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature
    }

    const url = `${this.baseUrl}/chat/completions`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`API error (${response.status}): ${err}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    return {
      content,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.generate([{ role: 'user', content: 'Hi' }], { maxTokens: 10 })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

// --- Factory ---

export function getActiveProvider(llmConfig: LLMConfig): LLMProvider {
  const active = llmConfig.activeProvider ?? 'claude'

  if (active === 'claude') {
    const model = llmConfig.claude?.model ?? 'claude-sonnet-4-20250514'
    return new ClaudeProvider(model)
  }

  if (active === 'openai-compatible') {
    const cfg = llmConfig.openai ?? {
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
      providerName: 'DashScope/Qwen',
    }
    return new OpenAICompatibleProvider(cfg.baseUrl, cfg.model, cfg.providerName)
  }

  throw new Error(`Unknown LLM provider: ${active}`)
}

// Model pricing (per 1M tokens) for cost estimation
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-haiku-4-20250506': { input: 0.80, output: 4 },
  'qwen-plus': { input: 0.80, output: 2 },
  'qwen-turbo': { input: 0.30, output: 0.60 },
  'qwen-max': { input: 2.40, output: 9.60 },
}
