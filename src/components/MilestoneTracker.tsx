interface MilestoneStep {
  id: number
  title: string
  subtitle: string
  icon: string
}

interface MilestoneTrackerProps {
  steps: MilestoneStep[]
  currentStep: number
  completedSteps: number[]
}

export function MilestoneTracker({ steps, currentStep, completedSteps }: MilestoneTrackerProps) {
  const isCompleted = (stepId: number) => completedSteps.includes(stepId)
  const isCurrent = (stepId: number) => stepId === currentStep
  const isPending = (stepId: number) => !isCompleted(stepId) && !isCurrent(stepId)

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex items-start min-w-max px-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            {/* Step */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={`
                  relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                  transition-all duration-300
                  ${isCompleted(step.id)
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : isCurrent(step.id)
                    ? 'bg-gradient-to-r from-gold to-yellow-500 text-wizard-dark shadow-lg shadow-gold/50'
                    : 'bg-gray-700/50 text-gray-500 border-2 border-gray-600'
                  }
                `}
              >
                {/* Glow effect for current step */}
                {isCurrent(step.id) && (
                  <div className="absolute inset-0 rounded-full bg-gold/30 animate-ping" />
                )}

                {/* Icon or checkmark */}
                {isCompleted(step.id) ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isPending(step.id) ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <span className="relative z-10">{step.icon}</span>
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="mt-3 text-center max-w-[100px]">
                <p
                  className={`text-xs font-semibold leading-tight ${
                    isCompleted(step.id)
                      ? 'text-green-400'
                      : isCurrent(step.id)
                      ? 'text-gold'
                      : 'text-gray-500'
                  }`}
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  {step.title}
                </p>
                <p className={`text-[10px] mt-1 ${
                  isCurrent(step.id) ? 'text-gold/70' : 'text-gray-600'
                }`}>
                  {step.subtitle}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex items-center h-12 mx-2">
                <div
                  className={`w-8 md:w-12 h-1 rounded-full transition-all duration-300 ${
                    isCompleted(step.id)
                      ? 'bg-gradient-to-r from-green-500 to-green-400'
                      : isCurrent(step.id)
                      ? 'bg-gradient-to-r from-gold to-gray-600'
                      : 'bg-gray-700'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Default dispute steps
export const disputeSteps: MilestoneStep[] = [
  { id: 1, title: 'DOCS', subtitle: 'Upload ID & SSN', icon: '📄' },
  { id: 2, title: 'REPORT', subtitle: 'Credit report', icon: '📊' },
  { id: 3, title: 'ANALYSIS', subtitle: 'AI review', icon: '🔍' },
  { id: 4, title: 'LETTERS', subtitle: 'Generated', icon: '✉️' },
  { id: 5, title: 'SENT', subtitle: 'To bureaus', icon: '📬' },
  { id: 6, title: 'WAITING', subtitle: '30-45 days', icon: '⏳' },
  { id: 7, title: 'RESPONSE', subtitle: 'Received', icon: '📨' },
  { id: 8, title: 'RESOLVED', subtitle: 'Items removed', icon: '🏆' },
]
