import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import {
  createBudgetCategories,
  getBudgetCategories,
  getBudgetMonthByDate,
  getEnvelopeAllocations,
  getOrCreateBudgetMonth,
  getSpendingByCategory,
  updateBudgetCategory,
  updateBudgetMonthTotals,
  upsertEnvelopeAllocation,
  type BudgetCategory,
  type BudgetMonth,
} from '../lib/supabase'

interface BudgetEnvelope {
  category: BudgetCategory
  assignedAmount: number
  spentAmount: number
  availableAmount: number
  rolloverAmount: number
}

const DEFAULT_CATEGORIES: Array<Pick<BudgetCategory, 'name' | 'plaid_primary_category' | 'rollover_enabled' | 'sort_order'>> = [
  { name: 'Housing', plaid_primary_category: 'Payment', rollover_enabled: true, sort_order: 1 },
  { name: 'Utilities', plaid_primary_category: 'Service', rollover_enabled: false, sort_order: 2 },
  { name: 'Groceries', plaid_primary_category: 'Food and Drink', rollover_enabled: false, sort_order: 3 },
  { name: 'Transportation', plaid_primary_category: 'Travel', rollover_enabled: false, sort_order: 4 },
  { name: 'Health', plaid_primary_category: 'Healthcare', rollover_enabled: true, sort_order: 5 },
  { name: 'Shopping', plaid_primary_category: 'Shops', rollover_enabled: false, sort_order: 6 },
  { name: 'Entertainment', plaid_primary_category: 'Recreation', rollover_enabled: false, sort_order: 7 },
  { name: 'Savings', plaid_primary_category: null, rollover_enabled: true, sort_order: 8 },
]

function formatMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('default', { month: 'long', year: 'numeric' })
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0]
  const end = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0]
  const previous = new Date(Date.UTC(year, month - 2, 1)).toISOString().split('T')[0]
  return { start, end, previous }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function Budget() {
  const { user } = useApp()
  const [monthValue, setMonthValue] = useState(() => new Date().toISOString().slice(0, 7))
  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth | null>(null)
  const [envelopes, setEnvelopes] = useState<BudgetEnvelope[]>([])
  const [incomeInput, setIncomeInput] = useState('0')
  const [assignOpen, setAssignOpen] = useState(false)
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  const assignedTotal = useMemo(
    () => envelopes.reduce((total, envelope) => total + envelope.assignedAmount, 0),
    [envelopes]
  )

  const remaining = useMemo(() => {
    const income = Number(incomeInput) || 0
    return income - assignedTotal
  }, [assignedTotal, incomeInput])

  useEffect(() => {
    let isActive = true

    const loadBudget = async () => {
      if (!user) return
      setIsLoading(true)
      const { start, end, previous } = getMonthRange(monthValue)
      const monthRecord = await getOrCreateBudgetMonth(user.id, start)

      if (!monthRecord) {
        setIsLoading(false)
        return
      }

      let categories = await getBudgetCategories(user.id)
      if (categories.length === 0) {
        categories = await createBudgetCategories(user.id, DEFAULT_CATEGORIES)
      }

      const allocations = await getEnvelopeAllocations(monthRecord.id)
      const allocationMap = new Map(allocations.map((allocation) => [allocation.category_id, allocation]))

      const previousMonth = await getBudgetMonthByDate(user.id, previous)
      const previousAllocations = previousMonth ? await getEnvelopeAllocations(previousMonth.id) : []
      const previousMap = new Map(previousAllocations.map((allocation) => [allocation.category_id, allocation]))

      const spending = await getSpendingByCategory(user.id, start, end)
      const spendingMap = new Map(spending.map((item) => [item.category, item.total]))

      const nextEnvelopes: BudgetEnvelope[] = categories.map((category) => {
        const allocation = allocationMap.get(category.id)
        const assignedAmount = allocation?.assigned_amount || 0
        const categoryKey = category.plaid_primary_category || category.name
        const spentAmount = spendingMap.get(categoryKey) || 0
        const rolloverAmount = category.rollover_enabled
          ? previousMap.get(category.id)?.available_amount || 0
          : 0
        const availableAmount = assignedAmount - spentAmount + rolloverAmount

        return {
          category,
          assignedAmount,
          spentAmount,
          availableAmount,
          rolloverAmount,
        }
      })

      const syncUpdates = nextEnvelopes.map((envelope) => {
        const existing = allocationMap.get(envelope.category.id)
        if (
          existing &&
          existing.spent_amount === envelope.spentAmount &&
          existing.available_amount === envelope.availableAmount &&
          existing.assigned_amount === envelope.assignedAmount
        ) {
          return null
        }
        return upsertEnvelopeAllocation({
          budget_month_id: monthRecord.id,
          category_id: envelope.category.id,
          assigned_amount: envelope.assignedAmount,
          spent_amount: envelope.spentAmount,
          available_amount: envelope.availableAmount,
        })
      }).filter(Boolean)

      if (syncUpdates.length > 0) {
        await Promise.all(syncUpdates)
      }

      await updateBudgetMonthTotals(monthRecord.id, {
        income_total: monthRecord.income_total,
        assigned_total: nextEnvelopes.reduce((total, envelope) => total + envelope.assignedAmount, 0),
      })

      if (!isActive) return

      setBudgetMonth(monthRecord)
      setEnvelopes(nextEnvelopes)
      setIncomeInput(monthRecord.income_total.toString())
      setLastSynced(new Date().toLocaleTimeString())
      setIsLoading(false)
    }

    loadBudget()

    return () => {
      isActive = false
    }
  }, [monthValue, user])

  const handleAssignSave = async () => {
    if (!budgetMonth) return

    const incomeTotal = Number(incomeInput) || 0
    const nextEnvelopes = envelopes.map((envelope) => ({
      ...envelope,
      availableAmount: envelope.assignedAmount - envelope.spentAmount + envelope.rolloverAmount,
    }))

    setEnvelopes(nextEnvelopes)

    await Promise.all(
      nextEnvelopes.map((envelope) =>
        upsertEnvelopeAllocation({
          budget_month_id: budgetMonth.id,
          category_id: envelope.category.id,
          assigned_amount: envelope.assignedAmount,
          spent_amount: envelope.spentAmount,
          available_amount: envelope.availableAmount,
        })
      )
    )

    await updateBudgetMonthTotals(budgetMonth.id, {
      income_total: incomeTotal,
      assigned_total: nextEnvelopes.reduce((total, envelope) => total + envelope.assignedAmount, 0),
    })

    setAssignOpen(false)
    setLastSynced(new Date().toLocaleTimeString())
  }

  const handleTransfer = async () => {
    if (!budgetMonth) return
    if (!transferFrom || !transferTo || transferFrom === transferTo) return

    const amount = Number(transferAmount)
    if (!amount || amount <= 0) return

    const nextEnvelopes = envelopes.map((envelope) => {
      if (envelope.category.id === transferFrom) {
        return { ...envelope, assignedAmount: envelope.assignedAmount - amount }
      }
      if (envelope.category.id === transferTo) {
        return { ...envelope, assignedAmount: envelope.assignedAmount + amount }
      }
      return envelope
    }).map((envelope) => ({
      ...envelope,
      availableAmount: envelope.assignedAmount - envelope.spentAmount + envelope.rolloverAmount,
    }))

    setEnvelopes(nextEnvelopes)

    await Promise.all(
      nextEnvelopes.map((envelope) =>
        upsertEnvelopeAllocation({
          budget_month_id: budgetMonth.id,
          category_id: envelope.category.id,
          assigned_amount: envelope.assignedAmount,
          spent_amount: envelope.spentAmount,
          available_amount: envelope.availableAmount,
        })
      )
    )

    await updateBudgetMonthTotals(budgetMonth.id, {
      income_total: Number(incomeInput) || 0,
      assigned_total: nextEnvelopes.reduce((total, envelope) => total + envelope.assignedAmount, 0),
    })

    setTransferAmount('')
    setTransferFrom('')
    setTransferTo('')
    setLastSynced(new Date().toLocaleTimeString())
  }

  const handleRolloverToggle = async (category: BudgetCategory) => {
    const nextValue = !category.rollover_enabled
    await updateBudgetCategory(category.id, { rollover_enabled: nextValue })

    const { previous } = getMonthRange(monthValue)
    const previousMonth = user ? await getBudgetMonthByDate(user.id, previous) : null
    const previousAllocations = previousMonth ? await getEnvelopeAllocations(previousMonth.id) : []
    const previousMap = new Map(previousAllocations.map((allocation) => [allocation.category_id, allocation]))

    const nextEnvelopes = envelopes.map((envelope) => {
      if (envelope.category.id !== category.id) return envelope
      const rolloverAmount = nextValue ? previousMap.get(category.id)?.available_amount || 0 : 0
      return {
        ...envelope,
        category: { ...envelope.category, rollover_enabled: nextValue },
        rolloverAmount,
        availableAmount: envelope.assignedAmount - envelope.spentAmount + rolloverAmount,
      }
    })

    setEnvelopes(nextEnvelopes)
    setLastSynced(new Date().toLocaleTimeString())
  }

  return (
    <div className="min-h-screen bg-vault-black pb-24">
      <header className="sticky top-0 z-30 bg-vault-black/95 backdrop-blur-lg border-b border-vault-silver/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
            BUDGET
          </h1>
          <input
            type="month"
            value={monthValue}
            onChange={(event) => setMonthValue(event.target.value)}
            className="bg-vault-black border border-vault-silver/30 text-white text-xs px-2 py-1 rounded-lg"
          />
        </div>
        <p className="text-xs text-vault-silver-dark mt-1">
          {formatMonthLabel(monthValue)} · Zero-based budgeting
        </p>
      </header>

      <div className="p-4 space-y-6">
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-vault-silver-dark">Income total</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(Number(incomeInput) || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-vault-silver-dark">Assigned</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(assignedTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-vault-silver-dark">Remaining</p>
              <p className={`text-lg font-semibold ${remaining === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-vault-silver-dark">
            <span>{isLoading ? 'Syncing budgets…' : 'Budget status'}</span>
            <span>{lastSynced ? `Last sync ${lastSynced}` : 'Not synced yet'}</span>
          </div>
          <button
            onClick={() => setAssignOpen((prev) => !prev)}
            className="w-full bg-vault-accent text-white text-sm font-semibold py-2 rounded-xl"
          >
            {assignOpen ? 'Close assignment panel' : 'Assign income'}
          </button>
        </div>

        {assignOpen && (
          <div
            className="rounded-2xl p-4 space-y-4"
            style={{ background: 'linear-gradient(145deg, #161422 0%, #11101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
          >
            <div>
              <label className="text-xs text-vault-silver-dark">Monthly income</label>
              <input
                type="number"
                value={incomeInput}
                onChange={(event) => setIncomeInput(event.target.value)}
                className="mt-1 w-full bg-vault-black border border-vault-silver/30 text-white text-sm px-3 py-2 rounded-lg"
              />
            </div>
            <div className="space-y-3">
              <p className="text-xs text-vault-silver-dark">Assign income to envelopes</p>
              {envelopes.map((envelope) => (
                <div key={envelope.category.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-white">{envelope.category.name}</p>
                    <p className="text-[11px] text-vault-silver-dark">
                      {envelope.category.rollover_enabled ? 'Rollover on' : 'Rollover off'}
                    </p>
                  </div>
                  <input
                    type="number"
                    value={envelope.assignedAmount}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setEnvelopes((prev) =>
                        prev.map((item) =>
                          item.category.id === envelope.category.id
                            ? { ...item, assignedAmount: Number.isNaN(value) ? 0 : value }
                            : item
                        )
                      )
                    }}
                    className="w-28 bg-vault-black border border-vault-silver/30 text-white text-sm px-2 py-1 rounded-lg text-right"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleAssignSave}
              className="w-full bg-emerald-500 text-white text-sm font-semibold py-2 rounded-xl"
            >
              Save assignments
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Monthly envelopes</h2>
            <span className="text-xs text-vault-silver-dark">Assigned / Spent / Available</span>
          </div>
          <div className="space-y-2">
            {envelopes.map((envelope) => (
              <div
                key={envelope.category.id}
                className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(192, 192, 192, 0.1)' }}
              >
                <div>
                  <p className="text-sm text-white font-medium">{envelope.category.name}</p>
                  <p className="text-[11px] text-vault-silver-dark">
                    {envelope.category.rollover_enabled
                      ? `Rollover +${formatCurrency(envelope.rolloverAmount)}`
                      : 'No rollover'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-vault-silver-dark">
                    {formatCurrency(envelope.assignedAmount)} / {formatCurrency(envelope.spentAmount)}
                  </p>
                  <p className="text-sm font-semibold text-white">{formatCurrency(envelope.availableAmount)}</p>
                  <button
                    onClick={() => handleRolloverToggle(envelope.category)}
                    className="text-[11px] text-vault-accent mt-1"
                  >
                    Toggle rollover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
        >
          <h2 className="text-sm font-semibold text-white">Move money between categories</h2>
          <div className="grid grid-cols-1 gap-2">
            <select
              value={transferFrom}
              onChange={(event) => setTransferFrom(event.target.value)}
              className="bg-vault-black border border-vault-silver/30 text-white text-sm px-2 py-2 rounded-lg"
            >
              <option value="">From category</option>
              {envelopes.map((envelope) => (
                <option key={envelope.category.id} value={envelope.category.id}>
                  {envelope.category.name}
                </option>
              ))}
            </select>
            <select
              value={transferTo}
              onChange={(event) => setTransferTo(event.target.value)}
              className="bg-vault-black border border-vault-silver/30 text-white text-sm px-2 py-2 rounded-lg"
            >
              <option value="">To category</option>
              {envelopes.map((envelope) => (
                <option key={envelope.category.id} value={envelope.category.id}>
                  {envelope.category.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              placeholder="Amount"
              className="bg-vault-black border border-vault-silver/30 text-white text-sm px-3 py-2 rounded-lg"
            />
            <button
              onClick={handleTransfer}
              className="bg-vault-accent text-white text-sm font-semibold py-2 rounded-xl"
            >
              Transfer funds
            </button>
          </div>
        </div>

        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(192, 192, 192, 0.1)' }}
        >
          <h2 className="text-sm font-semibold text-white">Budget formulas</h2>
          <ul className="text-xs text-vault-silver-dark space-y-1">
            <li>Remaining = Income total − Assigned total</li>
            <li>Available = Assigned − Spent + (Rollover if enabled)</li>
            <li>Spent is pulled from categorized transactions for the month.</li>
          </ul>
          <div className="text-xs text-vault-silver-dark mt-2">
            Example: $4,000 income − $4,000 assigned = $0 remaining. Groceries assigned $600, spent $420,
            rollover $50 ⇒ available $230.
          </div>
        </div>
      </div>
    </div>
  )
}
