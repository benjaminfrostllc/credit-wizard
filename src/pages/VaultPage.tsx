import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { supabase, getBankAccounts, getBankConnections, type BankConnection, type BankAccount } from '../lib/supabase'
import { PlaidLinkModal } from '../components/PlaidLinkModal'

interface ManualCard {
  id: string
  nickname: string
  lastFour: string
  connectionId: string
  inCarry: boolean
  isLocked: boolean
}

interface CarryItem {
  id: string
  type: 'plaid' | 'manual'
  name: string
  details: string
  color: string
  balance: number | null
  sourceId: string // account_id for plaid, credit_card_id for manual
  connectionId: string
}

export default function VaultPage() {
  const { user } = useApp()
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [manualCards, setManualCards] = useState<ManualCard[]>([])
  const [carryItems, setCarryItems] = useState<CarryItem[]>([])
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set())
  const [showPlaidModal, setShowPlaidModal] = useState(false)
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [cardForm, setCardForm] = useState({ nickname: '', lastFour: '' })
  const [saving, setSaving] = useState(false)
  const [selectedCard, setSelectedCard] = useState<ManualCard | null>(null)
  const [showCardDetailModal, setShowCardDetailModal] = useState(false)
  const [editForm, setEditForm] = useState({ nickname: '', lastFour: '', isLocked: false })
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [itemForm, setItemForm] = useState({ name: '', details: '' })
  const [vaultItems, setVaultItems] = useState<CarryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<CarryItem | null>(null)
  const [showItemDetailModal, setShowItemDetailModal] = useState(false)
  const [itemEditForm, setItemEditForm] = useState({ name: '', details: '' })

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    try {
      const [connectionsData, accountsData, creditCardsResult, belongingsResult, allBelongingsResult] = await Promise.all([
        getBankConnections(user.id),
        getBankAccounts(user.id),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('belongings').select('*').eq('user_id', user.id).eq('location', 'carry'),
        supabase.from('belongings').select('*').eq('user_id', user.id), // All belongings for vault items
      ])

      console.log('[Vault] Loaded:', {
        connections: connectionsData.length,
        accounts: accountsData.length,
        manualCards: creditCardsResult.data?.length,
        carryItems: belongingsResult.data?.length,
      })

      setConnections(connectionsData)
      setAccounts(accountsData)

      // Map manual cards
      const cards: ManualCard[] = (creditCardsResult.data || []).map(card => {
        const belonging = belongingsResult.data?.find(b => b.credit_card_id === card.id)
        return {
          id: card.id,
          nickname: card.nickname || 'Card',
          lastFour: card.last_four || '',
          connectionId: card.connection_id || '',
          inCarry: belonging?.location === 'carry',
          isLocked: card.is_locked || false,
        }
      })
      setManualCards(cards)

      // Build carry items list
      const carry: CarryItem[] = (belongingsResult.data || []).map(b => {
        // Check if it's a manual card
        if (b.credit_card_id) {
          const card = creditCardsResult.data?.find(c => c.id === b.credit_card_id)
          const conn = connectionsData.find(c => c.id === card?.connection_id)
          return {
            id: b.id,
            type: 'manual' as const,
            name: card?.nickname || 'Card',
            details: card?.last_four ? `•••• ${card.last_four}` : 'Credit Card',
            color: conn?.primary_color || '#6366f1',
            balance: card?.current_balance || null,
            sourceId: b.credit_card_id,
            connectionId: card?.connection_id || '',
          }
        }
        // Plaid account
        if (b.linked_account_id) {
          const acc = accountsData.find(a => a.id === b.linked_account_id)
          const conn = connectionsData.find(c => c.id === acc?.connection_id)
          return {
            id: b.id,
            type: 'plaid' as const,
            name: b.name || acc?.name || 'Account',
            details: b.details || (acc?.mask ? `•••• ${acc.mask}` : ''),
            color: conn?.primary_color || '#6366f1',
            balance: acc?.balance_current ?? null,
            sourceId: b.linked_account_id,
            connectionId: acc?.connection_id || '',
          }
        }
        // Generic belonging
        return {
          id: b.id,
          type: 'manual' as const,
          name: b.name,
          details: b.details || '',
          color: b.color || '#6366f1',
          balance: null,
          sourceId: b.id,
          connectionId: '',
        }
      })
      setCarryItems(carry)

      // Build vault items list (generic items not linked to cards/accounts)
      const genericItems: CarryItem[] = (allBelongingsResult.data || [])
        .filter(b => !b.credit_card_id && !b.linked_account_id)
        .map(b => ({
          id: b.id,
          type: 'manual' as const,
          name: b.name,
          details: b.details || '',
          color: b.color || '#6366f1',
          balance: null,
          sourceId: b.id,
          connectionId: '',
        }))

      // Separate into carry and vault
      const genericInCarry = genericItems.filter(item => {
        const belonging = allBelongingsResult.data?.find(b => b.id === item.id)
        return belonging?.location === 'carry'
      })
      const genericInVault = genericItems.filter(item => {
        const belonging = allBelongingsResult.data?.find(b => b.id === item.id)
        return belonging?.location !== 'carry'
      })

      // Add generic carry items to carryItems
      setCarryItems([...carry, ...genericInCarry])
      setVaultItems(genericInVault)

      // Auto-expand first bank
      if (connectionsData.length > 0 && expandedBanks.size === 0) {
        setExpandedBanks(new Set([connectionsData[0].id]))
      }
    } catch (error) {
      console.error('Error loading vault data:', error)
    }

    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleBankExpanded = (connectionId: string) => {
    setExpandedBanks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId)
      } else {
        newSet.add(connectionId)
      }
      return newSet
    })
  }

  const handleAddCard = async () => {
    if (!user?.id || !selectedConnectionId || !cardForm.nickname.trim()) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({
          user_id: user.id,
          connection_id: selectedConnectionId,
          nickname: cardForm.nickname.trim(),
          last_four: cardForm.lastFour.trim() || null,
          bank_id: 'other', // Default, can be enhanced later
          credit_limit: 0,
          current_balance: 0,
          due_date: 1,
          statement_date: 1,
          apr: 0,
          is_revolving: false,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding card:', error)
        alert(`Failed to add card: ${error.message}`)
      } else if (data) {
        console.log('Card added:', data)
        // Add to local state
        setManualCards(prev => [...prev, {
          id: data.id,
          nickname: data.nickname,
          lastFour: data.last_four || '',
          connectionId: data.connection_id,
          inCarry: false,
          isLocked: false,
        }])
        setShowAddCardModal(false)
        setCardForm({ nickname: '', lastFour: '' })
        setSelectedConnectionId(null)
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setSaving(false)
  }

  const handleAddToCarry = async (type: 'manual' | 'plaid', sourceId: string, name: string, details: string, connectionId: string) => {
    if (!user?.id) return

    try {
      const conn = connections.find(c => c.id === connectionId)
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        type: 'card',
        name,
        details,
        color: conn?.primary_color || '#6366f1',
        location: 'carry',
      }

      if (type === 'manual') {
        insertData.credit_card_id = sourceId
      } else {
        insertData.linked_account_id = sourceId
        insertData.connection_id = connectionId
      }

      const { data, error } = await supabase
        .from('belongings')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error adding to carry:', error)
        alert(`Failed: ${error.message}`)
        return
      }

      // Update local state
      if (type === 'manual') {
        setManualCards(prev => prev.map(c =>
          c.id === sourceId ? { ...c, inCarry: true } : c
        ))
        setCarryItems(prev => [...prev, {
          id: data.id,
          type: 'manual',
          name,
          details,
          color: conn?.primary_color || '#6366f1',
          balance: null,
          sourceId,
          connectionId,
        }])
      } else {
        const acc = accounts.find(a => a.id === sourceId)
        setCarryItems(prev => [...prev, {
          id: data.id,
          type: 'plaid',
          name,
          details,
          color: conn?.primary_color || '#6366f1',
          balance: acc?.balance_current ?? null,
          sourceId,
          connectionId,
        }])
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleRemoveFromCarry = async (carryItem: CarryItem) => {
    try {
      const { error } = await supabase
        .from('belongings')
        .update({ location: 'vault' })
        .eq('id', carryItem.id)

      if (error) {
        console.error('Error removing from carry:', error)
        return
      }

      // Update local state
      setCarryItems(prev => prev.filter(c => c.id !== carryItem.id))
      if (carryItem.type === 'manual') {
        setManualCards(prev => prev.map(c =>
          c.id === carryItem.sourceId ? { ...c, inCarry: false } : c
        ))
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handlePlaidSuccess = (connection: BankConnection) => {
    setConnections(prev => {
      const existing = prev.findIndex(c => c.institution_id === connection.institution_id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = connection
        return updated
      }
      return [...prev, connection]
    })
    setExpandedBanks(prev => new Set(prev).add(connection.id))
    setShowPlaidModal(false)
    loadData()
  }

  const handleOpenCardDetail = (card: ManualCard) => {
    setSelectedCard(card)
    setEditForm({
      nickname: card.nickname,
      lastFour: card.lastFour,
      isLocked: card.isLocked,
    })
    setShowCardDetailModal(true)
  }

  const handleUpdateCard = async () => {
    if (!selectedCard || !editForm.nickname.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('credit_cards')
        .update({
          nickname: editForm.nickname.trim(),
          last_four: editForm.lastFour.trim() || null,
          is_locked: editForm.isLocked,
        })
        .eq('id', selectedCard.id)

      if (error) {
        console.error('Error updating card:', error)
        alert(`Failed to update card: ${error.message}`)
      } else {
        // Update local state
        setManualCards(prev => prev.map(c =>
          c.id === selectedCard.id
            ? { ...c, nickname: editForm.nickname.trim(), lastFour: editForm.lastFour.trim(), isLocked: editForm.isLocked }
            : c
        ))
        // Also update carry items if this card is in carry
        setCarryItems(prev => prev.map(item =>
          item.type === 'manual' && item.sourceId === selectedCard.id
            ? { ...item, name: editForm.nickname.trim(), details: editForm.lastFour ? `•••• ${editForm.lastFour}` : 'Credit Card' }
            : item
        ))
        setShowCardDetailModal(false)
        setSelectedCard(null)
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setSaving(false)
  }

  const handleToggleLock = async () => {
    if (!selectedCard) return

    const newLockState = !editForm.isLocked
    setEditForm(prev => ({ ...prev, isLocked: newLockState }))

    try {
      const { error } = await supabase
        .from('credit_cards')
        .update({ is_locked: newLockState })
        .eq('id', selectedCard.id)

      if (error) {
        console.error('Error toggling lock:', error)
        setEditForm(prev => ({ ...prev, isLocked: !newLockState })) // Revert on error
      } else {
        setManualCards(prev => prev.map(c =>
          c.id === selectedCard.id ? { ...c, isLocked: newLockState } : c
        ))
      }
    } catch (err) {
      console.error('Error:', err)
      setEditForm(prev => ({ ...prev, isLocked: !newLockState }))
    }
  }

  const handleAddItem = async (location: 'carry' | 'vault') => {
    if (!user?.id || !itemForm.name.trim()) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('belongings')
        .insert({
          user_id: user.id,
          type: 'item',
          name: itemForm.name.trim(),
          details: itemForm.details.trim() || null,
          color: '#6366f1',
          location,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding item:', error)
        alert(`Failed to add item: ${error.message}`)
      } else if (data) {
        const newItem: CarryItem = {
          id: data.id,
          type: 'manual',
          name: data.name,
          details: data.details || '',
          color: data.color,
          balance: null,
          sourceId: data.id,
          connectionId: '',
        }

        if (location === 'carry') {
          setCarryItems(prev => [...prev, newItem])
        } else {
          setVaultItems(prev => [...prev, newItem])
        }

        setShowAddItemModal(false)
        setItemForm({ name: '', details: '' })
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setSaving(false)
  }

  const handleMoveItemToCarry = async (item: CarryItem) => {
    try {
      const { error } = await supabase
        .from('belongings')
        .update({ location: 'carry' })
        .eq('id', item.id)

      if (error) {
        console.error('Error moving to carry:', error)
        return
      }

      setVaultItems(prev => prev.filter(i => i.id !== item.id))
      setCarryItems(prev => [...prev, item])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleMoveItemToVault = async (item: CarryItem) => {
    // Check if it's a generic item (no connectionId) - those go back to vault items
    // Card items just get removed from carry
    if (!item.connectionId) {
      try {
        const { error } = await supabase
          .from('belongings')
          .update({ location: 'vault' })
          .eq('id', item.id)

        if (error) {
          console.error('Error moving to vault:', error)
          return
        }

        setCarryItems(prev => prev.filter(i => i.id !== item.id))
        setVaultItems(prev => [...prev, item])
      } catch (err) {
        console.error('Error:', err)
      }
    } else {
      // For card items, just call the existing handler
      handleRemoveFromCarry(item)
    }
  }

  const handleOpenItemDetail = (item: CarryItem) => {
    // Only open for generic items (not cards)
    if (item.connectionId) return // Skip card items
    setSelectedItem(item)
    setItemEditForm({
      name: item.name,
      details: item.details,
    })
    setShowItemDetailModal(true)
  }

  const handleUpdateItem = async () => {
    if (!selectedItem || !itemEditForm.name.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('belongings')
        .update({
          name: itemEditForm.name.trim(),
          details: itemEditForm.details.trim() || null,
        })
        .eq('id', selectedItem.id)

      if (error) {
        console.error('Error updating item:', error)
        alert(`Failed to update item: ${error.message}`)
      } else {
        // Update local state
        const updatedItem = {
          ...selectedItem,
          name: itemEditForm.name.trim(),
          details: itemEditForm.details.trim(),
        }
        setCarryItems(prev => prev.map(i =>
          i.id === selectedItem.id ? updatedItem : i
        ))
        setVaultItems(prev => prev.map(i =>
          i.id === selectedItem.id ? updatedItem : i
        ))
        setShowItemDetailModal(false)
        setSelectedItem(null)
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setSaving(false)
  }

  const handleDeleteItem = async () => {
    if (!selectedItem) return

    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('belongings')
        .delete()
        .eq('id', selectedItem.id)

      if (error) {
        console.error('Error deleting item:', error)
        alert(`Failed to delete item: ${error.message}`)
      } else {
        setCarryItems(prev => prev.filter(i => i.id !== selectedItem.id))
        setVaultItems(prev => prev.filter(i => i.id !== selectedItem.id))
        setShowItemDetailModal(false)
        setSelectedItem(null)
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  // Group accounts by connection
  const getAccountsForConnection = (connectionId: string) => {
    return accounts.filter(a => a.connection_id === connectionId)
  }

  // Get manual cards for a connection
  const getCardsForConnection = (connectionId: string) => {
    return manualCards.filter(c => c.connectionId === connectionId)
  }

  // Check if item is in carry
  const isInCarry = (type: 'manual' | 'plaid', sourceId: string) => {
    return carryItems.some(c => c.type === type && c.sourceId === sourceId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-vault-accent border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-vault-silver-dark">Loading your vault...</p>
        </div>
      </div>
    )
  }

  const totalCards = manualCards.length

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-vault-black/95 backdrop-blur-lg border-b border-vault-silver/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
              THE VAULT
            </h1>
            <p className="text-xs text-vault-silver-dark">
              {connections.length} bank{connections.length !== 1 ? 's' : ''} connected • {totalCards} card{totalCards !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowPlaidModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #71717a 0%, #52525b 50%, #3f3f46 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect Bank
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* CARRY Section */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, rgba(157, 140, 255, 0.15) 0%, rgba(123, 104, 238, 0.15) 100%)',
            border: '1px solid rgba(157, 140, 255, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">👜</span>
              <h2 className="text-sm font-bold text-vault-accent-light" style={{ fontFamily: 'var(--font-pixel)' }}>
                CARRY
              </h2>
              <span className="text-xs text-vault-accent">({carryItems.length})</span>
            </div>
            <button
              onClick={() => setShowAddItemModal(true)}
              className="text-xs text-vault-accent hover:text-vault-accent-light transition-colors"
            >
              + Add Item
            </button>
          </div>

          {carryItems.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl border-vault-accent/30">
              <p className="text-vault-accent/70 text-sm">
                Drag cards here when going out
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {carryItems.map(item => {
                const isGenericItem = !item.connectionId
                return (
                  <div
                    key={item.id}
                    className={`bg-vault-purple/50 rounded-xl p-3 border border-vault-accent/30 group relative ${
                      isGenericItem ? 'cursor-pointer hover:bg-vault-purple/70' : ''
                    }`}
                    onClick={() => isGenericItem && handleOpenItemDetail(item)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMoveItemToVault(item)
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-vault-black border border-vault-silver/20 rounded-full flex items-center justify-center text-vault-silver-dark hover:text-vault-error hover:border-vault-error/50 opacity-0 group-hover:opacity-100 transition-all text-xs"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                      {isGenericItem ? (
                        <span className="text-lg">📦</span>
                      ) : (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span className="text-white text-sm font-medium truncate flex-1">{item.name}</span>
                      {isGenericItem && (
                        <svg className="w-4 h-4 text-vault-silver-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                    {item.details && (
                      <p className="text-xs text-vault-accent-light truncate">{item.details}</p>
                    )}
                    {item.balance !== null && (
                      <p className="text-xs text-vault-success font-medium mt-1">
                        ${item.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* YOUR BANKS Section */}
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🏦</span>
            <h2 className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
              YOUR BANKS
            </h2>
          </div>

          {connections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-vault-silver-dark text-sm mb-2">No banks connected yet</p>
              <button
                onClick={() => setShowPlaidModal(true)}
                className="text-vault-accent text-sm hover:underline"
              >
                Connect your first bank →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map(conn => {
                const isExpanded = expandedBanks.has(conn.id)
                const connAccounts = getAccountsForConnection(conn.id)
                const connCards = getCardsForConnection(conn.id)
                const depositoryAccounts = connAccounts.filter(a => a.type === 'depository')
                const totalBalance = depositoryAccounts.reduce((sum, a) => sum + (a.balance_current || 0), 0)

                return (
                  <div key={conn.id} className="bg-vault-black/50 rounded-xl overflow-hidden">
                    {/* Bank Header */}
                    <button
                      onClick={() => toggleBankExpanded(conn.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-vault-purple/20 transition-colors"
                    >
                      {conn.logo_url ? (
                        <img src={conn.logo_url} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                          style={{ backgroundColor: conn.primary_color || '#6366f1' }}
                        >
                          {conn.institution_name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium">{conn.institution_name}</p>
                        <p className="text-vault-silver-dark text-xs">
                          {connAccounts.length} account{connAccounts.length !== 1 ? 's' : ''} • {connCards.length} card{connCards.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right mr-2">
                        <p className="text-white font-bold">
                          ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-vault-silver-dark text-xs">Total</p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-vault-silver-dark transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-vault-silver/10 p-3 space-y-4">
                        {/* YOUR CARDS Section */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-vault-accent uppercase">Your Cards</h3>
                            <button
                              onClick={() => {
                                setSelectedConnectionId(conn.id)
                                setShowAddCardModal(true)
                              }}
                              className="text-vault-accent text-xs hover:text-vault-accent-light transition-colors"
                            >
                              + Add Card
                            </button>
                          </div>

                          {connCards.length === 0 ? (
                            <p className="text-vault-silver-dark text-xs py-2">No cards added yet</p>
                          ) : (
                            <div className="space-y-2">
                              {connCards.map(card => {
                                const inCarry = isInCarry('manual', card.id)
                                return (
                                  <div
                                    key={card.id}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                                      inCarry
                                        ? 'bg-vault-accent/20 border border-vault-accent/30'
                                        : 'bg-vault-purple/20 hover:bg-vault-purple/30'
                                    } ${card.isLocked ? 'opacity-60' : ''}`}
                                    onClick={() => handleOpenCardDetail(card)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{card.isLocked ? '🔒' : '💳'}</span>
                                      <div>
                                        <p className="text-white text-sm flex items-center gap-1">
                                          {card.nickname}
                                          {card.isLocked && <span className="text-xs text-red-400">(Locked)</span>}
                                        </p>
                                        {card.lastFour && (
                                          <p className="text-vault-silver-dark text-xs">•••• {card.lastFour}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {inCarry ? (
                                        <span className="text-xs text-vault-accent px-2 py-1 bg-vault-accent/10 rounded">
                                          In Carry
                                        </span>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleAddToCarry(
                                              'manual',
                                              card.id,
                                              card.nickname,
                                              card.lastFour ? `•••• ${card.lastFour}` : 'Credit Card',
                                              conn.id
                                            )
                                          }}
                                          className="text-xs text-vault-accent hover:text-vault-accent-light transition-colors"
                                        >
                                          + Carry
                                        </button>
                                      )}
                                      <svg className="w-4 h-4 text-vault-silver-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Checking & Savings Section */}
                        {depositoryAccounts.length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                              <span>🏦</span> Checking & Savings ({depositoryAccounts.length})
                            </h3>
                            <div className="space-y-2">
                              {depositoryAccounts.map(acc => {
                                const inCarry = isInCarry('plaid', acc.id)
                                return (
                                  <div
                                    key={acc.id}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                                      inCarry
                                        ? 'bg-vault-accent/20 border border-vault-accent/30'
                                        : 'bg-vault-purple/20 hover:bg-vault-purple/30'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">
                                        {acc.subtype === 'checking' ? '💳' : '🏦'}
                                      </span>
                                      <div>
                                        <p className="text-white text-sm">{acc.name}</p>
                                        <p className="text-vault-silver-dark text-xs">
                                          {acc.subtype ? acc.subtype.charAt(0).toUpperCase() + acc.subtype.slice(1) : 'Account'}
                                          {acc.mask && ` •••• ${acc.mask}`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <p className="text-white text-sm font-medium">
                                          ${(acc.balance_current || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                        {acc.balance_available !== null && acc.balance_available !== acc.balance_current && (
                                          <p className="text-vault-silver-dark text-xs">
                                            ${acc.balance_available.toLocaleString('en-US', { minimumFractionDigits: 2 })} avail
                                          </p>
                                        )}
                                      </div>
                                      {inCarry ? (
                                        <span className="text-xs text-vault-accent px-2 py-1 bg-vault-accent/10 rounded">
                                          In Carry
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleAddToCarry(
                                            'plaid',
                                            acc.id,
                                            `${conn.institution_name} ${acc.subtype === 'checking' ? 'Debit' : 'Card'}`,
                                            acc.mask ? `•••• ${acc.mask}` : acc.subtype || '',
                                            conn.id
                                          )}
                                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                          + Card
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* VAULT ITEMS Section */}
        {vaultItems.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <h2 className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
                  STORED ITEMS
                </h2>
                <span className="text-xs text-vault-silver-dark">({vaultItems.length})</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {vaultItems.map(item => (
                <div
                  key={item.id}
                  className="bg-vault-purple/20 rounded-xl p-3 border border-vault-silver/10 group relative hover:bg-vault-purple/30 transition-colors cursor-pointer"
                  onClick={() => handleOpenItemDetail(item)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📦</span>
                    <span className="text-white text-sm font-medium truncate flex-1">{item.name}</span>
                    <svg className="w-4 h-4 text-vault-silver-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {item.details && (
                    <p className="text-xs text-vault-silver-dark truncate">{item.details}</p>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveItemToCarry(item)
                    }}
                    className="mt-2 text-xs text-vault-accent hover:text-vault-accent-light transition-colors"
                  >
                    + Move to Carry
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plaid Link Modal */}
      <PlaidLinkModal
        isOpen={showPlaidModal}
        onClose={() => setShowPlaidModal(false)}
        onSuccess={handlePlaidSuccess}
      />

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-6 w-full max-w-md"
            style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
          >
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              ADD CARD
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-vault-silver-dark mb-1">Card Nickname *</label>
                <input
                  type="text"
                  value={cardForm.nickname}
                  onChange={(e) => setCardForm({ ...cardForm, nickname: e.target.value })}
                  placeholder="e.g., Platinum Rewards"
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white focus:outline-none focus:border-vault-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-vault-silver-dark mb-1">Last 4 Digits (optional)</label>
                <input
                  type="text"
                  value={cardForm.lastFour}
                  onChange={(e) => setCardForm({ ...cardForm, lastFour: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white focus:outline-none focus:border-vault-accent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddCardModal(false)
                  setCardForm({ nickname: '', lastFour: '' })
                  setSelectedConnectionId(null)
                }}
                className="flex-1 px-4 py-3 border border-vault-silver/20 text-vault-silver-dark rounded-lg hover:border-vault-accent hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
                disabled={!cardForm.nickname.trim() || saving}
                className="flex-1 px-4 py-3 text-white font-bold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
              >
                {saving ? 'Adding...' : 'Add Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      {showCardDetailModal && selectedCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-6 w-full max-w-md"
            style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
                CARD DETAILS
              </h3>
              <button
                onClick={() => {
                  setShowCardDetailModal(false)
                  setSelectedCard(null)
                }}
                className="text-vault-silver-dark hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Issuing Bank */}
            <div className="mb-6">
              <label className="block text-xs text-vault-silver-dark mb-2">Issuing Bank</label>
              <div className="flex items-center gap-3 p-3 bg-vault-black/50 rounded-lg border border-vault-silver/10">
                {(() => {
                  const conn = connections.find(c => c.id === selectedCard.connectionId)
                  return conn ? (
                    <>
                      {conn.logo_url ? (
                        <img src={conn.logo_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: conn.primary_color || '#6366f1' }}
                        >
                          {conn.institution_name.charAt(0)}
                        </div>
                      )}
                      <span className="text-white font-medium">{conn.institution_name}</span>
                    </>
                  ) : (
                    <span className="text-vault-silver-dark">Unknown Bank</span>
                  )
                })()}
              </div>
            </div>

            {/* Lock Toggle */}
            <div className="mb-6">
              <button
                onClick={handleToggleLock}
                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                  editForm.isLocked
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-vault-success/10 border-vault-success/30 text-vault-success'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{editForm.isLocked ? '🔒' : '🔓'}</span>
                  <div className="text-left">
                    <p className="font-medium">{editForm.isLocked ? 'Card Locked' : 'Card Unlocked'}</p>
                    <p className="text-xs opacity-70">
                      {editForm.isLocked ? 'This card is marked as locked' : 'Tap to lock this card'}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${
                  editForm.isLocked ? 'bg-red-500' : 'bg-vault-success'
                }`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    editForm.isLocked ? 'right-1' : 'left-1'
                  }`} />
                </div>
              </button>
            </div>

            {/* Edit Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-vault-silver-dark mb-1">Card Nickname</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  placeholder="e.g., Platinum Rewards"
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white focus:outline-none focus:border-vault-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-vault-silver-dark mb-1">Last 4 Digits</label>
                <input
                  type="text"
                  value={editForm.lastFour}
                  onChange={(e) => setEditForm({ ...editForm, lastFour: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white focus:outline-none focus:border-vault-accent"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleUpdateCard}
              disabled={!editForm.nickname.trim() || saving}
              className="w-full px-4 py-3 text-white font-bold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {showItemDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-6 w-full max-w-md"
            style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
                ITEM DETAILS
              </h3>
              <button
                onClick={() => {
                  setShowItemDetailModal(false)
                  setSelectedItem(null)
                }}
                className="text-vault-silver-dark hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Item Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-vault-purple/30 flex items-center justify-center">
                <span className="text-4xl">📦</span>
              </div>
            </div>

            {/* Edit Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-vault-silver-dark mb-1">Item Name</label>
                <input
                  type="text"
                  value={itemEditForm.name}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, name: e.target.value })}
                  placeholder="e.g., Wallet, Keys"
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white focus:outline-none focus:border-vault-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-vault-silver-dark mb-1">Details</label>
                <input
                  type="text"
                  value={itemEditForm.details}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, details: e.target.value })}
                  placeholder="e.g., Brown leather, Work badge"
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white focus:outline-none focus:border-vault-accent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleUpdateItem}
                disabled={!itemEditForm.name.trim() || saving}
                className="w-full px-4 py-3 text-white font-bold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                onClick={handleDeleteItem}
                className="w-full px-4 py-3 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-6 w-full max-w-md"
            style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
          >
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-pixel)' }}>
              ADD ITEM
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-vault-silver-dark mb-1">Item Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g., Wallet, Keys, ID Badge"
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white focus:outline-none focus:border-vault-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-vault-silver-dark mb-1">Details (optional)</label>
                <input
                  type="text"
                  value={itemForm.details}
                  onChange={(e) => setItemForm({ ...itemForm, details: e.target.value })}
                  placeholder="e.g., Brown leather, Work badge"
                  className="w-full px-4 py-3 bg-vault-black border border-vault-silver/20 rounded-lg text-white focus:outline-none focus:border-vault-accent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddItemModal(false)
                  setItemForm({ name: '', details: '' })
                }}
                className="flex-1 px-4 py-3 border border-vault-silver/20 text-vault-silver-dark rounded-lg hover:border-vault-accent hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddItem('carry')}
                disabled={!itemForm.name.trim() || saving}
                className="flex-1 px-4 py-3 text-white font-bold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #9d8cff 0%, #7b68ee 100%)' }}
              >
                {saving ? 'Adding...' : 'Add to Carry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
