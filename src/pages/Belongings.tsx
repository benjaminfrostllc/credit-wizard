import { useState, useEffect } from 'react'
import { supabase, type BankConnection } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { PlaidLinkModal } from '../components/PlaidLinkModal'

interface BelongingItem {
  id: string
  type: 'card' | 'id' | 'cash' | 'key' | 'other'
  name: string
  details?: string
  color: string
  location: 'vault' | 'bag'
}

type BagType = 'handbag' | 'briefcase' | 'backpack'
type ViewMode = 'all' | 'vault' | 'bag'

interface RGBPreset {
  id: string
  name: string
  colors: string[]
}

const rgbPresets: RGBPreset[] = [
  { id: 'purple', name: 'Royal Purple', colors: ['#8b5cf6', '#7928ca', '#ec4899'] },
  { id: 'ocean', name: 'Ocean Blue', colors: ['#06b6d4', '#3b82f6', '#8b5cf6'] },
  { id: 'sunset', name: 'Sunset', colors: ['#f59e0b', '#ef4444', '#ec4899'] },
  { id: 'emerald', name: 'Emerald', colors: ['#10b981', '#06b6d4', '#22c55e'] },
  { id: 'rose', name: 'Rose Gold', colors: ['#ec4899', '#f472b6', '#fbbf24'] },
  { id: 'midnight', name: 'Midnight', colors: ['#1e1b4b', '#4338ca', '#7c3aed'] },
  { id: 'fire', name: 'Fire', colors: ['#dc2626', '#f97316', '#fbbf24'] },
  { id: 'ice', name: 'Ice', colors: ['#67e8f9', '#a5f3fc', '#e0f2fe'] },
]

const itemTypes = [
  { id: 'card', label: 'Card', icon: '💳', color: '#6366f1' },
  { id: 'id', label: 'ID', icon: '🪪', color: '#10b981' },
  { id: 'cash', label: 'Cash', icon: '💵', color: '#22c55e' },
  { id: 'key', label: 'Key', icon: '🔑', color: '#f59e0b' },
  { id: 'other', label: 'Other', icon: '📦', color: '#8b5cf6' },
]

const bagTypes = [
  { id: 'handbag' as BagType, label: 'Handbag', icon: '👜', color: '#ec4899', gradient: 'from-pink-600 to-rose-600' },
  { id: 'briefcase' as BagType, label: 'Briefcase', icon: '💼', color: '#8b5cf6', gradient: 'from-violet-600 to-purple-600' },
  { id: 'backpack' as BagType, label: 'Backpack', icon: '🎒', color: '#06b6d4', gradient: 'from-cyan-600 to-teal-600' },
]

function Belongings() {
  const { user } = useApp()
  const [items, setItems] = useState<BelongingItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [gyro, setGyro] = useState({ x: 0, y: 0 })
  const [bagOpen, setBagOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedBagType, setSelectedBagType] = useState<BagType>(() => {
    if (typeof window !== 'undefined') {
      const savedBag = localStorage.getItem('preferredBagType') as BagType | null
      if (savedBag && bagTypes.some(b => b.id === savedBag)) {
        return savedBag
      }
    }
    return 'briefcase'
  })
  const [showBagSelector, setShowBagSelector] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showPlaidModal, setShowPlaidModal] = useState(false)
  const [selectedRGB, setSelectedRGB] = useState<RGBPreset>(() => {
    if (typeof window !== 'undefined') {
      const savedRGB = localStorage.getItem('preferredRGBPreset')
      if (savedRGB) {
        const preset = rgbPresets.find(p => p.id === savedRGB)
        if (preset) return preset
      }
    }
    return rgbPresets[0]
  })
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('preferredViewMode') as ViewMode | null
      if (savedView) return savedView
    }
    return 'all'
  })

  // Form state
  const [formData, setFormData] = useState({
    type: 'card' as BelongingItem['type'],
    name: '',
    details: '',
  })

  // Load belongings and preferences from Supabase
  useEffect(() => {
    if (!user) return

    let cancelled = false

    const loadBelongings = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('belongings')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        console.error('Error loading belongings:', error)
      } else if (data) {
        const mappedItems: BelongingItem[] = data.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          details: item.details || undefined,
          color: item.color || '#6366f1',
          location: item.location === 'vault' ? 'vault' : 'bag',
        }))
        setItems(mappedItems)
      }
      setLoading(false)
    }

    loadBelongings()

    return () => {
      cancelled = true
    }
  }, [user])

  // Gyroscope effect
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const x = Math.min(Math.max((event.gamma || 0) / 45, -1), 1)
      const y = Math.min(Math.max((event.beta || 0) / 45, -1), 1)
      setGyro({ x: x * 15, y: y * 10 })
    }

    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation)
          }
        })
        .catch(console.error)
    } else {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  const handleAddItem = async () => {
    if (!user) return

    setSaving(true)
    const typeInfo = itemTypes.find(t => t.id === formData.type)

    const { data, error } = await supabase
      .from('belongings')
      .insert({
        user_id: user.id,
        type: formData.type,
        name: formData.name,
        details: formData.details || null,
        color: typeInfo?.color || '#6366f1',
        location: 'vault', // New items go to vault by default
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding belonging:', error)
    } else if (data) {
      const newItem: BelongingItem = {
        id: data.id,
        type: data.type,
        name: data.name,
        details: data.details || undefined,
        color: data.color || '#6366f1',
        location: 'vault',
      }
      setItems([newItem, ...items])
    }

    setSaving(false)
    setShowAddModal(false)
    setFormData({ type: 'card', name: '', details: '' })
  }

  const handleRemoveItem = async (id: string) => {
    const { error } = await supabase
      .from('belongings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error removing belonging:', error)
    } else {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const handleMoveItem = async (id: string, newLocation: 'vault' | 'bag') => {
    const { error } = await supabase
      .from('belongings')
      .update({ location: newLocation })
      .eq('id', id)

    if (error) {
      console.error('Error moving item:', error)
    } else {
      setItems(items.map(item =>
        item.id === id ? { ...item, location: newLocation } : item
      ))
    }
  }

  const handleSelectBagType = (bagType: BagType) => {
    setSelectedBagType(bagType)
    localStorage.setItem('preferredBagType', bagType)
    setShowBagSelector(false)
  }

  const handleSelectRGB = (preset: RGBPreset) => {
    setSelectedRGB(preset)
    localStorage.setItem('preferredRGBPreset', preset.id)
    setShowColorPicker(false)
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('preferredViewMode', mode)
  }

  const currentBag = bagTypes.find(b => b.id === selectedBagType) || bagTypes[1]
  const bagItems = items.filter(item => item.location === 'bag')
  const vaultItems = items.filter(item => item.location === 'vault')

  // Filter items based on view mode
  const displayItems = viewMode === 'all' ? items : viewMode === 'vault' ? vaultItems : bagItems

  const rgbGradient = `linear-gradient(${45 + gyro.x * 2}deg, ${selectedRGB.colors.join(', ')}, ${selectedRGB.colors[0]})`

  return (
    <div className="min-h-screen bg-wizard-dark pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-wizard-dark/95 backdrop-blur-lg border-b border-wizard-indigo/30 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
              YOUR BELONGINGS
            </h1>
            <p className="text-xs text-gray-400">{items.length} items total</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColorPicker(true)}
              className="p-2 rounded-lg border border-wizard-indigo hover:border-wizard-accent transition-colors"
              title="Customize colors"
            >
              🎨
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-wizard-accent text-white rounded-lg text-sm font-medium hover:bg-wizard-glow transition-colors"
            >
              + Add
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-wizard-purple/50 rounded-lg p-1">
          <button
            onClick={() => handleViewModeChange('all')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-wizard-accent text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 All ({items.length})
          </button>
          <button
            onClick={() => handleViewModeChange('vault')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'vault'
                ? 'bg-wizard-accent text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔐 Vault ({vaultItems.length})
          </button>
          <button
            onClick={() => handleViewModeChange('bag')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'bag'
                ? 'bg-wizard-accent text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {currentBag.icon} Carry ({bagItems.length})
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Carry Bag Section - Only show in 'all' or 'bag' view */}
        {(viewMode === 'all' || viewMode === 'bag') && (
          <div
            className="relative mx-auto"
            style={{
              perspective: '1000px',
              maxWidth: '360px',
            }}
          >
            {/* Bag Container */}
            <div
              onClick={() => setBagOpen(!bagOpen)}
              className="relative cursor-pointer transition-transform duration-300"
              style={{
                transform: `rotateY(${gyro.x}deg) rotateX(${-gyro.y}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* RGB Glow Effect */}
              <div
                className="absolute inset-0 rounded-3xl blur-xl opacity-60"
                style={{
                  background: rgbGradient,
                  backgroundSize: '400% 400%',
                  animation: 'rgbShift 8s ease infinite',
                }}
              />

              {/* Main Bag Body */}
              <div
                className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-1 overflow-hidden"
                style={{
                  boxShadow: `
                    0 0 30px ${selectedRGB.colors[0]}40,
                    0 0 60px ${selectedRGB.colors[1]}20,
                    inset 0 1px 0 rgba(255,255,255,0.1)
                  `,
                }}
              >
                {/* Inner Content */}
                <div className="bg-gradient-to-br from-gray-900 to-black rounded-[22px] p-6">
                  {/* Bag Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowBagSelector(true)
                        }}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${currentBag.gradient} hover:opacity-90 transition-opacity`}
                      >
                        <span className="text-2xl">{currentBag.icon}</span>
                      </button>
                      <div>
                        <h2 className="text-white font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>
                          MY {currentBag.label.toUpperCase()}
                        </h2>
                        <p className="text-xs text-gray-400">{bagItems.length} items carrying</p>
                      </div>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${bagOpen ? 'bg-green-400' : 'bg-wizard-accent'} animate-pulse`}
                    />
                  </div>

                  {/* Tap to Open Indicator */}
                  <div className="text-center py-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500">
                      {bagOpen ? 'Tap to close' : 'Tap to open'} your {currentBag.label.toLowerCase()}
                    </p>
                    <div className="mt-2 flex justify-center">
                      <div
                        className={`h-1 rounded-full transition-all`}
                        style={{
                          width: bagOpen ? '64px' : '32px',
                          background: rgbGradient,
                        }}
                      />
                    </div>
                  </div>

                  {/* Items Preview (when open) */}
                  {bagOpen && (
                    <div className="mt-4 space-y-2 animate-fadeIn">
                      {bagItems.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm py-4">
                          Your {currentBag.label.toLowerCase()} is empty
                        </p>
                      ) : (
                        bagItems.slice(0, 4).map((item) => {
                          const typeInfo = itemTypes.find(t => t.id === item.type)
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50"
                            >
                              <span className="text-xl">{typeInfo?.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                {item.details && (
                                  <p className="text-xs text-gray-400 truncate">{item.details}</p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMoveItem(item.id, 'vault')
                                }}
                                className="p-1 text-xs text-gray-400 hover:text-white transition-colors"
                                title="Move to vault"
                              >
                                📤
                              </button>
                            </div>
                          )
                        })
                      )}
                      {bagItems.length > 4 && (
                        <p className="text-center text-xs text-gray-500">
                          +{bagItems.length - 4} more items
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Holographic Strip */}
              <div
                className="absolute top-1/2 left-0 right-0 h-8 -translate-y-1/2 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg,
                    transparent,
                    rgba(255,255,255,0.1) 20%,
                    rgba(255,255,255,0.2) 50%,
                    rgba(255,255,255,0.1) 80%,
                    transparent)`,
                  transform: `translateY(-50%) translateX(${gyro.x * 5}px)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="mt-6">
          {viewMode === 'all' && (
            <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <span>📋</span> ALL BELONGINGS
            </h3>
          )}
          {viewMode === 'vault' && (
            <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <span>🔐</span> VAULT ITEMS
            </h3>
          )}
          {viewMode === 'bag' && (
            <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <span>{currentBag.icon}</span> IN YOUR {currentBag.label.toUpperCase()}
            </h3>
          )}

          {loading ? (
            <div className="text-center py-8 bg-wizard-purple/30 rounded-xl border border-wizard-indigo/30">
              <div className="text-4xl mb-3 animate-pulse">📦</div>
              <p className="text-gray-400">Loading your belongings...</p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-8 bg-wizard-purple/30 rounded-xl border border-wizard-indigo/30">
              <div className="text-4xl mb-3">
                {viewMode === 'vault' ? '🔐' : viewMode === 'bag' ? currentBag.icon : '📦'}
              </div>
              <p className="text-gray-400 mb-1">
                {viewMode === 'vault' ? 'Your vault is empty' : viewMode === 'bag' ? `Your ${currentBag.label.toLowerCase()} is empty` : 'No items yet'}
              </p>
              <p className="text-sm text-gray-500">Tap "+ Add" to add an item</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayItems.map((item) => {
                const typeInfo = itemTypes.find(t => t.id === item.type)
                const isInBag = item.location === 'bag'
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      isInBag
                        ? `bg-gradient-to-r ${currentBag.gradient} bg-opacity-20 border-white/10`
                        : 'bg-wizard-purple border-wizard-indigo/50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isInBag ? 'bg-white/10' : ''
                      }`}
                      style={!isInBag ? { backgroundColor: item.color + '30' } : undefined}
                    >
                      <span className="text-xl">{typeInfo?.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isInBag ? 'text-white' : 'text-white'}`}>{item.name}</p>
                      {item.details && (
                        <p className={`text-sm truncate ${isInBag ? 'text-gray-300' : 'text-gray-400'}`}>{item.details}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {isInBag ? `In ${currentBag.label}` : 'In Vault'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMoveItem(item.id, isInBag ? 'vault' : 'bag')}
                      className={`p-2 transition-colors ${
                        isInBag ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-green-400'
                      }`}
                      title={isInBag ? 'Move to vault' : `Move to ${currentBag.label}`}
                    >
                      {isInBag ? '📤' : '📥'}
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className={`p-2 transition-colors ${
                        isInBag ? 'text-white/70 hover:text-zinc-300' : 'text-gray-400 hover:text-zinc-300'
                      }`}
                    >
                      🗑️
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-wizard-dark border-2 border-wizard-indigo rounded-2xl p-6 w-full max-w-md relative">
            {/* Crushed Steel Connect Bank Button - Floating */}
            <button
              onClick={() => {
                setShowAddModal(false)
                setShowPlaidModal(true)
              }}
              className="absolute -top-3 right-4 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(145deg, #71717a 0%, #52525b 25%, #3f3f46 50%, #52525b 75%, #71717a 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)',
                border: '1px solid #52525b',
                color: '#fafafa',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect Bank
              </span>
            </button>

            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              ADD ITEM
            </h3>

            <div className="space-y-4">
              {/* Item Type */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Item Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {itemTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.id as BelongingItem['type'] })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.type === type.id
                          ? 'border-wizard-accent bg-wizard-accent/20'
                          : 'border-wizard-indigo hover:border-wizard-accent/50'
                      }`}
                    >
                      <span className="text-xl block text-center">{type.icon}</span>
                      <span className="text-xs text-gray-400 block text-center">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Chase Sapphire"
                  className="w-full px-4 py-2 bg-wizard-purple border border-wizard-indigo rounded-lg text-white focus:outline-none focus:border-wizard-accent"
                />
              </div>

              {/* Details */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Details (optional)</label>
                <input
                  type="text"
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder="e.g., ending in 4242"
                  className="w-full px-4 py-2 bg-wizard-purple border border-wizard-indigo rounded-lg text-white focus:outline-none focus:border-wizard-accent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({ type: 'card', name: '', details: '' })
                }}
                className="flex-1 px-4 py-2 border-2 border-wizard-indigo text-gray-400 rounded-lg hover:border-wizard-accent hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!formData.name.trim() || saving}
                className="flex-1 px-4 py-2 bg-wizard-accent text-white font-bold rounded-lg hover:bg-wizard-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add to Vault'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bag Type Selector Modal */}
      {showBagSelector && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-wizard-dark border-2 border-wizard-indigo rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              CHOOSE YOUR CARRY
            </h3>
            <p className="text-sm text-gray-400 mb-6">Select what you carry your items in when you go out</p>

            <div className="space-y-3">
              {bagTypes.map((bag) => (
                <button
                  key={bag.id}
                  onClick={() => handleSelectBagType(bag.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    selectedBagType === bag.id
                      ? 'border-wizard-accent bg-wizard-accent/10'
                      : 'border-wizard-indigo hover:border-wizard-accent/50 bg-wizard-purple/30'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${bag.gradient}`}>
                    <span className="text-3xl">{bag.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-bold">{bag.label}</p>
                    <p className="text-sm text-gray-400">
                      {bag.id === 'handbag' && 'Classic feminine style'}
                      {bag.id === 'briefcase' && 'Professional business look'}
                      {bag.id === 'backpack' && 'Casual everyday carry'}
                    </p>
                  </div>
                  {selectedBagType === bag.id && (
                    <span className="text-green-400 text-xl">✓</span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowBagSelector(false)}
              className="w-full mt-6 px-4 py-3 border-2 border-wizard-indigo text-gray-400 rounded-xl hover:border-wizard-accent hover:text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* RGB Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-wizard-dark border-2 border-wizard-indigo rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              RGB GLOW COLORS
            </h3>
            <p className="text-sm text-gray-400 mb-6">Choose your carry bag's glow effect</p>

            <div className="grid grid-cols-2 gap-3">
              {rgbPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectRGB(preset)}
                  className={`relative p-4 rounded-xl border-2 transition-all overflow-hidden ${
                    selectedRGB.id === preset.id
                      ? 'border-white'
                      : 'border-wizard-indigo hover:border-wizard-accent/50'
                  }`}
                >
                  {/* Gradient Preview */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `linear-gradient(135deg, ${preset.colors.join(', ')})`,
                    }}
                  />
                  <div className="relative">
                    <div className="flex gap-1 mb-2 justify-center">
                      {preset.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-white text-sm font-medium">{preset.name}</p>
                  </div>
                  {selectedRGB.id === preset.id && (
                    <div className="absolute top-2 right-2 text-green-400">✓</div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowColorPicker(false)}
              className="w-full mt-6 px-4 py-3 border-2 border-wizard-indigo text-gray-400 rounded-xl hover:border-wizard-accent hover:text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* CSS for RGB animation */}
      <style>{`
        @keyframes rgbShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {/* Plaid Link Modal */}
      <PlaidLinkModal
        isOpen={showPlaidModal}
        onClose={() => setShowPlaidModal(false)}
        onSuccess={(connection: BankConnection) => {
          console.log('Bank connected:', connection)
          setShowPlaidModal(false)
        }}
      />
    </div>
  )
}

export default Belongings
