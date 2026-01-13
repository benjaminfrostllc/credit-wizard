import { useEffect, useMemo, useState } from 'react'
import { getBudgetSummary, type BudgetSummary } from '../lib/supabase'

interface BudgetSummaryCardProps {
  userId: string
}

export function BudgetSummaryCard({ userId }: BudgetSummaryCardProps) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSummary = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getBudgetSummary(userId)
        if (!isMounted) return
        setSummary(data)
      } catch (err) {
        console.error('Failed to load budget summary:', err)
        if (isMounted) {
          setError('Unable to load budget summary')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      isMounted = false
    }
  }, [userId])

  const progress = useMemo(() => {
    if (!summary || summary.assigned <= 0) return 0
    return Math.min((summary.spent / summary.assigned) * 100, 100)
  }, [summary])

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
        border: '1px solid rgba(192, 192, 192, 0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🧾</span>
        <h2 className="text-sm font-bold text-vault-accent" style={{ fontFamily: 'var(--font-pixel)' }}>
          MONTHLY BUDGET
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vault-accent" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : !summary ? (
        <div className="text-center py-6 text-vault-silver-dark">
          <p className="text-sm">No budget set for this month.</p>
          <p className="text-xs mt-1">Create a budget to track assigned and remaining funds.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-vault-silver-dark">Remaining</p>
              <p className={`text-2xl font-bold ${summary.remaining >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                ${summary.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              {summary.month && (
                <p className="text-xs text-gray-500 mt-1">{summary.month}</p>
              )}
            </div>
            <div className="text-right text-xs text-vault-silver-dark">
              <p>Assigned: ${summary.assigned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              <p>Spent: ${summary.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 rounded-full bg-vault-black overflow-hidden border border-vault-silver/10">
              <div
                className="h-full bg-gradient-to-r from-vault-accent to-vault-glow rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {progress.toFixed(0)}% of assigned budget spent
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
