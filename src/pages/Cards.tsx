import { useState, useEffect, useCallback } from 'react'
import { supabase, getBankAccounts, getBankConnections, type BankAccount, type BankConnection } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { CardMarketplace } from '../components/CardMarketplace'

interface CarryItem {
  id: string
  name: string
  details?: string
  color: string
  linked_account_id: string | null
  connection_id: string | null
  balance?: number | null
}

// Bank/Credit Union logos and colors
const bankOptions = [
  { id: 'chase', name: 'Chase', color: '#117ACA', logo: '🏦' },
  { id: 'bofa', name: 'Bank of America', color: '#012169', logo: '🔴' },
  { id: 'wells', name: 'Wells Fargo', color: '#D71E28', logo: '🟡' },
  { id: 'citi', name: 'Citi', color: '#003B70', logo: '🔵' },
  { id: 'capital_one', name: 'Capital One', color: '#D03027', logo: '💳' },
  { id: 'discover', name: 'Discover', color: '#FF6000', logo: '🟠' },
  { id: 'amex', name: 'American Express', color: '#006FCF', logo: '💎' },
  { id: 'usbank', name: 'US Bank', color: '#0C2340', logo: '🏛️' },
  { id: 'pnc', name: 'PNC Bank', color: '#F58025', logo: '🟧' },
  { id: 'td', name: 'TD Bank', color: '#34A853', logo: '🟢' },
  { id: 'navy_federal', name: 'Navy Federal', color: '#003057', logo: '⚓' },
  { id: 'usaa', name: 'USAA', color: '#003366', logo: '🦅' },
  { id: 'synchrony', name: 'Synchrony', color: '#0066B3', logo: '🔄' },
  { id: 'apple', name: 'Apple Card', color: '#000000', logo: '🍎' },
  { id: 'other', name: 'Other', color: '#6366f1', logo: '➕' },
]

interface CreditCard {
  id: string
  bankId: string
  nickname: string
  lastFour: string
  creditLimit: number
  currentBalance: number
  dueDate: number
  statementDate: number
  apr: number
  isRevolving: boolean
}

interface LinkedCard {
  id: string
  user_id: string
  account_id: string
  name: string
  last_four?: string
  card_type: 'debit' | 'credit'
  created_at: string
}

interface DebtCenterCard {
  id: string
  name: string
  balance: number
  limit: number
  utilization: number
  statementDate?: number
  dueDate?: number
  source: 'manual' | 'plaid'
}

// Calculate estimated minimum payment
function calculateMinPayment(balance: number, apr: number): number {
  if (balance <= 0) return 0
  const interest = (balance * (apr / 100)) / 12
  const principal = Math.max(balance * 0.01, 25)
  return Math.min(Math.ceil(interest + principal), balance)
}

// Calculate days until due date
function getDaysUntilDue(dueDate: number): number {
  const today = new Date()
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDate)
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDate)

  const target = thisMonth >= today ? thisMonth : nextMonth
  const diffTime = target.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function formatOrdinalDay(day: number): string {
  const suffix = ['st', 'nd', 'rd'][((day + 90) % 100 - 10) % 10 - 1] || 'th'
  return `${day}${suffix}`
}

type TabType = 'my-cards' | 'marketplace'

function Cards() {
  const { user } = useApp()
  const [activeTab, setActiveTab] = useState<TabType>('my-cards')
  const [cards, setCards] = useState<CreditCard[]>([])
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([])
  const [plaidCreditAccounts, setPlaidCreditAccounts] = useState<BankAccount[]>([])
  const [plaidDebitAccounts, setPlaidDebitAccounts] = useState<BankAccount[]>([])
  const [plaidConnections, setPlaidConnections] = useState<BankConnection[]>([])
  const [expandedCreditConnections, setExpandedCreditConnections] = useState<Set<string>>(new Set())
  const [expandedDebitConnections, setExpandedDebitConnections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [saving, setSaving] = useState(false)
  const [targetUtilization, setTargetUtilization] = useState(30)
  const [utilizationAlert, setUtilizationAlert] = useState(30)
  const [statementDateOverrides, setStatementDateOverrides] = useState<Record<string, string>>({})

  // Carry items state
  const [carryItems, setCarryItems] = useState<CarryItem[]>([])

  // Form state
  const [formData, setFormData] = useState({
    bankId: '',
    nickname: '',
    lastFour: '',
    creditLimit: '',
    currentBalance: '',
    dueDate: '',
    statementDate: '',
    apr: '',
    isRevolving: true,
  })

  const loadCards = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    // Load manual cards, Plaid data, linked cards, and belongings in parallel
    const [cardsResult, plaidAccountsData, plaidConnectionsData, linkedCardsResult, belongingsResult] = await Promise.all([
      supabase.from('credit_cards').select('*').order('created_at', { ascending: false }),
      getBankAccounts(user.id),
      getBankConnections(user.id),
      supabase.from('linked_cards').select('*').eq('user_id', user.id),
      supabase.from('belongings').select('*').eq('location', 'carry'),
    ])

    if (cardsResult.error) {
      console.error('Error loading cards:', cardsResult.error)
    } else if (cardsResult.data) {
      setCards(cardsResult.data.map(card => ({
        id: card.id,
        bankId: card.bank_id,
        nickname: card.nickname || '',
        lastFour: card.last_four || '',
        creditLimit: Number(card.credit_limit) || 0,
        currentBalance: Number(card.current_balance) || 0,
        dueDate: card.due_date || 1,
        statementDate: card.statement_date || 1,
        apr: Number(card.apr) || 0,
        isRevolving: card.is_revolving || false,
      })))
    }

    // Filter credit and depository accounts
    const creditAccounts = plaidAccountsData.filter(a => a.type === 'credit')
    const debitAccounts = plaidAccountsData.filter(a => a.type === 'depository')
    setPlaidCreditAccounts(creditAccounts)
    setPlaidDebitAccounts(debitAccounts)
    setPlaidConnections(plaidConnectionsData)

    // Set linked cards
    if (linkedCardsResult.data) {
      setLinkedCards(linkedCardsResult.data)
    }

    // Set carry items with balance info
    if (belongingsResult.data) {
      const allAccounts = plaidAccountsData
      setCarryItems(belongingsResult.data.map(item => {
        const account = allAccounts.find(a => a.id === item.linked_account_id)
        return {
          id: item.id,
          name: item.name,
          details: item.details || undefined,
          color: item.color || '#6366f1',
          linked_account_id: item.linked_account_id,
          connection_id: item.connection_id,
          balance: account?.balance_current ?? null,
        }
      }))
    }

    console.log('[Cards] Loaded accounts:', { credit: creditAccounts.length, debit: debitAccounts.length, linked: linkedCardsResult.data?.length || 0 })

    setLoading(false)
  }, [user?.id])

  // Load cards from database
  useEffect(() => {
    if (user) {
      loadCards()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const resetForm = () => {
    setFormData({
      bankId: '',
      nickname: '',
      lastFour: '',
      creditLimit: '',
      currentBalance: '',
      dueDate: '',
      statementDate: '',
      apr: '',
      isRevolving: true,
    })
    setEditingCard(null)
  }

  const handleSaveCard = async () => {
    if (!user) return
    setSaving(true)

    const cardData = {
      user_id: user.id,
      bank_id: formData.bankId,
      nickname: formData.nickname || null,
      last_four: formData.lastFour || null,
      credit_limit: parseFloat(formData.creditLimit) || 0,
      current_balance: parseFloat(formData.currentBalance) || 0,
      due_date: parseInt(formData.dueDate) || 1,
      statement_date: parseInt(formData.statementDate) || 1,
      apr: parseFloat(formData.apr) || 0,
      is_revolving: formData.isRevolving,
    }

    if (editingCard) {
      const { error } = await supabase
        .from('credit_cards')
        .update(cardData)
        .eq('id', editingCard.id)

      if (error) {
        console.error('Error updating card:', error)
      }
    } else {
      const { error } = await supabase
        .from('credit_cards')
        .insert(cardData)

      if (error) {
        console.error('Error adding card:', error)
      }
    }

    await loadCards()
    setShowAddModal(false)
    resetForm()
    setSaving(false)
  }

  const handleEditCard = (card: CreditCard) => {
    setFormData({
      bankId: card.bankId,
      nickname: card.nickname,
      lastFour: card.lastFour,
      creditLimit: card.creditLimit.toString(),
      currentBalance: card.currentBalance.toString(),
      dueDate: card.dueDate.toString(),
      statementDate: card.statementDate.toString(),
      apr: card.apr.toString(),
      isRevolving: card.isRevolving,
    })
    setEditingCard(card)
    setShowAddModal(true)
  }

  const handleDeleteCard = async (id: string) => {
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting card:', error)
    } else {
      setCards(cards.filter(c => c.id !== id))
    }
  }

  const toggleCreditConnectionExpanded = (connectionId: string) => {
    setExpandedCreditConnections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId)
      } else {
        newSet.add(connectionId)
      }
      return newSet
    })
  }

  const toggleDebitConnectionExpanded = (connectionId: string) => {
    setExpandedDebitConnections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId)
      } else {
        newSet.add(connectionId)
      }
      return newSet
    })
  }

  const handleRemoveFromCarry = async (id: string) => {
    // Update location to vault instead of deleting
    const { error } = await supabase
      .from('belongings')
      .update({ location: 'vault' })
      .eq('id', id)

    if (!error) {
      setCarryItems(carryItems.filter(item => item.id !== id))
    }
  }

  // Group Plaid credit accounts by connection
  const creditAccountsByConnection = plaidConnections
    .filter(conn => plaidCreditAccounts.some(acc => acc.connection_id === conn.id))
    .map(conn => ({
      connection: conn,
      accounts: plaidCreditAccounts.filter(acc => acc.connection_id === conn.id),
    }))

  // Group Plaid debit accounts by connection
  const debitAccountsByConnection = plaidConnections
    .filter(conn => plaidDebitAccounts.some(acc => acc.connection_id === conn.id))
    .map(conn => ({
      connection: conn,
      accounts: plaidDebitAccounts.filter(acc => acc.connection_id === conn.id),
    }))

  // Include both manual and Plaid cards in totals
  const manualLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0)
  const manualBalance = cards.reduce((sum, c) => sum + c.currentBalance, 0)
  const plaidCreditLimit = plaidCreditAccounts.reduce((sum, a) => sum + (a.balance_limit || 0), 0)
  const plaidCreditBalance = plaidCreditAccounts.reduce((sum, a) => sum + (a.balance_current || 0), 0)

  const totalLimit = manualLimit + plaidCreditLimit
  const totalBalance = manualBalance + plaidCreditBalance
  const overallUtilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0

  // Debit account totals
  const totalDebitBalance = plaidDebitAccounts.reduce((sum, a) => sum + (a.balance_current || 0), 0)
  const totalDebitAvailable = plaidDebitAccounts.reduce((sum, a) => sum + (a.balance_available || a.balance_current || 0), 0)

  const debtCenterCards: DebtCenterCard[] = [
    ...cards.map(card => ({
      id: `manual-${card.id}`,
      name: card.nickname || bankOptions.find(b => b.id === card.bankId)?.name || 'Manual Card',
      balance: card.currentBalance,
      limit: card.creditLimit,
      utilization: card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0,
      statementDate: card.statementDate || undefined,
      dueDate: card.dueDate || undefined,
      source: 'manual' as const,
    })),
    ...plaidCreditAccounts.map(account => {
      const override = statementDateOverrides[account.id]
      const statementDate = override ? Number(override) : undefined
      const limit = account.balance_limit || 0
      const balance = account.balance_current || 0
      return {
        id: `plaid-${account.id}`,
        name: account.name,
        balance,
        limit,
        utilization: limit > 0 ? (balance / limit) * 100 : 0,
        statementDate,
        source: 'plaid' as const,
      }
    }),
  ].filter(card => card.limit > 0 || card.balance > 0)

  return (
    <div className="min-h-screen bg-vault-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-vault-black/95 backdrop-blur-lg border-b border-vault-silver/10 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
              CARDS
            </h1>
            <p className="text-xs text-vault-silver-dark">
              {activeTab === 'my-cards' ? 'Track your credit cards' : 'Find your next card'}
            </p>
          </div>
          {activeTab === 'my-cards' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
              style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
            >
              + Add Card
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('my-cards')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'my-cards'
                ? 'bg-vault-accent text-white'
                : 'bg-vault-purple/30 text-vault-silver-dark hover:bg-vault-purple/50'
            }`}
          >
            My Cards
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'marketplace'
                ? 'bg-vault-accent text-white'
                : 'bg-vault-purple/30 text-vault-silver-dark hover:bg-vault-purple/50'
            }`}
          >
            Marketplace
          </button>
        </div>
      </header>

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <CardMarketplace />
      )}

      {/* My Cards Tab */}
      {activeTab === 'my-cards' && (
      <div className="p-4 space-y-4">
        {/* Summary Card */}
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
          <h2 className="text-sm text-vault-silver-dark mb-3">OVERALL SUMMARY</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">${totalLimit.toLocaleString()}</p>
              <p className="text-xs text-vault-silver-dark">Total Limit</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-vault-accent">${totalBalance.toLocaleString()}</p>
              <p className="text-xs text-vault-silver-dark">Total Balance</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${overallUtilization > 30 ? 'text-vault-warning' : 'text-vault-success'}`}>
                {overallUtilization.toFixed(1)}%
              </p>
              <p className="text-xs text-vault-silver-dark">Utilization</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-vault-black rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallUtilization > 30 ? 'bg-vault-warning' : overallUtilization > 10 ? 'bg-yellow-500' : 'bg-vault-success'
              }`}
              style={{ width: `${Math.min(overallUtilization, 100)}%` }}
            />
          </div>
        </div>

        {/* Debt Center */}
        <div className="rounded-2xl p-4 space-y-4" style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-sky-300">DEBT CENTER</h2>
              <p className="text-xs text-vault-silver-dark">Track utilization and pay down before statement close.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-vault-silver-dark flex items-center gap-2">
                Target Utilization
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={targetUtilization}
                  onChange={(event) => setTargetUtilization(Number(event.target.value || 0))}
                  className="w-16 bg-vault-black/60 border border-vault-silver/20 rounded px-2 py-1 text-white text-xs"
                />
                %
              </label>
              <label className="text-xs text-vault-silver-dark flex items-center gap-2">
                Alert at
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={utilizationAlert}
                  onChange={(event) => setUtilizationAlert(Number(event.target.value || 0))}
                  className="w-16 bg-vault-black/60 border border-vault-silver/20 rounded px-2 py-1 text-white text-xs"
                />
                %
              </label>
            </div>
          </div>

          {debtCenterCards.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl border-sky-400/30">
              <p className="text-sm text-sky-200">Add a credit card to see utilization paydown guidance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {debtCenterCards.map(card => {
                const targetBalance = card.limit * (targetUtilization / 100)
                const paydownNeeded = Math.max(0, card.balance - targetBalance)
                const alert = card.utilization > utilizationAlert
                const statementLabel = card.statementDate ? `Statement closes on ${formatOrdinalDay(card.statementDate)}` : 'Statement close date needed'
                const dueLabel = card.dueDate ? `Due on ${formatOrdinalDay(card.dueDate)}` : null

                return (
                  <div key={card.id} className="bg-vault-black/60 rounded-xl p-3 border border-sky-400/20">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{card.name}</p>
                        <p className="text-xs text-vault-silver-dark">
                          Balance ${card.balance.toLocaleString()} / Limit ${card.limit.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${alert ? 'text-vault-warning' : 'text-vault-success'}`}>
                          {card.utilization.toFixed(1)}% utilization
                        </p>
                        <p className="text-xs text-vault-silver-dark">{statementLabel}</p>
                        {dueLabel && <p className="text-xs text-vault-silver-dark">{dueLabel}</p>}
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="h-1.5 bg-vault-black rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${alert ? 'bg-vault-warning' : 'bg-vault-success'}`}
                          style={{ width: `${Math.min(card.utilization, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-vault-silver-dark">
                        Target balance: ${targetBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                      {paydownNeeded > 0 ? (
                        <div className="text-sky-300 font-semibold">
                          Pay ${paydownNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 })} before statement close
                        </div>
                      ) : (
                        <div className="text-vault-success font-semibold">On target for statement close</div>
                      )}
                    </div>

                    {!card.statementDate && card.source === 'plaid' && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-vault-silver-dark">Set statement close day:</span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={statementDateOverrides[card.id.replace('plaid-', '')] || ''}
                          onChange={(event) =>
                            setStatementDateOverrides(prev => ({
                              ...prev,
                              [card.id.replace('plaid-', '')]: event.target.value,
                            }))
                          }
                          className="w-20 bg-vault-black/60 border border-vault-silver/20 rounded px-2 py-1 text-white text-xs"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="bg-vault-black/40 rounded-xl p-3 text-xs text-vault-silver-dark">
            <p className="text-white text-xs font-semibold mb-2">Example calculations</p>
            {debtCenterCards.length > 0 ? (
              <ul className="space-y-1">
                {debtCenterCards.slice(0, 2).map(card => {
                  const targetBalance = card.limit * (targetUtilization / 100)
                  const paydownNeeded = Math.max(0, card.balance - targetBalance)
                  return (
                    <li key={`example-${card.id}`}>
                      {card.name}: ${card.balance.toLocaleString()} / ${card.limit.toLocaleString()} = {card.utilization.toFixed(1)}% utilization → pay down ${paydownNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 })}.
                    </li>
                  )
                })}
              </ul>
            ) : (
              <ul className="space-y-1">
                <li>$3,200 / $10,000 = 32% utilization → pay down $200.</li>
                <li>$1,500 / $5,000 = 30% utilization → no paydown needed.</li>
              </ul>
            )}
          </div>
        </div>

        {/* Carry Section */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, rgba(157, 140, 255, 0.15) 0%, rgba(123, 104, 238, 0.15) 100%)',
            border: '1px solid rgba(157, 140, 255, 0.3)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-vault-accent-light flex items-center gap-2">
              <span>💼</span> CARRY
              <span className="text-xs text-vault-accent font-normal">({carryItems.length})</span>
            </h2>
            <p className="text-xs text-vault-accent">Check "Carry" on cards below</p>
          </div>

          {carryItems.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl border-vault-accent/30">
              <p className="text-vault-accent text-sm">
                Check "Carry" on any card to add it here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {carryItems.map((item) => {
                const conn = plaidConnections.find(c => c.id === item.connection_id)
                return (
                  <div
                    key={item.id}
                    className="bg-vault-purple/50 rounded-xl p-3 border border-vault-accent/30 hover:border-vault-accent/50 transition-colors group relative"
                  >
                    <button
                      onClick={() => handleRemoveFromCarry(item.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-vault-black border border-vault-silver/20 rounded-full flex items-center justify-center text-vault-silver-dark hover:text-vault-error hover:border-vault-error/50 opacity-0 group-hover:opacity-100 transition-all text-xs"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                      {conn?.logo_url ? (
                        <img src={conn.logo_url} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <span className="text-lg">💳</span>
                      )}
                      <span className="text-white text-sm font-medium truncate flex-1">{item.name}</span>
                    </div>
                    {item.details && (
                      <p className="text-xs text-vault-accent-light truncate">{item.details}</p>
                    )}
                    {item.balance !== null && item.balance !== undefined && (
                      <p className="text-xs text-vault-success font-medium mt-1">
                        ${item.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Plaid Connected Credit Cards */}
        {creditAccountsByConnection.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
            <h3 className="text-sm font-bold text-vault-success mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              CREDIT CARDS (VIA PLAID)
            </h3>
            <div className="space-y-2">
              {creditAccountsByConnection.map(({ connection, accounts }) => {
                const isExpanded = expandedCreditConnections.has(connection.id)
                const hasAccounts = accounts.length > 0

                return (
                  <div key={connection.id} className="bg-vault-black/50 rounded-lg overflow-hidden">
                    {/* Connection Header - Clickable */}
                    <button
                      onClick={() => toggleCreditConnectionExpanded(connection.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-vault-purple/20 transition-colors"
                    >
                      {connection.logo_url ? (
                        <img src={connection.logo_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: connection.primary_color || '#6366f1' }}
                        >
                          💳
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-white text-sm font-medium">{connection.institution_name}</p>
                        <p className="text-gray-500 text-xs">
                          {accounts.length} credit card{accounts.length !== 1 ? 's' : ''} linked
                        </p>
                      </div>
                      <span className="text-vault-success text-xs px-2 py-1 bg-vault-success/10 rounded">Connected</span>
                      {/* Expand/Collapse Arrow */}
                      {hasAccounts && (
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>

                    {/* Accounts List (expandable) */}
                    {isExpanded && hasAccounts && (
                      <div className="space-y-2 border-t border-vault-silver/10 p-3 bg-vault-purple/10">
                        {accounts.map((acc) => {
                          const carryItem = carryItems.find(item => item.linked_account_id === acc.id)
                          const isInCarry = !!carryItem
                          return (
                            <div
                              key={acc.id}
                              className={`flex items-center justify-between rounded-lg p-2 transition-all ${
                                isInCarry
                                  ? 'bg-vault-accent/20 border border-vault-accent/30'
                                  : 'bg-vault-purple/20'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isInCarry}
                                    onChange={async () => {
                                      if (carryItem) {
                                        // Move back to vault
                                        const { error } = await supabase
                                          .from('belongings')
                                          .update({ location: 'vault' })
                                          .eq('id', carryItem.id)
                                        if (!error) {
                                          setCarryItems(carryItems.filter(i => i.id !== carryItem.id))
                                        }
                                      } else {
                                        // Add to carry
                                        if (!user?.id) {
                                          alert('No user logged in')
                                          return
                                        }
                                        const cardName = `${connection.institution_name} Credit Card`
                                        console.log('Adding to carry:', { userId: user.id, cardName, accountId: acc.id })
                                        const { data, error } = await supabase
                                          .from('belongings')
                                          .insert({
                                            user_id: user.id,
                                            type: 'card',
                                            name: cardName,
                                            details: acc.mask ? `•••• ${acc.mask}` : 'Credit',
                                            color: connection.primary_color || '#6366f1',
                                            location: 'carry',
                                            linked_account_id: acc.id,
                                            connection_id: connection.id,
                                          })
                                          .select()
                                          .single()
                                        if (error) {
                                          console.error('Error adding to carry:', error)
                                          alert(`Failed to add to carry: ${error.message}`)
                                        } else if (data) {
                                          console.log('Added to carry:', data)
                                          setCarryItems([...carryItems, {
                                            id: data.id,
                                            name: cardName,
                                            details: acc.mask ? `•••• ${acc.mask}` : 'Credit',
                                            color: connection.primary_color || '#6366f1',
                                            linked_account_id: acc.id,
                                            connection_id: connection.id,
                                            balance: acc.balance_current,
                                          }])
                                        }
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-vault-silver/30 bg-vault-black text-vault-accent focus:ring-vault-accent cursor-pointer"
                                  />
                                  <span className="text-xs text-vault-silver-dark">Carry</span>
                                </label>
                                <span className="text-lg">💳</span>
                                <div>
                                  <p className="text-white text-sm">{acc.name}</p>
                                  <p className="text-gray-500 text-xs">
                                    {acc.subtype ? acc.subtype.charAt(0).toUpperCase() + acc.subtype.slice(1) : 'Credit'}
                                    {acc.mask && ` •••• ${acc.mask}`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {acc.balance_current !== null && (
                                  <p className="text-white text-sm font-medium">
                                    ${acc.balance_current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                                {acc.balance_limit !== null && (
                                  <p className="text-gray-500 text-xs">
                                    ${acc.balance_limit.toLocaleString('en-US', { minimumFractionDigits: 2 })} limit
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Credit cards synced via Plaid. Balances update when you reconnect.
            </p>
          </div>
        )}

        {/* Manual Cards List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-vault-accent border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-vault-silver-dark">Loading cards...</p>
          </div>
        ) : cards.length === 0 && plaidCreditAccounts.length === 0 && plaidDebitAccounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <p className="text-vault-silver-dark mb-2">No cards added yet</p>
            <p className="text-sm text-vault-silver-dark/70">Add your first credit card to start tracking</p>
          </div>
        ) : cards.length === 0 ? null : (
          <div className="space-y-3">
            {cards.map((card) => {
              const bank = bankOptions.find(b => b.id === card.bankId)
              const utilization = card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0
              const daysUntilDue = getDaysUntilDue(card.dueDate)
              const minPayment = calculateMinPayment(card.currentBalance, card.apr)

              return (
                <div
                  key={card.id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                >
                  {/* Card Header with Bank Color */}
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: bank?.color + '20' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{bank?.logo}</span>
                      <div>
                        <p className="font-bold text-white">{card.nickname || bank?.name}</p>
                        <p className="text-xs text-gray-400">•••• {card.lastFour}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCard(card)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-2 text-gray-400 hover:text-zinc-300 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-vault-silver-dark">Credit Limit</p>
                        <p className="text-lg font-bold text-white">${card.creditLimit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-vault-silver-dark">Current Balance</p>
                        <p className="text-lg font-bold text-vault-accent">${card.currentBalance.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-vault-silver-dark">Utilization</span>
                        <span className={utilization > 30 ? 'text-vault-warning' : 'text-vault-success'}>
                          {utilization.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-vault-black rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            utilization > 30 ? 'bg-vault-warning' : utilization > 10 ? 'bg-yellow-500' : 'bg-vault-success'
                          }`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-vault-silver/10">
                      <div>
                        <p className="text-xs text-vault-silver-dark">Due Date</p>
                        <p className="text-sm font-medium text-white">
                          {card.dueDate}{['st', 'nd', 'rd'][((card.dueDate + 90) % 100 - 10) % 10 - 1] || 'th'}
                        </p>
                        <p className={`text-xs ${daysUntilDue <= 7 ? 'text-vault-warning' : 'text-vault-silver-dark'}`}>
                          {daysUntilDue} days
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-vault-silver-dark">Statement</p>
                        <p className="text-sm font-medium text-white">
                          {card.statementDate}{['st', 'nd', 'rd'][((card.statementDate + 90) % 100 - 10) % 10 - 1] || 'th'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-vault-silver-dark">Est. Min Payment</p>
                        <p className="text-sm font-medium text-vault-accent">${minPayment}</p>
                      </div>
                    </div>

                    {card.isRevolving && card.currentBalance > 0 && (
                      <div className="pt-2 border-t border-vault-silver/10">
                        <div className="flex items-center gap-2 text-xs text-vault-warning">
                          <span>⚠️</span>
                          <span>Revolving balance at {card.apr}% APR</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Debit Cards & Bank Accounts Section */}
        {debitAccountsByConnection.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
            <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              DEBIT CARDS & BANK ACCOUNTS
            </h3>

            {/* Debit Summary */}
            <div className="bg-vault-black/50 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-vault-silver-dark">Total Available</p>
                  <p className="text-xl font-bold text-blue-400">
                    ${totalDebitAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-vault-silver-dark">Current Balance</p>
                  <p className="text-lg font-medium text-white">
                    ${totalDebitBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {debitAccountsByConnection.map(({ connection, accounts }) => {
                const isExpanded = expandedDebitConnections.has(connection.id)
                const hasAccounts = accounts.length > 0

                return (
                  <div key={connection.id} className="bg-vault-black/50 rounded-lg overflow-hidden">
                    {/* Connection Header - Clickable */}
                    <button
                      onClick={() => toggleDebitConnectionExpanded(connection.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-vault-purple/20 transition-colors"
                    >
                      {connection.logo_url ? (
                        <img src={connection.logo_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: connection.primary_color || '#6366f1' }}
                        >
                          🏦
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-white text-sm font-medium">{connection.institution_name}</p>
                        <p className="text-gray-500 text-xs">
                          {accounts.length} account{accounts.length !== 1 ? 's' : ''} linked
                        </p>
                      </div>
                      <span className="text-blue-400 text-xs px-2 py-1 bg-blue-500/10 rounded">Connected</span>
                      {/* Expand/Collapse Arrow */}
                      {hasAccounts && (
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>

                    {/* Accounts List (expandable) */}
                    {isExpanded && hasAccounts && (
                      <div className="space-y-2 border-t border-vault-silver/10 p-3 bg-vault-purple/10">
                        {accounts.map((acc) => {
                          const linkedCard = linkedCards.find(lc => lc.account_id === acc.id)
                          const carryItem = carryItems.find(item => item.linked_account_id === acc.id)
                          const isInCarry = !!carryItem
                          return (
                            <div
                              key={acc.id}
                              className={`flex items-center justify-between rounded-lg p-2 transition-all ${
                                isInCarry
                                  ? 'bg-vault-accent/20 border border-vault-accent/30'
                                  : linkedCard
                                    ? 'bg-vault-success/10 border border-vault-success/30'
                                    : 'bg-vault-purple/20'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isInCarry}
                                    onChange={async () => {
                                      if (carryItem) {
                                        // Move back to vault
                                        const { error } = await supabase
                                          .from('belongings')
                                          .update({ location: 'vault' })
                                          .eq('id', carryItem.id)
                                        if (!error) {
                                          setCarryItems(carryItems.filter(i => i.id !== carryItem.id))
                                        }
                                      } else {
                                        // Add to carry
                                        if (!user?.id) {
                                          alert('No user logged in')
                                          return
                                        }
                                        const cardName = `${connection.institution_name} ${acc.subtype === 'checking' ? 'Debit' : acc.subtype || ''} Card`.trim()
                                        console.log('Adding debit to carry:', { userId: user.id, cardName, accountId: acc.id })
                                        const { data, error } = await supabase
                                          .from('belongings')
                                          .insert({
                                            user_id: user.id,
                                            type: 'card',
                                            name: cardName,
                                            details: acc.mask ? `•••• ${acc.mask}` : acc.subtype || 'Card',
                                            color: connection.primary_color || '#6366f1',
                                            location: 'carry',
                                            linked_account_id: acc.id,
                                            connection_id: connection.id,
                                          })
                                          .select()
                                          .single()
                                        if (error) {
                                          console.error('Error adding debit to carry:', error)
                                          alert(`Failed to add to carry: ${error.message}`)
                                        } else if (data) {
                                          console.log('Added debit to carry:', data)
                                          setCarryItems([...carryItems, {
                                            id: data.id,
                                            name: cardName,
                                            details: acc.mask ? `•••• ${acc.mask}` : acc.subtype || 'Card',
                                            color: connection.primary_color || '#6366f1',
                                            linked_account_id: acc.id,
                                            connection_id: connection.id,
                                            balance: acc.balance_current,
                                          }])
                                        }
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-vault-silver/30 bg-vault-black text-vault-accent focus:ring-vault-accent cursor-pointer"
                                  />
                                  <span className="text-xs text-vault-silver-dark">Carry</span>
                                </label>
                                <span className="text-lg">
                                  {acc.subtype === 'checking' ? '💳' : acc.subtype === 'savings' ? '🏦' : '💰'}
                                </span>
                                <div>
                                  <p className="text-white text-sm">
                                    {linkedCard ? linkedCard.name : acc.name}
                                  </p>
                                  <p className="text-vault-silver-dark text-xs">
                                    {acc.subtype ? acc.subtype.charAt(0).toUpperCase() + acc.subtype.slice(1) : 'Account'}
                                    {linkedCard?.last_four ? ` •••• ${linkedCard.last_four}` : acc.mask ? ` •••• ${acc.mask}` : ''}
                                  </p>
                                  {linkedCard && !isInCarry && (
                                    <p className="text-xs text-vault-success mt-0.5">✓ Card in Vault</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                {acc.balance_current !== null && (
                                  <p className="text-white text-sm font-medium">
                                    ${acc.balance_current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                                {acc.balance_available !== null && acc.balance_available !== acc.balance_current && (
                                  <p className="text-gray-500 text-xs">
                                    ${acc.balance_available.toLocaleString('en-US', { minimumFractionDigits: 2 })} available
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Bank accounts for budgeting and bill pay.
            </p>
          </div>
        )}
      </div>
      )}

      {/* Add/Edit Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              {editingCard ? 'EDIT CARD' : 'ADD NEW CARD'}
            </h3>

            <div className="space-y-4">
              {/* Bank Selection */}
              <div>
                <label className="block text-xs text-vault-silver-dark mb-2">Select Bank/Issuer</label>
                <div className="grid grid-cols-4 gap-2">
                  {bankOptions.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, bankId: bank.id })}
                      className={`p-3 rounded-lg border transition-all ${
                        formData.bankId === bank.id
                          ? 'border-vault-accent bg-vault-accent/20'
                          : 'border-vault-silver/20 hover:border-vault-accent/50'
                      }`}
                    >
                      <span className="text-xl block text-center">{bank.logo}</span>
                      <span className="text-xs text-vault-silver-dark block text-center truncate">{bank.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-vault-silver-dark mb-1">Card Nickname</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    placeholder="e.g., Freedom Unlimited"
                    className="w-full px-3 py-2 bg-vault-black border border-vault-silver/20 rounded-lg text-white text-sm focus:outline-none focus:border-vault-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-vault-silver-dark mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    value={formData.lastFour}
                    onChange={(e) => setFormData({ ...formData, lastFour: e.target.value.slice(0, 4) })}
                    placeholder="1234"
                    maxLength={4}
                    className="w-full px-3 py-2 bg-vault-black border border-vault-silver/20 rounded-lg text-white text-sm focus:outline-none focus:border-vault-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-vault-silver-dark mb-1">Credit Limit ($)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    placeholder="10000"
                    className="w-full px-3 py-2 bg-vault-black border border-vault-silver/20 rounded-lg text-white text-sm focus:outline-none focus:border-vault-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-vault-silver-dark mb-1">Current Balance ($)</label>
                  <input
                    type="number"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                    placeholder="2500"
                    className="w-full px-3 py-2 bg-vault-black border border-vault-silver/20 rounded-lg text-white text-sm focus:outline-none focus:border-vault-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-vault-silver-dark mb-1">Due Date (Day)</label>
                  <input
                    type="number"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    placeholder="15"
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 bg-vault-black border border-vault-silver/20 rounded-lg text-white text-sm focus:outline-none focus:border-vault-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-vault-silver-dark mb-1">Statement (Day)</label>
                  <input
                    type="number"
                    value={formData.statementDate}
                    onChange={(e) => setFormData({ ...formData, statementDate: e.target.value })}
                    placeholder="1"
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 bg-vault-black border border-vault-silver/20 rounded-lg text-white text-sm focus:outline-none focus:border-vault-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-vault-silver-dark mb-1">APR (%)</label>
                  <input
                    type="number"
                    value={formData.apr}
                    onChange={(e) => setFormData({ ...formData, apr: e.target.value })}
                    placeholder="24.99"
                    step="0.01"
                    className="w-full px-3 py-2 bg-vault-black border border-vault-silver/20 rounded-lg text-white text-sm focus:outline-none focus:border-vault-accent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isRevolving"
                  checked={formData.isRevolving}
                  onChange={(e) => setFormData({ ...formData, isRevolving: e.target.checked })}
                  className="rounded border-vault-silver/20 bg-vault-black text-vault-accent focus:ring-vault-accent"
                />
                <label htmlFor="isRevolving" className="text-sm text-vault-silver">
                  Carrying a revolving balance (not paying in full)
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="flex-1 px-4 py-2 border border-vault-silver/20 text-vault-silver-dark rounded-lg hover:border-vault-accent hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCard}
                disabled={!formData.bankId || saving}
                className="flex-1 px-4 py-2 text-white font-bold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
              >
                {saving ? 'Saving...' : editingCard ? 'Save Changes' : 'Add Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cards
