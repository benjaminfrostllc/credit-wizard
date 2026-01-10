import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { resetPassword } from '../lib/supabase'
import logo from '../assets/logo.png'
import {
  getSavedAccounts,
  removeAccount,
  getInitials,
  maskEmail,
  isAccountTrusted,
  type SavedAccount,
} from '../lib/savedAccounts'

type AuthMode = 'login' | 'signup' | 'saved' | 'forgot'

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showCoinSpin, setShowCoinSpin] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null)
  const [trustDevice, setTrustDevice] = useState(false)
  const { login, loginWithTrustedDevice, signup, loading } = useApp()

  // Load saved accounts on mount
  useEffect(() => {
    // Use requestAnimationFrame to defer state updates and avoid cascading renders
    requestAnimationFrame(() => {
      const accounts = getSavedAccounts()
      setSavedAccounts(accounts)

      // Check if we're adding a new account (via query param from More.tsx)
      const modeParam = searchParams.get('mode')
      if (modeParam === 'new') {
        // Clear the query param and show login form
        setSearchParams({}, { replace: true })
        setMode('login')
      } else if (accounts.length > 0) {
        // If there are saved accounts, show that view first
        setMode('saved')
      } else {
        setMode('login')
      }
    })
  }, [searchParams, setSearchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowCoinSpin(true)

    if (mode === 'login' || mode === 'saved') {
      const loginEmail = selectedAccount?.email || email
      console.log('[Login] Submitting login for:', loginEmail)

      try {
        const result = await login(loginEmail, password, { trustDevice })
        console.log('[Login] Result:', result)

        if (!result.success) {
          const errorMsg = result.error || 'Login failed. Please check your credentials.'
          console.error('[Login] Error:', errorMsg)
          setError(errorMsg)
          setShowCoinSpin(false)
        } else {
          console.log('[Login] Success! Waiting for redirect...')
        }
      } catch (err) {
        console.error('[Login] Exception:', err)
        setError('An unexpected error occurred. Please try again.')
        setShowCoinSpin(false)
      }
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setShowCoinSpin(false)
        return
      }

      const result = await signup(email, password, fullName)
      if (!result.success) {
        setError(result.error || 'Signup failed. Please try again.')
        setShowCoinSpin(false)
      }
      // On success, the "/" route will auto-redirect to /dashboard when isAuthenticated becomes true
    }
  }

  // Handle trusted device login (no password required)
  const handleTrustedLogin = async (account: SavedAccount) => {
    setError('')
    setShowCoinSpin(true)

    const result = await loginWithTrustedDevice(account.id)
    if (!result.success) {
      // Token expired or invalid - show password form
      setSelectedAccount(account)
      setEmail(account.email)
      setError(result.error || 'Session expired. Please enter your password.')
      setShowCoinSpin(false)
    }
    // On success, the "/" route will auto-redirect to /dashboard when isAuthenticated becomes true
  }

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setShowCoinSpin(true)

    if (!email) {
      setError('Please enter your email address.')
      setShowCoinSpin(false)
      return
    }

    const result = await resetPassword(email)
    setShowCoinSpin(false)

    if (!result.success) {
      setError(result.error || 'Failed to send reset email. Please try again.')
    } else {
      setSuccessMessage('Password reset email sent! Check your inbox.')
    }
  }

  const handleSelectAccount = (account: SavedAccount) => {
    setSelectedAccount(account)
    setEmail(account.email)
    setError('')
  }

  const handleRemoveAccount = (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation()
    removeAccount(accountId)
    const updated = getSavedAccounts()
    setSavedAccounts(updated)
    if (selectedAccount?.id === accountId) {
      setSelectedAccount(null)
      setEmail('')
    }
    if (updated.length === 0) {
      setMode('login')
    }
  }

  const handleUseAnotherAccount = () => {
    setSelectedAccount(null)
    setEmail('')
    setPassword('')
    setMode('login')
  }

  const toggleMode = () => {
    if (mode === 'saved') {
      setMode('login')
    } else {
      setMode(mode === 'login' ? 'signup' : 'login')
    }
    setSelectedAccount(null)
    setEmail('')
    setPassword('')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <div className={`${showCoinSpin ? 'animate-coin-spin' : 'animate-float'}`}>
              <img src={logo} alt="Credit Wizard" className="w-20 h-20 rounded-xl" />
            </div>
          </div>
          <h1
            className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-vault-silver-light via-vault-accent to-vault-glow bg-clip-text text-transparent mb-2"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            FINANCIAL ASCENT
          </h1>
          <p className="text-vault-silver-dark text-sm">by Credit Wizard</p>
          <p
            className="text-vault-accent text-xs mt-4 leading-relaxed"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            Your Journey to<br />Financial Freedom
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl p-8 backdrop-blur-sm" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
          <h2
            className="text-sm font-semibold text-white mb-6 text-center"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            {mode === 'saved'
              ? 'WELCOME BACK'
              : mode === 'login'
              ? 'ENTER PORTAL'
              : mode === 'forgot'
              ? 'RESET PASSWORD'
              : 'CREATE ACCOUNT'}
          </h2>

          {/* Forgot Password View */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-gray-400 mb-4 text-center">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <div className="mb-4">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs text-gray-300 mb-2"
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  EMAIL
                </label>
                <input
                  type="email"
                  id="forgot-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white placeholder-vault-silver-dark focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all text-sm"
                  required
                />
              </div>

              {error && (
                <div className="mb-4 p-4 bg-vault-error/20 border border-vault-error/50 rounded-lg">
                  <p className="text-vault-error text-xs">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-4 bg-vault-success/20 border border-vault-success/50 rounded-lg">
                  <p className="text-vault-success text-xs">{successMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={showCoinSpin}
                className="w-full py-4 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                style={{ fontFamily: 'var(--font-pixel)', background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' }}
              >
                {showCoinSpin ? 'SENDING...' : 'SEND RESET LINK'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setSuccessMessage('')
                }}
                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Back to login
              </button>
            </form>
          )}

          {/* Saved Accounts View */}
          {mode === 'saved' && savedAccounts.length > 0 && !selectedAccount && (
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-4 text-center">
                Choose an account to continue
              </p>
              <div className="space-y-2">
                {savedAccounts.map((account) => {
                  const isTrusted = isAccountTrusted(account.id)
                  return (
                    <div
                      key={account.id}
                      className="w-full p-3 rounded-lg transition-all group"
                      style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vault-accent to-vault-glow flex items-center justify-center text-white font-bold text-sm relative">
                          {getInitials(account.name)}
                          {isTrusted && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-vault-success rounded-full flex items-center justify-center text-[8px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white text-sm font-medium truncate">
                            {account.name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {maskEmail(account.email)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleRemoveAccount(e, account.id)}
                          className="p-1 text-gray-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove account"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {/* Trusted device: tap to login, otherwise enter password */}
                      {isTrusted ? (
                        <button
                          onClick={() => handleTrustedLogin(account)}
                          disabled={loading}
                          className="w-full mt-3 py-2 bg-vault-success/20 hover:bg-vault-success/30 border border-vault-success/50 rounded-lg text-vault-success text-xs font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Signing in...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                              </svg>
                              Tap to Login (Trusted Device)
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectAccount(account)}
                          className="w-full mt-3 py-2 bg-vault-purple-light/30 hover:bg-vault-purple-light/50 border border-vault-silver/20 rounded-lg text-vault-silver text-xs font-medium transition-all"
                        >
                          Enter Password
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <button
                onClick={handleUseAnotherAccount}
                className="w-full mt-4 p-3 border border-dashed border-vault-silver/30 hover:border-vault-accent rounded-lg text-vault-silver-dark hover:text-white text-sm transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Use another account
              </button>
            </div>
          )}

          {/* Selected Account or Regular Login */}
          {mode !== 'forgot' && (mode !== 'saved' || selectedAccount || savedAccounts.length === 0) && (
            <>
              {/* Info Box */}
              <div className="mb-6 p-3 rounded-lg" style={{ background: 'rgba(26, 21, 37, 0.5)', border: '1px solid rgba(192, 192, 192, 0.15)' }}>
                <p className="text-xs text-vault-silver-dark leading-relaxed">
                  {selectedAccount ? (
                    <span className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-vault-accent to-vault-glow flex items-center justify-center text-white font-bold text-xs">
                        {getInitials(selectedAccount.name)}
                      </span>
                      <span>
                        <span className="text-vault-accent font-semibold block">{selectedAccount.name}</span>
                        <span className="text-vault-silver-dark">{maskEmail(selectedAccount.email)}</span>
                      </span>
                    </span>
                  ) : mode === 'login' ? (
                    <>
                      <span className="text-vault-accent font-semibold">Welcome back!</span><br />
                      Sign in to continue your financial journey.
                    </>
                  ) : (
                    <>
                      <span className="text-vault-accent font-semibold">Join the journey!</span><br />
                      Create an account to start building your credit empire.
                    </>
                  )}
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {mode === 'signup' && (
                  <div className="mb-4">
                    <label
                      htmlFor="fullName"
                      className="block text-xs text-gray-300 mb-2"
                      style={{ fontFamily: 'var(--font-pixel)' }}
                    >
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white placeholder-vault-silver-dark focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all text-sm"
                      required
                    />
                  </div>
                )}

                {!selectedAccount && (
                  <div className="mb-4">
                    <label
                      htmlFor="email"
                      className="block text-xs text-gray-300 mb-2"
                      style={{ fontFamily: 'var(--font-pixel)' }}
                    >
                      EMAIL
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white placeholder-vault-silver-dark focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all text-sm"
                      required
                    />
                  </div>
                )}

                <div className="mb-2">
                  <label
                    htmlFor="password"
                    className="block text-xs text-gray-300 mb-2"
                    style={{ fontFamily: 'var(--font-pixel)' }}
                  >
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Create a password (6+ chars)' : 'Enter your password'}
                    className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white placeholder-vault-silver-dark focus:outline-none focus:border-vault-accent focus:ring-2 focus:ring-vault-accent/20 transition-all text-sm"
                    required
                  />
                </div>

                {/* Forgot Password Link - only show for login */}
                {mode !== 'signup' && (
                  <div className="mb-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot')
                        setError('')
                        setSuccessMessage('')
                      }}
                      className="text-xs text-vault-accent hover:text-vault-accent-light transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Trust Device Checkbox - only show for login, not signup */}
                {mode !== 'signup' && (
                  <div className="mb-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={trustDevice}
                          onChange={(e) => setTrustDevice(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-5 h-5 border border-vault-silver/30 rounded bg-vault-black peer-checked:bg-vault-accent peer-checked:border-vault-accent transition-all flex items-center justify-center">
                          {trustDevice && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          Trust this device
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Skip password next time on this browser
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-4 bg-vault-error/20 border border-vault-error/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <p
                          className="text-vault-error font-bold text-sm"
                          style={{ fontFamily: 'var(--font-pixel)' }}
                        >
                          LOGIN FAILED
                        </p>
                        <p className="text-vault-error/80 text-xs mt-1">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  style={{ fontFamily: 'var(--font-pixel)', background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2 text-xs">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {mode === 'signup' ? 'CREATING ACCOUNT...' : 'SIGNING IN...'}
                    </span>
                  ) : (
                    <span className="text-xs">
                      {mode === 'signup' ? 'CREATE ACCOUNT' : 'ENTER PORTAL'}
                    </span>
                  )}
                </button>

                {(selectedAccount || (mode === 'login' && savedAccounts.length > 0)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccount(null)
                      setPassword('')
                      setError('')
                      setEmail('')
                      setMode('saved')
                    }}
                    className="w-full mt-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    ← Back to saved accounts
                  </button>
                )}
              </form>
            </>
          )}

          {!selectedAccount && (
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-sm text-vault-accent hover:text-vault-accent-light transition-colors"
              >
                {mode === 'login' || mode === 'saved' ? (
                  <>Don't have an account? <span className="font-semibold">Sign up</span></>
                ) : (
                  <>Already have an account? <span className="font-semibold">Sign in</span></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Features Box */}
        <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(10, 10, 10, 0.5)', border: '1px solid rgba(192, 192, 192, 0.15)' }}>
          <h3
            className="text-xs text-vault-accent mb-2"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            FINANCIAL ASCENT SYSTEM
          </h3>
          <ul className="text-xs text-vault-silver-dark space-y-1">
            <li>• Build your business credit from the ground up</li>
            <li>• Track progress across all phases</li>
            <li>• Step-by-step guidance for each task</li>
            <li>• Secure document management</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-vault-silver-dark text-xs mt-8">
          © 2025 Credit Wizard by Benjamin Frost<br />
          All rights reserved.
        </p>
      </div>
    </div>
  )
}
