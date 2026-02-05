import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

type AlertEventPayload = {
  user_id: string
  event_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message_template_key: string
  payload_json?: Record<string, unknown>
  n8n_webhook_id?: string
  n8n_webhook_url?: string
}

const ALLOWED_EVENT_TYPES = new Set([
  'budget.threshold_reached',
  'spend.unusual',
  'bill.upcoming',
  'balance.low',
  'credit.utilization_high',
  'goal.off_track',
])

const ALLOWED_SEVERITIES = new Set(['info', 'warning', 'critical'])

function resolveWebhookUrl(
  webhookUrl: string | undefined,
  webhookId: string | undefined,
  baseUrl: string | undefined
): string | null {
  if (webhookUrl) {
    return webhookUrl
  }

  if (!webhookId) {
    return null
  }

  if (!baseUrl) {
    return null
  }

  const trimmedBase = baseUrl.replace(/\/$/, '')
  return `${trimmedBase}/n8n/webhook/${webhookId}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const internalKey = process.env.INTERNAL_EVENTS_API_KEY
  if (internalKey && req.headers['x-internal-key'] !== internalKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Supabase service role not configured' })
  }

  const payload = req.body as AlertEventPayload

  if (!payload?.user_id || !payload?.event_type || !payload?.severity || !payload?.title || !payload?.message_template_key) {
    return res.status(400).json({
      error: 'Missing required fields: user_id, event_type, severity, title, message_template_key',
    })
  }

  if (!ALLOWED_EVENT_TYPES.has(payload.event_type)) {
    return res.status(400).json({ error: 'Invalid event_type' })
  }

  if (!ALLOWED_SEVERITIES.has(payload.severity)) {
    return res.status(400).json({ error: 'Invalid severity' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: event, error } = await supabase
    .from('alert_events')
    .insert({
      user_id: payload.user_id,
      event_type: payload.event_type,
      severity: payload.severity,
      title: payload.title,
      message_template_key: payload.message_template_key,
      payload_json: payload.payload_json ?? {},
    })
    .select('id')
    .single()

  if (error || !event) {
    return res.status(500).json({ error: 'Failed to store event', details: error?.message })
  }

  const webhookUrl = resolveWebhookUrl(
    payload.n8n_webhook_url,
    payload.n8n_webhook_id,
    process.env.N8N_WEBHOOK_BASE_URL
  )

  if (!webhookUrl && (payload.n8n_webhook_id || payload.n8n_webhook_url)) {
    return res.status(400).json({ error: 'Invalid n8n webhook configuration' })
  }

  let deliveryStatus = 'pending'
  let deliveryError: string | null = null

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          user_id: payload.user_id,
          event_type: payload.event_type,
          severity: payload.severity,
          title: payload.title,
          message_template_key: payload.message_template_key,
          payload_json: payload.payload_json ?? {},
        }),
      })

      if (response.ok) {
        deliveryStatus = 'delivered'
      } else {
        deliveryStatus = 'failed'
        deliveryError = `Webhook responded with ${response.status}`
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      deliveryStatus = 'failed'
      deliveryError = errorMessage
    }
  }

  if (deliveryStatus !== 'pending') {
    await supabase
      .from('alert_events')
      .update({
        delivery_status: deliveryStatus,
        delivery_error: deliveryError,
        delivered_at: deliveryStatus === 'delivered' ? new Date().toISOString() : null,
      })
      .eq('id', event.id)
  }

  return res.status(200).json({
    success: true,
    event_id: event.id,
    delivery_status: deliveryStatus,
    delivery_error: deliveryError,
    webhook_url: webhookUrl ?? null,
  })
}
