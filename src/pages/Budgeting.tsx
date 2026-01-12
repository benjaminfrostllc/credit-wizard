import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getBankConnections, getBankAccounts, type BankAccount, type BankConnection } from '../lib/supabase'
import { SpendingTab } from '../components/SpendingTab'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const focusAreas = [
  {
    title: 'Smart Account Sync',
    description: 'Connect checking, savings, cards, and loans for a real-time snapshot of balances, bills, and net worth.',
    detail: 'Powered by Plaid + fallback monitoring for hard-to-sync institutions.',
    icon: '🔗',
  },
  {
    title: 'Flexible Budgeting Modes',
    description: 'Toggle between zero-based budgeting and a relaxed spending plan with automatic rollovers.',
    detail: 'Create custom categories, rules, and shared budgets in minutes.',
    icon: '🧩',
  },
  {
    title: 'Goals & Debt Paydown',
    description: 'Track emergency funds, payoff timelines, and credit utilization improvements from every payment.',
    detail: 'Simulate extra payments and see interest saved instantly.',
    icon: '🎯',
  },
  {
    title: 'Real-Time Insights',
    description: 'Get proactive alerts for overspending, new subscriptions, and upcoming bills.',
    detail: 'Smart nudges keep you ahead of cash shortfalls.',
    icon: '⚡',
  },
]

const aiAssist = [
  {
    title: 'Claude-Powered Coach',
    description: 'Ask questions like “How can I save $200 this month?” and get tailored answers.',
  },
  {
    title: 'Monthly Money Recaps',
    description: 'AI-generated summaries highlight top categories, wins, and next steps.',
  },
  {
    title: 'Predictive Warnings',
    description: 'Forecasts catch low-balance weeks before they happen.',
  },
]

const budgetModes = [
  {
    id: 'zero',
    title: 'Zero-Based',
    description: 'Assign every dollar to a job and track rollovers automatically.',
  },
  {
    id: 'flex',
    title: 'Flex Plan',
    description: 'Set spending targets without locking every income dollar.',
  },
]

const budgetCategories = [
  {
    name: 'Housing',
    spent: 1420,
    limit: 1800,
    trend: 'On track',
  },
  {
    name: 'Groceries',
    spent: 520,
    limit: 650,
    trend: 'Steady',
  },
  {
    name: 'Transportation',
    spent: 310,
    limit: 400,
    trend: 'Under budget',
  },
  {
    name: 'Subscriptions',
    spent: 94,
    limit: 90,
    trend: 'Over budget',
  },
]

const goals = [
  {
    title: 'Emergency Fund',
    progress: '$1,850 of $5,000',
    timeline: 'Target: Nov 2026',
  },
  {
    title: 'Credit Card Paydown',
    progress: '$2,140 of $4,200',
    timeline: 'Save $480 in interest',
  },
]

const formatCurrency = (value: number) => currencyFormatter.format(value)
const formatPercentage = (value: number) => `${Math.round(value)}%`
const formatDate = (value: string | null) => {
  if (!value) return 'Not synced yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not synced yet'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

export default function Budgeting() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState('zero')
  const [activeSection, setActiveSection] = useState<'overview' | 'spending'>('overview')

  useEffect(() => {
    const loadAccounts = async () => {
      if (!user?.id) return
      setLoadError(null)
      setIsLoadingAccounts(true)
      try {
        const [connectionData, accountData] = await Promise.all([
          getBankConnections(user.id),
          getBankAccounts(user.id),
        ])
        setConnections(connectionData)
        setAccounts(accountData)
      } catch (error) {
        console.error('[Budgeting] Failed to load account data', error)
        setLoadError('Unable to load account data right now. Please try again soon.')
      }
      setIsLoadingAccounts(false)
    }

    loadAccounts()
  }, [user?.id])

  const accountSummary = useMemo(() => {
    const assetTypes = new Set(['depository', 'investment', 'other', 'cash'])
    const liabilityTypes = new Set(['credit', 'loan'])
    let assets = 0
    let liabilities = 0
    let creditBalances = 0
    let creditLimits = 0

    accounts.forEach((account) => {
      const balance = account.balance_current ?? account.balance_available ?? 0
      if (liabilityTypes.has(account.type)) {
        liabilities += Math.abs(balance)
      } else if (assetTypes.has(account.type)) {
        assets += balance
      }

      if (account.type === 'credit') {
        creditBalances += Math.abs(balance)
        creditLimits += account.balance_limit ?? 0
      }
    })

    return {
      assets,
      liabilities,
      netWorth: assets - liabilities,
      creditUtilization: creditLimits > 0 ? (creditBalances / creditLimits) * 100 : null,
      creditBalances,
      creditLimits,
    }
  }, [accounts])

  const connectedCount = connections.filter((connection) => connection.status === 'connected').length
  const topConnections = connections.slice(0, 3)
  const topAccounts = useMemo(() => {
    return [...accounts]
      .map((account) => ({
        ...account,
        displayBalance: account.balance_current ?? account.balance_available ?? 0,
      }))
      .sort((a, b) => b.displayBalance - a.displayBalance)
      .slice(0, 4)
  }, [accounts])
  const creditUtilizationStatus = accountSummary.creditUtilization === null
    ? null
    : accountSummary.creditUtilization > 30
      ? 'High utilization'
      : 'On track'

  const highlights = [
    {
      title: 'Net Worth',
      value: accounts.length ? formatCurrency(accountSummary.netWorth) : '—',
      subtitle: accounts.length
        ? `Assets ${formatCurrency(accountSummary.assets)} · Liabilities ${formatCurrency(accountSummary.liabilities)}`
        : 'Connect accounts to calculate net worth',
      icon: '📈',
    },
    {
      title: 'Connected Accounts',
      value: isLoadingAccounts ? 'Loading…' : `${connectedCount} institutions`,
      subtitle: `${accounts.length} account${accounts.length === 1 ? '' : 's'} linked`,
      icon: '🔗',
    },
    {
      title: 'Credit Utilization',
      value: accountSummary.creditUtilization === null ? '—' : formatPercentage(accountSummary.creditUtilization),
      subtitle: accountSummary.creditUtilization === null
        ? 'Add credit cards to monitor utilization'
        : `${formatCurrency(accountSummary.creditBalances)} of ${formatCurrency(accountSummary.creditLimits)} used`,
      icon: '🧭',
    },
  ]

  return (
    <div className="min-h-screen bg-vault-black pb-24">
      <header className="sticky top-0 z-30 bg-vault-black/95 backdrop-blur-lg border-b border-vault-silver/10 px-4 py-3">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
          BUDGETING
        </h1>
      </header>

      <div className="p-4 space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'overview'
                ? 'bg-vault-accent text-white'
                : 'bg-vault-purple-dark/40 text-vault-silver'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection('spending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'spending'
                ? 'bg-vault-accent text-white'
                : 'bg-vault-purple-dark/40 text-vault-silver'
            }`}
          >
            Spending
          </button>
        </div>

        {activeSection === 'spending' ? (
          user?.id ? (
            <SpendingTab userId={user.id} />
          ) : (
            <div className="rounded-2xl p-4 text-sm text-vault-silver-dark">
              Sign in to view live spending insights.
            </div>
          )
        ) : (
          <>
        <section
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-vault-accent uppercase tracking-wide">Credit Wizard Budgeting Lab</p>
            <h2 className="text-2xl font-bold text-white">Rebuild credit with disciplined, automated budgeting.</h2>
            <p className="text-sm text-vault-silver-dark">
              Combine smart account sync, flexible budgeting modes, and AI-powered coaching to keep every dollar working
              toward your next score milestone.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => navigate('/treasury')}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
              >
                Connect Accounts
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-vault-silver"
                style={{ border: '1px solid rgba(192, 192, 192, 0.25)' }}
              >
                Create Budget
              </button>
            </div>
          </div>
        </section>

        {loadError && (
          <div
            className="rounded-2xl p-4 text-sm text-vault-error"
            style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.4)' }}
          >
            {loadError}
          </div>
        )}

        {accounts.length === 0 && !isLoadingAccounts && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'linear-gradient(145deg, rgba(157, 140, 255, 0.15) 0%, rgba(123, 104, 238, 0.1) 100%)', border: '1px solid rgba(157, 140, 255, 0.3)' }}
          >
            <span className="text-xl">✨</span>
            <div>
              <p className="text-sm text-white font-semibold">Connect your first account to unlock live budgeting.</p>
              <p className="text-xs text-vault-silver-dark mt-1">
                We will automatically calculate net worth, utilization, and cash flow once accounts are linked.
              </p>
            </div>
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(145deg, #14111d 0%, #0e0c14 100%)', border: '1px solid rgba(192, 192, 192, 0.15)' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-vault-silver-dark">{item.title}</p>
                <span className="text-xl">{item.icon}</span>
              </div>
              <p className="text-2xl font-semibold text-white mt-2">{item.value}</p>
              <p className="text-xs text-vault-silver-dark mt-1">{item.subtitle}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Account Snapshot</h3>
            <span className="text-xs text-vault-silver-dark uppercase tracking-wide">
              {accounts.length === 0 ? 'No data yet' : 'Top balances'}
            </span>
          </div>
          {accounts.length === 0 ? (
            <div
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(145deg, #14111d 0%, #0e0c14 100%)', border: '1px solid rgba(192, 192, 192, 0.15)' }}
            >
              <p className="text-white font-semibold">Connect an account to see balances here.</p>
              <p className="text-xs text-vault-silver-dark mt-1">We will surface your most important accounts and balances.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {topAccounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-2xl p-4 flex items-center justify-between"
                  style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                >
                  <div>
                    <p className="text-white font-semibold">{account.name}</p>
                    <p className="text-xs text-vault-silver-dark">{account.subtype ?? account.type}</p>
                  </div>
                  <p className="text-sm font-semibold text-vault-accent">
                    {formatCurrency(account.displayBalance)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Linked Institutions</h3>
            <button
              onClick={() => navigate('/treasury')}
              className="text-xs text-vault-accent hover:text-vault-accent-light"
            >
              Manage in Treasury →
            </button>
          </div>
          {connections.length === 0 ? (
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(145deg, #14111d 0%, #0e0c14 100%)', border: '1px solid rgba(192, 192, 192, 0.15)' }}
            >
              <div>
                <p className="text-white font-semibold">No institutions connected yet.</p>
                <p className="text-xs text-vault-silver-dark mt-1">Connect a bank to unlock live budgeting insights.</p>
              </div>
              <button
                onClick={() => navigate('/treasury')}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
              >
                Connect
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {topConnections.map((connection) => {
                const statusTone = connection.status === 'connected'
                  ? 'text-vault-success'
                  : connection.status === 'pending_reauth'
                    ? 'text-vault-error'
                    : 'text-vault-silver-dark'
                return (
                  <div
                    key={connection.id}
                    className="rounded-2xl p-4"
                    style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{connection.institution_name}</p>
                        <p className="text-xs text-vault-silver-dark">
                          {connection.accounts_count} account{connection.accounts_count === 1 ? '' : 's'} · Last sync {formatDate(connection.last_synced_at)}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold ${statusTone}`}>
                        {connection.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )
              })}
              {connections.length > topConnections.length && (
                <p className="text-xs text-vault-silver-dark">+ {connections.length - topConnections.length} more institutions connected</p>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Budgeting Mode</h3>
            <span className="text-xs text-vault-silver-dark uppercase tracking-wide">Choose your flow</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {budgetModes.map((mode) => {
              const isActive = activeMode === mode.id
              return (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id)}
                  className={`rounded-2xl p-4 text-left transition-colors ${
                    isActive ? 'border-vault-accent bg-vault-purple-dark/50' : 'border-vault-silver/20'
                  }`}
                  style={{ borderWidth: 1 }}
                >
                  <p className={`text-sm uppercase tracking-wide ${isActive ? 'text-vault-accent' : 'text-vault-silver-dark'}`}>
                    {mode.title}
                  </p>
                  <p className="text-white font-semibold mt-1">{mode.description}</p>
                  <p className="text-xs text-vault-silver-dark mt-2">
                    {isActive ? 'Active budgeting flow' : 'Tap to preview this flow'}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Budget Categories</h3>
            <span className="text-xs text-vault-silver-dark uppercase tracking-wide">
              {accounts.length === 0 ? 'Sample' : 'This month'}
            </span>
          </div>
          <div className="space-y-3">
            {budgetCategories.map((category) => {
              const progress = Math.min((category.spent / category.limit) * 100, 100)
              const overBudget = category.spent > category.limit
              return (
                <div
                  key={category.name}
                  className="rounded-2xl p-4"
                  style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{category.name}</p>
                      <p className="text-xs text-vault-silver-dark">{category.trend}</p>
                    </div>
                    <p className={`text-sm font-semibold ${overBudget ? 'text-vault-error' : 'text-vault-accent'}`}>
                      {formatCurrency(category.spent)} / {formatCurrency(category.limit)}
                    </p>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-vault-purple-dark/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${overBudget ? 'bg-vault-error' : 'bg-vault-accent'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Core Features</h3>
            <span className="text-xs text-vault-silver-dark uppercase tracking-wide">Phase 1</span>
          </div>
          <div className="grid gap-3">
            {focusAreas.map((area) => (
              <div
                key={area.title}
                className="rounded-2xl p-4 flex gap-4"
                style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
              >
                <div className="text-2xl">{area.icon}</div>
                <div className="space-y-1">
                  <h4 className="text-white font-semibold">{area.title}</h4>
                  <p className="text-sm text-vault-silver-dark">{area.description}</p>
                  <p className="text-xs text-vault-accent-light">{area.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Goals & Paydown</h3>
            <span className="text-xs text-vault-silver-dark uppercase tracking-wide">In progress</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {goals.map((goal) => (
              <div
                key={goal.title}
                className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(145deg, #14111d 0%, #0e0c14 100%)', border: '1px solid rgba(192, 192, 192, 0.15)' }}
              >
                <p className="text-white font-semibold">{goal.title}</p>
                <p className="text-sm text-vault-accent mt-2">{goal.progress}</p>
                <p className="text-xs text-vault-silver-dark mt-1">{goal.timeline}</p>
              </div>
            ))}
            {creditUtilizationStatus && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(145deg, #14111d 0%, #0e0c14 100%)', border: '1px solid rgba(192, 192, 192, 0.15)' }}
              >
                <p className="text-white font-semibold">Credit Utilization</p>
                <p className="text-sm text-vault-accent mt-2">{formatPercentage(accountSummary.creditUtilization ?? 0)}</p>
                <p className="text-xs text-vault-silver-dark mt-1">{creditUtilizationStatus}</p>
              </div>
            )}
          </div>
        </section>

        <section
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'linear-gradient(145deg, rgba(157, 140, 255, 0.12) 0%, rgba(123, 104, 238, 0.08) 100%)', border: '1px solid rgba(157, 140, 255, 0.35)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">AI Financial Assistant</h3>
            <span className="text-xs text-vault-accent">Claude Ready</span>
          </div>
          <div className="space-y-2">
            {aiAssist.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-vault-accent" />
                <div>
                  <p className="text-sm text-white font-medium">{item.title}</p>
                  <p className="text-xs text-vault-silver-dark">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
          >
            Open Budgeting Chat
          </button>
        </section>
          </>
        )}
      </div>
    </div>
  )
}
