import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { TheOracle } from './TheOracle'

interface Tab {
  id: string
  label: string
  icon: string
  path: string
}

const tabs: Tab[] = [
  { id: 'home', label: 'Home', icon: '🏠', path: '/dashboard' },
  { id: 'cards', label: 'Cards', icon: '💳', path: '/cards' },
  { id: 'disputes', label: 'Disputes', icon: '⚔️', path: '/disputes' },
  { id: 'vault', label: 'The Vault', icon: '🔐', path: '/vault' },
  { id: 'more', label: 'More', icon: '☰', path: '/more' },
]

export function BottomTabNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showOracle, setShowOracle] = useState(false)

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      // Home is active for dashboard and all section pages
      return location.pathname === '/dashboard' ||
             ['/foundry', '/identity', '/treasury', '/credit-core', '/control', '/command', '/the-vault'].includes(location.pathname)
    }
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-vault-black/95 backdrop-blur-lg border-t border-vault-silver/10">
        <div className="flex items-center justify-around px-2 py-1">
          {tabs.map((tab) => {
            const active = isActive(tab.path)
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-vault-accent'
                    : 'text-vault-silver-dark hover:text-vault-silver'
                }`}
                style={active ? { filter: 'drop-shadow(0 0 8px rgba(157, 140, 255, 0.5))' } : {}}
              >
                <span className={`text-xl mb-0.5 transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                <span
                  className={`text-[10px] font-medium ${active ? 'text-vault-accent' : ''}`}
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  {tab.label}
                </span>
                {active && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-vault-accent animate-pulse" />
                )}
              </button>
            )
          })}

          {/* Oracle Tab - inline with other tabs */}
          <button
            onClick={() => setShowOracle(true)}
            className="flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 text-vault-accent-light hover:text-vault-accent"
          >
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vault-accent-light to-vault-glow animate-pulse shadow-lg shadow-vault-glow/30" />
              <div className="absolute inset-0 w-6 h-6 rounded-full bg-vault-glow/30 animate-ping" />
            </div>
            <span
              className="text-[10px] font-medium mt-1 text-vault-accent-light"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              Oracle
            </span>
          </button>
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-safe-area-bottom bg-vault-black" />
      </nav>

      {/* Oracle Modal */}
      <TheOracle isOpen={showOracle} onClose={() => setShowOracle(false)} />
    </>
  )
}
