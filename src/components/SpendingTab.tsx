import { useState, useEffect, useMemo } from 'react'
import {
  getTransactions,
  getSpendingByCategory,
  getCreditUtilization,
  syncTransactions,
  type Transaction,
  type SpendingByCategory,
  type CreditUtilization,
} from '../lib/supabase'

interface SpendingTabProps {
  userId: string
}

// Category colors for the pie chart
const CATEGORY_COLORS: Record<string, string> = {
  'Food and Drink': '#22c55e',
  'Shops': '#3b82f6',
  'Travel': '#8b5cf6',
  'Transfer': '#6b7280',
  'Payment': '#6b7280',
  'Recreation': '#f59e0b',
  'Service': '#ec4899',
  'Healthcare': '#ef4444',
  'Community': '#14b8a6',
  'Bank Fees': '#dc2626',
  'Interest': '#7c3aed',
  'Tax': '#991b1b',
  'Other': '#9ca3af',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Other']
}

// Simple pie chart component
function PieChart({ data }: { data: SpendingByCategory[] }) {
  const total = data.reduce((sum, item) => sum + item.total, 0)

  // Calculate pie segments
  let cumulativePercent = 0
  const segments = data.slice(0, 8).map((item) => {
    const startPercent = cumulativePercent
    cumulativePercent += item.percentage
    return {
      ...item,
      startPercent,
      endPercent: cumulativePercent,
    }
  })

  // Convert percentage to SVG arc coordinates
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * (percent / 100 - 0.25))
    const y = Math.sin(2 * Math.PI * (percent / 100 - 0.25))
    return [x, y]
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* Pie Chart SVG */}
      <div className="relative w-48 h-48 flex-shrink-0">
        <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
          {segments.map((segment, i) => {
            const [startX, startY] = getCoordinatesForPercent(segment.startPercent)
            const [endX, endY] = getCoordinatesForPercent(segment.endPercent)
            const largeArcFlag = segment.percentage > 50 ? 1 : 0

            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `L 0 0`,
            ].join(' ')

            return (
              <path
                key={i}
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
            <p className="text-xl font-bold text-white">
              ${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-400">Total Spent</p>
          </div>
        </div>
      </div>

      {/* Legend */}
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

// Credit utilization bar
function UtilizationBar({ utilization }: { utilization: CreditUtilization }) {
  const getUtilizationColor = (percent: number) => {
    if (percent <= 30) return '#22c55e' // Green - excellent
    if (percent <= 50) return '#f59e0b' // Yellow - good
    if (percent <= 75) return '#f97316' // Orange - fair
    return '#ef4444' // Red - poor
  }

  const color = getUtilizationColor(utilization.utilization_percent)

  return (
    <div className="p-3 bg-vault-purple/20 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        {utilization.logo_url ? (
          <img src={utilization.logo_url} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: utilization.primary_color || '#6366f1' }}
          >
            {utilization.institution_name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{utilization.account_name}</p>
          <p className="text-xs text-gray-500">
            {utilization.institution_name}
            {utilization.mask && ` ****${utilization.mask}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium" style={{ color }}>
            {utilization.utilization_percent.toFixed(0)}%
          </p>
        </div>
      </div>
      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(utilization.utilization_percent, 100)}%`,
            backgroundColor: color,
          }}
        />
        {/* 30% marker */}
        <div className="absolute inset-y-0 left-[30%] w-px bg-gray-500" />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>${utilization.balance_current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span>${utilization.balance_limit.toLocaleString('en-US', { minimumFractionDigits: 2 })} limit</span>
      </div>
    </div>
  )
}

// Transaction row
function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.amount < 0
  const displayAmount = Math.abs(transaction.amount)
  const account = transaction.account as {
    name: string
    mask: string | null
    connection?: { institution_name: string } | null
  } | null

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-vault-purple/10 rounded-lg transition-colors">
      {/* Category icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
        style={{ backgroundColor: `${getCategoryColor(transaction.primary_category)}20` }}
      >
        {transaction.primary_category === 'Food and Drink' && '🍔'}
        {transaction.primary_category === 'Shops' && '🛍️'}
        {transaction.primary_category === 'Travel' && '✈️'}
        {transaction.primary_category === 'Transfer' && '💸'}
        {transaction.primary_category === 'Payment' && '💳'}
        {transaction.primary_category === 'Recreation' && '🎮'}
        {transaction.primary_category === 'Service' && '🔧'}
        {transaction.primary_category === 'Healthcare' && '🏥'}
        {!['Food and Drink', 'Shops', 'Travel', 'Transfer', 'Payment', 'Recreation', 'Service', 'Healthcare'].includes(transaction.primary_category) && '📝'}
      </div>

      {/* Transaction details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          {transaction.merchant_name || transaction.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{transaction.primary_category}</span>
          {account && (
            <>
              <span>-</span>
              <span>{account.connection?.institution_name || account.name}</span>
              {account.mask && <span>****{account.mask}</span>}
            </>
          )}
        </div>
      </div>

      {/* Amount and date */}
      <div className="text-right">
        <p className={`text-sm font-medium ${isIncome ? 'text-green-400' : 'text-white'}`}>
          {isIncome ? '+' : '-'}${displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-500">
          {new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

export function SpendingTab({ userId }: SpendingTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [spending, setSpending] = useState<SpendingByCategory[]>([])
  const [utilization, setUtilization] = useState<CreditUtilization[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  // Load data
  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [txData, spendingData, utilizationData] = await Promise.all([
        getTransactions(userId, { limit: 50 }),
        getSpendingByCategory(userId),
        getCreditUtilization(userId),
      ])

      setTransactions(txData)
      setSpending(spendingData)
      setUtilization(utilizationData)
    } catch (err) {
      console.error('Failed to load spending data:', err)
      setError('Failed to load spending data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userId])

  // Sync transactions from Plaid
  const handleSync = async () => {
    setSyncing(true)
    setError(null)

    try {
      const result = await syncTransactions()
      if (result.success) {
        setLastSynced(new Date())
        await loadData()
      } else {
        setError(result.error || 'Failed to sync transactions')
      }
    } catch (err) {
      console.error('Sync error:', err)
      setError('Failed to sync transactions')
    } finally {
      setSyncing(false)
    }
  }

  // Calculate totals
  const totalSpent = useMemo(() => {
    return spending.reduce((sum, item) => sum + item.total, 0)
  }, [spending])

  const avgUtilization = useMemo(() => {
    if (utilization.length === 0) return 0
    return utilization.reduce((sum, item) => sum + item.utilization_percent, 0) / utilization.length
  }, [utilization])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vault-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with sync button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Spending Overview</h2>
          <p className="text-sm text-gray-400">Last 30 days</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-vault-accent/20 text-vault-accent rounded-lg hover:bg-vault-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Transactions
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {lastSynced && (
        <p className="text-xs text-gray-500">
          Last synced: {lastSynced.toLocaleTimeString()}
        </p>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-vault-purple/20 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Spent</p>
          <p className="text-xl font-bold text-white">
            ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-vault-purple/20 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Transactions</p>
          <p className="text-xl font-bold text-white">{transactions.length}</p>
        </div>
        <div className="bg-vault-purple/20 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Avg. Utilization</p>
          <p className={`text-xl font-bold ${avgUtilization <= 30 ? 'text-green-400' : avgUtilization <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {avgUtilization.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Spending by Category */}
      <div className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
        <h3 className="text-sm font-bold text-vault-accent mb-4 flex items-center gap-2">
          <span>📊</span>
          SPENDING BY CATEGORY
        </h3>
        {spending.length > 0 ? (
          <PieChart data={spending} />
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No spending data available</p>
            <p className="text-sm mt-1">Sync your transactions to see spending breakdown</p>
          </div>
        )}
      </div>

      {/* Credit Utilization */}
      <div className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
        <h3 className="text-sm font-bold text-vault-accent mb-4 flex items-center gap-2">
          <span>💳</span>
          CREDIT UTILIZATION
        </h3>
        {utilization.length > 0 ? (
          <div className="space-y-3">
            {utilization.map((card) => (
              <UtilizationBar key={card.account_id} utilization={card} />
            ))}
            <p className="text-xs text-gray-500 mt-2">
              Keep utilization below 30% for the best credit score impact
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No credit cards linked</p>
            <p className="text-sm mt-1">Connect a bank with credit cards to see utilization</p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
        <h3 className="text-sm font-bold text-vault-accent mb-4 flex items-center gap-2">
          <span>📝</span>
          RECENT TRANSACTIONS
        </h3>
        {transactions.length > 0 ? (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No transactions yet</p>
            <p className="text-sm mt-1">Connect a bank and sync to see transactions</p>
          </div>
        )}
      </div>
    </div>
  )
}
