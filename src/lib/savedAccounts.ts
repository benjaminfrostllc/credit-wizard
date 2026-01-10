export interface SavedAccount {
  id: string
  email: string
  name: string
  isAdmin: boolean
  savedAt: string
  lastUsed: string
  // Trust device feature - allows passwordless login
  isTrusted?: boolean
  refreshToken?: string
  // Device info for display
  deviceName?: string
}

const STORAGE_KEY = 'creditWizardSavedAccounts'

// Generate a simple device name based on browser/OS
export function getDeviceName(): string {
  const ua = navigator.userAgent
  let device = 'Unknown Device'

  if (/iPhone/.test(ua)) device = 'iPhone'
  else if (/iPad/.test(ua)) device = 'iPad'
  else if (/Android/.test(ua)) device = 'Android'
  else if (/Mac/.test(ua)) device = 'Mac'
  else if (/Windows/.test(ua)) device = 'Windows PC'
  else if (/Linux/.test(ua)) device = 'Linux'

  // Add browser
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) device += ' (Chrome)'
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) device += ' (Safari)'
  else if (/Firefox/.test(ua)) device += ' (Firefox)'
  else if (/Edg/.test(ua)) device += ' (Edge)'

  return device
}

export function getSavedAccounts(): SavedAccount[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return []
  try {
    const accounts = JSON.parse(saved) as SavedAccount[]
    // Sort by last used (most recent first)
    return accounts.sort((a, b) =>
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    )
  } catch {
    return []
  }
}

export function saveAccount(
  account: Omit<SavedAccount, 'savedAt' | 'lastUsed'>,
  options?: { trustDevice?: boolean; refreshToken?: string }
): void {
  const accounts = getSavedAccounts()

  // Check if account already exists by id
  const existingIndex = accounts.findIndex((a) => a.id === account.id)

  const now = new Date().toISOString()

  if (existingIndex >= 0) {
    // Update existing account
    accounts[existingIndex] = {
      ...accounts[existingIndex],
      ...account,
      lastUsed: now,
      // Only update trust status if explicitly provided
      ...(options?.trustDevice !== undefined && {
        isTrusted: options.trustDevice,
        refreshToken: options.trustDevice ? options.refreshToken : undefined,
        deviceName: options.trustDevice ? getDeviceName() : undefined,
      }),
    }
  } else {
    // Add new account (max 5 accounts)
    if (accounts.length >= 5) {
      // Remove oldest account
      accounts.pop()
    }
    accounts.unshift({
      ...account,
      savedAt: now,
      lastUsed: now,
      isTrusted: options?.trustDevice || false,
      refreshToken: options?.trustDevice ? options.refreshToken : undefined,
      deviceName: options?.trustDevice ? getDeviceName() : undefined,
    })
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function updateLastUsed(id: string): void {
  const accounts = getSavedAccounts()
  const index = accounts.findIndex((a) => a.id === id)

  if (index >= 0) {
    accounts[index].lastUsed = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }
}

// Trust a device for an account (enables passwordless login)
export function trustDevice(id: string, refreshToken: string): void {
  const accounts = getSavedAccounts()
  const index = accounts.findIndex((a) => a.id === id)

  if (index >= 0) {
    accounts[index].isTrusted = true
    accounts[index].refreshToken = refreshToken
    accounts[index].deviceName = getDeviceName()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }
}

// Revoke trust for an account on this device
export function untrustDevice(id: string): void {
  const accounts = getSavedAccounts()
  const index = accounts.findIndex((a) => a.id === id)

  if (index >= 0) {
    accounts[index].isTrusted = false
    accounts[index].refreshToken = undefined
    accounts[index].deviceName = undefined
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }
}

// Get a trusted account's refresh token for auto-login
export function getTrustedRefreshToken(id: string): string | undefined {
  const accounts = getSavedAccounts()
  const account = accounts.find((a) => a.id === id)
  return account?.isTrusted ? account.refreshToken : undefined
}

// Check if an account is trusted on this device
export function isAccountTrusted(id: string): boolean {
  const accounts = getSavedAccounts()
  const account = accounts.find((a) => a.id === id)
  return account?.isTrusted === true && !!account?.refreshToken
}

export function removeAccount(id: string): void {
  const accounts = getSavedAccounts()
  const filtered = accounts.filter((a) => a.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function clearAllAccounts(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// Get initials from name for avatar
export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Mask email for display
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const maskedLocal = local.length <= 2
    ? local
    : local.charAt(0) + '***' + local.charAt(local.length - 1)
  return `${maskedLocal}@${domain}`
}
