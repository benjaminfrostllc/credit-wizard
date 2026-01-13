export type GoalType = 'savings' | 'debt'
export type GoalContributionSource = 'manual' | 'allocation'

export interface GoalContribution {
  id: string
  amount: number
  date: string
  source: GoalContributionSource
  note?: string
}

export interface Goal {
  id: string
  name: string
  type: GoalType
  target_amount: number
  target_date: string
  linked_category_id?: string | null
  contributions: GoalContribution[]
  created_at: string
  updated_at: string
}

export interface GoalInput {
  name: string
  type: GoalType
  target_amount: number
  target_date: string
  linked_category_id?: string | null
}

const GOALS_STORAGE_KEY = 'credit-wizard-goals'
const ALLOCATIONS_STORAGE_KEY = 'credit-wizard-budget-allocations'

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function loadGoals(): Goal[] {
  const stored = safeParse<Goal[]>(localStorage.getItem(GOALS_STORAGE_KEY), [])
  return stored.map((goal) => ({
    ...goal,
    contributions: goal.contributions || [],
  }))
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
}

export function createGoal(input: GoalInput): Goal {
  const now = new Date().toISOString()
  const goal: Goal = {
    id: generateId('goal'),
    name: input.name,
    type: input.type,
    target_amount: input.target_amount,
    target_date: input.target_date,
    linked_category_id: input.linked_category_id || null,
    contributions: [],
    created_at: now,
    updated_at: now,
  }
  const goals = loadGoals()
  goals.unshift(goal)
  saveGoals(goals)
  return goal
}

export function updateGoal(goalId: string, updates: GoalInput): Goal | null {
  const goals = loadGoals()
  const goalIndex = goals.findIndex((goal) => goal.id === goalId)
  if (goalIndex === -1) return null

  const updated: Goal = {
    ...goals[goalIndex],
    ...updates,
    linked_category_id: updates.linked_category_id || null,
    updated_at: new Date().toISOString(),
  }

  goals[goalIndex] = updated
  saveGoals(goals)
  return updated
}

export function deleteGoal(goalId: string) {
  const goals = loadGoals().filter((goal) => goal.id !== goalId)
  saveGoals(goals)
}

export function addGoalContribution(
  goalId: string,
  contribution: Omit<GoalContribution, 'id'>
): Goal | null {
  const goals = loadGoals()
  const goalIndex = goals.findIndex((goal) => goal.id === goalId)
  if (goalIndex === -1) return null

  const updatedContribution: GoalContribution = {
    ...contribution,
    id: generateId('contribution'),
  }

  const goal = goals[goalIndex]
  const updatedGoal: Goal = {
    ...goal,
    contributions: [updatedContribution, ...goal.contributions],
    updated_at: new Date().toISOString(),
  }

  goals[goalIndex] = updatedGoal
  saveGoals(goals)
  return updatedGoal
}

export function getGoalById(goalId: string): Goal | null {
  return loadGoals().find((goal) => goal.id === goalId) || null
}

export function getTotalContributions(goal: Goal): number {
  return goal.contributions.reduce((sum, entry) => sum + entry.amount, 0)
}

export function calculateGoalProgress(goal: Goal) {
  const contributed = getTotalContributions(goal)
  const progressPercent = goal.target_amount > 0
    ? Math.min((contributed / goal.target_amount) * 100, 100)
    : 0
  const remaining = Math.max(goal.target_amount - contributed, 0)

  return {
    contributed,
    remaining,
    progressPercent,
  }
}

export function calculateMonthsRemaining(targetDate: string, now = new Date()): number {
  const parsed = new Date(targetDate)
  if (Number.isNaN(parsed.getTime())) return 1

  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(parsed.getFullYear(), parsed.getMonth(), 1)
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1

  return Math.max(months, 1)
}

export function calculateRecommendedMonthlyContribution(goal: Goal, now = new Date()) {
  const { remaining } = calculateGoalProgress(goal)
  const monthsRemaining = calculateMonthsRemaining(goal.target_date, now)
  const recommendedMonthly = remaining / monthsRemaining

  return {
    monthsRemaining,
    recommendedMonthly,
  }
}

export function getBudgetAllocations(): Record<string, number> {
  return safeParse<Record<string, number>>(localStorage.getItem(ALLOCATIONS_STORAGE_KEY), {})
}

export function setBudgetAllocation(categoryId: string, amount: number) {
  const allocations = getBudgetAllocations()
  allocations[categoryId] = amount
  localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations))
}

export function removeBudgetAllocation(categoryId: string) {
  const allocations = getBudgetAllocations()
  delete allocations[categoryId]
  localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations))
}
