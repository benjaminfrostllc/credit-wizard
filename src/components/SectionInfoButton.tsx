interface SectionInfoButtonProps {
  onClick: () => void
  className?: string
}

export function SectionInfoButton({ onClick, className = '' }: SectionInfoButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={`w-6 h-6 rounded-full bg-wizard-indigo/50 hover:bg-wizard-accent/50 border border-wizard-accent/30 hover:border-wizard-accent flex items-center justify-center text-wizard-accent hover:text-white transition-all group ${className}`}
      title="Customize section"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  )
}
