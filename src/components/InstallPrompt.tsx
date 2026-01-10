import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if user already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-wizard-purple to-wizard-dark border-2 border-wizard-accent rounded-2xl p-4 shadow-2xl shadow-wizard-accent/20">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center text-2xl shadow-lg">
            ✨
          </div>
          <div className="flex-1">
            <h3
              className="text-sm text-gold font-bold"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              INSTALL APP
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              Add Credit Wizard to your home screen for quick access!
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-wizard-accent to-purple-600 text-white text-sm font-bold rounded-lg hover:from-purple-500 hover:to-purple-700 transition-all shadow-lg shadow-wizard-accent/30"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            INSTALL
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-gray-400 text-sm hover:text-white border border-wizard-indigo hover:border-wizard-accent rounded-lg transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
