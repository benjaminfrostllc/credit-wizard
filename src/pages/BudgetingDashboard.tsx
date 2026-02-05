import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BudgetSummaryCard } from '../components/BudgetSummaryCard'
import { CategorySpendChart } from '../components/CategorySpendChart'
import { NetWorthCard } from '../components/NetWorthCard'
import { UpcomingBillsList } from '../components/UpcomingBillsList'
import { UtilizationAlertCard } from '../components/UtilizationAlertCard'

export default function BudgetingDashboard() {
  const { user } = useApp()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-vault-silver-dark">
        <p>Please sign in to view budgeting details.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-vault-accent hover:text-vault-accent-light transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
              BUDGETING DASHBOARD
            </h1>
            <p className="text-vault-silver-dark text-sm mt-1">
              Track your cash flow, spending categories, and utilization alerts.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NetWorthCard userId={user.id} />
          <BudgetSummaryCard userId={user.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategorySpendChart userId={user.id} />
          <UpcomingBillsList userId={user.id} />
        </div>

        <UtilizationAlertCard userId={user.id} />
      </div>
    </div>
  )
}
