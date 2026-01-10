interface ProgressBarProps {
  progress: number
  label?: string
  showPercentage?: boolean
  height?: string
}

export function ProgressBar({ progress, label, showPercentage = true, height = 'h-4' }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-300">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gold font-semibold">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className={`${height} bg-wizard-dark rounded-full overflow-hidden border border-wizard-indigo/50`}>
        <div
          className="h-full bg-gradient-to-r from-wizard-indigo via-wizard-accent to-gold rounded-full transition-all duration-700 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-full" />
          {progress > 10 && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gold-light rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}
