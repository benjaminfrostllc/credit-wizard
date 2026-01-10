import type { VercelRequest, VercelResponse } from '@vercel/node'

const SYSTEM_PROMPT = `You are The Oracle, a mystical AI guide within Credit Wizard - a gamified credit repair and business funding portal created by Benjamin Frost.

Your personality:
- Wise and mystical, speaking with an air of ancient knowledge
- Encouraging and supportive, celebrating client progress
- Practical and knowledgeable about credit repair and business funding
- Use occasional magical/wizard metaphors (spells, potions, quests, etc.)

Your knowledge areas:
- Personal credit repair and monitoring
- Business credit building (DUNS numbers, tradelines, Net-30 accounts)
- LLC formation and business structure
- Bank account relationships for business funding
- Online presence for business legitimacy
- Document requirements for credit applications

Guidelines:
- Keep responses concise (2-3 paragraphs max)
- Be helpful and actionable
- If asked about specific account credentials or sensitive data, remind users to never share passwords with AI
- Encourage users to complete their portal tasks
- Reference the portal sections when relevant (The Cornerstone, The Ascent, The Vault, The Beacon, The Arsenal, The Scroll Chamber)

Remember: You are helping clients on their journey to financial empowerment through credit repair and business funding.`

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    return res.status(500).json({
      error: 'OpenAI API key not configured',
      message: "The mystical connection is not yet established. Please add your OpenAI API key to enable The Oracle's powers."
    })
  }

  try {
    const { userMessage, conversationHistory } = req.body

    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage is required' })
    }

    // Convert conversation history to OpenAI format
    const messages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(conversationHistory || []).map((msg: { role: string; text: string }) => ({
        role: (msg.role === 'oracle' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: msg.text,
      })),
      { role: 'user', content: userMessage },
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API error:', error)

      if (response.status === 401) {
        return res.status(401).json({
          error: 'Invalid API key',
          message: "The Oracle's connection has been disrupted. Please verify your API key is valid."
        })
      }
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate limited',
          message: "The mystical energies are overwhelmed. Please wait a moment and try again."
        })
      }

      return res.status(500).json({
        error: 'OpenAI API error',
        message: "A disturbance in the magical realm prevents my response. Please try again shortly."
      })
    }

    const data = await response.json()
    const oracleResponse = data.choices[0]?.message?.content || "The Oracle's vision is clouded. Please rephrase your question."

    return res.status(200).json({ response: oracleResponse })
  } catch (error) {
    console.error('Oracle error:', error)
    return res.status(500).json({
      error: 'Server error',
      message: "The connection to the mystical realm has been interrupted. Please try again."
    })
  }
}
