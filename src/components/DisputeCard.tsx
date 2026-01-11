import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

interface DisputeStats {
  totalItems: number
  deletedItems: number
  inProgress: number
  verified: number
  overallProgress: number
  hasActiveCase: boolean
}

// Mini progress ring for the card
function MiniProgressRing({ progress, size = 56 }: { progress: number; size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(212, 175, 55, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#miniGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="miniGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f5d061" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gold">{progress}%</span>
      </div>
    </div>
  )
}

export function DisputeCard() {
  const { user } = useApp()
  const [stats, setStats] = useState<DisputeStats>({
    totalItems: 0,
    deletedItems: 0,
    inProgress: 0,
    verified: 0,
    overallProgress: 0,
    hasActiveCase: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchStats()
    } else {
      setLoading(false)
    }
  }, [user?.id])

  const fetchStats = async () => {
    if (!user?.id) return

    try {
      // Fetch cases
      const { data: cases, error: casesError } = await supabase
        .from('dispute_cases')
        .select('id, progress_percent, status')
        .eq('user_id', user.id)

      if (casesError) throw casesError

      if (cases && cases.length > 0) {
        const activeCases = cases.filter(c => c.status === 'active')
        const caseIds = cases.map(c => c.id)

        // Fetch items
        const { data: items, error: itemsError } = await supabase
          .from('dispute_items')
          .select('status')
          .in('case_id', caseIds)

        if (itemsError) throw itemsError

        const totalItems = items?.length || 0
        const deletedItems = items?.filter(i => i.status === 'deleted').length || 0
        const inProgress = items?.filter(i => ['disputed', 'escalated', 'sent', 'awaiting_response'].includes(i.status)).length || 0
        const verified = items?.filter(i => i.status === 'verified').length || 0
        const avgProgress = cases.reduce((sum, c) => sum + (c.progress_percent || 0), 0) / cases.length

        setStats({
          totalItems,
          deletedItems,
          inProgress,
          verified,
          overallProgress: Math.round(avgProgress),
          hasActiveCase: activeCases.length > 0,
        })
      }
    } catch (error) {
      console.error('Error fetching dispute stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}
      >
        <div className="animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-wizard-indigo/30" />
            <div className="flex-1">
              <div className="h-4 bg-wizard-indigo/30 rounded w-1/2 mb-2" />
              <div className="h-3 bg-wizard-indigo/30 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      to="/disputes"
      className="group rounded-2xl p-6 hover:scale-[1.02] transition-all block"
      style={{
        background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.05) 0%, #12101a 100%)',
        border: '1px solid rgba(212, 175, 55, 0.3)'
      }}
    >
      <div className="flex items-center gap-4">
        {/* Progress Ring or Icon */}
        {stats.hasActiveCase ? (
          <MiniProgressRing progress={stats.overallProgress} />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-2xl shadow-lg border border-gold/30">
            🛡️
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold text-white group-hover:text-gold transition-colors"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            DISPUTE CENTER
          </h3>
          <p className="text-xs text-gold/80">Credit Repair Progress</p>

          {stats.hasActiveCase ? (
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {stats.deletedItems} removed
              </span>
              <span className="text-yellow-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                {stats.inProgress} active
              </span>
              {stats.verified > 0 && (
                <span className="text-orange-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  {stats.verified} verified
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Upload credit report to start
            </p>
          )}
        </div>

        {/* Arrow */}
        <svg
          className="w-5 h-5 text-gold/50 group-hover:text-gold group-hover:translate-x-1 transition-all"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Progress Bar (only if active case) */}
      {stats.hasActiveCase && stats.totalItems > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">{stats.totalItems} items total</span>
            <span className="text-gold">{stats.overallProgress}% complete</span>
          </div>
          <div className="h-1.5 bg-wizard-black rounded-full overflow-hidden border border-gold/10">
            <div
              className="h-full bg-gradient-to-r from-gold to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.overallProgress}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}
