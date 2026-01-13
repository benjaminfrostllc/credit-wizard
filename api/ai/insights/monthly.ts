import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildAiContext, formatContextForPrompt, type ContextInput } from '../contextBuilder'
import { callClaude, getModelForInsights } from '../claudeClient'
import { INSIGHTS_SYSTEM_PROMPT, PROMPT_VERSION } from '../prompts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contextInput, monthLabel } = req.body as {
    contextInput?: ContextInput
    monthLabel?: string
  }

  if (!contextInput) {
    return res.status(400).json({ error: 'contextInput is required' })
  }

  const context = buildAiContext(contextInput)
  const contextText = formatContextForPrompt(context)
  const monthDescriptor = monthLabel || context.budgetSummary?.monthLabel || 'this month'

  const messages = [
    {
      role: 'user' as const,
      content:
        `Context:\n${contextText}\n\nGenerate a monthly insights report for ${monthDescriptor}. ` +
        'Keep it concise and action-oriented.',
    },
  ]

  const claudeResponse = await callClaude({
    system: INSIGHTS_SYSTEM_PROMPT,
    messages,
    max_tokens: 600,
    model: getModelForInsights(),
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
