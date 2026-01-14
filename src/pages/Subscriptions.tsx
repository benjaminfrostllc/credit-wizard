export type ReminderEvent = Record<string, unknown>
export type N8nEventPayload = Record<string, string>

async function sendToN8n(payload: N8nEventPayload): Promise<void> {
  void payload
}

export async function emitReminderEvent(reminderEvent: ReminderEvent): Promise<void> {
  const payload: N8nEventPayload = Object.fromEntries(
    Object.entries(reminderEvent).map(([k, v]) => [k, String(v)])
  )

  await sendToN8n(payload)
}

export default function Subscriptions() {
  return null
}
