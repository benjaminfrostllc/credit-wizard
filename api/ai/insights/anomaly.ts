import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildAiContext, formatContextForPrompt, type ContextInput } from '../contextBuilder'
import { callClaude, getModelForInsights } from '../claudeClient'
import { INSIGHTS_SYSTEM_PROMPT, PROMPT_VERSION } from '../prompts'

interface AnomalyInput {
  description: string
  amount?: number
  date?: string
  category?: string
  notes?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contextInput, anomaly } = req.body as {
    contextInput?: ContextInput
    anomaly?: AnomalyInput
  }

  if (!contextInput) {
    return res.status(400).json({ error: 'contextInput is required' })
  }

  if (!anomaly?.description) {
    return res.status(400).json({ error: 'anomaly.description is required' })
  }

  const context = buildAiContext(contextInput)
  const contextText = formatContextForPrompt(context)

  const anomalyDetails = {
    description: anomaly.description,
    amount: anomaly.amount,
    date: anomaly.date,
    category: anomaly.category,
    notes: anomaly.notes,
  }

  const messages = [
    {
      role: 'user' as const,
      content:
        `Context:\n${contextText}\n\nAnalyze this anomaly and explain likely causes and next steps. ` +
        `Anomaly details: ${JSON.stringify(anomalyDetails)}.`,
    },
  ]

  const claudeResponse = await callClaude({
    system: INSIGHTS_SYSTEM_PROMPT,
    messages,
    max_tokens: 500,
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
