import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GoalForm } from '../components/GoalForm'
import { ProgressBar } from '../components/ProgressBar'
import {
  addGoalContribution,
  calculateGoalProgress,
  calculateRecommendedMonthlyContribution,
  getBudgetAllocations,
  getGoalById,
  removeBudgetAllocation,
  setBudgetAllocation,
  updateGoal,
  type Goal,
  type GoalInput,
} from '../lib/goals'

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

export default function GoalDetail() {
  const { goalId } = useParams()
  const [goal, setGoal] = useState<Goal | null>(() => (goalId ? getGoalById(goalId) : null))
  const [allocationMap, setAllocationMap] = useState<Record<string, number>>(() => getBudgetAllocations())
  const [manualAmount, setManualAmount] = useState('')
  const [showEdit, setShowEdit] = useState(false)

  const { contributed, remaining, progressPercent } = useMemo(() => {
    if (!goal) {
      return { contributed: 0, remaining: 0, progressPercent: 0 }
    }
    return calculateGoalProgress(goal)
  }, [goal])

  const { monthsRemaining, recommendedMonthly } = useMemo(() => {
    if (!goal) {
      return { monthsRemaining: 1, recommendedMonthly: 0 }
    }
    return calculateRecommendedMonthlyContribution(goal)
  }, [goal])

  const allocationAmount = goal?.linked_category_id
    ? allocationMap[goal.linked_category_id] || 0
    : 0

  const handleUpdateGoal = (input: GoalInput) => {
    if (!goal) return
    const updated = updateGoal(goal.id, input)
    if (!updated) return
    setGoal(updated)
    setShowEdit(false)
  }

  const handleManualContribution = (event: React.FormEvent) => {
    event.preventDefault()
    if (!goal) return

    const parsed = Number.parseFloat(manualAmount)
    if (Number.isNaN(parsed) || parsed <= 0) return

    const updated = addGoalContribution(goal.id, {
      amount: parsed,
      date: new Date().toISOString(),
      source: 'manual',
    })

    if (updated) {
      setGoal(updated)
      setManualAmount('')
    }
  }

  const handleApplyAllocation = () => {
    if (!goal || allocationAmount <= 0) return
    const updated = addGoalContribution(goal.id, {
      amount: allocationAmount,
      date: new Date().toISOString(),
      source: 'allocation',
      note: 'Monthly allocation applied',
    })
    if (updated) {
      setGoal(updated)
    }
  }

  const handleAllocationChange = (value: string) => {
    if (!goal?.linked_category_id) return
    const numeric = Number.parseFloat(value)
    if (Number.isNaN(numeric) || numeric <= 0) {
      removeBudgetAllocation(goal.linked_category_id)
      setAllocationMap((prev) => {
        const rest = { ...prev }
        delete rest[goal.linked_category_id as string]
        return rest
      })
      return
    }

    setBudgetAllocation(goal.linked_category_id, numeric)
    setAllocationMap((prev) => ({
      ...prev,
      [goal.linked_category_id as string]: numeric,
    }))
  }

  const categoryOptions = useMemo(() => {
    const unique = new Set(DEFAULT_CATEGORIES)
    if (goal?.linked_category_id) {
      unique.add(goal.linked_category_id)
    }
    return Array.from(unique).sort().map((category) => ({
      id: category,
      label: category,
    }))
  }, [goal])

  if (!goal) {
    return (
      <div className="min-h-screen bg-vault-black p-6 text-white">
        <Link to="/goals" className="text-sm text-vault-silver-dark">← Back to Goals</Link>
        <p className="mt-4">Goal not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vault-black pb-24">
      <header className="sticky top-0 z-30 bg-vault-black/95 backdrop-blur-lg border-b border-vault-silver/10 px-4 py-3">
        <Link
          to="/goals"
          className="text-xs text-vault-silver-dark hover:text-white"
        >
          ← Back to Goals
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
            {goal.name}
          </h1>
          <button
            onClick={() => setShowEdit((prev) => !prev)}
            className="text-xs text-vault-silver-dark hover:text-white"
          >
            {showEdit ? 'Close' : 'Edit'}
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {showEdit && (
          <GoalForm
            key={goal.id}
            categories={categoryOptions}
            initialGoal={goal}
            onSave={handleUpdateGoal}
            onCancel={() => setShowEdit(false)}
          />
        )}

        <section
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
            border: '1px solid rgba(192, 192, 192, 0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-vault-silver-dark">Target</p>
              <p className="text-lg font-semibold text-white">
                ${goal.target_amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-vault-silver-dark">Target date</p>
              <p className="text-sm text-white">{goal.target_date}</p>
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
              <p>{monthsRemaining} month{monthsRemaining === 1 ? '' : 's'} to go</p>
            </div>
          </div>
        </section>

        {goal.linked_category_id && (
          <section
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
              border: '1px solid rgba(192, 192, 192, 0.2)',
            }}
          >
            <div>
              <h2 className="text-lg font-bold text-white">Linked Budget Category</h2>
              <p className="text-xs text-vault-silver-dark">
                {goal.linked_category_id}
              </p>
            </div>
            <label className="block text-sm text-vault-silver-dark">
              Monthly allocation
              <input
                value={allocationAmount ? allocationAmount.toString() : ''}
                onChange={(event) => handleAllocationChange(event.target.value)}
                className="mt-1 w-full rounded-lg bg-vault-black/60 border border-vault-silver/20 px-3 py-2 text-white"
                inputMode="decimal"
                placeholder="0"
              />
            </label>
            <button
              onClick={handleApplyAllocation}
              className="w-full py-2 rounded-lg font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
            >
              Apply Allocation to Progress
            </button>
          </section>
        )}

        <section
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
            border: '1px solid rgba(192, 192, 192, 0.2)',
          }}
        >
          <div>
            <h2 className="text-lg font-bold text-white">Add Contribution</h2>
            <p className="text-xs text-vault-silver-dark">Track progress based on saved allocations.</p>
          </div>
          <form onSubmit={handleManualContribution} className="flex flex-col gap-2 md:flex-row">
            <input
              value={manualAmount}
              onChange={(event) => setManualAmount(event.target.value)}
              className="flex-1 rounded-lg bg-vault-black/60 border border-vault-silver/20 px-3 py-2 text-white"
              inputMode="decimal"
              placeholder="250"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
            >
              Add
            </button>
          </form>
        </section>

        <section
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
            border: '1px solid rgba(192, 192, 192, 0.2)',
          }}
        >
          <div>
            <h2 className="text-lg font-bold text-white">Contribution History</h2>
            <p className="text-xs text-vault-silver-dark">
              Progress uses allocation and manual contributions.
            </p>
          </div>
          {goal.contributions.length === 0 ? (
            <p className="text-sm text-vault-silver-dark">No contributions logged yet.</p>
          ) : (
            <div className="space-y-2">
              {goal.contributions.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm text-white"
                >
                  <div>
                    <p className="font-semibold">
                      ${entry.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-vault-silver-dark">
                      {entry.source === 'allocation' ? 'Allocation' : 'Manual'} ·{' '}
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                  </div>
                  {entry.note && (
                    <p className="text-xs text-vault-silver-dark">{entry.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
