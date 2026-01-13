import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { MilestoneTracker } from '../components/MilestoneTracker'

interface DisputeCase {
  id: string
  case_id: string
  client_id: string
  status: string
  progress_percent: number
  ai_summary: string
  next_steps: string[]
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

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  review: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  sent: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  complete: { bg: 'bg-green-500/20', text: 'text-green-400' },
  disputed: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  verified: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  deleted: { bg: 'bg-green-500/20', text: 'text-green-400' },
  escalated: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  pending: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  awaiting_response: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
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

// Circular Progress Ring Component
function ProgressRing({ progress, size = 120, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(139, 92, 246, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f5d061" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gold" style={{ fontFamily: 'var(--font-pixel)' }}>
          {progress}%
        </span>
        <span className="text-xs text-gray-400">Complete</span>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
  }

  return (
    <div className="bg-wizard-black/50 rounded-xl p-4 text-center border border-wizard-indigo/20">
      <div className={`text-3xl font-bold ${colorClasses[color]}`} style={{ fontFamily: 'var(--font-pixel)' }}>
        {value}
      </div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  )
}

// Bureau Card Component
function BureauCard({ bureau, deleted, total }: { bureau: string; deleted: number; total: number }) {
  const progress = total > 0 ? (deleted / total) * 100 : 0

  return (
    <div
      className="rounded-xl p-4 hover:scale-[1.02] transition-transform"
      style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${bureauColors[bureau]} flex items-center justify-center text-white font-bold shadow-lg`}>
          {bureau}
        </div>
        <div>
          <h4 className="font-semibold text-white">{bureauNames[bureau]}</h4>
          <p className="text-sm text-gray-400">
            {total > 0 ? `${deleted}/${total} removed` : 'No items'}
          </p>
        </div>
      </div>
      {total > 0 && (
        <div className="h-2 bg-wizard-black rounded-full overflow-hidden border border-wizard-silver/10">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Timeline Item Component
function TimelineItem({ round, isLast }: { round: DisputeRound; isLast: boolean }) {
  const getStatusColor = () => {
    if (round.outcome === 'deleted') return 'bg-green-500'
    if (round.outcome === 'verified') return 'bg-orange-500'
    if (round.status === 'sent' || round.status === 'awaiting_response') return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-wizard-indigo/50 to-transparent" />
      )}

      {/* Timeline dot */}
      <div className={`absolute left-0 w-6 h-6 rounded-full ${getStatusColor()} border-4 border-wizard-dark shadow-lg`} />

      <div
        className="rounded-xl p-4"
        style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-white flex items-center gap-2">
              <span className={`w-8 h-8 rounded bg-gradient-to-br ${bureauColors[round.bureau]} flex items-center justify-center text-white text-xs font-bold`}>
                {round.bureau}
              </span>
              Round {round.round_number}
            </h4>
            <p className="text-sm text-gold mt-1">
              {roundTypeLabels[round.round_type] || round.round_type}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[round.status]?.bg || 'bg-gray-500/20'} ${statusColors[round.status]?.text || 'text-gray-400'}`}>
            {round.status?.replace(/_/g, ' ').toUpperCase()}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3 pt-3 border-t border-wizard-indigo/20">
          <div>
            <span className="text-gray-500 text-xs">Started</span>
            <p className="text-white">
              {round.started_at ? new Date(round.started_at).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Letter Sent</span>
            <p className="text-white">
              {round.letter_sent_at ? new Date(round.letter_sent_at).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Response Due</span>
            <p className="text-white">
              {round.response_due_at ? new Date(round.response_due_at).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Outcome</span>
            <p className={`font-medium ${
              round.outcome === 'deleted' ? 'text-green-400' :
              round.outcome === 'verified' ? 'text-orange-400' :
              'text-gray-400'
            }`}>
              {round.outcome?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Item Card Component
function ItemCard({ item }: { item: DisputeItem }) {
  const status = statusColors[item.status] || statusColors.pending

  return (
    <div
      className="rounded-xl p-4 hover:border-gold/30 transition-colors"
      style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${bureauColors[item.bureau]} flex items-center justify-center text-white font-bold shadow-lg`}>
            {item.bureau}
          </div>
          <div>
            <h4 className="font-semibold text-white">{item.creditor}</h4>
            <p className="text-sm text-gray-400">
              ****{item.account_number?.slice(-4) || '0000'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {item.status?.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500 text-xs">Balance</span>
          <p className="text-white font-medium">
            ${item.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Dispute Reason</span>
          <p className="text-gold text-sm">
            {item.reason_code?.replace(/_/g, ' ') || 'Not specified'}
          </p>
        </div>
      </div>

      {item.confidence_score > 0 && (
        <div className="mt-3 pt-3 border-t border-wizard-indigo/20">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">Success Confidence</span>
            <span className={`text-sm font-medium ${
              item.confidence_score >= 80 ? 'text-green-400' :
              item.confidence_score >= 60 ? 'text-yellow-400' :
              'text-orange-400'
            }`}>
              {item.confidence_score}%
            </span>
          </div>
          <div className="mt-1 h-1.5 bg-wizard-black rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                item.confidence_score >= 80 ? 'bg-green-500' :
                item.confidence_score >= 60 ? 'bg-yellow-500' :
                'bg-orange-500'
              }`}
              style={{ width: `${item.confidence_score}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Disputes() {
  const { user } = useApp()
  const navigate = useNavigate()
  const [cases, setCases] = useState<DisputeCase[]>([])
  const [items, setItems] = useState<DisputeItem[]>([])
  const [rounds, setRounds] = useState<DisputeRound[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'timeline'>('overview')
  const [docsUploaded, setDocsUploaded] = useState(false)
  const [creditReportUploaded, setCreditReportUploaded] = useState(false)
  const [showOnboardingTip, setShowOnboardingTip] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchDisputeData()
      checkDocumentStatus()
    }
  }, [user?.id])

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('disputes_onboarding_tip_dismissed')
      if (!dismissed) setShowOnboardingTip(true)
    } catch {
      setShowOnboardingTip(true)
    }
  }, [])

  const checkDocumentStatus = async () => {
    if (!user?.id) return
    try {
      const { data: files } = await supabase
        .from('uploaded_files')
        .select('document_type')
        .eq('user_id', user.id)

      if (files && files.length > 0) {
        const types = files.map(f => f.document_type)
        const hasRequiredDocs = types.includes('government_id') &&
                                types.includes('social_security') &&
                                types.includes('proof_of_address')
        setDocsUploaded(hasRequiredDocs)
        setCreditReportUploaded(types.includes('credit_report'))
      }
    } catch (error) {
      console.error('Error checking document status:', error)
    }
  }

  const fetchDisputeData = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Fetch cases for this user
      const { data: casesData, error: casesError } = await supabase
        .from('dispute_cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (casesError) throw casesError
      setCases(casesData || [])

      console.log('[Disputes] Cases loaded:', casesData?.length || 0)
      if (casesData) {
        console.log('[Disputes] Case IDs:', casesData.map(c => ({ id: c.id, case_id: c.case_id })))
      }

      // Fetch items using multiple strategies
      let itemsData: DisputeItem[] = []

      // Strategy 1: Get all items for this user (by user_id)
      const { data: itemsByUser } = await supabase
        .from('dispute_items')
        .select('*')
        .eq('user_id', user.id)

      console.log('[Disputes] Strategy 1 - Items by user_id:', itemsByUser?.length || 0, 'user_id:', user.id)

      if (itemsByUser && itemsByUser.length > 0) {
        itemsData = itemsByUser
      } else {
        // Strategy 2: Get items by case_id (TEXT field like 'CASE-CW-2026-976-01')
        if (casesData && casesData.length > 0) {
          const caseIds = casesData.map(c => c.case_id).filter(Boolean)
          const { data: itemsByCase } = await supabase
            .from('dispute_items')
            .select('*')
            .in('case_id', caseIds)

          console.log('[Disputes] Strategy 2 - Items by case_id:', itemsByCase?.length || 0, 'case_ids:', caseIds)

          if (itemsByCase && itemsByCase.length > 0) {
            itemsData = itemsByCase
          }
        }

        // Strategy 3: If still no items, fetch ALL items (no filter) as fallback for debugging
        if (itemsData.length === 0) {
          const { data: allItems } = await supabase
            .from('dispute_items')
            .select('*')
            .limit(50)

          console.log('[Disputes] Strategy 3 - All items (no filter):', allItems?.length || 0)
          if (allItems) {
            console.log('[Disputes] Sample item user_ids:', allItems.slice(0, 3).map(i => i.user_id))
            console.log('[Disputes] Sample item case_ids:', allItems.slice(0, 3).map(i => i.case_id))
          }

          // Use all items if they exist (temporary for debugging)
          if (allItems && allItems.length > 0) {
            itemsData = allItems
          }
        }
      }

      setItems(itemsData)
      console.log('[Disputes] Final items loaded:', itemsData.length)
      if (itemsData.length > 0) {
        console.log('[Disputes] Item sample:', itemsData.slice(0, 3))
      }

      // Fetch rounds
      if (casesData && casesData.length > 0) {
        const caseStringIds = casesData.map(c => c.case_id).filter(Boolean)

        // Fetch rounds by string case_id
        const { data: roundsData, error: roundsError } = await supabase
          .from('dispute_rounds')
          .select('*')
          .in('case_id', caseStringIds)
          .order('started_at', { ascending: false })

        console.log('[Disputes] Rounds query result:', { roundsData, roundsError })

        if (roundsError) {
          console.error('[Disputes] Rounds error:', roundsError)
        }

        setRounds(roundsData || [])

        // Select first case by default (use case_id string)
        if (!selectedCase && casesData.length > 0) {
          const defaultCaseId = casesData[0].case_id
          if (defaultCaseId) {
            console.log('[Disputes] Default case_id set:', defaultCaseId)
            setSelectedCase(defaultCaseId)
          }
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
  const inProgressItems = caseItems.filter(i => ['disputed', 'escalated', 'sent', 'awaiting_response'].includes(i.status)).length
  const verifiedItems = caseItems.filter(i => i.status === 'verified').length

  // Group items by bureau
  const itemsByBureau = caseItems.reduce((acc, item) => {
    if (!acc[item.bureau]) acc[item.bureau] = []
    acc[item.bureau].push(item)
    return acc
  }, {} as Record<string, DisputeItem[]>)

  // Default next steps if not provided
  const nextSteps = selectedCaseData?.next_steps || []

  // Calculate milestone progress
  const calculateMilestones = () => {
    const completed: number[] = []
    let current = 1

    // Step 1: Documents uploaded
    if (docsUploaded) {
      completed.push(1)
      current = 2
    }

    // Step 2: Credit report received
    if (creditReportUploaded) {
      completed.push(2)
      current = 3
    }

    // Step 3: AI Analysis (has case with items)
    if (cases.length > 0 && items.length > 0) {
      completed.push(3)
      current = 4
    }

    // Step 4: Letters generated (has rounds in draft/review)
    const hasGeneratedLetters = rounds.some(r => ['draft', 'review'].includes(r.status))
    if (hasGeneratedLetters || rounds.some(r => r.status === 'sent')) {
      completed.push(4)
      current = 5
    }

    // Step 5: Letters sent
    const sentRounds = rounds.filter(r => r.status === 'sent' || r.status === 'awaiting_response' || r.status === 'complete')
    if (sentRounds.length > 0) {
      completed.push(5)
      current = 6
    }

    // Step 6: Awaiting response (letters sent, waiting for response)
    const awaitingRounds = rounds.filter(r => r.status === 'awaiting_response')
    if (awaitingRounds.length > 0 || rounds.some(r => r.status === 'complete')) {
      completed.push(6)
      current = 7
    }

    // Step 7: Responses received
    const completedRounds = rounds.filter(r => r.status === 'complete')
    if (completedRounds.length > 0) {
      completed.push(7)
      current = 8
    }

    // Step 8: Items resolved (all items deleted or case closed)
    if (totalItems > 0 && deletedItems === totalItems) {
      completed.push(8)
      current = 8 // Stay on 8, all done
    }

    return { completed, current }
  }

  const milestones = calculateMilestones()

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
          className="inline-flex items-center gap-2 text-gold hover:text-gold/80 transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1
            className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            <span className="text-4xl">⚔️</span>
            DISPUTE CENTER
          </h1>
          <p className="text-gray-400 mt-2">Track your credit repair progress in real-time</p>
        </div>

        {/* Milestone Tracker - Always visible */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
        >
          <h3 className="text-sm font-semibold text-gold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-pixel)' }}>
            <span>🎯</span> YOUR JOURNEY
          </h3>
          <MilestoneTracker
            currentStep={milestones.current}
            completedSteps={milestones.completed}
            onUploadClick={(type) => {
              if (type === 'docs') {
                navigate('/vault?upload=docs')
              } else {
                navigate('/vault?upload=report')
              }
            }}
          />
          {showOnboardingTip && (
            <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="text-lg">✨</div>
                <div className="flex-1 text-sm text-gray-300">
                  Complete DOCS → REPORT → ANALYSIS to unlock dispute tracking. Tap each step for the exact instructions.
                </div>
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('disputes_onboarding_tip_dismissed', 'true')
                    } catch {
                      // ignore storage errors
                    }
                    setShowOnboardingTip(false)
                  }}
                  className="text-xs text-gold hover:text-gold/80"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Step Action Card */}
        {!loading && milestones.current <= 2 && (
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.1) 0%, rgba(18, 16, 26, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.4)' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center text-2xl animate-pulse shadow-lg shadow-gold/30">
                {milestones.current === 1 ? '📄' : '📊'}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {milestones.current === 1 ? 'UPLOAD YOUR DOCUMENTS' : 'UPLOAD CREDIT REPORT'}
                </h3>
                <p className="text-gray-400 mt-1 text-sm">
                  {milestones.current === 1
                    ? 'Start by uploading your Government ID, Social Security Card, and Proof of Address to verify your identity.'
                    : 'Upload your credit report so our AI can analyze it and identify negative items to dispute.'}
                </p>
                <Link
                  to="/vault"
                  className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gradient-to-r from-gold to-yellow-500 text-wizard-dark font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  {milestones.current === 1 ? 'Upload Documents' : 'Upload Credit Report'}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {cases.length > 0 && (
          <>
            {/* Case Selector (if multiple cases) */}
            {cases.length > 1 && (
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCase(c.case_id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                      selectedCase === c.case_id
                        ? 'bg-gradient-to-r from-gold to-yellow-500 text-wizard-dark font-semibold'
                        : 'bg-wizard-indigo/30 text-gray-400 hover:text-white border border-wizard-indigo/30'
                    }`}
                  >
                    Case {c.case_id}
                  </button>
                ))}
              </div>
            )}

            {/* Progress Overview */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
            >
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Circular Progress */}
                <ProgressRing progress={selectedCaseData?.progress_percent || 0} size={140} strokeWidth={10} />

                {/* Stats Grid */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  <StatCard value={totalItems} label="Total Items" color="white" />
                  <StatCard value={deletedItems} label="Deleted" color="green" />
                  <StatCard value={inProgressItems} label="In Progress" color="yellow" />
                  <StatCard value={verifiedItems} label="Escalating" color="orange" />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {(['overview', 'items', 'timeline'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-lg capitalize font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-gold to-yellow-500 text-wizard-dark'
                      : 'bg-wizard-indigo/30 text-gray-400 hover:text-white border border-wizard-indigo/30'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Bureau Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-gold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                    <span>📊</span> BUREAU BREAKDOWN
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['EX', 'EQ', 'TU'].map((bureau) => {
                      const bureauItems = itemsByBureau[bureau] || []
                      const deleted = bureauItems.filter(i => i.status === 'deleted').length
                      return (
                        <BureauCard
                          key={bureau}
                          bureau={bureau}
                          deleted={deleted}
                          total={bureauItems.length}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* AI Summary */}
                {selectedCaseData?.ai_summary && (
                  <div
                    className="rounded-2xl p-6"
                    style={{ background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.1) 0%, rgba(18, 16, 26, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">🔮</span>
                      <h3 className="font-semibold text-gold" style={{ fontFamily: 'var(--font-pixel)' }}>
                        AI CASE ANALYSIS
                      </h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{selectedCaseData.ai_summary}</p>
                  </div>
                )}

                {/* Next Steps */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                >
                  <h3 className="font-semibold text-gold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                    <span>📋</span> NEXT STEPS
                  </h3>
                  <ul className="space-y-3">
                    {nextSteps.length > 0 ? (
                      nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-gray-300">
                          <span className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))
                    ) : (
                      <>
                        {caseRounds.length === 0 && (
                          <li className="flex items-center gap-3 text-gray-300">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                            Dispute letters are being generated by our AI system
                          </li>
                        )}
                        {caseRounds.filter(r => r.status === 'sent' || r.status === 'awaiting_response').length > 0 && (
                          <li className="flex items-center gap-3 text-gray-300">
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            {caseRounds.filter(r => r.status === 'sent' || r.status === 'awaiting_response').length} dispute(s) awaiting bureau response (30-45 days)
                          </li>
                        )}
                        {verifiedItems > 0 && (
                          <li className="flex items-center gap-3 text-gray-300">
                            <span className="w-2 h-2 bg-orange-500 rounded-full" />
                            {verifiedItems} verified item(s) being escalated with Method of Verification letters
                          </li>
                        )}
                        {deletedItems === totalItems && totalItems > 0 && (
                          <li className="flex items-center gap-3 text-green-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            Congratulations! All negative items have been removed!
                          </li>
                        )}
                        {inProgressItems > 0 && (
                          <li className="flex items-center gap-3 text-gray-300">
                            <span className="w-2 h-2 bg-purple-500 rounded-full" />
                            Monitor your mail for bureau responses and update your case
                          </li>
                        )}
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-sm font-semibold text-gold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                  <span>📁</span> DISPUTED ACCOUNTS ({caseItems.length})
                </h3>
                {caseItems.length === 0 ? (
                  <div
                    className="text-center py-12 rounded-2xl"
                    style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                  >
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-gray-400">No dispute items yet.</p>
                    <p className="text-gray-500 text-sm mt-1">Your credit report is being analyzed by our AI.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {caseItems.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-sm font-semibold text-gold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-pixel)' }}>
                  <span>📅</span> DISPUTE TIMELINE
                </h3>
                {caseRounds.length === 0 ? (
                  <div
                    className="text-center py-12 rounded-2xl"
                    style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                  >
                    <div className="text-4xl mb-3">📬</div>
                    <p className="text-gray-400">No dispute rounds yet.</p>
                    <p className="text-gray-500 text-sm mt-1">Letters will appear here once they're sent.</p>
                  </div>
                ) : (
                  <div className="relative ml-3">
                    {caseRounds.map((round, index) => (
                      <TimelineItem
                        key={round.id}
                        round={round}
                        isLast={index === caseRounds.length - 1}
                      />
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
