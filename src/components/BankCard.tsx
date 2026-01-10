import { useState } from 'react'
import type { ChecklistTask } from './Checklist'
import { ChecklistItem } from './ChecklistItem'
import { ProgressBar } from './ProgressBar'

interface BankCardProps {
  name: string
  logo?: string
  tasks: ChecklistTask[]
  onToggle: (id: string) => void
  onComment: (id: string, comment: string) => void
  notes?: string
  // Plaid connection props
  isConnected?: boolean
  connectionLogo?: string | null
  connectionColor?: string | null
  onConnect?: () => void
}

export function BankCard({
  name,
  logo,
  tasks,
  onToggle,
  onComment,
  notes,
  isConnected,
  connectionLogo,
  connectionColor,
  onConnect,
}: BankCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const completedCount = tasks.filter((t) => t.completed).length
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0
  const isComplete = completedCount === tasks.length && tasks.length > 0

  // Use Plaid logo if connected, otherwise fall back to default
  const displayLogo = connectionLogo || logo

  return (
    <div
      className={`rounded-xl border-2 transition-all ${
        isComplete
          ? 'bg-gold/10 border-gold/30'
          : isConnected
            ? 'bg-green-900/10 border-green-500/30'
            : 'bg-wizard-purple/30 border-wizard-indigo/30 hover:border-wizard-accent/50'
      }`}
    >
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 text-left"
      >
        {/* Bank Icon/Logo */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold overflow-hidden ${
            isComplete
              ? 'bg-gold text-wizard-dark'
              : isConnected
                ? 'bg-green-900/30 text-white'
                : 'bg-wizard-indigo/50 text-white'
          }`}
          style={connectionColor && !isComplete ? { backgroundColor: connectionColor + '20' } : undefined}
        >
          {displayLogo ? (
            <img src={displayLogo} alt={name} className="w-8 h-8 object-contain" />
          ) : (
            name.charAt(0)
          )}
        </div>

        {/* Bank Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold truncate ${isComplete ? 'text-gold' : isConnected ? 'text-green-400' : 'text-white'}`}>
              {name}
            </h3>
            {isComplete && (
              <svg className="w-5 h-5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {isConnected && !isComplete && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Connected
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {completedCount} of {tasks.length} tasks
            </span>
            <div className="flex-1 max-w-[120px]">
              <ProgressBar progress={progress} height="h-1.5" />
            </div>
          </div>
        </div>

        {/* Connect Button */}
        {!isConnected && onConnect && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConnect()
            }}
            className="text-xs px-3 py-1.5 bg-wizard-accent/20 text-wizard-accent rounded-lg hover:bg-wizard-accent/30 transition-colors flex-shrink-0"
          >
            Connect
          </button>
        )}

        {/* Expand/Collapse Icon */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-wizard-indigo/30">
          {notes && (
            <p className="text-xs text-gray-400 mt-3 mb-4 p-2 bg-wizard-dark/50 rounded-lg">
              <span className="text-gold font-medium">Note:</span> {notes}
            </p>
          )}

          <div className="space-y-2 mt-3">
            {tasks.map((task) => (
              <ChecklistItem
                key={task.id}
                {...task}
                onToggle={onToggle}
                onComment={onComment}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
