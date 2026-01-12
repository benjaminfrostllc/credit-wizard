import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  applyRules,
  createCategory,
  createCategoryRule,
  deleteCategory,
  ensureDefaultCategories,
  getCategoryRules,
  getTransactions,
  getSpendingByCategory,
  getCreditUtilization,
  syncTransactions,
  updateCategory,
  updateTransactionCategory,
  DEFAULT_CATEGORIES,
  type Category,
  type Transaction,
  type SpendingByCategory,
  type CreditUtilization,
} from '../lib/supabase'

interface SpendingTabProps {
  userId: string
}

const DEFAULT_CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((category) => [category.name, category.color])
)

// Simple pie chart component
function PieChart({
  data,
  categoryColors,
}: {
  data: SpendingByCategory[]
  categoryColors: Record<string, string>
}) {
  const total = data.reduce((sum, item) => sum + item.total, 0)
  const getCategoryColor = (category: string) =>
    categoryColors[category] || DEFAULT_CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLORS['Other']

  // Calculate pie segments
  const segments = data.slice(0, 8).reduce<
    Array<SpendingByCategory & { startPercent: number; endPercent: number }>
  >((acc, item) => {
    const startPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0
    const endPercent = startPercent + item.percentage
    return [...acc, { ...item, startPercent, endPercent }]
  }, [])

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

function CategoryRow({
  category,
  onSave,
  onDelete,
}: {
  category: Category
  onSave: (categoryId: string, name: string, color: string) => Promise<void>
  onDelete: (categoryId: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLORS['Other'])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(category.id, name, color)
    setIsSaving(false)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const displayColor = isEditing ? color : category.color || DEFAULT_CATEGORY_COLORS['Other']

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-vault-purple/10 p-2">
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: displayColor }} />
      {isEditing ? (
        <>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="bg-vault-purple/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-vault-accent"
          />
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-7 w-10 rounded border border-white/10 bg-vault-purple/20"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-2 py-1 text-xs bg-vault-accent/20 text-vault-accent rounded-lg hover:bg-vault-accent/30 transition-colors disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-white">{category.name}</span>
          <button
            type="button"
            onClick={() => {
              setName(category.name)
              setColor(category.color || DEFAULT_CATEGORY_COLORS['Other'])
              setIsEditing(true)
            }}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </>
      )}
    </div>
  )
}

// Transaction row
function TransactionRow({
  transaction,
  categories,
  categoryColors,
  onUpdateCategory,
  isUpdating,
}: {
  transaction: Transaction
  categories: Category[]
  categoryColors: Record<string, string>
  onUpdateCategory: (transaction: Transaction, categoryId: string, createRule: boolean) => Promise<void>
  isUpdating: boolean
}) {
  const isIncome = transaction.amount < 0
  const displayAmount = Math.abs(transaction.amount)
  const account = transaction.account as {
    name: string
    mask: string | null
    connection?: { institution_name: string } | null
  } | null
  const currentCategoryId =
    transaction.category_id ||
    categories.find((category) => category.name === transaction.primary_category)?.id ||
    ''
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null)
  const [createRule, setCreateRule] = useState(false)
  const getCategoryColor = (category: string) =>
    categoryColors[category] || DEFAULT_CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLORS['Other']
  const selectedCategoryId = draftCategoryId ?? currentCategoryId
  const isDirty = draftCategoryId !== null && draftCategoryId !== currentCategoryId

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
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={selectedCategoryId}
            onChange={(event) => {
              const nextValue = event.target.value
              setDraftCategoryId(nextValue)
              if (nextValue === currentCategoryId) {
                setDraftCategoryId(null)
                setCreateRule(false)
              }
            }}
            disabled={isUpdating}
            className="bg-vault-purple/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-vault-accent"
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {isDirty && (
            <>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={createRule}
                  onChange={(event) => setCreateRule(event.target.checked)}
                  disabled={isUpdating}
                  className="accent-vault-accent"
                />
                Create rule from this transaction
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCategoryId) {
                      onUpdateCategory(transaction, selectedCategoryId, createRule)
                      setDraftCategoryId(null)
                      setCreateRule(false)
                    }
                  }}
                  disabled={isUpdating || !selectedCategoryId}
                  className="px-2 py-1 text-xs bg-vault-accent/20 text-vault-accent rounded-lg hover:bg-vault-accent/30 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftCategoryId(null)
                    setCreateRule(false)
                  }}
                  disabled={isUpdating}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [updatingTransactionId, setUpdatingTransactionId] = useState<string | null>(null)
  const [categoryActionError, setCategoryActionError] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_CATEGORY_COLORS['Other'])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setCategoryActionError(null)

    try {
      const [categoryData, ruleData, txData, spendingData, utilizationData] = await Promise.all([
        ensureDefaultCategories(userId),
        getCategoryRules(userId),
        getTransactions(userId, { limit: 50 }),
        getSpendingByCategory(userId),
        getCreditUtilization(userId),
      ])

      const { transactions: categorizedTransactions, updates } = applyRules(txData, ruleData, categoryData)
      let nextSpending = spendingData

      if (updates.length > 0) {
        await Promise.all(
          updates.map((update) =>
            updateTransactionCategory(update.transaction_id, userId, update.category_id, update.primary_category)
          )
        )
        nextSpending = await getSpendingByCategory(userId)
      }

      setCategories(categoryData)
      setTransactions(categorizedTransactions)
      setSpending(nextSpending)
      setUtilization(utilizationData)
    } catch (err) {
      console.error('Failed to load spending data:', err)
      setError('Failed to load spending data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const categoryColors = useMemo(() => {
    const colors = { ...DEFAULT_CATEGORY_COLORS }
    categories.forEach((category) => {
      if (category.color) {
        colors[category.name] = category.color
      }
    })
    return colors
  }, [categories])

  const handleUpdateCategory = async (
    transaction: Transaction,
    categoryId: string,
    createRule: boolean
  ) => {
    const category = categories.find((item) => item.id === categoryId)
    if (!category) {
      return
    }

    setUpdatingTransactionId(transaction.id)
    setCategoryActionError(null)

    try {
      const result = await updateTransactionCategory(transaction.id, userId, categoryId, category.name)
      if (!result.success) {
        setCategoryActionError(result.error || 'Failed to update transaction category')
        return
      }

      if (createRule) {
        const matchValue = transaction.merchant_name?.trim() || transaction.name
        const matchType = transaction.merchant_name ? 'merchant' : 'name'
        const source = transaction.merchant_name ? 'merchant' : 'user'
        const ruleResult = await createCategoryRule(userId, {
          category_id: categoryId,
          match_type: matchType,
          match_value: matchValue,
          source,
        })

        if (!ruleResult.rule) {
          setCategoryActionError(ruleResult.error || 'Failed to create rule')
        }
      }

      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transaction.id
            ? { ...tx, category_id: categoryId, primary_category: category.name }
            : tx
        )
      )
      const updatedSpending = await getSpendingByCategory(userId)
      setSpending(updatedSpending)
    } catch (err) {
      console.error('Failed to update category:', err)
      setCategoryActionError('Failed to update category')
    } finally {
      setUpdatingTransactionId(null)
    }
  }

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      return
    }

    setCategoryActionError(null)
    const result = await createCategory(userId, { name, color: newCategoryColor })

    if (!result.category) {
      setCategoryActionError(result.error || 'Failed to create category')
      return
    }

    setCategories((prev) => [...prev, result.category].sort((a, b) => a.name.localeCompare(b.name)))
    setNewCategoryName('')
    setNewCategoryColor(DEFAULT_CATEGORY_COLORS['Other'])
  }

  const handleUpdateCategoryDetails = async (categoryId: string, name: string, color: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    setCategoryActionError(null)
    const result = await updateCategory(categoryId, { name: trimmedName, color })

    if (!result.success) {
      setCategoryActionError(result.error || 'Failed to update category')
      return
    }

    setCategories((prev) =>
      prev
        .map((category) =>
          category.id === categoryId ? { ...category, name: trimmedName, color } : category
        )
        .filter((category): category is Category => Boolean(category))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Delete this category? Transactions using it will keep the last assigned name.')) {
      return
    }

    setCategoryActionError(null)
    const result = await deleteCategory(categoryId)

    if (!result.success) {
      setCategoryActionError(result.error || 'Failed to delete category')
      return
    }

    setCategories((prev) => prev.filter((category) => category.id !== categoryId))
  }

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
          <PieChart data={spending} categoryColors={categoryColors} />
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No spending data available</p>
            <p className="text-sm mt-1">Sync your transactions to see spending breakdown</p>
          </div>
        )}
      </div>

      {/* Category Management */}
      <div className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
        <h3 className="text-sm font-bold text-vault-accent mb-4 flex items-center gap-2">
          <span>🏷️</span>
          CATEGORIES
        </h3>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="New category name"
              className="bg-vault-purple/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-vault-accent"
            />
            <input
              type="color"
              value={newCategoryColor}
              onChange={(event) => setNewCategoryColor(event.target.value)}
              className="h-9 w-12 rounded border border-white/10 bg-vault-purple/20"
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              className="px-3 py-2 text-sm bg-vault-accent/20 text-vault-accent rounded-lg hover:bg-vault-accent/30 transition-colors"
            >
              Add Category
            </button>
          </div>
          {categoryActionError && (
            <p className="text-xs text-red-400">{categoryActionError}</p>
          )}
          {categories.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onSave={handleUpdateCategoryDetails}
                  onDelete={handleDeleteCategory}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No categories found.</p>
          )}
        </div>
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
              <TransactionRow
                key={tx.id}
                transaction={tx}
                categories={categories}
                categoryColors={categoryColors}
                onUpdateCategory={handleUpdateCategory}
                isUpdating={updatingTransactionId === tx.id}
              />
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
