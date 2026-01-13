import { useMemo, useState } from 'react'
import type { Goal, GoalInput, GoalType } from '../lib/goals'

interface CategoryOption {
  id: string
  label: string
}

interface GoalFormProps {
  categories: CategoryOption[]
  initialGoal?: Goal
  onSave: (input: GoalInput) => void
  onCancel?: () => void
}

export function GoalForm({ categories, initialGoal, onSave, onCancel }: GoalFormProps) {
  const [name, setName] = useState(initialGoal?.name ?? '')
  const [type, setType] = useState<GoalType>(initialGoal?.type ?? 'savings')
  const [targetAmount, setTargetAmount] = useState(
    initialGoal ? initialGoal.target_amount.toString() : ''
  )
  const [targetDate, setTargetDate] = useState(initialGoal?.target_date ?? '')
  const [linkedCategoryId, setLinkedCategoryId] = useState(initialGoal?.linked_category_id ?? '')
  const [error, setError] = useState<string | null>(null)

  const categoryOptions = useMemo(() => {
    const options = categories.map((category) => ({
      value: category.id,
      label: category.label,
    }))
    return [{ value: '', label: 'No linked category' }, ...options]
  }, [categories])


  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsedAmount = Number.parseFloat(targetAmount)

    if (!name.trim()) {
      setError('Please enter a goal name.')
      return
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Target amount must be greater than 0.')
      return
    }

    if (!targetDate) {
      setError('Please select a target date.')
      return
    }

    setError(null)
    onSave({
      name: name.trim(),
      type,
      target_amount: parsedAmount,
      target_date: targetDate,
      linked_category_id: linkedCategoryId || null,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-4 space-y-4"
      style={{
        background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
        border: '1px solid rgba(192, 192, 192, 0.2)',
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {initialGoal ? 'Edit Goal' : 'Create a Goal'}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-vault-silver-dark hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <label className="block text-sm text-vault-silver-dark">
        Goal Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-lg bg-vault-black/60 border border-vault-silver/20 px-3 py-2 text-white"
          placeholder="Emergency Fund"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-vault-silver-dark">
          Goal Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value as GoalType)}
            className="mt-1 w-full rounded-lg bg-vault-black/60 border border-vault-silver/20 px-3 py-2 text-white"
          >
            <option value="savings">Savings</option>
            <option value="debt">Debt Payoff</option>
          </select>
        </label>
        <label className="block text-sm text-vault-silver-dark">
          Target Amount
          <input
            value={targetAmount}
            onChange={(event) => setTargetAmount(event.target.value)}
            className="mt-1 w-full rounded-lg bg-vault-black/60 border border-vault-silver/20 px-3 py-2 text-white"
            inputMode="decimal"
            placeholder="5000"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-vault-silver-dark">
          Target Date
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="mt-1 w-full rounded-lg bg-vault-black/60 border border-vault-silver/20 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-vault-silver-dark">
          Linked Budget Category
          <select
            value={linkedCategoryId}
            onChange={(event) => setLinkedCategoryId(event.target.value)}
            className="mt-1 w-full rounded-lg bg-vault-black/60 border border-vault-silver/20 px-3 py-2 text-white"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="w-full py-2 rounded-lg font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
      >
        {initialGoal ? 'Save Changes' : 'Add Goal'}
      </button>
    </form>
  )
}
