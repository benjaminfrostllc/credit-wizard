import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

interface DisputeStats {
  totalCases: number
  totalItems: number
  deletedItems: number
  inProgress: number
  overallProgress: number
}

export function DisputeCard() {
  const { clientId } = useApp()
  const [stats, setStats] = useState<DisputeStats>({
    totalCases: 0,
    totalItems: 0,
    deletedItems: 0,
    inProgress: 0,
    overallProgress: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (clientId) {
      fetchStats()
    }
  }, [clientId])

  const fetchStats = async () => {
    try {
      // Fetch cases
      const { data: cases, error: casesError } = await supabase
        .from('dispute_cases')
        .select('case_id, progress_percent')
        .eq('client_id', clientId)

      if (casesError) throw casesError

      if (cases && cases.length > 0) {
        const caseIds = cases.map(c => c.case_id)
        
        // Fetch items
        const { data: items, error: itemsError } = await supabase
          .from('dispute_items')
          .select('status')
          .in('case_id', caseIds)

        if (itemsError) throw itemsError

        const totalItems = items?.length || 0
        const deletedItems = items?.filter(i => i.status === 'deleted').length || 0
        const inProgress = items?.filter(i => ['disputed', 'escalated', 'sent'].includes(i.status)).length || 0
        const avgProgress = cases.reduce((sum, c) => sum + (c.progress_percent || 0), 0) / cases.length

        setStats({
          totalCases: cases.length,
          totalItems,
          deletedItems,
          inProgress,
          overallProgress: Math.round(avgProgress),
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
        style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-wizard-indigo/30 rounded w-1/3 mb-4" />
          <div className="h-8 bg-wizard-indigo/30 rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <Link
      to="/disputes"
      className="group rounded-2xl p-6 hover:scale-[1.02] transition-all block"
      style={{ background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.1) 0%, #12101a 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg border border-white/10">
          ⚔️
        </div>
        <div className="text-right">
          <span
            className="text-wizard-accent font-semibold text-lg block"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            {stats.overallProgress}%
          </span>
          <span className="text-xs text-gray-400">{stats.totalCases} active case(s)</span>
        </div>
      </div>

      <h3
        className="text-sm font-semibold text-white group-hover:text-wizard-accent transition-colors mb-1"
        style={{ fontFamily: 'var(--font-pixel)' }}
      >
        DISPUTE CENTER
      </h3>
      <p className="text-xs text-wizard-accent/80 mb-2">Credit Repair Progress</p>
      
      {stats.totalItems > 0 ? (
        <>
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
            <span className="text-green-400">✓ {stats.deletedItems} removed</span>
            <span className="text-yellow-400">⏳ {stats.inProgress} in progress</span>
          </div>
          <div className="h-2 bg-wizard-black rounded-full overflow-hidden border border-wizard-silver/10">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${stats.overallProgress}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400">Upload your credit report to start disputing</p>
      )}
    </Link>
  )
}
