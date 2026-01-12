import { CHAT_MODEL, INSIGHTS_MODEL, TOOL_DEFINITIONS } from './prompts'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeRequest {
  system: string
  messages: ClaudeMessage[]
  max_tokens: number
  temperature?: number
  model?: string
  tools?: typeof TOOL_DEFINITIONS
}

interface ClaudeResponse {
  content: Array<{ text?: string }>
}

export async function callClaude(request: ClaudeRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      error: 'Anthropic API key not configured',
    }
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: request.model || CHAT_MODEL,
      system: request.system,
      messages: request.messages,
      max_tokens: request.max_tokens,
      temperature: request.temperature ?? 0.4,
      tools: request.tools,
    }),
  })

  if (!response.ok) {
    let errorPayload: unknown
    try {
      errorPayload = await response.json()
    } catch (err) {
      errorPayload = {
        message: err instanceof Error ? err.message : 'Failed to parse Claude error response',
      }
    }

    return {
      ok: false,
      status: response.status,
      error: errorPayload,
    }
  }

  const data = (await response.json()) as ClaudeResponse
  const text = data.content?.map((item) => item.text).filter(Boolean).join('') || ''

  return {
    ok: true,
    status: 200,
    text,
  }
}

export function getModelForInsights() {
  return INSIGHTS_MODEL
}

export function getToolsForChat() {
  return TOOL_DEFINITIONS
}
