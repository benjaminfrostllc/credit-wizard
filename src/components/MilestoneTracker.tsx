import { useState } from 'react'

interface MilestoneStep {
  id: number
  title: string
  subtitle: string
  icon: string
  phase: 'onboarding' | 'tracking'
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
}

// Onboarding steps (1-3)
const onboardingSteps: MilestoneStep[] = [
  { id: 1, title: 'DOCS', subtitle: 'Upload ID & SSN', icon: '📄', phase: 'onboarding' },
  { id: 2, title: 'REPORT', subtitle: 'Credit report', icon: '📊', phase: 'onboarding' },
  { id: 3, title: 'ANALYSIS', subtitle: 'AI review', icon: '🔍', phase: 'onboarding' },
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

function StepCircle({
  step,
  isCompleted,
  isCurrent,
  isPending,
  onClick,
  isClickable
}: {
  step: MilestoneStep
  isCompleted: boolean
  isCurrent: boolean
  isPending: boolean
  onClick?: () => void
  isClickable: boolean
}) {
  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`
        relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-lg font-bold
        transition-all duration-300
        ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
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
  )
}

function OnboardingPhase({
  currentStep,
  completedSteps
}: {
  currentStep: number
  completedSteps: number[]
}) {
  const isCompleted = (id: number) => completedSteps.includes(id)
  const isCurrent = (id: number) => id === currentStep
  const isPending = (id: number) => !isCompleted(id) && !isCurrent(id)

  return (
    <div className="mb-6">
      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>🚀</span> ONBOARDING
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
                isClickable={false}
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
              <div className={`flex-1 h-1 mx-2 rounded-full ${
                isCompleted(step.id) ? 'bg-green-500' :
                isCurrent(step.id) ? 'bg-gradient-to-r from-gold to-gray-600' : 'bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>
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
      <div className="opacity-50">
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>🎯</span> DISPUTE TRACKING
          <span className="text-[10px] text-gray-600 ml-2">Complete onboarding to unlock</span>
        </h4>
        <div className="flex items-center gap-2">
          {trackingSteps.map((step) => (
            <div key={step.id} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
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
  onStepClick
}: MilestoneTrackerProps) {
  return (
    <div className="space-y-6">
      <OnboardingPhase
        currentStep={currentStep}
        completedSteps={completedSteps}
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
