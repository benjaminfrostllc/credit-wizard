import { useEffect, useState } from 'react'
import { getUpcomingBills, type UpcomingBill } from '../lib/supabase'

interface UpcomingBillsListProps {
  userId: string
}

function getDaysUntil(dateString: string) {
  const today = new Date()
  const dueDate = new Date(dateString)
  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function UpcomingBillsList({ userId }: UpcomingBillsListProps) {
  const [bills, setBills] = useState<UpcomingBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadBills = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getUpcomingBills(userId)
        if (!isMounted) return
        setBills(data)
      } catch (err) {
        console.error('Failed to load upcoming bills:', err)
        if (isMounted) {
          setError('Unable to load upcoming bills')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadBills()

    return () => {
      isMounted = false
    }
  }, [userId])

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
        border: '1px solid rgba(192, 192, 192, 0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🗓️</span>
        <h2 className="text-sm font-bold text-vault-accent" style={{ fontFamily: 'var(--font-pixel)' }}>
          UPCOMING BILLS
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
      ) : bills.length === 0 ? (
        <div className="text-center py-6 text-vault-silver-dark">
          <p className="text-sm">No bills scheduled.</p>
          <p className="text-xs mt-1">Add recurring bills to stay ahead.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => {
            const daysUntil = getDaysUntil(bill.due_date)
            const isPastDue = daysUntil < 0
            const statusLabel = isPastDue ? 'Past due' : daysUntil === 0 ? 'Due today' : `Due in ${daysUntil}d`

            return (
              <div key={bill.id} className="flex items-center justify-between bg-vault-purple/20 rounded-xl p-3">
                <div>
                  <p className="text-sm text-white font-medium">{bill.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(bill.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {bill.autopay ? ' • Autopay' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white font-semibold">
                    ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs ${isPastDue ? 'text-red-400' : 'text-vault-silver-dark'}`}>
                    {statusLabel}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
