import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Client {
  id: string
  client_id: string
  full_name: string
  email: string
  phone: string
  plan_type: string
  created_at: string
  is_active: boolean
}

interface Case {
  id: string
  case_id: string
  client_id: string
  status: string
  progress_percent: number
  created_at: string
  updated_at: string
}

interface DisputeItem {
  id: string
  case_id: string
  client_id: string
  bureau: string
  creditor: string
  status: string
}

interface DisputeRound {
  id: string
  case_id: string
  client_id: string
  round_type: string
  bureau: string
  status: string
  response_due_at: string
}

interface GHLLead {
  id: string
  full_name: string
  email: string
  phone: string
  created_at: string
}

type TabType = 'overview' | 'clients' | 'cases' | 'pipeline' | 'leads'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  review: 'bg-yellow-500',
  sent: 'bg-blue-500',
  complete: 'bg-green-500',
  disputed: 'bg-yellow-500',
  verified: 'bg-orange-500',
  deleted: 'bg-green-500',
  escalated: 'bg-purple-500',
  pending: 'bg-gray-500',
  awaiting_response: 'bg-blue-500',
}

const roundTypeLabels: Record<string, string> = {
  standard: 'Standard',
  method_of_verification: 'MOV',
  direct_creditor: 'Direct',
  debt_validation: 'Validation',
  cfpb: 'CFPB',
  ag_complaint: 'AG',
  intent_to_litigate: 'Litigate',
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [clients, setClients] = useState<Client[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [items, setItems] = useState<DisputeItem[]>([])
  const [rounds, setRounds] = useState<DisputeRound[]>([])
  const [leads, setLeads] = useState<GHLLead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedClient, setSelectedClient] = useState<string | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Fetch clients
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      setClients(clientsData || [])

      // Fetch cases
      const { data: casesData } = await supabase
        .from('dispute_cases')
        .select('*')
        .order('updated_at', { ascending: false })
      setCases(casesData || [])

      // Fetch items
      const { data: itemsData } = await supabase
        .from('dispute_items')
        .select('*')
      setItems(itemsData || [])

      // Fetch rounds
      const { data: roundsData } = await supabase
        .from('dispute_rounds')
        .select('*')
        .order('started_at', { ascending: false })
      setRounds(roundsData || [])

      // Fetch GHL leads
      const { data: leadsData } = await supabase
        .from('ghl_leads')
        .select('*')
        .order('created_at', { ascending: false })
      setLeads(leadsData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const totalClients = clients.length
  const activeCases = cases.filter(c => !['complete', 'closed'].includes(c.status)).length
  const totalItems = items.length
  const deletedItems = items.filter(i => i.status === 'deleted').length
  const verifiedItems = items.filter(i => i.status === 'verified').length
  const inProgressItems = items.filter(i => ['disputed', 'escalated', 'sent'].includes(i.status)).length
  
  // Cases needing attention (30+ days)
  const casesNeedingAttention = cases.filter(c => {
    const daysSince = (Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince >= 30 && c.status !== 'complete'
  })

  // Overdue responses
  const overdueRounds = rounds.filter(r => {
    if (!r.response_due_at || r.status === 'complete') return false
    return new Date(r.response_due_at) < new Date()
  })

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_id?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Filter cases
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.case_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_id?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesClient = !selectedClient || c.client_id === selectedClient
    return matchesSearch && matchesStatus && matchesClient
  })

  // Get client details for a case
  const getClientForCase = (clientId: string) => {
    return clients.find(c => c.client_id === clientId)
  }

  // Get items for a case
  const getItemsForCase = (caseId: string) => {
    return items.filter(i => i.case_id === caseId)
  }

  // Get rounds for a case
  const getRoundsForCase = (caseId: string) => {
    return rounds.filter(r => r.case_id === caseId)
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-wizard-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-wizard-accent hover:text-wizard-glow transition-colors mb-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1
              className="text-2xl md:text-3xl font-bold text-white"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              ⚡ ADMIN COMMAND CENTER
            </h1>
            <p className="text-gray-400 mt-1">Benjamin Frost LLC Credit Repair CRM</p>
          </div>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-wizard-accent text-white rounded-lg hover:bg-wizard-accent/80 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="rounded-xl p-4 bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30">
            <div className="text-3xl font-bold text-white">{totalClients}</div>
            <div className="text-sm text-blue-400">Total Clients</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30">
            <div className="text-3xl font-bold text-white">{activeCases}</div>
            <div className="text-sm text-green-400">Active Cases</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30">
            <div className="text-3xl font-bold text-white">{totalItems}</div>
            <div className="text-sm text-purple-400">Total Items</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border border-emerald-500/30">
            <div className="text-3xl font-bold text-white">{deletedItems}</div>
            <div className="text-sm text-emerald-400">Items Deleted</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-orange-600/20 to-orange-800/20 border border-orange-500/30">
            <div className="text-3xl font-bold text-white">{casesNeedingAttention.length}</div>
            <div className="text-sm text-orange-400">Need Attention</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-500/30">
            <div className="text-3xl font-bold text-white">{leads.length}</div>
            <div className="text-sm text-yellow-400">GHL Leads</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['overview', 'clients', 'cases', 'pipeline', 'leads'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-wizard-accent text-white'
                  : 'bg-wizard-indigo/30 text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        {['clients', 'cases'].includes(activeTab) && (
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-wizard-black border border-wizard-silver/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-wizard-accent"
              />
            </div>
            {activeTab === 'cases' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-wizard-black border border-wizard-silver/30 rounded-lg text-white focus:outline-none focus:border-wizard-accent"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="sent">Sent</option>
                <option value="complete">Complete</option>
              </select>
            )}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Alerts */}
            {(casesNeedingAttention.length > 0 || overdueRounds.length > 0) && (
              <div className="rounded-xl p-4 bg-red-900/20 border border-red-500/30">
                <h3 className="font-semibold text-red-400 mb-3">⚠️ Requires Attention</h3>
                <div className="space-y-2">
                  {casesNeedingAttention.slice(0, 5).map((c) => (
                    <div key={c.case_id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{c.case_id} - 30+ days since update</span>
                      <span className={`px-2 py-1 rounded text-xs ${statusColors[c.status]}`}>
                        {c.status?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {overdueRounds.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{r.case_id} - Response overdue ({r.bureau})</span>
                      <span className="text-orange-400">{roundTypeLabels[r.round_type]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Cases */}
              <div className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
                <h3 className="font-semibold text-white mb-4">📁 Recent Cases</h3>
                <div className="space-y-3">
                  {cases.slice(0, 5).map((c) => {
                    const client = getClientForCase(c.client_id)
                    const caseItems = getItemsForCase(c.case_id)
                    return (
                      <div key={c.case_id} className="flex items-center justify-between p-3 bg-wizard-black/50 rounded-lg">
                        <div>
                          <div className="text-white font-medium">{client?.full_name || c.client_id}</div>
                          <div className="text-xs text-gray-400">{c.case_id} • {caseItems.length} items</div>
                        </div>
                        <div className="text-right">
                          <div className={`px-2 py-1 rounded text-xs ${statusColors[c.status]}`}>
                            {c.status?.toUpperCase()}
                          </div>
                          <div className="text-xs text-wizard-accent mt-1">{c.progress_percent}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Dispute Stats */}
              <div className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
                <h3 className="font-semibold text-white mb-4">📊 Dispute Stats</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Items Deleted</span>
                      <span className="text-green-400">{deletedItems} / {totalItems}</span>
                    </div>
                    <div className="h-3 bg-wizard-black rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${totalItems > 0 ? (deletedItems / totalItems) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">In Progress</span>
                      <span className="text-yellow-400">{inProgressItems}</span>
                    </div>
                    <div className="h-3 bg-wizard-black rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${totalItems > 0 ? (inProgressItems / totalItems) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Verified (Escalating)</span>
                      <span className="text-orange-400">{verifiedItems}</span>
                    </div>
                    <div className="h-3 bg-wizard-black rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${totalItems > 0 ? (verifiedItems / totalItems) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="mt-6 p-4 bg-wizard-accent/10 rounded-lg border border-wizard-accent/30">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-wizard-accent">
                      {totalItems > 0 ? Math.round((deletedItems / totalItems) * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-400">Overall Success Rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bureau Breakdown */}
            <div className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
              <h3 className="font-semibold text-white mb-4">🏛️ Bureau Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['EX', 'EQ', 'TU'].map((bureau) => {
                  const bureauItems = items.filter(i => i.bureau === bureau)
                  const bureauDeleted = bureauItems.filter(i => i.status === 'deleted').length
                  const bureauTotal = bureauItems.length
                  const bureauNames: Record<string, string> = { EX: 'Experian', EQ: 'Equifax', TU: 'TransUnion' }
                  const bureauColors: Record<string, string> = { EX: 'from-red-600 to-red-800', EQ: 'from-blue-600 to-blue-800', TU: 'from-green-600 to-green-800' }

                  return (
                    <div key={bureau} className="p-4 bg-wizard-black/50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${bureauColors[bureau]} flex items-center justify-center text-white font-bold`}>
                          {bureau}
                        </div>
                        <div>
                          <div className="text-white font-medium">{bureauNames[bureau]}</div>
                          <div className="text-xs text-gray-400">{bureauDeleted}/{bureauTotal} deleted</div>
                        </div>
                      </div>
                      <div className="h-2 bg-wizard-black rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${bureauTotal > 0 ? (bureauDeleted / bureauTotal) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-4">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No clients found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-wizard-silver/20">
                      <th className="pb-3 pl-4">Client</th>
                      <th className="pb-3">Contact</th>
                      <th className="pb-3">Plan</th>
                      <th className="pb-3">Cases</th>
                      <th className="pb-3">Items</th>
                      <th className="pb-3">Progress</th>
                      <th className="pb-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => {
                      const clientCases = cases.filter(c => c.client_id === client.client_id)
                      const clientItems = items.filter(i => i.client_id === client.client_id)
                      const deletedCount = clientItems.filter(i => i.status === 'deleted').length
                      const avgProgress = clientCases.length > 0
                        ? Math.round(clientCases.reduce((sum, c) => sum + (c.progress_percent || 0), 0) / clientCases.length)
                        : 0

                      return (
                        <tr
                          key={client.id}
                          className="border-b border-wizard-silver/10 hover:bg-wizard-indigo/10 cursor-pointer"
                          onClick={() => {
                            setSelectedClient(client.client_id)
                            setActiveTab('cases')
                          }}
                        >
                          <td className="py-4 pl-4">
                            <div className="text-white font-medium">{client.full_name}</div>
                            <div className="text-xs text-gray-400">{client.client_id}</div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-gray-300">{client.email}</div>
                            <div className="text-xs text-gray-400">{client.phone}</div>
                          </td>
                          <td className="py-4">
                            <span className="px-2 py-1 bg-wizard-accent/20 text-wizard-accent rounded text-xs">
                              {client.plan_type || 'Basic'}
                            </span>
                          </td>
                          <td className="py-4 text-white">{clientCases.length}</td>
                          <td className="py-4">
                            <span className="text-green-400">{deletedCount}</span>
                            <span className="text-gray-400">/{clientItems.length}</span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-wizard-black rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-wizard-accent rounded-full"
                                  style={{ width: `${avgProgress}%` }}
                                />
                              </div>
                              <span className="text-sm text-wizard-accent">{avgProgress}%</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-400">
                            {new Date(client.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cases' && (
          <div className="space-y-4">
            {selectedClient && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-gray-400">Filtered by:</span>
                <span className="px-3 py-1 bg-wizard-accent/20 text-wizard-accent rounded-lg text-sm">
                  {clients.find(c => c.client_id === selectedClient)?.full_name || selectedClient}
                </span>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {filteredCases.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No cases found</div>
            ) : (
              <div className="grid gap-4">
                {filteredCases.map((c) => {
                  const client = getClientForCase(c.client_id)
                  const caseItems = getItemsForCase(c.case_id)
                  const caseRounds = getRoundsForCase(c.case_id)
                  const deletedCount = caseItems.filter(i => i.status === 'deleted').length
                  const latestRound = caseRounds[0]

                  return (
                    <div
                      key={c.case_id}
                      className="rounded-xl p-4"
                      style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-white">{client?.full_name || c.client_id}</h3>
                            <span className={`px-2 py-1 rounded text-xs ${statusColors[c.status]}`}>
                              {c.status?.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">{c.case_id}</div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-white">{caseItems.length}</div>
                            <div className="text-xs text-gray-400">Items</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-400">{deletedCount}</div>
                            <div className="text-xs text-gray-400">Deleted</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-wizard-accent">{c.progress_percent}%</div>
                            <div className="text-xs text-gray-400">Progress</div>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4 h-2 bg-wizard-black rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-wizard-accent to-wizard-glow rounded-full"
                          style={{ width: `${c.progress_percent}%` }}
                        />
                      </div>

                      {/* Latest round info */}
                      {latestRound && (
                        <div className="mt-4 flex items-center gap-4 text-sm">
                          <span className="text-gray-400">Latest:</span>
                          <span className="text-white">{roundTypeLabels[latestRound.round_type]} - {latestRound.bureau}</span>
                          <span className={`px-2 py-1 rounded text-xs ${statusColors[latestRound.status]}`}>
                            {latestRound.status?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Items by bureau */}
                      <div className="mt-4 flex gap-4">
                        {['EX', 'EQ', 'TU'].map((bureau) => {
                          const count = caseItems.filter(i => i.bureau === bureau).length
                          const deleted = caseItems.filter(i => i.bureau === bureau && i.status === 'deleted').length
                          if (count === 0) return null
                          return (
                            <div key={bureau} className="text-xs">
                              <span className="text-gray-400">{bureau}:</span>
                              <span className="text-green-400 ml-1">{deleted}</span>
                              <span className="text-gray-400">/{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['draft', 'review', 'sent', 'complete'].map((status) => {
              const statusCases = cases.filter(c => c.status === status)
              const statusLabels: Record<string, string> = {
                draft: '📝 Draft',
                review: '👀 Review',
                sent: '📬 Sent',
                complete: '✅ Complete'
              }

              return (
                <div key={status} className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">{statusLabels[status]}</h3>
                    <span className="px-2 py-1 bg-wizard-black rounded text-sm text-wizard-accent">
                      {statusCases.length}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {statusCases.map((c) => {
                      const client = getClientForCase(c.client_id)
                      return (
                        <div
                          key={c.case_id}
                          className="p-3 bg-wizard-black/50 rounded-lg cursor-pointer hover:bg-wizard-black/80"
                          onClick={() => {
                            setSelectedClient(c.client_id)
                            setActiveTab('cases')
                          }}
                        >
                          <div className="text-sm text-white font-medium truncate">
                            {client?.full_name || c.client_id}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{c.case_id}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-wizard-accent">{c.progress_percent}%</span>
                            <span className="text-xs text-gray-400">
                              {new Date(c.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {statusCases.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No cases
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="space-y-4">
            {leads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No GHL leads yet. Connect GoHighLevel to start receiving leads.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-wizard-silver/20">
                      <th className="pb-3 pl-4">Name</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Phone</th>
                      <th className="pb-3">Received</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-wizard-silver/10 hover:bg-wizard-indigo/10">
                        <td className="py-4 pl-4">
                          <div className="text-white font-medium">{lead.full_name}</div>
                        </td>
                        <td className="py-4 text-gray-300">{lead.email}</td>
                        <td className="py-4 text-gray-300">{lead.phone}</td>
                        <td className="py-4 text-sm text-gray-400">
                          {new Date(lead.created_at).toLocaleString()}
                        </td>
                        <td className="py-4">
                          <button className="px-3 py-1 bg-wizard-accent text-white rounded text-sm hover:bg-wizard-accent/80">
                            Convert to Client
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
