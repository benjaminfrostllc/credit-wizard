import { useState } from 'react'

interface InfoTooltipProps {
  title: string
  content: string
  children?: React.ReactNode
}

export function InfoTooltip({ title, content, children }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-5 h-5 rounded-full bg-wizard-indigo border border-wizard-accent text-wizard-glow text-xs flex items-center justify-center hover:bg-wizard-accent transition-colors"
        title="Click for more info"
      >
        ?
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-wizard-dark border-2 border-wizard-indigo rounded-lg shadow-xl">
            <h4
              className="text-xs text-gold mb-2"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              {title}
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              {content}
            </p>
            {children}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
              <div className="border-8 border-transparent border-t-wizard-indigo" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface TutorialStepProps {
  step: number
  title: string
  description: string
  icon?: string
  isActive?: boolean
  isComplete?: boolean
}

export function TutorialStep({ step, title, description, icon, isActive, isComplete }: TutorialStepProps) {
  return (
    <div className={`flex gap-3 p-3 rounded-xl border-2 transition-all ${
      isComplete
        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/10 border-green-500/40'
        : isActive
        ? 'bg-gradient-to-r from-wizard-accent/20 to-purple-500/10 border-wizard-accent/60 shadow-lg shadow-wizard-accent/20'
        : 'bg-wizard-dark/30 border-wizard-indigo/20 opacity-60'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
        isComplete
          ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
          : isActive
          ? 'bg-gradient-to-br from-wizard-accent to-purple-600 text-white shadow-lg shadow-wizard-accent/30 animate-pulse'
          : 'bg-wizard-indigo/50 text-gray-500'
      }`}>
        {isComplete ? '✓' : icon || step}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isComplete ? 'bg-green-500/20 text-green-400' : isActive ? 'bg-wizard-accent/20 text-wizard-accent' : 'bg-wizard-indigo/20 text-gray-500'
          }`}>
            {isComplete ? 'COMPLETE' : isActive ? 'CURRENT QUEST' : `LEVEL ${step}`}
          </span>
        </div>
        <h4 className={`text-sm font-bold mt-1 ${isComplete ? 'text-green-400' : isActive ? 'text-white' : 'text-gray-400'}`}
            style={{ fontFamily: 'var(--font-pixel)' }}>
          {title}
        </h4>
        <p className={`text-xs mt-1 ${isComplete ? 'text-green-300/70' : isActive ? 'text-gray-300' : 'text-gray-500'}`}>{description}</p>
      </div>
      {isComplete && <span className="text-2xl">🏆</span>}
      {isActive && <span className="text-2xl animate-bounce">👈</span>}
    </div>
  )
}

interface TutorialBoxProps {
  title: string
  steps: { title: string; description: string; icon?: string }[]
  currentStep?: number
  completedSteps?: number[]
}

export function TutorialBox({ title, steps, currentStep = 0, completedSteps = [] }: TutorialBoxProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="bg-wizard-purple/30 rounded-xl border-2 border-wizard-indigo/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-wizard-indigo/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <h3
            className="text-xs text-gold"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            {title}
          </h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-2">
          {steps.map((step, index) => (
            <TutorialStep
              key={index}
              step={index + 1}
              title={step.title}
              description={step.description}
              icon={step.icon}
              isActive={currentStep === index}
              isComplete={completedSteps.includes(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
