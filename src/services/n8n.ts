export interface N8nEventPayload {
  event_type: string
  [key: string]: unknown
}

const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined

export async function sendN8nEvent(payload: N8nEventPayload) {
  if (!webhookUrl) {
    console.info('N8N webhook not configured. Event payload:', payload)
    return { success: false, error: 'Missing VITE_N8N_WEBHOOK_URL' }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: text || 'Failed to send event' }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send n8n event:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
