import type { Transaction } from './supabase'

export type RecurringCadence = 'monthly'

export interface RecurringSeries {
  merchant: string
  average_amount: number
  cadence: RecurringCadence
  next_due_estimate: string
  last_transaction_date: string
  occurrences: number
}

export interface RecurringDetectionConfig {
  minOccurrences: number
  monthlyMinDays: number
  monthlyMaxDays: number
  amountTolerancePercent: number
  amountToleranceAbsolute: number
}

export const DEFAULT_RECURRING_CONFIG: RecurringDetectionConfig = {
  minOccurrences: 3,
  monthlyMinDays: 25,
  monthlyMaxDays: 35,
  amountTolerancePercent: 0.1,
  amountToleranceAbsolute: 5,
}

interface AmountCluster {
  transactions: Transaction[]
  averageAmount: number
}

const dayMs = 24 * 60 * 60 * 1000

const normalizeMerchant = (transaction: Transaction) => {
  const base = transaction.merchant_name || transaction.name
  return base
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const isSimilarAmount = (amount: number, averageAmount: number, config: RecurringDetectionConfig) => {
  const tolerance = Math.max(config.amountToleranceAbsolute, averageAmount * config.amountTolerancePercent)
  return Math.abs(amount - averageAmount) <= tolerance
}

const parseDate = (date: string) => new Date(`${date}T00:00:00`)

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * dayMs)

const ensureFutureDueDate = (date: Date, cadenceDays: number) => {
  let next = new Date(date)
  const today = new Date()
  while (next < today) {
    next = addDays(next, cadenceDays)
  }
  return next
}

export function detectRecurringSeries(
  transactions: Transaction[],
  config: RecurringDetectionConfig = DEFAULT_RECURRING_CONFIG
): RecurringSeries[] {
  const expenses = transactions.filter((tx) => tx.amount > 0)
  const grouped = new Map<string, Transaction[]>()

  for (const tx of expenses) {
    const merchantKey = normalizeMerchant(tx)
    if (!merchantKey) continue
    const existing = grouped.get(merchantKey) || []
    existing.push(tx)
    grouped.set(merchantKey, existing)
  }

  const results: RecurringSeries[] = []

  grouped.forEach((merchantTransactions) => {
    const sorted = [...merchantTransactions].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
    const clusters: AmountCluster[] = []

    for (const tx of sorted) {
      const cluster = clusters.find((candidate) => isSimilarAmount(tx.amount, candidate.averageAmount, config))
      if (cluster) {
        cluster.transactions.push(tx)
        cluster.averageAmount =
          cluster.transactions.reduce((sum, item) => sum + item.amount, 0) / cluster.transactions.length
      } else {
        clusters.push({ transactions: [tx], averageAmount: tx.amount })
      }
    }

    clusters.forEach((cluster) => {
      if (cluster.transactions.length < config.minOccurrences) return
      const clusterSorted = [...cluster.transactions].sort(
        (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
      )
      const intervals = clusterSorted.slice(1).map((tx, index) => {
        const prev = clusterSorted[index]
        return (parseDate(tx.date).getTime() - parseDate(prev.date).getTime()) / dayMs
      })

      const isMonthly = intervals.every(
        (days) => days >= config.monthlyMinDays && days <= config.monthlyMaxDays
      )
      if (!isMonthly) return

      const averageInterval = intervals.reduce((sum, days) => sum + days, 0) / intervals.length
      const lastTransaction = clusterSorted[clusterSorted.length - 1]
      const cadenceDays = Math.round(averageInterval)
      const nextDue = ensureFutureDueDate(parseDate(lastTransaction.date), cadenceDays)

      results.push({
        merchant: lastTransaction.merchant_name || lastTransaction.name,
        average_amount: cluster.averageAmount,
        cadence: 'monthly',
        next_due_estimate: nextDue.toISOString().split('T')[0],
        last_transaction_date: lastTransaction.date,
        occurrences: cluster.transactions.length,
      })
    })
  })

  return results.sort((a, b) => parseDate(a.next_due_estimate).getTime() - parseDate(b.next_due_estimate).getTime())
}

export interface ReminderEvent {
  event_type: 'subscription.reminder'
  merchant: string
  average_amount: number
  next_due_estimate: string
  cadence: RecurringCadence
  days_until_due: number
}

export function buildReminderEvents(series: RecurringSeries[], lookaheadDays = 7): ReminderEvent[] {
  const today = new Date()
  return series
    .map((item) => {
      const dueDate = parseDate(item.next_due_estimate)
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / dayMs)
      return {
        event_type: 'subscription.reminder' as const,
        merchant: item.merchant,
        average_amount: item.average_amount,
        next_due_estimate: item.next_due_estimate,
        cadence: item.cadence,
        days_until_due: daysUntilDue,
      }
    })
    .filter((event) => event.days_until_due >= 0 && event.days_until_due <= lookaheadDays)
}
