import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ProgressBar } from '../components/ProgressBar'
import { SectionInfoButton } from '../components/SectionInfoButton'
import { SectionSurvey } from '../components/SectionSurvey'
import { uploadFile, getFilesByUser, getFileUrl, deleteFile, getBankAccounts, getBankConnections, type UploadedFile, type BankAccount, type BankConnection } from '../lib/supabase'

interface DocumentTask {
  id: string
  title: string
  description: string
  acceptedTypes: string
  maxSize: number
  required: boolean
}

const documentTasks: DocumentTask[] = [
  {
    id: 'vault_id',
    title: 'Government-Issued ID',
    description: 'Upload a clear photo of your ID (front and back). Accepted: Driver\'s license, State ID, or Passport.',
    acceptedTypes: 'image/*,.pdf',
    maxSize: 10,
    required: true,
  },
  {
    id: 'vault_ssn',
    title: 'Social Security Card',
    description: 'Upload your Social Security card. This is required for identity verification.',
    acceptedTypes: 'image/*,.pdf',
    maxSize: 10,
    required: true,
  },
  {
    id: 'vault_address',
    title: 'Proof of Address',
    description: 'Upload a utility bill or bank statement dated within the last 60 days showing your current address.',
    acceptedTypes: 'image/*,.pdf',
    maxSize: 10,
    required: true,
  },
]

export default function TheVault() {
  const { user, theVault, toggleTask, refreshTasks } = useApp()
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSurvey, setShowSurvey] = useState(false)
  const [investmentAccounts, setInvestmentAccounts] = useState<BankAccount[]>([])
  const [plaidConnections, setPlaidConnections] = useState<BankConnection[]>([])
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set())
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const loadData = async () => {
      // Load files and Plaid data in parallel
      const [files, accounts, connections] = await Promise.all([
        getFilesByUser(user.id),
        getBankAccounts(user.id),
        getBankConnections(user.id),
      ])

      if (cancelled) return

      // Group files by task
      const grouped: Record<string, UploadedFile[]> = {}
      files.forEach((file) => {
        if (!grouped[file.task_id]) grouped[file.task_id] = []
        grouped[file.task_id].push(file)
      })
      setUploadedFiles(grouped)

      // Filter to investment accounts only
      const investments = accounts.filter(a => a.type === 'investment')
      setInvestmentAccounts(investments)
      setPlaidConnections(connections)
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [user])

  const toggleConnectionExpanded = (connectionId: string) => {
    setExpandedConnections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId)
      } else {
        newSet.add(connectionId)
      }
      return newSet
    })
  }

  // Group investment accounts by connection
  const accountsByConnection = plaidConnections
    .filter(conn => investmentAccounts.some(acc => acc.connection_id === conn.id))
    .map(conn => ({
      connection: conn,
      accounts: investmentAccounts.filter(acc => acc.connection_id === conn.id),
    }))

  const handleFileSelect = async (taskId: string, file: File) => {
    if (!user) return

    const task = documentTasks.find((t) => t.id === taskId)
    if (!task) return

    if (file.size > task.maxSize * 1024 * 1024) {
      setError(`File too large. Maximum size is ${task.maxSize}MB.`)
      return
    }

    setError(null)
    setUploading(taskId)

    const result = await uploadFile(file, user.id, taskId)

    if (result.success && result.data) {
      setUploadedFiles((prev) => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), result.data!],
      }))

      const taskState = theVault.find((t) => t.id === taskId)
      if (taskState && !taskState.completed) {
        toggleTask('theVault', taskId)
      }
    } else {
      setError(result.error || 'Upload failed')
    }

    setUploading(null)
  }

  const handleDelete = async (taskId: string, file: UploadedFile) => {
    const success = await deleteFile(file.id, file.file_path)
    if (success) {
      setUploadedFiles((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter((f) => f.id !== file.id),
      }))

      const remaining = (uploadedFiles[taskId] || []).filter((f) => f.id !== file.id)
      if (remaining.length === 0) {
        const taskState = theVault.find((t) => t.id === taskId)
        if (taskState?.completed) {
          toggleTask('theVault', taskId)
        }
      }
    }
  }

  const handleViewFile = async (file: UploadedFile) => {
    const url = await getFileUrl(file.file_path)
    if (url) {
      window.open(url, '_blank')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const completedCount = Object.keys(uploadedFiles).filter((k) => uploadedFiles[k]?.length > 0).length
  const progress = (completedCount / documentTasks.length) * 100

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-wizard-accent hover:text-wizard-glow transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-wizard-purple/30 rounded-2xl border-2 border-wizard-indigo/30 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔐</span>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1
                  className="text-xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  THE VAULT
                </h1>
                <SectionInfoButton onClick={() => setShowSurvey(true)} />
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {completedCount} of {documentTasks.length} documents uploaded
              </p>
            </div>
          </div>
          <ProgressBar progress={progress} />
        </div>

        {/* Plaid Investment Accounts */}
        {accountsByConnection.length > 0 && (
          <div className="bg-wizard-purple/30 rounded-2xl border-2 border-green-500/30 p-4 mb-6">
            <h3 className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              INVESTMENT ACCOUNTS (VIA PLAID)
            </h3>
            <div className="space-y-2">
              {accountsByConnection.map(({ connection, accounts }) => {
                const isExpanded = expandedConnections.has(connection.id)
                const hasAccounts = accounts.length > 0

                return (
                  <div key={connection.id} className="bg-wizard-dark/50 rounded-lg overflow-hidden">
                    {/* Connection Header - Clickable */}
                    <button
                      onClick={() => toggleConnectionExpanded(connection.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-wizard-purple/20 transition-colors"
                    >
                      {connection.logo_url ? (
                        <img src={connection.logo_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: connection.primary_color || '#6366f1' }}
                        >
                          📈
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-white text-sm font-medium">{connection.institution_name}</p>
                        <p className="text-gray-500 text-xs">
                          {accounts.length} investment account{accounts.length !== 1 ? 's' : ''} linked
                        </p>
                      </div>
                      <span className="text-green-400 text-xs px-2 py-1 bg-green-500/10 rounded">Connected</span>
                      {/* Expand/Collapse Arrow */}
                      {hasAccounts && (
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>

                    {/* Accounts List (expandable) */}
                    {isExpanded && hasAccounts && (
                      <div className="space-y-2 border-t border-wizard-indigo/30 p-3 bg-wizard-purple/10">
                        {accounts.map((acc) => (
                          <div
                            key={acc.id}
                            className="flex items-center justify-between bg-wizard-purple/20 rounded-lg p-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📈</span>
                              <div>
                                <p className="text-white text-sm">{acc.name}</p>
                                <p className="text-gray-500 text-xs">
                                  {acc.subtype ? acc.subtype.charAt(0).toUpperCase() + acc.subtype.slice(1).replace(/_/g, ' ') : 'Investment'}
                                  {acc.mask && ` •••• ${acc.mask}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {acc.balance_current !== null && (
                                <p className="text-white text-sm font-medium">
                                  ${acc.balance_current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                              )}
                              {acc.balance_available !== null && acc.balance_available !== acc.balance_current && (
                                <p className="text-gray-500 text-xs">
                                  ${acc.balance_available.toLocaleString('en-US', { minimumFractionDigits: 2 })} available
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Investment accounts synced via Plaid. Balances update when you reconnect.
            </p>
          </div>
        )}

        {/* My Documents Section */}
        <div className="bg-wizard-purple/30 rounded-2xl border-2 border-wizard-accent/30 p-4 mb-6">
          <h3 className="text-sm font-bold text-wizard-accent mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            MY DOCUMENTS
            <span className="text-xs text-wizard-accent/70 font-normal">
              ({Object.values(uploadedFiles).flat().length} files)
            </span>
          </h3>
          {Object.values(uploadedFiles).flat().length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-wizard-accent/20 rounded-xl">
              <span className="text-4xl mb-3 block">📁</span>
              <p className="text-gray-400 text-sm">No documents uploaded yet</p>
              <p className="text-gray-500 text-xs mt-1">Upload documents below to see them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(uploadedFiles).map(([taskId, files]) => {
                const task = documentTasks.find(t => t.id === taskId)
                return files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-wizard-dark/50 rounded-lg hover:bg-wizard-purple/20 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-wizard-accent/20 flex items-center justify-center">
                      {file.file_type.includes('pdf') ? (
                        <span className="text-lg">📄</span>
                      ) : file.file_type.includes('image') ? (
                        <span className="text-lg">🖼️</span>
                      ) : (
                        <span className="text-lg">📎</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{task?.title || taskId}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewFile(file)}
                        className="p-2 text-wizard-accent hover:text-wizard-glow hover:bg-wizard-accent/10 rounded-lg transition-colors"
                        title="View file"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(taskId, file)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete file"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              })}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-wizard-dark/50 rounded-xl border-2 border-wizard-indigo/30 p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h3
                className="text-xs text-gold mb-2"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                UPLOAD INSTRUCTIONS
              </h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• <strong className="text-white">Accepted formats:</strong> JPG, PNG, PDF</li>
                <li>• <strong className="text-white">Maximum file size:</strong> 10MB per file</li>
                <li>• <strong className="text-white">Image quality:</strong> Ensure text is clearly readable</li>
                <li>• <strong className="text-white">Privacy:</strong> All documents are encrypted and stored securely</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-amber-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-amber-400/70 text-xs mt-2 hover:text-amber-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Document Tasks */}
        <div className="space-y-4">
          {documentTasks.map((task) => {
            const files = uploadedFiles[task.id] || []
            const isUploading = uploading === task.id

            return (
              <div
                key={task.id}
                className={`rounded-xl border-2 transition-all ${
                  files.length > 0
                    ? 'bg-wizard-indigo/20 border-gold/30'
                    : 'bg-wizard-purple/30 border-wizard-indigo/30'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div
                      className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center ${
                        files.length > 0
                          ? 'bg-gold text-wizard-dark'
                          : 'bg-wizard-indigo/50 text-gray-400'
                      }`}
                    >
                      {files.length > 0 ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      )}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold ${files.length > 0 ? 'text-gold' : 'text-white'}`}>
                          {task.title}
                        </h4>
                        {task.required && (
                          <span className="text-xs text-amber-400">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{task.description}</p>

                      {/* Uploaded Files */}
                      {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center gap-3 p-2 bg-wizard-dark/50 rounded-lg"
                            >
                              <svg className="w-4 h-4 text-wizard-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{file.file_name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                              </div>
                              <button
                                onClick={() => handleViewFile(file)}
                                className="p-1 text-wizard-accent hover:text-wizard-glow transition-colors"
                                title="View file"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(task.id, file)}
                                className="p-1 text-gray-400 hover:text-zinc-300 transition-colors"
                                title="Delete file"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload Button */}
                      <div className="mt-3">
                        <input
                          ref={(el) => { fileInputRefs.current[task.id] = el }}
                          type="file"
                          accept={task.acceptedTypes}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelect(task.id, file)
                            e.target.value = ''
                          }}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRefs.current[task.id]?.click()}
                          disabled={isUploading}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isUploading
                              ? 'bg-wizard-indigo/30 text-gray-500 cursor-not-allowed'
                              : files.length > 0
                              ? 'bg-wizard-indigo/30 text-wizard-accent hover:bg-wizard-indigo/50'
                              : 'bg-wizard-accent text-white hover:bg-wizard-glow'
                          }`}
                        >
                          {isUploading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Uploading...
                            </span>
                          ) : files.length > 0 ? (
                            'Upload Another'
                          ) : (
                            'Upload Document'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-green-500/10 rounded-xl border-2 border-green-500/30">
          <div className="flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <h3
                className="text-xs text-green-400 mb-1"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                SECURITY NOTE
              </h3>
              <p className="text-xs text-gray-400">
                All documents are encrypted in transit and at rest. Files are stored securely in Supabase Storage
                with row-level security. Only you and authorized Credit Wizard team members can access your files.
              </p>
            </div>
          </div>
        </div>
      </div>

      <SectionSurvey
        section="the_vault"
        sectionTitle="The Vault"
        isOpen={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSave={() => refreshTasks('theVault')}
      />
    </div>
  )
}
