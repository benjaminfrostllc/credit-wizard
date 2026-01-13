import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getTransactions } from '../lib/supabase'
import {
  buildReminderEvents,
  DEFAULT_RECURRING_CONFIG,
  detectRecurringSeries,
  type RecurringSeries,
} from '../lib/recurring'
import { seededTransactions } from '../data/seedTransactions'
import { sendN8nEvent, type N8nEventPayload } from '../services/n8n'

const classificationStorageKey = 'subscription-classifications'

type Classification = 'essential' | 'subscription'

const loadClassifications = (): Record<string, Classification> => {
  try {
    const stored = localStorage.getItem(classificationStorageKey)
    if (!stored) return {}
    return JSON.parse(stored) as Record<string, Classification>
  } catch {
    return {}
  }
}

const saveClassifications = (value: Record<string, Classification>) => {
  localStorage.setItem(classificationStorageKey, JSON.stringify(value))
}

const toKey = (merchant: string) => merchant.toLowerCase().replace(/\s+/g, '-').trim()

export default function Subscriptions() {
  const { user } = useApp()
  const [series, setSeries] = useState<RecurringSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [useSeeded, setUseSeeded] = useState(false)
  const [reminderStatus, setReminderStatus] = useState<string | null>(null)
  const [negotiationStatus, setNegotiationStatus] = useState<string | null>(null)
  const [classifications, setClassifications] = useState<Record<string, Classification>>(() => loadClassifications())

  useEffect(() => {
    const fetchSeries = async () => {
      if (!user?.id) return
      setLoading(true)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 180)
      const transactions = await getTransactions(user.id, {
        startDate: startDate.toISOString().split('T')[0],
        limit: 500,
      })

      const data = transactions.length > 0 ? transactions : seededTransactions
      setUseSeeded(transactions.length === 0)
      setSeries(detectRecurringSeries(data))
      setLoading(false)
    }

    fetchSeries()
  }, [user?.id])

  const handleToggleClassification = (merchant: string) => {
    const key = toKey(merchant)
    const nextValue: Classification = classifications[key] === 'essential' ? 'subscription' : 'essential'
    const updated = { ...classifications, [key]: nextValue }
    setClassifications(updated)
    saveClassifications(updated)
  }

  const handleEmitReminders = async () => {
    setReminderStatus(null)
    const events = buildReminderEvents(series, 7)
    if (events.length === 0) {
      setReminderStatus('No reminders in the next 7 days.')
      return
    }

    const results = await Promise.all(
      events.map((reminderEvent) => {
        const payload: N8nEventPayload = Object.fromEntries(
          Object.entries(reminderEvent).map(([k, v]) => [k, String(v)])
        ) as N8nEventPayload
        return sendN8nEvent(payload)
      })
    )
    const successCount = results.filter((result) => result.success).length

    if (successCount === events.length) {
      setReminderStatus(`Sent ${successCount} reminder event${successCount === 1 ? '' : 's'} to n8n.`)
      return
    }

    setReminderStatus(
      `Sent ${successCount} of ${events.length} reminder events. Check your webhook configuration.`
    )
  }

  const handleNegotiate = async (merchant: string) => {
    setNegotiationStatus(null)
    const result = await sendN8nEvent({
      event_type: 'subscription.negotiate_request',
      merchant,
      requested_at: new Date().toISOString(),
    })

    if (result.success) {
      setNegotiationStatus(`Negotiation request sent for ${merchant}. We'll follow up soon.`)
      return
    }

    setNegotiationStatus(`Negotiation placeholder for ${merchant}. Configure VITE_N8N_WEBHOOK_URL to activate.`)
  }

  const formattedSeries = useMemo(() => {
    return series.map((item) => {
      const key = toKey(item.merchant)
      return {
        ...item,
        classification: classifications[key] || 'subscription',
      }
    })
  }, [series, classifications])

  return (
    <div className="min-h-screen bg-vault-black pb-24">
      <header className="sticky top-0 z-30 bg-vault-black/95 backdrop-blur-lg border-b border-vault-silver/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-vault-accent hover:text-vault-glow transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
            SUBSCRIPTIONS
          </h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
            border: '1px solid rgba(192, 192, 192, 0.2)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔁</span>
            <div className="space-y-1">
              <h2 className="text-sm text-white font-semibold">Recurring detection</h2>
              <p className="text-xs text-vault-silver-dark">
                Scans 6 months of transactions for monthly repeats with similar merchant + amount.
              </p>
              <p className="text-xs text-vault-silver-dark">
                Thresholds: {DEFAULT_RECURRING_CONFIG.minOccurrences}+ hits, {DEFAULT_RECURRING_CONFIG.monthlyMinDays}-
                {DEFAULT_RECURRING_CONFIG.monthlyMaxDays} day spacing, ±{DEFAULT_RECURRING_CONFIG.amountTolerancePercent * 100}%
                or ${DEFAULT_RECURRING_CONFIG.amountToleranceAbsolute} variance.
              </p>
            </div>
          </div>
        </div>

        {useSeeded && (
          <div className="rounded-xl border border-vault-accent/30 bg-vault-accent/10 px-4 py-3 text-xs text-vault-accent">
            Using seeded transactions so you can preview recurring detection.
          </div>
        )}

        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
            border: '1px solid rgba(192, 192, 192, 0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm text-white font-semibold">Reminders</h2>
              <p className="text-xs text-vault-silver-dark">
                Emit upcoming bills to n8n. Configure VITE_N8N_WEBHOOK_URL to enable.
              </p>
            </div>
            <button
              onClick={handleEmitReminders}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-vault-accent hover:bg-vault-glow transition-colors"
            >
              Emit reminders
            </button>
          </div>
          {reminderStatus && <p className="mt-2 text-xs text-vault-silver-dark">{reminderStatus}</p>}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm text-white font-semibold">Detected subscriptions</h2>
          {loading ? (
            <p className="text-xs text-vault-silver-dark">Detecting recurring charges...</p>
          ) : formattedSeries.length === 0 ? (
            <p className="text-xs text-vault-silver-dark">No recurring subscriptions detected yet.</p>
          ) : (
            formattedSeries.map((item) => (
              <div
                key={`${item.merchant}-${item.last_transaction_date}`}
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
                  border: '1px solid rgba(192, 192, 192, 0.2)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white font-semibold">{item.merchant}</p>
                    <p className="text-xs text-vault-silver-dark">
                      ${item.average_amount.toFixed(2)} • Next due {item.next_due_estimate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleClassification(item.merchant)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors border ${
                        item.classification === 'essential'
                          ? 'bg-vault-success/20 text-vault-success border-vault-success/40'
                          : 'bg-vault-accent/10 text-vault-accent border-vault-accent/40'
                      }`}
                    >
                      {item.classification === 'essential' ? 'Essential bill' : 'Subscription'}
                    </button>
                    <button
                      onClick={() => handleNegotiate(item.merchant)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-vault-silver/30 text-vault-silver-dark hover:text-white hover:border-vault-silver"
                    >
                      Negotiate
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-vault-silver-dark">
                  Cadence: {item.cadence} • {item.occurrences} recent charges
                </p>
              </div>
            ))
          )}
        </div>

        {negotiationStatus && (
          <div className="rounded-xl border border-vault-silver/20 bg-vault-purple/20 px-4 py-3 text-xs text-vault-silver">
            {negotiationStatus}
          </div>
        )}
      </div>
    </div>
  )
}
