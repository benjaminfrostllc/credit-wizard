import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GoalForm } from '../components/GoalForm'
import { ProgressBar } from '../components/ProgressBar'
import { useApp } from '../context/AppContext'
import {
  calculateGoalProgress,
  calculateRecommendedMonthlyContribution,
  createGoal,
  deleteGoal,
  getBudgetAllocations,
  loadGoals,
  removeBudgetAllocation,
  setBudgetAllocation,
  updateGoal,
  type Goal,
  type GoalInput,
} from '../lib/goals'
import { getSpendingByCategory } from '../lib/supabase'

const DEFAULT_CATEGORIES = [
  'Emergency Fund',
  'Debt Payments',
  'Home',
  'Auto',
  'Education',
  'Healthcare',
  'Food and Drink',
  'Shops',
  'Travel',
  'Recreation',
  'Service',
  'Other',
]

export default function Goals() {
  const { user } = useApp()
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals())
  const [allocations, setAllocations] = useState<Record<string, number>>(() => getBudgetAllocations())
  const [spendingCategories, setSpendingCategories] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  useEffect(() => {
    if (!user?.id) return

    let isActive = true
    getSpendingByCategory(user.id)
      .then((data) => {
        if (!isActive) return
        setSpendingCategories(data.map((item) => item.category))
      })
      .catch(() => {
        if (!isActive) return
        setSpendingCategories([])
      })

    return () => {
      isActive = false
    }
  }, [user?.id])

  const categoryOptions = useMemo(() => {
    const unique = new Set([...DEFAULT_CATEGORIES, ...spendingCategories])
    return Array.from(unique).sort().map((category) => ({
      id: category,
      label: category,
    }))
  }, [spendingCategories])

  const allocationOptions = useMemo(() => {
    const linked = goals
      .map((goal) => goal.linked_category_id)
      .filter((categoryId): categoryId is string => Boolean(categoryId))
    const unique = new Set([...linked, ...Object.keys(allocations)])
    if (unique.size === 0) {
      return categoryOptions.slice(0, 6).map((category) => category.id)
    }
    return Array.from(unique).sort()
  }, [allocations, categoryOptions, goals])

  const handleCreateGoal = (input: GoalInput) => {
    const newGoal = createGoal(input)
    setGoals((prev) => [newGoal, ...prev])
    setShowForm(false)
  }

  const handleUpdateGoal = (input: GoalInput) => {
    if (!editingGoal) return
    const updated = updateGoal(editingGoal.id, input)
    if (!updated) return
    setGoals((prev) => prev.map((goal) => (goal.id === updated.id ? updated : goal)))
    setEditingGoal(null)
  }

  const handleDeleteGoal = (goalId: string) => {
    deleteGoal(goalId)
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId))
  }

  const handleAllocationChange = (categoryId: string, value: string) => {
    const numeric = Number.parseFloat(value)
    if (Number.isNaN(numeric) || numeric <= 0) {
      const rest = { ...allocations }
      delete rest[categoryId]
      removeBudgetAllocation(categoryId)
      setAllocations(rest)
      return
    }

    setBudgetAllocation(categoryId, numeric)
    setAllocations((prev) => ({
      ...prev,
      [categoryId]: numeric,
    }))
  }

  return (
    <div className="min-h-screen bg-vault-black pb-24">
      <header className="sticky top-0 z-30 bg-vault-black/95 backdrop-blur-lg border-b border-vault-silver/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/dashboard"
              className="text-xs text-vault-silver-dark hover:text-white"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
              GOALS
            </h1>
          </div>
          <button
            onClick={() => {
              setEditingGoal(null)
              setShowForm((prev) => !prev)
            }}
            className="px-3 py-2 text-sm rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
          >
            {showForm ? 'Close' : 'New Goal'}
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {showForm && !editingGoal && (
          <GoalForm
            key="create-goal"
            categories={categoryOptions}
            onSave={handleCreateGoal}
            onCancel={() => setShowForm(false)}
          />
        )}

        {editingGoal && (
          <GoalForm
            key={editingGoal.id}
            categories={categoryOptions}
            initialGoal={editingGoal}
            onSave={handleUpdateGoal}
            onCancel={() => setEditingGoal(null)}
          />
        )}

        <section
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
            border: '1px solid rgba(192, 192, 192, 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Budget Allocations</h2>
              <p className="text-xs text-vault-silver-dark">
                Monthly category allocations power linked goal progress.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {allocationOptions.map((categoryId) => (
              <label key={categoryId} className="text-sm text-vault-silver-dark">
                {categoryId}
                <input
                  value={allocations[categoryId]?.toString() ?? ''}
                  onChange={(event) => handleAllocationChange(categoryId, event.target.value)}
                  className="mt-1 w-full rounded-lg bg-vault-black/60 border border-vault-silver/20 px-3 py-2 text-white"
                  inputMode="decimal"
                  placeholder="0"
                />
              </label>
            ))}
            {allocationOptions.length === 0 && (
              <p className="text-sm text-vault-silver-dark">Link a goal to start tracking allocations.</p>
            )}
          </div>
        </section>

        <div className="space-y-4">
          {goals.length === 0 && (
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
                border: '1px solid rgba(192, 192, 192, 0.2)',
              }}
            >
              <p className="text-white font-semibold">No goals yet</p>
              <p className="text-sm text-vault-silver-dark mt-1">
                Add a savings or debt payoff goal to track progress.
              </p>
            </div>
          )}

          {goals.map((goal) => {
            const { contributed, remaining, progressPercent } = calculateGoalProgress(goal)
            const { monthsRemaining, recommendedMonthly } = calculateRecommendedMonthlyContribution(goal)
            const allocation = goal.linked_category_id ? allocations[goal.linked_category_id] : undefined

            return (
              <div
                key={goal.id}
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
                  border: '1px solid rgba(192, 192, 192, 0.2)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/goals/${goal.id}`}
                      className="text-lg font-semibold text-white hover:text-vault-accent"
                    >
                      {goal.name}
                    </Link>
                    <p className="text-xs text-vault-silver-dark">
                      {goal.type === 'savings' ? 'Savings Goal' : 'Debt Payoff'} · Target {goal.target_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingGoal(goal)
                        setShowForm(false)
                      }}
                      className="text-xs text-vault-silver-dark hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <ProgressBar progress={progressPercent} showPercentage={false} />

                <div className="grid gap-2 text-xs text-vault-silver-dark md:grid-cols-3">
                  <div>
                    <p className="text-white font-semibold">
                      ${contributed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p>Contributed</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      ${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p>Remaining</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      ${recommendedMonthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                    </p>
                    <p>{monthsRemaining} month{monthsRemaining === 1 ? '' : 's'} left</p>
                  </div>
                </div>

                {goal.linked_category_id && (
                  <div className="text-xs text-vault-silver-dark">
                    Linked to <span className="text-white">{goal.linked_category_id}</span>
                    {allocation ? (
                      <span> · ${allocation.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo allocated</span>
                    ) : (
                      <span> · No monthly allocation set</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
