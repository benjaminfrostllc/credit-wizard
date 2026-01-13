import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildAiContext, formatContextForPrompt, type ContextInput } from './contextBuilder'
import { callClaude, getToolsForChat } from './claudeClient'
import { CHAT_SYSTEM_PROMPT, PROMPT_VERSION } from './prompts'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userMessage, conversationHistory, contextInput } = req.body as {
    userMessage?: string
    conversationHistory?: ChatMessage[]
    contextInput?: ContextInput
  }

  if (!userMessage) {
    return res.status(400).json({ error: 'userMessage is required' })
  }

  const context = contextInput ? buildAiContext(contextInput) : null
  const contextText = context ? formatContextForPrompt(context) : 'No user context provided.'

  const messages: ChatMessage[] = [
    ...(conversationHistory || []),
    {
      role: 'user',
      content: `Context:\n${contextText}\n\nUser question: ${userMessage}`,
    },
  ]

  const claudeResponse = await callClaude({
    system: CHAT_SYSTEM_PROMPT,
    messages,
    max_tokens: 500,
    tools: getToolsForChat(),
  })

  if (!claudeResponse.ok) {
    return res.status(claudeResponse.status).json({
      error: 'Claude API error',
      details: claudeResponse.error,
    })
  }

  return res.status(200).json({
    response: claudeResponse.text,
    promptVersion: PROMPT_VERSION,
  })
}
