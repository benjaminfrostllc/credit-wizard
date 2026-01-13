import { useState } from 'react'

interface MilestoneStep {
  id: number
  title: string
  subtitle: string
  icon: string
  phase: 'onboarding' | 'tracking'
  description?: string
  instructions?: string[]
}

interface TrackingDetails {
  letterDate?: string
  sentDate?: string
  trackingNumber?: string
  daysRemaining?: number
  responseDate?: string
  outcome?: string
}

interface MilestoneTrackerProps {
  currentStep: number
  completedSteps: number[]
  trackingDetails?: Record<number, TrackingDetails>
  onStepClick?: (stepId: number) => void
  onUploadClick?: (type: 'docs' | 'report') => void
}

// Onboarding steps (1-3)
const onboardingSteps: MilestoneStep[] = [
  {
    id: 1,
    title: 'DOCS',
    subtitle: 'Identity verification',
    icon: '📄',
    phase: 'onboarding',
    description: 'Upload your Government ID and Social Security card in The Vault to verify your identity.',
  },
  {
    id: 2,
    title: 'REPORT',
    subtitle: 'Report intake',
    icon: '📊',
    phase: 'onboarding',
    description: 'Upload your credit report PDF or connect your accounts to pull it automatically.',
  },
  {
    id: 3,
    title: 'ANALYSIS',
    subtitle: 'AI review',
    icon: '🔍',
    phase: 'onboarding',
    description: 'Our AI will analyze your report and identify items to dispute.',
  },
]

// Tracking steps (4-8)
const trackingSteps: MilestoneStep[] = [
  { id: 4, title: 'LETTERS', subtitle: 'Generated', icon: '✉️', phase: 'tracking' },
  { id: 5, title: 'SENT', subtitle: 'To bureaus', icon: '📬', phase: 'tracking' },
  { id: 6, title: 'WAITING', subtitle: '30-45 days', icon: '⏳', phase: 'tracking' },
  { id: 7, title: 'RESPONSE', subtitle: 'Received', icon: '📨', phase: 'tracking' },
  { id: 8, title: 'RESOLVED', subtitle: 'Complete', icon: '🏆', phase: 'tracking' },
]

export const disputeSteps = [...onboardingSteps, ...trackingSteps]

// Instruction Modal Component
function InstructionModal({
  step,
  isOpen,
  onClose,
  onAction,
}: {
  step: MilestoneStep
  isOpen: boolean
  onClose: () => void
  onAction?: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center text-2xl">
            {step.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
              {step.title}
            </h3>
            <p className="text-sm text-gold">{step.subtitle}</p>
          </div>
        </div>

        {step.description && (
          <p className="text-sm text-gray-300 mb-4">{step.description}</p>
        )}

        {step.instructions && (
          <ul className="space-y-3 mb-6">
            {step.instructions.map((instruction, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {instruction}
              </li>
            ))}
          </ul>
        )}

        {(step.id === 1 || step.id === 2) && onAction && (
          <button
            onClick={onAction}
            className="w-full py-3 bg-gradient-to-r from-gold to-yellow-500 text-wizard-dark font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Go to The Vault
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {step.id === 3 && (
          <div className="flex items-center justify-center gap-2 py-3 text-gold">
            <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="ml-2 text-sm">Analysis in progress...</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Step Circle with Tooltip
function StepCircle({
  step,
  isCompleted,
  isCurrent,
  isPending,
  onClick,
  isClickable,
  showTooltip,
}: {
  step: MilestoneStep
  isCompleted: boolean
  isCurrent: boolean
  isPending: boolean
  onClick?: () => void
  isClickable: boolean
  showTooltip?: boolean
}) {
  const [hovering, setHovering] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable && !isPending}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`
          relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-lg font-bold
          transition-all duration-300
          ${isClickable ? 'cursor-pointer hover:scale-110' : isPending ? 'cursor-not-allowed' : 'cursor-default'}
          ${isCompleted
            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
            : isCurrent
            ? 'bg-gradient-to-r from-gold to-yellow-500 text-wizard-dark shadow-lg shadow-gold/50'
            : 'bg-gray-700/50 text-gray-500 border-2 border-gray-600'
          }
        `}
      >
        {isCurrent && (
          <div className="absolute inset-0 rounded-full bg-gold/30 animate-ping" />
        )}
        {isCompleted ? (
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : isPending ? (
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <span className="relative z-10">{step.icon}</span>
        )}
      </button>

      {/* Tooltip for locked steps */}
      {isPending && hovering && showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 whitespace-nowrap z-10 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Complete previous steps to unlock
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}

function OnboardingPhase({
  currentStep,
  completedSteps,
  onUploadClick,
}: {
  currentStep: number
  completedSteps: number[]
  onUploadClick?: (type: 'docs' | 'report') => void
}) {
  const [selectedStep, setSelectedStep] = useState<MilestoneStep | null>(null)

  const isCompleted = (id: number) => completedSteps.includes(id)
  const isCurrent = (id: number) => id === currentStep
  const isPending = (id: number) => !isCompleted(id) && !isCurrent(id)

  const handleStepClick = (step: MilestoneStep) => {
    setSelectedStep(step)
  }

  const handleModalAction = () => {
    if (selectedStep?.id === 1) {
      onUploadClick?.('docs')
    } else if (selectedStep?.id === 2) {
      onUploadClick?.('report')
    }
    setSelectedStep(null)
  }

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>🚀</span> ONBOARDING
        <span className="text-[10px] text-gold ml-auto">Click steps for instructions</span>
      </h4>
      <div className="flex items-center justify-between">
        {onboardingSteps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <StepCircle
                step={step}
                isCompleted={isCompleted(step.id)}
                isCurrent={isCurrent(step.id)}
                isPending={isPending(step.id)}
                onClick={() => handleStepClick(step)}
                isClickable={true}
                showTooltip={true}
              />
              <div className="mt-2 text-center">
                <p
                  className={`text-[10px] md:text-xs font-semibold ${
                    isCompleted(step.id) ? 'text-green-400' :
                    isCurrent(step.id) ? 'text-gold' : 'text-gray-500'
                  }`}
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  {step.title}
                </p>
                <p className="text-[8px] md:text-[10px] text-gray-600">{step.subtitle}</p>
              </div>
            </div>
            {index < onboardingSteps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                isCompleted(step.id) ? 'bg-green-500' :
                isCurrent(step.id) ? 'bg-gradient-to-r from-gold to-gray-600' : 'bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Instruction Modal */}
      {selectedStep && (
        <InstructionModal
          step={selectedStep}
          isOpen={true}
          onClose={() => setSelectedStep(null)}
          onAction={handleModalAction}
        />
      )}
    </div>
  )
}

function TrackingPhase({
  currentStep,
  completedSteps,
  trackingDetails,
  onStepClick
}: {
  currentStep: number
  completedSteps: number[]
  trackingDetails?: Record<number, TrackingDetails>
  onStepClick?: (stepId: number) => void
}) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  const isCompleted = (id: number) => completedSteps.includes(id)
  const isCurrent = (id: number) => id === currentStep
  const isPending = (id: number) => !isCompleted(id) && !isCurrent(id)
  const isActive = (id: number) => isCompleted(id) || isCurrent(id)

  const handleStepClick = (stepId: number) => {
    if (isActive(stepId)) {
      setExpandedStep(expandedStep === stepId ? null : stepId)
      onStepClick?.(stepId)
    }
  }

  const getStepDetails = (step: MilestoneStep) => {
    const details = trackingDetails?.[step.id]
    switch (step.id) {
      case 4: // Letters
        return details?.letterDate
          ? `Generated on ${details.letterDate}`
          : 'Dispute letters ready for review'
      case 5: // Sent
        return details?.sentDate
          ? `Mailed on ${details.sentDate}${details.trackingNumber ? ` • ${details.trackingNumber}` : ''}`
          : 'Letters sent to all three bureaus'
      case 6: // Waiting
        return details?.daysRemaining !== undefined
          ? `${details.daysRemaining} days remaining`
          : 'Bureaus have 30-45 days to respond'
      case 7: // Response
        return details?.responseDate
          ? `Response received ${details.responseDate}`
          : 'Awaiting bureau responses'
      case 8: // Resolved
        return details?.outcome || 'Case complete'
      default:
        return ''
    }
  }

  // Only show tracking if past onboarding
  if (currentStep < 4 && completedSteps.filter(s => s >= 4).length === 0) {
    return (
      <div className="opacity-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>🎯</span> DISPUTE TRACKING
          <span className="text-[10px] text-gray-600 ml-2">Complete onboarding to unlock</span>
        </h4>
        <div className="flex items-center gap-2">
          {trackingSteps.map((step) => (
            <div key={step.id} className="relative group">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-[10px] text-gray-300 whitespace-nowrap">
                  Complete onboarding to unlock
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>🎯</span> DISPUTE TRACKING
      </h4>
      <div className="space-y-2">
        {trackingSteps.map((step) => {
          const active = isActive(step.id)
          const expanded = expandedStep === step.id

          return (
            <div
              key={step.id}
              className={`rounded-xl transition-all duration-300 ${
                active ? 'bg-wizard-black/50 border border-gold/20' : 'bg-gray-800/30 border border-gray-700/30'
              } ${expanded ? 'pb-3' : ''}`}
            >
              <button
                onClick={() => handleStepClick(step.id)}
                disabled={!active}
                className={`w-full flex items-center gap-3 p-3 ${active ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              >
                <StepCircle
                  step={step}
                  isCompleted={isCompleted(step.id)}
                  isCurrent={isCurrent(step.id)}
                  isPending={isPending(step.id)}
                  isClickable={false}
                  showTooltip={false}
                />
                <div className="flex-1 text-left">
                  <p
                    className={`text-xs font-semibold ${
                      isCompleted(step.id) ? 'text-green-400' :
                      isCurrent(step.id) ? 'text-gold' : 'text-gray-500'
                    }`}
                    style={{ fontFamily: 'var(--font-pixel)' }}
                  >
                    {step.title}
                  </p>
                  <p className="text-[10px] text-gray-500">{step.subtitle}</p>
                </div>
                {active && (
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {expanded && active && (
                <div className="px-3 pt-2 border-t border-gray-700/50 mx-3">
                  <p className="text-xs text-gray-400">{getStepDetails(step)}</p>
                  {step.id === 4 && (
                    <button className="mt-2 text-xs text-gold hover:text-gold/80 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Letters
                    </button>
                  )}
                  {step.id === 5 && trackingDetails?.[5]?.trackingNumber && (
                    <button className="mt-2 text-xs text-gold hover:text-gold/80 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Track Package
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MilestoneTracker({
  currentStep,
  completedSteps,
  trackingDetails,
  onStepClick,
  onUploadClick,
}: MilestoneTrackerProps) {
  return (
    <div className="space-y-6">
      <OnboardingPhase
        currentStep={currentStep}
        completedSteps={completedSteps}
        onUploadClick={onUploadClick}
      />
      <TrackingPhase
        currentStep={currentStep}
        completedSteps={completedSteps}
        trackingDetails={trackingDetails}
        onStepClick={onStepClick}
      />
    </div>
  )
}
