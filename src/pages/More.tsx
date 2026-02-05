import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  getSavedAccounts,
  removeAccount,
  getInitials,
  maskEmail,
  isAccountTrusted,
  untrustDevice,
  getDeviceName,
  type SavedAccount,
} from '../lib/savedAccounts'

function More() {
  const { user, profile, logout, trustCurrentDevice, switchAccount } = useApp()
  const navigate = useNavigate()
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false)
  const [showDeviceTrust, setShowDeviceTrust] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [isTrusting, setIsTrusting] = useState(false)
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null)
  const [switchError, setSwitchError] = useState<string | null>(null)

  // Load saved accounts
  useEffect(() => {
    requestAnimationFrame(() => {
      setSavedAccounts(getSavedAccounts())
    })
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleSwitchToAccount = async (accountId: string) => {
    setSwitchError(null)
    setSwitchingAccountId(accountId)
    const result = await switchAccount(accountId)
    setSwitchingAccountId(null)
    if (!result.success) {
      setSwitchError(result.error || 'Unable to switch accounts right now.')
      return
    }
    setShowAccountSwitcher(false)
    navigate('/dashboard')
  }

  const handleAddAccount = async () => {
    // Log out and go to login page to add another account
    await logout()
    // Use query param to indicate we want to add a new account (not show saved accounts)
    navigate('/?mode=new')
  }

  const handleRemoveAccount = (accountId: string) => {
    removeAccount(accountId)
    setSavedAccounts(getSavedAccounts())
  }

  const handleTrustDevice = async () => {
    setIsTrusting(true)
    const success = await trustCurrentDevice()
    if (success) {
      setSavedAccounts(getSavedAccounts())
    }
    setIsTrusting(false)
  }

  const handleUntrustDevice = () => {
    if (user?.id) {
      untrustDevice(user.id)
      setSavedAccounts(getSavedAccounts())
    }
  }

  const otherAccounts = savedAccounts.filter(a => a.id !== user?.id)
  const currentAccountTrusted = user?.id ? isAccountTrusted(user.id) : false
  const deviceName = getDeviceName()

  const menuItems = [
    {
      id: 'profile',
      icon: '👤',
      label: 'My Profile',
      description: 'View and edit your profile',
      action: () => {},
    },
    {
      id: 'accounts',
      icon: '🔄',
      label: 'Switch Account',
      description: otherAccounts.length > 0
        ? `${otherAccounts.length} other account${otherAccounts.length > 1 ? 's' : ''} saved`
        : 'Manage multiple accounts',
      action: () => setShowAccountSwitcher(true),
    },
    {
      id: 'calendar',
      icon: '📅',
      label: 'Calendar',
      description: 'View your schedule',
      path: '/calendar',
    },
    {
      id: 'budgeting',
      icon: '🧮',
      label: 'Budgeting',
      description: 'Track budgets, goals, and net worth',
      path: '/budgeting',
    },
    {
      id: 'notifications',
      icon: '🔔',
      label: 'Notifications',
      description: 'Manage notification settings',
      action: () => {},
    },
    {
      id: 'device-trust',
      icon: '📱',
      label: 'Trusted Device',
      description: currentAccountTrusted
        ? `This device is trusted (${deviceName})`
        : 'Enable passwordless login',
      action: () => setShowDeviceTrust(true),
      badge: currentAccountTrusted ? 'ON' : undefined,
      badgeColor: currentAccountTrusted ? 'green' : undefined,
    },
    {
      id: 'privacy',
      icon: '🔒',
      label: 'Privacy & Security',
      description: 'Manage your security settings',
      action: () => {},
    },
    {
      id: 'help',
      icon: '❓',
      label: 'Help & Support',
      description: 'Get help with the app',
      action: () => {},
    },
    {
      id: 'about',
      icon: 'ℹ️',
      label: 'About',
      description: 'App version and info',
      action: () => {},
    },
  ]

  return (
    <div className="min-h-screen bg-vault-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-vault-black/95 backdrop-blur-lg border-b border-vault-silver/10 px-4 py-3">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
          MORE
        </h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Profile Card */}
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-vault-accent to-vault-glow flex items-center justify-center text-xl font-bold text-white">
              {getInitials(profile?.full_name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">
                {profile?.full_name || 'User'}
              </h2>
              <p className="text-sm text-vault-silver-dark truncate">{user?.email}</p>
              {profile?.client_id && (
                <p className="text-xs text-vault-accent mt-1">
                  ID: {profile.client_id}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            item.path ? (
              <Link
                key={item.id}
                to={item.path}
                className="flex items-center gap-4 p-4 rounded-xl transition-colors"
                style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-sm text-vault-silver-dark">{item.description}</p>
                </div>
                <span className="text-vault-silver-dark">→</span>
              </Link>
            ) : (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left"
                style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-sm text-vault-silver-dark">{item.description}</p>
                </div>
                {item.id === 'accounts' && otherAccounts.length > 0 && (
                  <span className="bg-vault-accent text-white text-xs px-2 py-1 rounded-full">
                    {otherAccounts.length}
                  </span>
                )}
                {item.badge && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    item.badgeColor === 'green'
                      ? 'bg-vault-success/20 text-vault-success'
                      : 'bg-vault-accent/20 text-vault-accent'
                  }`}>
                    {item.badge}
                  </span>
                )}
                <span className="text-vault-silver-dark">→</span>
              </button>
            )
          ))}
        </div>

        {/* Admin Link (if admin) */}
        {profile?.role === 'admin' && (
          <Link
            to="/admin"
            className="flex items-center gap-4 p-4 rounded-xl transition-colors"
            style={{ background: 'linear-gradient(145deg, rgba(157, 140, 255, 0.2) 0%, rgba(123, 104, 238, 0.2) 100%)', border: '1px solid rgba(157, 140, 255, 0.3)' }}
          >
            <span className="text-2xl">⚙️</span>
            <div className="flex-1">
              <p className="text-white font-medium">Admin Dashboard</p>
              <p className="text-sm text-vault-accent">Manage clients and system</p>
            </div>
            <span className="text-vault-accent">→</span>
          </Link>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-vault-purple-dark/50 border border-vault-silver/10 rounded-xl text-vault-silver-dark hover:bg-vault-purple-dark transition-colors"
        >
          <span>🚪</span>
          <span className="font-medium">Log Out</span>
        </button>
      </div>

      {/* Account Switcher Modal */}
      {showAccountSwitcher && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-wizard-dark border-2 border-wizard-indigo rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              SWITCH ACCOUNT
            </h3>

            <div className="space-y-3">
              {switchError && (
                <div className="p-3 rounded-lg text-xs text-vault-error bg-vault-error/10 border border-vault-error/40">
                  {switchError}
                </div>
              )}
              {/* Current Account */}
              <div className="p-4 bg-wizard-purple rounded-xl border-2 border-wizard-accent">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-wizard-accent to-wizard-glow flex items-center justify-center text-white font-bold">
                    {getInitials(profile?.full_name || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{profile?.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <span className="text-wizard-accent text-xs font-medium px-2 py-1 bg-wizard-accent/20 rounded-full">
                    Active
                  </span>
                </div>
              </div>

              {/* Other Saved Accounts */}
              {otherAccounts.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 px-1">
                    Other Accounts
                  </p>
                  {otherAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="p-4 bg-wizard-purple/50 rounded-xl border border-wizard-indigo/50 hover:border-wizard-accent/50 transition-colors mb-2 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                          {getInitials(account.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{account.name}</p>
                          <p className="text-xs text-gray-400 truncate">{maskEmail(account.email)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSwitchToAccount(account.id)}
                            disabled={switchingAccountId === account.id}
                            className="px-3 py-1.5 bg-wizard-accent/20 hover:bg-wizard-accent text-wizard-accent hover:text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                          >
                            {switchingAccountId === account.id ? 'Switching...' : 'Switch'}
                          </button>
                          <button
                            onClick={() => handleRemoveAccount(account.id)}
                            className="p-1.5 text-gray-500 hover:text-zinc-300 hover:bg-zinc-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove account"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Account */}
              <button
                onClick={handleAddAccount}
                className="w-full p-4 bg-wizard-purple/30 rounded-xl border-2 border-dashed border-wizard-indigo hover:border-wizard-accent transition-colors"
              >
                <div className="flex items-center justify-center gap-2 text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Another Account</span>
                </div>
              </button>

              {savedAccounts.length > 1 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  {savedAccounts.length} accounts saved on this device
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowAccountSwitcher(false)}
              className="w-full mt-4 px-4 py-3 border-2 border-wizard-indigo text-gray-400 rounded-xl hover:border-wizard-accent hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Device Trust Modal */}
      {showDeviceTrust && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-wizard-dark border-2 border-wizard-indigo rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
              TRUSTED DEVICE
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {currentAccountTrusted
                ? 'This device is trusted for your account. You can log in without entering your password.'
                : 'Trust this device to skip entering your password when logging in.'}
            </p>

            {/* Current Device Info */}
            <div className="p-4 bg-wizard-purple/50 rounded-xl border border-wizard-indigo/50 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-wizard-accent to-wizard-glow flex items-center justify-center">
                  <span className="text-xl">📱</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{deviceName}</p>
                  <p className="text-xs text-gray-400">Current device</p>
                </div>
                {currentAccountTrusted && (
                  <span className="text-green-400 text-xs font-medium px-2 py-1 bg-green-500/20 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Trusted
                  </span>
                )}
              </div>
            </div>

            {/* Trust/Untrust Button */}
            {currentAccountTrusted ? (
              <button
                onClick={handleUntrustDevice}
                className="w-full p-4 bg-zinc-800/30 border border-zinc-600/50 rounded-xl text-zinc-400 hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="font-medium">Remove Trust</span>
              </button>
            ) : (
              <button
                onClick={handleTrustDevice}
                disabled={isTrusting}
                className="w-full p-4 bg-green-900/30 border border-green-500/50 rounded-xl text-green-400 hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTrusting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="font-medium">Enabling...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="font-medium">Trust This Device</span>
                  </>
                )}
              </button>
            )}

            {/* Security Note */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              Only trust devices you own. Anyone with access to this device can sign in to your account without a password.
            </p>

            {/* Close Button */}
            <button
              onClick={() => setShowDeviceTrust(false)}
              className="w-full mt-4 px-4 py-3 border-2 border-wizard-indigo text-gray-400 rounded-xl hover:border-wizard-accent hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default More
