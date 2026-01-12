import { useEffect, useMemo, useState } from 'react'
import { getSpendingByCategory, type SpendingByCategory } from '../lib/supabase'

interface CategorySpendChartProps {
  userId: string
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food and Drink': '#22c55e',
  Shops: '#3b82f6',
  Travel: '#8b5cf6',
  Transfer: '#6b7280',
  Payment: '#6b7280',
  Recreation: '#f59e0b',
  Service: '#ec4899',
  Healthcare: '#ef4444',
  Community: '#14b8a6',
  'Bank Fees': '#dc2626',
  Interest: '#7c3aed',
  Tax: '#991b1b',
  Other: '#9ca3af',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
}

function PieChart({ data }: { data: SpendingByCategory[] }) {
  const total = data.reduce((sum, item) => sum + item.total, 0)

  const segments = data.slice(0, 8).map((item, index, items) => {
    const startPercent = items
      .slice(0, index)
      .reduce((sum, entry) => sum + entry.percentage, 0)
    const endPercent = startPercent + item.percentage

    return {
      ...item,
      startPercent,
      endPercent,
    }
  })

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * (percent / 100 - 0.25))
    const y = Math.sin(2 * Math.PI * (percent / 100 - 0.25))
    return [x, y]
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative w-44 h-44 flex-shrink-0">
        <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
          {segments.map((segment) => {
            const [startX, startY] = getCoordinatesForPercent(segment.startPercent)
            const [endX, endY] = getCoordinatesForPercent(segment.endPercent)
            const largeArcFlag = segment.percentage > 50 ? 1 : 0

            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              'L 0 0',
            ].join(' ')

            return (
              <path
                key={segment.category}
                d={pathData}
                fill={getCategoryColor(segment.category)}
                stroke="#1a1525"
                strokeWidth="0.02"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-bold text-white">
              ${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-400">Total Spend</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-2">
        {segments.map((segment) => (
          <div key={segment.category} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: getCategoryColor(segment.category) }}
            />
            <div className="min-w-0">
              <p className="text-xs text-white truncate">{segment.category}</p>
              <p className="text-xs text-gray-500">
                ${segment.total.toFixed(0)} ({segment.percentage.toFixed(0)}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CategorySpendChart({ userId }: CategorySpendChartProps) {
  const [spending, setSpending] = useState<SpendingByCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSpending = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getSpendingByCategory(userId)
        if (!isMounted) return
        setSpending(data)
      } catch (err) {
        console.error('Failed to load spending by category:', err)
        if (isMounted) {
          setError('Unable to load category spending')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadSpending()

    return () => {
      isMounted = false
    }
  }, [userId])

  const totalSpent = useMemo(() => spending.reduce((sum, item) => sum + item.total, 0), [spending])

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
        border: '1px solid rgba(192, 192, 192, 0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📊</span>
        <div>
          <h2 className="text-sm font-bold text-vault-accent" style={{ fontFamily: 'var(--font-pixel)' }}>
            SPEND BY CATEGORY
          </h2>
          <p className="text-xs text-gray-500">Last 30 days</p>
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
      ) : spending.length === 0 ? (
        <div className="text-center py-6 text-vault-silver-dark">
          <p className="text-sm">No spending data yet.</p>
          <p className="text-xs mt-1">Connect a bank to see category breakdowns.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <PieChart data={spending} />
          <p className="text-xs text-gray-500">
            Total spend: ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  )
}
