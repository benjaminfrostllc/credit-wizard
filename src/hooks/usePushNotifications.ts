import { useState, useEffect, useCallback } from 'react'
import { savePushSubscription, removePushSubscription } from '../lib/supabase'

export type NotificationPermission = 'default' | 'granted' | 'denied'

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Convert URL-safe base64 to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Check if push notifications are supported (computed once on module load)
const checkSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  !!VAPID_PUBLIC_KEY

export function usePushNotifications(userId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as NotificationPermission
    }
    return 'default'
  })
  const [isSupported] = useState(checkSupported)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    if (!isSupported) return

    // Check if already subscribed
    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      } catch (error) {
        console.error('Error checking subscription:', error)
      }
    }
    checkSubscription()
  }, [isSupported])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications are not supported in this browser')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermission)
      return result === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }, [isSupported])

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !userId) {
      console.warn('Cannot subscribe: not supported or no user ID')
      return false
    }

    setIsSubscribing(true)

    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) {
          setIsSubscribing(false)
          return false
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription()

      // If no subscription exists, create one
      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource,
        })
      }

      // Save subscription to database
      const subscriptionJSON = subscription.toJSON()
      const { success, error } = await savePushSubscription(userId, subscriptionJSON)

      if (!success) {
        console.error('Failed to save subscription:', error)
        setIsSubscribing(false)
        return false
      }

      setIsSubscribed(true)
      setIsSubscribing(false)
      return true
    } catch (error) {
      console.error('Failed to subscribe to push:', error)
      setIsSubscribing(false)
      return false
    }
  }, [isSupported, userId, requestPermission])

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!userId) return false

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Remove from database first
        await removePushSubscription(userId, subscription.endpoint)

        // Then unsubscribe from browser
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      return true
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      return false
    }
  }, [userId])

  // Show a local notification (for testing or fallback)
  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions): Promise<boolean> => {
      if (!isSupported) return false
      if (permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) return false
      }

      try {
        const registration = await navigator.serviceWorker?.ready
        if (registration) {
          const notifOptions = {
            icon: '/icon.svg',
            badge: '/icon.svg',
            ...options,
          }
          await registration.showNotification(title, notifOptions)
        } else {
          new Notification(title, {
            icon: '/icon.svg',
            ...options,
          })
        }
        return true
      } catch (error) {
        console.error('Failed to show notification:', error)
        return false
      }
    },
    [isSupported, permission, requestPermission]
  )

  return {
    permission,
    isSupported,
    isSubscribed,
    isSubscribing,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    showNotification,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
  }
}
