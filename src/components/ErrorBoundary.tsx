import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-wizard-dark">
          <div className="max-w-md w-full bg-wizard-purple/30 rounded-xl border-2 border-zinc-500/30 p-6 text-center">
            <span className="text-5xl mb-4 block">⚠️</span>
            <h2
              className="text-lg text-zinc-300 mb-2"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              SOMETHING WENT WRONG
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <p className="text-xs text-gray-500 mb-4 font-mono bg-wizard-dark/50 p-2 rounded">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-wizard-accent hover:bg-wizard-glow text-white rounded-lg transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
