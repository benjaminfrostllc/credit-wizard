import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  type Notification,
} from '../lib/supabase'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { getSavedAccounts, getInitials } from '../lib/savedAccounts'

export function NotificationBell() {
  const { user, profile } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const lastNotificationId = useRef<string | null>(null)

  // Get current account name for Instagram-style display
  const currentAccountName = profile?.full_name || user?.email?.split('@')[0] || 'Account'
  const savedAccounts = getSavedAccounts()
  const hasMultipleAccounts = savedAccounts.length > 1

  const {
    permission,
    isSupported,
    isSubscribed,
    isSubscribing,
    subscribeToPush,
    showNotification,
    isGranted,
    isDenied
  } = usePushNotifications(user?.id)

  useEffect(() => {
    if (user) {
      loadNotifications()
      // Refresh count every 30 seconds and check for new notifications
      const interval = setInterval(checkForNewNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  // Show permission prompt after a short delay if not yet subscribed
  useEffect(() => {
    if (isSupported && !isSubscribed && permission === 'default') {
      const timer = setTimeout(() => {
        setShowPermissionPrompt(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isSupported, isSubscribed, permission])

  const loadNotifications = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(user.id),
        getUnreadNotificationCount(user.id),
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkForNewNotifications = async () => {
    if (!user) return
    const [notifs, count] = await Promise.all([
      getNotifications(user.id),
      getUnreadNotificationCount(user.id),
    ])

    // Check if there's a new notification
    if (notifs.length > 0 && notifs[0].id !== lastNotificationId.current) {
      const newNotif = notifs[0]

      // Only show browser notification if permission is granted and it's unread
      if (isGranted && !newNotif.is_read) {
        // Instagram-style notification with account name
        showNotification(`(${currentAccountName})`, {
          body: `${newNotif.title}: ${newNotif.message}`,
          tag: `notif-${newNotif.id}`,
        })
      }

      lastNotificationId.current = newNotif.id
    }

    setNotifications(notifs)
    setUnreadCount(count)
  }

  const handleEnableNotifications = async () => {
    setShowPermissionPrompt(false)
    const success = await subscribeToPush()
    if (success) {
      // Show a test notification with account name
      showNotification(`(${currentAccountName})`, {
        body: 'Notifications enabled! You\'ll receive updates for this account.',
      })
    }
  }

  const handleMarkRead = async (notificationId: string) => {
    const success = await markNotificationRead(notificationId)
    if (success) {
      setNotifications(notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ))
      setUnreadCount(Math.max(0, unreadCount - 1))
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    const success = await markAllNotificationsRead(user.id)
    if (success) {
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const handleSendTestNotification = async () => {
    if (!user) return
    const result = await createNotification(
      user.id,
      user.id,
      'Test Notification',
      'This is a test notification to verify your notification system is working! 🎉',
      'congratulations'
    )
    if (result.success) {
      // Refresh notifications
      loadNotifications()
      // Show browser notification if enabled
      if (isGranted) {
        showNotification(`(${currentAccountName})`, {
          body: 'Test Notification: This is a test notification to verify your notification system is working! 🎉',
          tag: 'test-notification',
        })
      }
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'announcement': return '📢'
      case 'reminder': return '⏰'
      case 'congratulations': return '🎉'
      default: return '💬'
    }
  }

  return (
    <div className="relative">
      {/* Permission prompt */}
      {showPermissionPrompt && !isDenied && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 z-50 w-auto sm:w-72 p-3 bg-wizard-dark border-2 border-wizard-accent rounded-xl shadow-2xl animate-slide-up">
          <div className="flex items-start gap-2">
            <span className="text-xl">🔔</span>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Enable notifications?</p>
              <p className="text-xs text-gray-400 mt-1">Get instant updates on your credit journey</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEnableNotifications}
                  className="px-3 py-1 text-xs font-bold bg-wizard-accent hover:bg-wizard-accent/80 text-wizard-dark rounded-lg transition-colors"
                >
                  Enable
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) loadNotifications()
        }}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-wizard-dark text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown - responsive positioning */}
          <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1rem)] bg-wizard-dark border-2 border-wizard-indigo rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header with current account */}
            <div className="p-3 border-b border-wizard-indigo/30">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
                  NOTIFICATIONS
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-wizard-accent hover:text-wizard-glow transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Current account indicator - Instagram style */}
              <div className="flex items-center gap-2 px-2 py-1.5 bg-wizard-purple/50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-wizard-accent to-wizard-glow flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(currentAccountName)}
                </div>
                <span className="text-xs text-gray-300">
                  Viewing as <span className="text-white font-medium">@{currentAccountName.toLowerCase().replace(/\s+/g, '')}</span>
                </span>
                {hasMultipleAccounts && (
                  <span className="ml-auto text-xs text-gray-500">
                    {savedAccounts.length} accounts
                  </span>
                )}
              </div>

              {/* Push notification status */}
              {isSupported && !isSubscribed && !isDenied && (
                <button
                  onClick={handleEnableNotifications}
                  disabled={isSubscribing}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium bg-wizard-accent/20 hover:bg-wizard-accent/30 text-wizard-accent rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubscribing ? (
                    <>
                      <span className="animate-spin">⏳</span> Enabling...
                    </>
                  ) : (
                    <>
                      <span>🔔</span> Enable push notifications
                    </>
                  )}
                </button>
              )}
              {isSubscribed && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Push notifications enabled
                </div>
              )}

              {/* Test Notification Button - Admin Only */}
              {profile?.role === 'admin' && (
                <button
                  onClick={handleSendTestNotification}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium bg-wizard-purple/50 hover:bg-wizard-purple text-gray-300 hover:text-white rounded-lg transition-colors border border-wizard-indigo/30"
                >
                  <span>🧪</span> Send Test Notification
                </button>
              )}
            </div>

            {/* Notifications List - Instagram style */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="inline-block animate-spin h-5 w-5 border-2 border-wizard-accent border-t-transparent rounded-full" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <span className="text-3xl mb-2 block">🔔</span>
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                  <p className="text-gray-600 text-xs mt-1">
                    for @{currentAccountName.toLowerCase().replace(/\s+/g, '')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-wizard-indigo/20">
                  {notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      className={`p-3 hover:bg-wizard-indigo/10 cursor-pointer transition-colors ${
                        !notif.is_read ? 'bg-wizard-accent/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Account avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wizard-accent to-wizard-glow flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {getInitials(currentAccountName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Instagram-style format: (account): title */}
                          <div className="flex items-start gap-1 flex-wrap">
                            <span className="text-wizard-accent text-sm font-semibold">
                              ({currentAccountName})
                            </span>
                            <span className={`text-sm ${!notif.is_read ? 'text-white font-medium' : 'text-gray-300'}`}>
                              {notif.title}
                            </span>
                            {!notif.is_read && (
                              <span className="w-2 h-2 bg-wizard-accent rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm">{getIcon(notif.type)}</span>
                            <span className="text-xs text-gray-500">{formatRelativeTime(notif.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 10 && (
              <div className="p-2 border-t border-wizard-indigo/30">
                <p className="text-xs text-gray-500 text-center">
                  Showing 10 of {notifications.length} notifications
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
