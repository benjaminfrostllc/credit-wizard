import { useState } from 'react'
import {
  createClientFromAdmin,
  sendInviteLink,
  generateSignupLink,
  type PlanType,
} from '../../lib/supabase'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type CreateMode = 'direct' | 'invite' | 'link'

export function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [mode, setMode] = useState<CreateMode>('direct')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [planType, setPlanType] = useState<PlanType>('basic')
  const [password, setPassword] = useState('')
  const [autoPassword, setAutoPassword] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ clientId?: string; message: string } | null>(null)
  const [signupLink, setSignupLink] = useState<string | null>(null)

  if (!isOpen) return null

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'direct') {
        const finalPassword = autoPassword ? generateRandomPassword() : password
        const result = await createClientFromAdmin({
          email,
          password: finalPassword,
          fullName,
          phone: phone || undefined,
          planType,
        })

        if (!result.success) {
          setError(result.error || 'Failed to create client')
          return
        }

        setSuccess({
          clientId: result.clientId,
          message: `Client created successfully! ${autoPassword ? `Temporary password: ${finalPassword}` : ''}`,
        })
      } else if (mode === 'invite') {
        const result = await sendInviteLink(email, fullName, phone || undefined, planType)

        if (!result.success) {
          setError(result.error || 'Failed to send invite')
          return
        }

        setSuccess({
          message: `Invite sent to ${email}! They will receive a magic link to set up their account.`,
        })
      } else if (mode === 'link') {
        const link = generateSignupLink(planType)
        setSignupLink(link)
        setSuccess({
          message: 'Signup link generated! Share it with your client.',
        })
      }

      // Reset form after success (except for link mode)
      if (mode !== 'link') {
        setTimeout(() => {
          onSuccess()
          resetForm()
        }, 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPhone('')
    setPlanType('basic')
    setPassword('')
    setAutoPassword(true)
    setError(null)
    setSuccess(null)
    setSignupLink(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-wizard-dark border-2 border-wizard-indigo rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3
          className="text-lg font-bold text-white mb-6"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          ADD NEW CLIENT
        </h3>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'direct'
                ? 'bg-wizard-accent text-white'
                : 'bg-wizard-purple text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => setMode('invite')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'invite'
                ? 'bg-wizard-accent text-white'
                : 'bg-wizard-purple text-gray-400 hover:text-white'
            }`}
          >
            Send Invite
          </button>
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'link'
                ? 'bg-wizard-accent text-white'
                : 'bg-wizard-purple text-gray-400 hover:text-white'
            }`}
          >
            Get Link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name - not needed for link mode */}
          {mode !== 'link' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-2 bg-wizard-purple border-2 border-wizard-indigo rounded-lg text-white focus:outline-none focus:border-wizard-accent"
                placeholder="John Smith"
              />
            </div>
          )}

          {/* Email - not needed for link mode */}
          {mode !== 'link' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-wizard-purple border-2 border-wizard-indigo rounded-lg text-white focus:outline-none focus:border-wizard-accent"
                placeholder="john@example.com"
              />
            </div>
          )}

          {/* Phone - optional, not for link mode */}
          {mode !== 'link' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 bg-wizard-purple border-2 border-wizard-indigo rounded-lg text-white focus:outline-none focus:border-wizard-accent"
                placeholder="(555) 123-4567"
              />
            </div>
          )}

          {/* Plan Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Plan Type</label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as PlanType)}
              className="w-full px-4 py-2 bg-wizard-purple border-2 border-wizard-indigo rounded-lg text-white focus:outline-none focus:border-wizard-accent"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          {/* Password - only for direct mode */}
          {mode === 'direct' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Password</label>
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPassword}
                    onChange={(e) => setAutoPassword(e.target.checked)}
                    className="rounded border-wizard-indigo bg-wizard-purple text-wizard-accent focus:ring-wizard-accent"
                  />
                  Auto-generate
                </label>
              </div>
              {!autoPassword && (
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!autoPassword}
                  minLength={8}
                  className="w-full px-4 py-2 bg-wizard-purple border-2 border-wizard-indigo rounded-lg text-white focus:outline-none focus:border-wizard-accent"
                  placeholder="Min 8 characters"
                />
              )}
              {autoPassword && (
                <p className="text-xs text-gray-500 mt-1">
                  A secure password will be generated and displayed after creation.
                </p>
              )}
            </div>
          )}

          {/* Link mode - show generated link */}
          {mode === 'link' && signupLink && (
            <div className="p-4 bg-wizard-purple/50 rounded-lg border border-wizard-indigo">
              <p className="text-xs text-gray-400 mb-2">Shareable Signup Link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={signupLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-wizard-dark border border-wizard-indigo rounded text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(signupLink)}
                  className="px-3 py-2 bg-wizard-accent text-white rounded hover:bg-wizard-glow transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-lg text-amber-400 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400 text-sm">
              {success.clientId && (
                <p className="font-bold mb-1">Client ID: {success.clientId}</p>
              )}
              <p>{success.message}</p>
              {success.message.includes('password:') && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(success.message.split('password: ')[1])}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Copy Password
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border-2 border-wizard-indigo text-gray-400 rounded-lg hover:border-wizard-accent hover:text-white transition-colors"
            >
              {success ? 'Close' : 'Cancel'}
            </button>
            {!success && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-500 hover:to-emerald-500 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⟳</span> Processing...
                  </span>
                ) : mode === 'direct' ? (
                  'Create Account'
                ) : mode === 'invite' ? (
                  'Send Invite'
                ) : (
                  'Generate Link'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
