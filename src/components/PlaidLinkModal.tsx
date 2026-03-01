import { useCallback, useState, useEffect } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccess, type PlaidLinkOptions } from 'react-plaid-link'
import { createPlaidLinkToken, exchangePlaidToken, type BankConnection } from '../lib/supabase'

interface PlaidLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (connection: BankConnection) => void
}

export function PlaidLinkModal({ isOpen, onClose, onSuccess }: PlaidLinkModalProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasOpened, setHasOpened] = useState(false) // Prevent auto-reopen loop

  // Fetch link token when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasOpened(false) // Reset when modal opens fresh
      fetchLinkToken()
    }
    return () => {
      setLinkToken(null)
      setError(null)
      setHasOpened(false)
    }
  }, [isOpen])

  const fetchLinkToken = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await createPlaidLinkToken()
      if (!result) {
        setError('Failed to initialize bank connection. Please try again.')
        return
      }
      if (result.error) {
        setError(result.error)
        return
      }
      if (!result.link_token) {
        setError('No link token received from server.')
        return
      }
      setLinkToken(result.link_token)
    } catch (err) {
      console.error('Failed to get link token:', err)
      setError('Failed to initialize bank connection. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onPlaidSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      setLoading(true)
      setError(null)

      try {
        if (!metadata.institution) {
          throw new Error('No institution data received')
        }

        console.log('[PlaidLink] Exchanging token for:', metadata.institution.name)

        const result = await exchangePlaidToken(publicToken, {
          institution_id: metadata.institution.institution_id,
          name: metadata.institution.name,
        })

        console.log('[PlaidLink] Exchange result:', result)

        if (!result.success || !result.connection) {
          const errorMsg = result.error || 'Failed to connect bank'
          console.error('[PlaidLink] Exchange failed:', errorMsg)
          setError(errorMsg)
          setLoading(false)
          return
        }

        onSuccess(result.connection)
        onClose()
      } catch (err) {
        console.error('[PlaidLink] Exception during exchange:', err)
        setError(err instanceof Error ? err.message : 'Failed to connect bank. Please try again.')
        setLoading(false)
      }
    },
    [onSuccess, onClose]
  )

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: (err) => {
      if (err) {
        console.log('Plaid Link exit with error:', err)
      }
      onClose()
    },
  }

  const { open, ready } = usePlaidLink(config)

  // Auto-open Plaid Link when token is ready (only once)
  useEffect(() => {
    if (linkToken && ready && isOpen && !loading && !hasOpened) {
      setHasOpened(true)
      open()
    }
  }, [linkToken, ready, isOpen, loading, hasOpened, open])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
        <h3
          className="text-lg font-bold text-white mb-4"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          CONNECT ACCOUNTS
        </h3>

        {loading && (
          <div className="flex flex-col items-center py-8">
            <div className="animate-spin text-4xl mb-4 text-vault-accent">⟳</div>
            <p className="text-vault-silver-dark">
              {linkToken ? 'Connecting your bank...' : 'Initializing secure connection...'}
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-vault-error/20 border border-vault-error/50 rounded-lg text-vault-error mb-4">
            {error}
          </div>
        )}

        {!loading && !error && !linkToken && (
          <p className="text-vault-silver-dark text-center py-4">
            Preparing secure bank connection...
          </p>
        )}

        {!loading && linkToken && ready && (
          <div className="text-center py-4">
            <p className="text-vault-silver-dark mb-4">
              Click below to securely connect your bank account via Plaid.
            </p>
            <button
              onClick={() => open()}
              className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-colors font-semibold"
              style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
            >
              Open Plaid Link
            </button>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-vault-silver/20 text-vault-silver-dark rounded-lg hover:border-vault-accent hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {error && (
            <button
              type="button"
              onClick={fetchLinkToken}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
              style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
            >
              Retry
            </button>
          )}
        </div>

        <p className="text-xs text-vault-silver-dark mt-4 text-center">
          Your bank credentials are securely handled by Plaid and never stored on our servers.
        </p>
      </div>
    </div>
  )
}
