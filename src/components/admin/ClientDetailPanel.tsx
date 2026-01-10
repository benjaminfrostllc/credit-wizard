import { useState, useEffect, useCallback } from 'react'
import {
  getClientFullDetails,
  updateClientProfile,
  updateClientNotes,
  deactivateClient,
  reactivateClient,
  getFileUrl,
  type ClientFullDetails,
  type PlanType,
} from '../../lib/supabase'

interface ClientDetailPanelProps {
  clientId: string | null
  onClose: () => void
  onUpdate: () => void
  onSendNotification: (clientId: string) => void
}

const sectionLabels: Record<string, string> = {
  foundry: 'The Foundry',
  identity: 'Identity',
  treasury: 'The Treasury',
  credit_core: 'Credit Core',
  control: 'Control',
  command: 'Command',
  the_vault: 'The Vault',
}

export function ClientDetailPanel({
  clientId,
  onClose,
  onUpdate,
  onSendNotification,
}: ClientDetailPanelProps) {
  const [client, setClient] = useState<ClientFullDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'activity' | 'notes'>(
    'overview'
  )
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    full_name: '',
    phone: '',
    plan_type: 'basic' as PlanType,
  })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const loadClient = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    const data = await getClientFullDetails(clientId)
    setClient(data)
    if (data) {
      setEditData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        plan_type: data.plan_type || 'basic',
      })
      setNotes(data.notes || '')
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    if (clientId) {
      loadClient()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const handleSave = async () => {
    if (!clientId) return
    setSaving(true)
    await updateClientProfile(clientId, editData)
    setEditMode(false)
    await loadClient()
    onUpdate()
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    if (!clientId) return
    setSaving(true)
    await updateClientNotes(clientId, notes)
    await loadClient()
    setSaving(false)
  }

  const handleToggleStatus = async () => {
    if (!clientId || !client) return
    setSaving(true)
    if (client.is_active !== false) {
      await deactivateClient(clientId)
    } else {
      await reactivateClient(clientId)
    }
    await loadClient()
    onUpdate()
    setSaving(false)
  }

  const openFile = async (filePath: string) => {
    const url = await getFileUrl(filePath)
    if (url) {
      window.open(url, '_blank')
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return formatDate(dateStr)
  }

  if (!clientId) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-wizard-dark border-2 border-wizard-indigo rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-wizard-indigo/30 flex items-start justify-between">
          <div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-6 w-48 bg-wizard-purple rounded mb-2"></div>
                <div className="h-4 w-32 bg-wizard-purple rounded"></div>
              </div>
            ) : client ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-wizard-accent flex items-center justify-center text-white text-lg font-bold">
                    {client.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold text-white"
                      style={{ fontFamily: 'var(--font-pixel)' }}
                    >
                      {client.full_name || 'Unnamed Client'}
                    </h2>
                    <p className="text-gray-400 text-sm">{client.email}</p>
                  </div>
                  <span
                    className={`ml-4 px-2 py-1 rounded text-xs font-medium ${
                      client.is_active !== false
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-zinc-700/50 text-zinc-400'
                    }`}
                  >
                    {client.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-wizard-purple text-wizard-glow capitalize">
                    {client.plan_type || 'Basic'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>ID: {client.client_id || 'N/A'}</span>
                  <span>Joined: {formatDate(client.created_at)}</span>
                  <span>Last Login: {formatDate(client.last_login)}</span>
                </div>
              </>
            ) : (
              <p className="text-zinc-400">Client not found</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-wizard-indigo/30">
          {(['overview', 'documents', 'activity', 'notes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-wizard-accent border-b-2 border-wizard-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin text-wizard-accent text-2xl">⟳</div>
            </div>
          ) : client ? (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Progress Overview */}
                  <div className="bg-wizard-purple/30 rounded-xl p-4 border border-wizard-indigo/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-bold">Overall Progress</h3>
                      <span className="text-2xl font-bold text-wizard-accent">
                        {client.overallProgress}%
                      </span>
                    </div>
                    <div className="h-3 bg-wizard-dark rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          client.overallProgress >= 75
                            ? 'bg-green-500'
                            : client.overallProgress >= 50
                              ? 'bg-gold'
                              : 'bg-wizard-accent'
                        }`}
                        style={{ width: `${client.overallProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {client.completedTasks} of {client.totalTasks} tasks completed
                    </p>
                  </div>

                  {/* Section Progress */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {client.progressBySection.map((section) => (
                      <div
                        key={section.section}
                        className="bg-wizard-purple/20 rounded-lg p-3 border border-wizard-indigo/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white">
                            {sectionLabels[section.section] || section.section}
                          </span>
                          <span className="text-xs text-gray-400">
                            {section.completed_tasks}/{section.total_tasks}
                          </span>
                        </div>
                        <div className="h-2 bg-wizard-dark rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              section.progress_percent >= 75
                                ? 'bg-green-500'
                                : section.progress_percent >= 50
                                  ? 'bg-gold'
                                  : 'bg-wizard-accent'
                            }`}
                            style={{ width: `${section.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Profile Edit */}
                  <div className="bg-wizard-purple/30 rounded-xl p-4 border border-wizard-indigo/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-bold">Profile Details</h3>
                      <button
                        onClick={() => setEditMode(!editMode)}
                        className="text-sm text-wizard-accent hover:text-wizard-glow"
                      >
                        {editMode ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    {editMode ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={editData.full_name}
                            onChange={(e) =>
                              setEditData({ ...editData, full_name: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-wizard-dark border border-wizard-indigo rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            className="w-full px-3 py-2 bg-wizard-dark border border-wizard-indigo rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Plan Type</label>
                          <select
                            value={editData.plan_type}
                            onChange={(e) =>
                              setEditData({ ...editData, plan_type: e.target.value as PlanType })
                            }
                            className="w-full px-3 py-2 bg-wizard-dark border border-wizard-indigo rounded text-white text-sm"
                          >
                            <option value="basic">Basic</option>
                            <option value="premium">Premium</option>
                            <option value="vip">VIP</option>
                          </select>
                        </div>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Phone:</span>
                          <span className="text-white ml-2">{client.phone || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Plan:</span>
                          <span className="text-white ml-2 capitalize">
                            {client.plan_type || 'Basic'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => onSendNotification(clientId)}
                      className="flex-1 px-4 py-2 bg-wizard-accent text-white rounded-lg hover:bg-wizard-glow transition-colors"
                    >
                      Send Notification
                    </button>
                    <button
                      onClick={handleToggleStatus}
                      disabled={saving}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        client.is_active !== false
                          ? 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-green-900/50 text-green-400 hover:bg-green-900'
                      }`}
                    >
                      {client.is_active !== false ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-3">
                  {client.recentDocuments.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No documents uploaded yet.</p>
                  ) : (
                    client.recentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-wizard-purple/30 rounded-lg border border-wizard-indigo/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {doc.file_type?.includes('image') ? '🖼️' : '📄'}
                          </span>
                          <div>
                            <p className="text-white text-sm">{doc.file_name}</p>
                            <p className="text-xs text-gray-400">
                              {(doc.file_size / 1024).toFixed(1)} KB •{' '}
                              {formatDate(doc.uploaded_at)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => openFile(doc.file_path)}
                          className="text-wizard-accent hover:text-wizard-glow text-sm"
                        >
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {client.recentActivity.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No activity recorded yet.</p>
                  ) : (
                    client.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 bg-wizard-purple/20 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-wizard-indigo flex items-center justify-center text-sm">
                          {activity.action.includes('complete') ? '✅' : '📝'}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{activity.action}</p>
                          <p className="text-xs text-gray-400">
                            {formatRelativeTime(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    Private notes visible only to administrators.
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this client..."
                    className="w-full h-64 px-4 py-3 bg-wizard-purple border-2 border-wizard-indigo rounded-lg text-white focus:outline-none focus:border-wizard-accent resize-none"
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={saving || notes === client.notes}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-zinc-400 text-center py-8">Failed to load client details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
