import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

interface DisputeCase {
  id: string
  case_id: string
  client_id: string
  status: string
  progress_percent: number
  ai_summary: string
  created_at: string
  updated_at: string
}

interface DisputeItem {
  id: string
  case_id: string
  bureau: string
  creditor: string
  account_number: string
  balance: number
  status: string
  reason_code: string
  confidence_score: number
  created_at: string
}

interface DisputeRound {
  id: string
  case_id: string
  round_number: number
  round_type: string
  bureau: string
  status: string
  started_at: string
  letter_sent_at: string
  response_due_at: string
  outcome: string
}

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
  standard: 'Standard Dispute',
  method_of_verification: 'Method of Verification',
  direct_creditor: 'Direct Creditor',
  debt_validation: 'Debt Validation',
  cfpb: 'CFPB Complaint',
  ag_complaint: 'Attorney General',
  intent_to_litigate: 'Intent to Litigate',
}

const bureauColors: Record<string, string> = {
  EX: 'from-red-600 to-red-800',
  EQ: 'from-blue-600 to-blue-800',
  TU: 'from-green-600 to-green-800',
}

const bureauNames: Record<string, string> = {
  EX: 'Experian',
  EQ: 'Equifax',
  TU: 'TransUnion',
}

export default function Disputes() {
  const { clientId } = useApp()
  const [cases, setCases] = useState<DisputeCase[]>([])
  const [items, setItems] = useState<DisputeItem[]>([])
  const [rounds, setRounds] = useState<DisputeRound[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'timeline'>('overview')

  useEffect(() => {
    if (clientId) {
      fetchDisputeData()
    }
  }, [clientId])

  const fetchDisputeData = async () => {
    setLoading(true)
    try {
      // Fetch cases
      const { data: casesData, error: casesError } = await supabase
        .from('dispute_cases')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (casesError) throw casesError
      setCases(casesData || [])

      // If we have cases, fetch items and rounds
      if (casesData && casesData.length > 0) {
        const caseIds = casesData.map(c => c.case_id)
        
        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from('dispute_items')
          .select('*')
          .in('case_id', caseIds)

        if (itemsError) throw itemsError
        setItems(itemsData || [])

        // Fetch rounds
        const { data: roundsData, error: roundsError } = await supabase
          .from('dispute_rounds')
          .select('*')
          .in('case_id', caseIds)
          .order('started_at', { ascending: false })

        if (roundsError) throw roundsError
        setRounds(roundsData || [])

        // Select first case by default
        if (!selectedCase && casesData.length > 0) {
          setSelectedCase(casesData[0].case_id)
        }
      }
    } catch (error) {
      console.error('Error fetching dispute data:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedCaseData = cases.find(c => c.case_id === selectedCase)
  const caseItems = items.filter(i => i.case_id === selectedCase)
  const caseRounds = rounds.filter(r => r.case_id === selectedCase)

  // Calculate stats
  const totalItems = caseItems.length
  const deletedItems = caseItems.filter(i => i.status === 'deleted').length
  const inProgressItems = caseItems.filter(i => ['disputed', 'escalated'].includes(i.status)).length
  const verifiedItems = caseItems.filter(i => i.status === 'verified').length

  // Group items by bureau
  const itemsByBureau = caseItems.reduce((acc, item) => {
    if (!acc[item.bureau]) acc[item.bureau] = []
    acc[item.bureau].push(item)
    return acc
  }, {} as Record<string, DisputeItem[]>)

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-wizard-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your disputes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-wizard-accent hover:text-wizard-glow transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1
            className="text-2xl md:text-3xl font-bold text-white"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            ⚔️ DISPUTE CENTER
          </h1>
          <p className="text-gray-400 mt-2">Track your credit repair progress in real-time</p>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-white mb-2">No Active Disputes</h2>
            <p className="text-gray-400 mb-4">Your dispute journey hasn't started yet. Upload your credit report to begin.</p>
            <Link
              to="/the-vault"
              className="inline-flex items-center gap-2 px-6 py-3 bg-wizard-accent text-white rounded-lg hover:bg-wizard-accent/80 transition-colors"
            >
              Upload Credit Report
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            {/* Case Selector (if multiple cases) */}
            {cases.length > 1 && (
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {cases.map((c) => (
                  <button
                    key={c.case_id}
                    onClick={() => setSelectedCase(c.case_id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCase === c.case_id
                        ? 'bg-wizard-accent text-white'
                        : 'bg-wizard-indigo/30 text-gray-400 hover:text-white'
                    }`}
                  >
                    {c.case_id}
                  </button>
                ))}
              </div>
            )}

            {/* Progress Overview */}
            <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Case Progress</h2>
                  <p className="text-sm text-gray-400">{selectedCase}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedCaseData?.status || 'draft']} text-white`}>
                  {selectedCaseData?.status?.toUpperCase() || 'DRAFT'}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Overall Progress</span>
                  <span className="text-wizard-accent font-semibold">{selectedCaseData?.progress_percent || 0}%</span>
                </div>
                <div className="h-4 bg-wizard-black rounded-full overflow-hidden border border-wizard-silver/10">
                  <div
                    className="h-full bg-gradient-to-r from-wizard-accent to-wizard-glow rounded-full transition-all duration-500"
                    style={{ width: `${selectedCaseData?.progress_percent || 0}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-wizard-black/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-white">{totalItems}</div>
                  <div className="text-sm text-gray-400">Total Items</div>
                </div>
                <div className="bg-wizard-black/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-500">{deletedItems}</div>
                  <div className="text-sm text-gray-400">Deleted ✓</div>
                </div>
                <div className="bg-wizard-black/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-500">{inProgressItems}</div>
                  <div className="text-sm text-gray-400">In Progress</div>
                </div>
                <div className="bg-wizard-black/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-orange-500">{verifiedItems}</div>
                  <div className="text-sm text-gray-400">Escalating</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {(['overview', 'items', 'timeline'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-wizard-accent text-white'
                      : 'bg-wizard-indigo/30 text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* AI Summary */}
                {selectedCaseData?.ai_summary && (
                  <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, rgba(157, 140, 255, 0.1) 0%, rgba(18, 16, 26, 0.8) 100%)', border: '1px solid rgba(157, 140, 255, 0.3)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🔮</span>
                      <h3 className="font-semibold text-wizard-accent">AI Analysis</h3>
                    </div>
                    <p className="text-gray-300">{selectedCaseData.ai_summary}</p>
                  </div>
                )}

                {/* Bureau Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['EX', 'EQ', 'TU'].map((bureau) => {
                    const bureauItems = itemsByBureau[bureau] || []
                    const deleted = bureauItems.filter(i => i.status === 'deleted').length
                    const total = bureauItems.length

                    return (
                      <div
                        key={bureau}
                        className="rounded-xl p-4"
                        style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                      >
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${bureauColors[bureau]} flex items-center justify-center text-white font-bold mb-3`}>
                          {bureau}
                        </div>
                        <h4 className="font-semibold text-white">{bureauNames[bureau]}</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {total > 0 ? `${deleted}/${total} items removed` : 'No items'}
                        </p>
                        {total > 0 && (
                          <div className="mt-2 h-2 bg-wizard-black rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(deleted / total) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Next Steps */}
                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
                  <h3 className="font-semibold text-white mb-4">📋 Next Steps</h3>
                  <ul className="space-y-2">
                    {caseRounds.length === 0 && (
                      <li className="flex items-center gap-2 text-gray-300">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                        Awaiting dispute letters to be generated
                      </li>
                    )}
                    {caseRounds.filter(r => r.status === 'sent').length > 0 && (
                      <li className="flex items-center gap-2 text-gray-300">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        {caseRounds.filter(r => r.status === 'sent').length} dispute(s) awaiting bureau response
                      </li>
                    )}
                    {verifiedItems > 0 && (
                      <li className="flex items-center gap-2 text-gray-300">
                        <span className="w-2 h-2 bg-orange-500 rounded-full" />
                        {verifiedItems} item(s) being escalated with stronger letters
                      </li>
                    )}
                    {deletedItems === totalItems && totalItems > 0 && (
                      <li className="flex items-center gap-2 text-green-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        🎉 All items successfully removed!
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="space-y-4">
                {caseItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No dispute items yet. Your credit report is being analyzed.
                  </div>
                ) : (
                  caseItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl p-4"
                      style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${bureauColors[item.bureau]} flex items-center justify-center text-white text-sm font-bold`}>
                            {item.bureau}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{item.creditor}</h4>
                            <p className="text-sm text-gray-400">
                              ****{item.account_number} • ${item.balance?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[item.status]} text-white`}>
                          {item.status?.toUpperCase()}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-wizard-silver/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Dispute Reason</span>
                          <span className="text-wizard-accent">{item.reason_code?.replace(/_/g, ' ')}</span>
                        </div>
                        {item.confidence_score && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-400">Confidence</span>
                            <span className="text-green-400">{item.confidence_score}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {caseRounds.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No dispute rounds yet. Letters will appear here once generated.
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-wizard-silver/20" />
                    
                    {caseRounds.map((round) => (
                      <div key={round.id} className="relative pl-16 pb-6">
                        {/* Timeline dot */}
                        <div className={`absolute left-4 w-5 h-5 rounded-full ${statusColors[round.status]} border-4 border-wizard-black`} />
                        
                        <div
                          className="rounded-xl p-4"
                          style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-white">
                                Round {round.round_number} - {bureauNames[round.bureau]}
                              </h4>
                              <p className="text-sm text-wizard-accent">
                                {roundTypeLabels[round.round_type] || round.round_type}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[round.status]} text-white`}>
                              {round.status?.replace(/_/g, ' ').toUpperCase()}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                            <div>
                              <span className="text-gray-400">Started</span>
                              <p className="text-white">
                                {round.started_at ? new Date(round.started_at).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">Letter Sent</span>
                              <p className="text-white">
                                {round.letter_sent_at ? new Date(round.letter_sent_at).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">Response Due</span>
                              <p className="text-white">
                                {round.response_due_at ? new Date(round.response_due_at).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">Outcome</span>
                              <p className={`font-medium ${round.outcome === 'deleted' ? 'text-green-400' : round.outcome === 'verified' ? 'text-orange-400' : 'text-gray-400'}`}>
                                {round.outcome?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
