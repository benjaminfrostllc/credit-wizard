import { useEffect, useMemo, useState } from 'react'
import { getBankAccounts, getManualCreditCards, type BankAccount, type ManualCreditCard } from '../lib/supabase'

interface NetWorthCardProps {
  userId: string
}

export function NetWorthCard({ userId }: NetWorthCardProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [manualCards, setManualCards] = useState<ManualCreditCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadNetWorth = async () => {
      setLoading(true)
      setError(null)

      try {
        const [accountsData, manualCardsData] = await Promise.all([
          getBankAccounts(userId),
          getManualCreditCards(userId),
        ])

        if (!isMounted) return

        setAccounts(accountsData)
        setManualCards(manualCardsData)
      } catch (err) {
        console.error('Failed to load net worth data:', err)
        if (isMounted) {
          setError('Unable to load net worth data')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadNetWorth()

    return () => {
      isMounted = false
    }
  }, [userId])

  const assets = useMemo(() => {
    return accounts
      .filter((account) => account.type === 'depository')
      .reduce((sum, account) => sum + (account.balance_current || 0), 0)
  }, [accounts])

  const debts = useMemo(() => {
    const plaidCredit = accounts
      .filter((account) => account.type === 'credit')
      .reduce((sum, account) => sum + (account.balance_current || 0), 0)

    const manualDebt = manualCards.reduce((sum, card) => sum + (card.current_balance || 0), 0)

    return plaidCredit + manualDebt
  }, [accounts, manualCards])

  const hasData = accounts.length > 0 || manualCards.length > 0
  const netWorth = assets - debts
  const isPositive = netWorth >= 0

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)',
        border: '1px solid rgba(192, 192, 192, 0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💎</span>
        <h2 className="text-sm font-bold text-vault-accent" style={{ fontFamily: 'var(--font-pixel)' }}>
          NET WORTH
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vault-accent" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : !hasData ? (
        <div className="text-center py-6 text-vault-silver-dark">
          <p className="text-sm">No balances to calculate yet.</p>
          <p className="text-xs mt-1">Connect a bank or add a card to track your net worth.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-vault-silver-dark">Total Net Worth</p>
              <p className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-orange-400'}`}>
                {isPositive ? '' : '-'}${Math.abs(netWorth).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right text-xs text-vault-silver-dark">
              <p>Assets: ${assets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              <p>Debt: ${debts.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 bg-vault-purple/20">
              <p className="text-xs text-gray-400">Bank Balances</p>
              <p className="text-lg font-semibold text-white">
                ${assets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl p-3 bg-vault-purple/20">
              <p className="text-xs text-gray-400">Total Debt</p>
              <p className="text-lg font-semibold text-white">
                ${debts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
