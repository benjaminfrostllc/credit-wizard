import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BankCard } from '../components/BankCard'
import { ProgressBar } from '../components/ProgressBar'
import { SectionInfoButton } from '../components/SectionInfoButton'
import { SectionSurvey } from '../components/SectionSurvey'
import { PlaidLinkModal } from '../components/PlaidLinkModal'
import { SpendingTab } from '../components/SpendingTab'
import { getBankConnections, getBankAccounts, type BankConnection, type BankAccount } from '../lib/supabase'

type TabType = 'banks' | 'spending'

// Bank definitions with their task ID prefixes
const banks = [
  { name: 'JPMorgan Chase', prefix: 'treasury_chase', notes: 'Chase relationship banking is key to unlocking business lines and larger credit cards. Prioritize early.' },
  { name: 'Bank of America', prefix: 'treasury_bofa', notes: 'Strong business credit reporting partner. Offers secured business cards for early-stage builders.' },
  { name: 'Wells Fargo', prefix: 'treasury_wells', notes: 'Conservative bank. Good for stability and relationship banking later in funding journey.' },
  { name: 'Citi', prefix: 'treasury_citi', notes: 'Good for accessing Citi Business Credit Cards. International-friendly for scaling beyond U.S.' },
  { name: 'US Bank', prefix: 'treasury_usbank', notes: 'Moderate approval standards. Great for regional funding strategies.' },
  { name: 'PNC Bank', prefix: 'treasury_pnc', notes: 'Known for regional relationship banking. Can unlock funding with steady business activity.' },
  { name: 'Truist', prefix: 'treasury_truist', notes: 'Merged from SunTrust and BB&T. Newer systems but high-touch service.' },
  { name: 'BMO', prefix: 'treasury_bmo', notes: 'Canadian roots, strong midwestern U.S. presence. Relationship banking bonuses for new businesses.' },
  { name: 'Citizens Bank', prefix: 'treasury_citizens', notes: 'Moderate-sized bank. Good supplementary bank for secondary relationship banking.' },
  { name: 'HSBC', prefix: 'treasury_hsbc', notes: 'Great for international business setups. Personal savings often prioritized.' },
  { name: 'American Express', prefix: 'treasury_amex', notes: 'Focus on High-Yield Savings. Business Checking by invite only.' },
  { name: 'Navy Federal', prefix: 'treasury_navyfed', notes: 'Military affiliation required. Known for aggressive high-limit approvals once internal score is built.' },
  { name: 'SECU', prefix: 'treasury_secu', notes: 'NC employees/family only. Extremely conservative underwriting but great for stable personal growth.' },
  { name: 'PenFed', prefix: 'treasury_penfed', notes: 'Open to all with small donation if no military background. Good mix of personal and business lending.' },
  { name: 'NASA FCU', prefix: 'treasury_nasafcu', notes: 'Tech/science/engineering professional perks. Unique business lines available after relationship builds.' },
]

export default function Treasury() {
  const { treasury, toggleTask, addComment, refreshTasks, user } = useApp()
  const [activeTab, setActiveTab] = useState<TabType>('banks')
  const [showSurvey, setShowSurvey] = useState(false)
  const [showPlaidModal, setShowPlaidModal] = useState(false)
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set())

  // Load bank connections and accounts on mount
  useEffect(() => {
    if (user?.id) {
      loadConnections()
    }
  }, [user?.id])

  const loadConnections = async () => {
    if (!user?.id) return
    try {
      const [connectionsData, accountsData] = await Promise.all([
        getBankConnections(user.id),
        getBankAccounts(user.id),
      ])
      console.log('[Treasury] Loaded bank connections:', connectionsData)
      console.log('[Treasury] Loaded bank accounts:', accountsData)
      setConnections(connectionsData)
      setAccounts(accountsData)
    } catch (err) {
      console.error('Failed to load bank data:', err)
    }
  }

  // Create a map from bank name to connection (matching by institution name)
  // This is more reliable than treasury_bank_prefix which depends on Plaid institution IDs
  const connectionMap = useMemo(() => {
    const map = new Map<string, BankConnection>()
    connections.forEach((conn) => {
      // Match by institution name (case-insensitive, partial match)
      const connName = conn.institution_name.toLowerCase()
      banks.forEach((bank) => {
        const bankName = bank.name.toLowerCase()
        // Check if names match (handle variations like "Bank of America" vs "Bank of America, N.A.")
        if (
          connName.includes(bankName) ||
          bankName.includes(connName) ||
          // Handle specific aliases
          (bankName === 'jpmorgan chase' && connName.includes('chase')) ||
          (bankName === 'navy federal' && connName.includes('navy federal')) ||
          (bankName === 'american express' && connName.includes('amex'))
        ) {
          map.set(bank.prefix, conn)
        }
      })
    })
    return map
  }, [connections])

  // Create a map from connection_id to accounts
  const accountsByConnection = useMemo(() => {
    const map = new Map<string, BankAccount[]>()
    accounts.forEach((acc) => {
      const existing = map.get(acc.connection_id) || []
      existing.push(acc)
      map.set(acc.connection_id, existing)
    })
    return map
  }, [accounts])

  // Group tasks by bank
  const bankTasks = useMemo(() => {
    return banks.map((bank) => ({
      ...bank,
      tasks: treasury.filter((task) => task.id.startsWith(bank.prefix)),
    }))
  }, [treasury])

  // Overall progress
  const completedCount = treasury.filter((t) => t.completed).length
  const progress = treasury.length > 0 ? (completedCount / treasury.length) * 100 : 0

  // Count connected banks
  const connectedCount = connections.filter((c) => c.status === 'connected').length

  // All connected Plaid connections
  const connectedPlaid = connections.filter((c) => c.status === 'connected')

  // Filter credit accounts to show link to Cards section
  const creditAccounts = accounts.filter((a) => a.type === 'credit')

  const handlePlaidSuccess = (connection: BankConnection) => {
    setConnections((prev) => {
      // Replace if same institution exists, otherwise add
      const existing = prev.findIndex((c) => c.institution_id === connection.institution_id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = connection
        return updated
      }
      return [...prev, connection]
    })
    // Auto-expand the newly connected bank
    setExpandedConnections((prev) => new Set(prev).add(connection.id))
    // Reload accounts to get the new accounts
    loadConnections()
  }

  const toggleConnectionExpanded = (connectionId: string) => {
    setExpandedConnections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId)
      } else {
        newSet.add(connectionId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-vault-accent hover:text-vault-accent-light transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1
                className="text-2xl md:text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                THE TREASURY
              </h1>
              <SectionInfoButton onClick={() => setShowSurvey(true)} />
            </div>
            <button
              onClick={() => setShowPlaidModal(true)}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Connect Bank
            </button>
          </div>
          <p className="text-vault-silver-dark mt-2">Banking & Capital Custody</p>
          {connectedCount > 0 && (
            <p className="text-vault-success text-sm mt-1">
              {connectedCount} bank{connectedCount !== 1 ? 's' : ''} connected via Plaid
            </p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('banks')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'banks'
                ? 'bg-vault-accent text-white'
                : 'bg-vault-purple/30 text-gray-400 hover:text-white hover:bg-vault-purple/50'
            }`}
          >
            Banks
          </button>
          <button
            onClick={() => setActiveTab('spending')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'spending'
                ? 'bg-vault-accent text-white'
                : 'bg-vault-purple/30 text-gray-400 hover:text-white hover:bg-vault-purple/50'
            }`}
          >
            Spending
          </button>
        </div>

        {/* Spending Tab Content */}
        {activeTab === 'spending' && user && (
          <SpendingTab userId={user.id} />
        )}

        {/* Banks Tab Content */}
        {activeTab === 'banks' && (
          <>
        {/* Overall Progress */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🏦</span>
            <div>
              <h2 className="text-lg font-bold text-white">Bank Account Setup</h2>
              <p className="text-sm text-vault-silver-dark">
                {completedCount} of {treasury.length} accounts opened
              </p>
            </div>
          </div>
          <ProgressBar progress={progress} />
        </div>

        {/* Instructions */}
        <div className="rounded-xl p-4 mb-6" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <h3
                className="text-xs text-vault-accent mb-2"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                TREASURY STRATEGY
              </h3>
              <ul className="text-xs text-vault-silver-dark space-y-1">
                <li>• <strong className="text-white">Prepare documents:</strong> ID, SSN, EIN, Articles of Organization, Operating Agreement</li>
                <li>• <strong className="text-white">Minimum deposit:</strong> $50 per account recommended</li>
                <li>• <strong className="text-white">Relationship banking:</strong> Multiple banks = more funding options</li>
                <li>• <strong className="text-white">Credit unions:</strong> Join ACC for access (use code "Andrews" for free membership)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bank Cards */}
        <div className="space-y-3">
          {bankTasks.map((bank) => {
            const connection = connectionMap.get(bank.prefix)
            return (
              <BankCard
                key={bank.prefix}
                name={bank.name}
                tasks={bank.tasks}
                notes={bank.notes}
                onToggle={(id) => toggleTask('treasury', id)}
                onComment={(id, comment) => addComment('treasury', id, comment)}
                isConnected={connection?.status === 'connected'}
                connectionLogo={connection?.logo_url}
                connectionColor={connection?.primary_color}
                onConnect={() => setShowPlaidModal(true)}
              />
            )
          })}
        </div>

        {/* If no tasks yet, show placeholder */}
        {treasury.length === 0 && (
          <div className="text-center py-12 text-vault-silver-dark">
            <p className="text-lg mb-2">No bank tasks configured yet.</p>
            <p className="text-sm">Run the database seed script to populate tasks.</p>
          </div>
        )}

        {/* Connected Banks (via Plaid) */}
        {connectedPlaid.length > 0 && (
          <div className="mt-6 rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
            <h3 className="text-sm font-bold text-vault-success mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              CONNECTED VIA PLAID
            </h3>
            <div className="space-y-2">
              {connectedPlaid.map((conn) => {
                const connAccounts = accountsByConnection.get(conn.id) || []
                const depositoryAccounts = connAccounts.filter(a => a.type === 'depository')
                const isExpanded = expandedConnections.has(conn.id)
                const hasAccounts = depositoryAccounts.length > 0

                return (
                  <div key={conn.id} className="bg-vault-black/50 rounded-lg overflow-hidden">
                    {/* Bank Header - Clickable */}
                    <button
                      onClick={() => toggleConnectionExpanded(conn.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-vault-purple/20 transition-colors"
                    >
                      {conn.logo_url ? (
                        <img
                          src={conn.logo_url}
                          alt={conn.institution_name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: conn.primary_color || '#6366f1' }}
                        >
                          {conn.institution_name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-white text-sm font-medium">{conn.institution_name}</p>
                        <p className="text-gray-500 text-xs">
                          {conn.accounts_count > 0
                            ? `${conn.accounts_count} account${conn.accounts_count !== 1 ? 's' : ''} linked`
                            : 'Connected'
                          }
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

                    {/* Accounts List - Only show depository accounts in Treasury (expandable) */}
                    {isExpanded && hasAccounts && (
                      <div className="space-y-2 border-t border-vault-silver/10 p-3 pt-3 bg-vault-purple/10">
                        {depositoryAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className="flex items-center justify-between bg-vault-purple/20 rounded-lg p-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏦</span>
                              <div>
                                <p className="text-white text-sm">{acc.name}</p>
                                <p className="text-vault-silver-dark text-xs">
                                  {acc.subtype ? acc.subtype.charAt(0).toUpperCase() + acc.subtype.slice(1) : acc.type}
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
                              {acc.balance_available !== null && acc.balance_available !== acc.balance_current && (
                                <p className="text-vault-silver-dark text-xs">
                                  ${acc.balance_available.toLocaleString('en-US', { minimumFractionDigits: 2 })} available
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {creditAccounts.length > 0 && (
              <p className="text-xs text-vault-accent mt-3">
                💳 {creditAccounts.length} credit card{creditAccounts.length !== 1 ? 's' : ''} linked — view in Cards section
              </p>
            )}
            <p className="text-xs text-vault-silver-dark mt-2">
              Bank accounts connected via Plaid. Balances update when you reconnect.
            </p>
          </div>
        )}

        {/* Pro Tip */}
        <div className="mt-6 p-4 rounded-xl" style={{ background: 'linear-gradient(145deg, rgba(157, 140, 255, 0.1) 0%, rgba(123, 104, 238, 0.1) 100%)', border: '1px solid rgba(157, 140, 255, 0.2)' }}>
          <p className="text-sm text-vault-silver-dark">
            <span className="text-vault-accent font-semibold">Pro Tip:</span> Having multiple bank relationships increases your funding options and shows financial stability to lenders. Aim for 3-5 major bank relationships.
          </p>
        </div>
          </>
        )}
      </div>

      <SectionSurvey
        section="treasury"
        sectionTitle="The Treasury"
        isOpen={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSave={() => refreshTasks('treasury')}
      />

      <PlaidLinkModal
        isOpen={showPlaidModal}
        onClose={() => setShowPlaidModal(false)}
        onSuccess={handlePlaidSuccess}
      />
    </div>
  )
}
