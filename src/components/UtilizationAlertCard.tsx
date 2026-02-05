import { useEffect, useMemo, useState } from 'react'
import { getCreditUtilization, type CreditUtilization } from '../lib/supabase'

interface UtilizationAlertCardProps {
  userId: string
}

export function UtilizationAlertCard({ userId }: UtilizationAlertCardProps) {
  const [utilization, setUtilization] = useState<CreditUtilization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadUtilization = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getCreditUtilization(userId)
        if (!isMounted) return
        setUtilization(data)
      } catch (err) {
        console.error('Failed to load utilization data:', err)
        if (isMounted) {
          setError('Unable to load utilization alerts')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadUtilization()

    return () => {
      isMounted = false
    }
  }, [userId])

  const warnings = useMemo(() => {
    return utilization.filter((item) => item.utilization_percent > 30)
  }, [utilization])

  const averageUtilization = useMemo(() => {
    if (utilization.length === 0) return 0
    return utilization.reduce((sum, item) => sum + item.utilization_percent, 0) / utilization.length
  }, [utilization])

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
        border: '1px solid rgba(192, 192, 192, 0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚠️</span>
        <div>
          <h2 className="text-sm font-bold text-vault-accent" style={{ fontFamily: 'var(--font-pixel)' }}>
            UTILIZATION WARNINGS
          </h2>
          <p className="text-xs text-gray-500">Keep usage below 30% for best score impact</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vault-accent" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : utilization.length === 0 ? (
        <div className="text-center py-6 text-vault-silver-dark">
          <p className="text-sm">No credit cards linked.</p>
          <p className="text-xs mt-1">Connect a bank to see utilization alerts.</p>
        </div>
      ) : warnings.length === 0 ? (
        <div className="text-center py-6 text-green-400">
          <p className="text-sm font-medium">All utilization levels are healthy.</p>
          <p className="text-xs text-vault-silver-dark mt-1">Average utilization: {averageUtilization.toFixed(0)}%</p>
        </div>
      ) : (
        <div className="space-y-3">
          {warnings.map((card) => (
            <div key={card.account_id} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div>
                <p className="text-sm text-white font-medium">{card.account_name}</p>
                <p className="text-xs text-gray-500">{card.institution_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-400">
                  {card.utilization_percent.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">
                  ${card.balance_current.toLocaleString('en-US', { minimumFractionDigits: 2 })} of
                  ${card.balance_limit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Consider making an early payment to reduce utilization.
          </p>
        </div>
      )}
    </div>
  )
}
