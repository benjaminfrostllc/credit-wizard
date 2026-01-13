export interface BudgetSummaryInput {
  monthLabel: string
  income: number
  expenses: number
  budgeted?: number
  currency?: string
}

export interface CategorySpendInput {
  name: string
  spent: number
  budgeted?: number
}

export interface UpcomingBillInput {
  name: string
  amount: number
  dueDate: string
  autopay?: boolean
}

export interface UtilizationCardInput {
  name: string
  limit: number
  balance: number
  statementDate?: string
  dueDate?: string
}

export interface UtilizationInput {
  totalLimit: number
  totalBalance: number
  cards?: UtilizationCardInput[]
}

export interface GoalInput {
  name: string
  targetAmount: number
  currentAmount: number
  dueDate?: string
  status?: string
}

export interface ContextInput {
  asOfDate: string
  budget?: BudgetSummaryInput
  categories?: CategorySpendInput[]
  bills?: UpcomingBillInput[]
  utilization?: UtilizationInput
  goals?: GoalInput[]
}

export interface BudgetSummary {
  monthLabel: string
  income: number
  expenses: number
  remaining: number
  savingsRate: number
  currency: string
}

export interface CategorySummary {
  name: string
  spent: number
  budgeted?: number
}

export interface UpcomingBill {
  name: string
  amount: number
  dueDate: string
  autopay: boolean
  daysUntilDue: number | null
}

export interface UtilizationCardSummary {
  name: string
  utilization: number
  statementDate?: string
  dueDate?: string
}

export interface UtilizationOverview {
  totalLimit: number
  totalBalance: number
  overallUtilization: number
  cards: UtilizationCardSummary[]
}

export interface GoalStatus {
  name: string
  targetAmount: number
  currentAmount: number
  progressPercent: number
  status: string
  dueDate?: string
  daysRemaining: number | null
}

export interface AiContext {
  asOfDate: string
  budgetSummary: BudgetSummary | null
  topCategories: CategorySummary[]
  upcomingBills: UpcomingBill[]
  utilizationOverview: UtilizationOverview | null
  goalsStatus: GoalStatus[]
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function diffDays(fromDate: Date, toDate: Date): number | null {
  const start = Date.parse(fromDate.toISOString())
  const end = Date.parse(toDate.toISOString())
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  const diffMs = end - start
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function parseDate(value?: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function deriveGoalStatus(goal: GoalInput, asOfDate: Date): GoalStatus {
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
  const progressPercent = clampPercent(progress)
  const dueDate = parseDate(goal.dueDate)
  const daysRemaining = dueDate ? diffDays(asOfDate, dueDate) : null

  let status = goal.status
  if (!status) {
    if (progressPercent >= 100) {
      status = 'complete'
    } else if (daysRemaining !== null && daysRemaining < 0) {
      status = 'overdue'
    } else if (daysRemaining !== null && daysRemaining <= 30 && progressPercent < 75) {
      status = 'behind'
    } else {
      status = 'on_track'
    }
  }

  return {
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    progressPercent,
    status,
    dueDate: goal.dueDate,
    daysRemaining,
  }
}

export function buildAiContext(input: ContextInput): AiContext {
  const asOfDate = parseDate(input.asOfDate) || new Date(input.asOfDate)

  const budgetSummary = input.budget
    ? {
        monthLabel: input.budget.monthLabel,
        income: input.budget.income,
        expenses: input.budget.expenses,
        remaining: input.budget.income - input.budget.expenses,
        savingsRate: clampPercent(
          input.budget.income > 0 ? ((input.budget.income - input.budget.expenses) / input.budget.income) * 100 : 0
        ),
        currency: input.budget.currency || 'USD',
      }
    : null

  const topCategories = (input.categories || [])
    .slice()
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)

  const upcomingBills = (input.bills || [])
    .slice()
    .sort((a, b) => {
      const aDate = parseDate(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY
      const bDate = parseDate(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY
      return aDate - bDate
    })
    .slice(0, 5)
    .map((bill) => {
      const dueDate = parseDate(bill.dueDate)
      const daysUntilDue = dueDate && asOfDate ? diffDays(asOfDate, dueDate) : null
      return {
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.dueDate,
        autopay: bill.autopay ?? false,
        daysUntilDue,
      }
    })

  const utilizationOverview = input.utilization
    ? {
        totalLimit: input.utilization.totalLimit,
        totalBalance: input.utilization.totalBalance,
        overallUtilization: clampPercent(
          input.utilization.totalLimit > 0
            ? (input.utilization.totalBalance / input.utilization.totalLimit) * 100
            : 0
        ),
        cards: (input.utilization.cards || []).map((card) => ({
          name: card.name,
          utilization: clampPercent(card.limit > 0 ? (card.balance / card.limit) * 100 : 0),
          statementDate: card.statementDate,
          dueDate: card.dueDate,
        })),
      }
    : null

  const goalsStatus = (input.goals || []).map((goal) => deriveGoalStatus(goal, asOfDate))

  return {
    asOfDate: input.asOfDate,
    budgetSummary,
    topCategories,
    upcomingBills,
    utilizationOverview,
    goalsStatus,
  }
}

export function formatContextForPrompt(context: AiContext): string {
  const lines: string[] = []
  lines.push(`As of ${context.asOfDate}:`)

  if (context.budgetSummary) {
    const budget = context.budgetSummary
    lines.push(
      `Budget (${budget.monthLabel}): income ${budget.income.toFixed(2)} ${budget.currency}, ` +
        `expenses ${budget.expenses.toFixed(2)} ${budget.currency}, ` +
        `remaining ${budget.remaining.toFixed(2)} ${budget.currency}, savings rate ${budget.savingsRate.toFixed(1)}%.`
    )
  }

  if (context.topCategories.length > 0) {
    const categories = context.topCategories
      .map((cat) => `${cat.name} ${cat.spent.toFixed(2)}`)
      .join('; ')
    lines.push(`Top categories: ${categories}.`)
  }

  if (context.upcomingBills.length > 0) {
    const bills = context.upcomingBills
      .map((bill) => `${bill.name} ${bill.amount.toFixed(2)} due ${bill.dueDate}`)
      .join('; ')
    lines.push(`Upcoming bills: ${bills}.`)
  }

  if (context.utilizationOverview) {
    const utilization = context.utilizationOverview
    lines.push(
      `Utilization: ${utilization.overallUtilization.toFixed(1)}% overall on ` +
        `${utilization.totalBalance.toFixed(2)} / ${utilization.totalLimit.toFixed(2)}.`
    )
    if (utilization.cards.length > 0) {
      const cards = utilization.cards
        .map((card) => `${card.name} ${card.utilization.toFixed(1)}% stmt ${card.statementDate ?? 'n/a'}`)
        .join('; ')
      lines.push(`Cards: ${cards}.`)
    }
  }

  if (context.goalsStatus.length > 0) {
    const goals = context.goalsStatus
      .map((goal) => `${goal.name} ${goal.progressPercent.toFixed(0)}% (${goal.status})`)
      .join('; ')
    lines.push(`Goals: ${goals}.`)
  }

  return lines.join('\n')
}
