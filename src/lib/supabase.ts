import { createClient, type User, type Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'client' | 'admin'
  phone?: string
  plan_type?: 'basic' | 'premium' | 'vip'
  client_id?: string
  notes?: string
  is_active?: boolean
  last_login?: string
  invited_by?: string
  created_at: string
  updated_at: string
}

export type PlanType = 'basic' | 'premium' | 'vip'

export interface ClientWithProgress extends UserProfile {
  progress: number
}

export interface TaskTemplate {
  id: string
  section: string
  title: string
  description: string | null
  tips: string | null
  resources: { label: string; url: string }[]
  order_index: number
  is_active: boolean
  survey_condition: { questionId: string; expectedAnswer: string } | null
  parent_id: string | null
  created_at: string
}

export interface ClientTask {
  id: string
  user_id: string
  task_template_id: string
  completed: boolean
  completed_at: string | null
  comment: string | null
  custom_title: string | null
  custom_description: string | null
  is_hidden: boolean
  created_at: string
  updated_at: string
  // Joined from task_templates
  template?: TaskTemplate
}

export interface SurveyQuestion {
  id: string
  section: string
  question: string
  options: { value: string; label: string }[]
  order_index: number
}

export interface ClientSurvey {
  id: string
  user_id: string
  question_id: string
  answer: string
  created_at: string
}

export interface UploadedFile {
  id: string
  user_id: string
  client_token?: string // Legacy support
  task_id: string
  file_name: string
  file_type: string
  file_size: number
  file_path: string
  uploaded_at: string
}

// ============================================
// AUTH FUNCTIONS
// ============================================

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone?: string,
  planType?: PlanType
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'client',
        phone: phone || null,
        plan_type: planType || 'basic',
      },
    },
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

export async function resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  console.log('[Supabase] Sending password reset to:', email)

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    })

    console.log('[Supabase] Reset password result:', error ? error.message : 'Success')

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (e) {
    console.error('[Supabase] Reset password exception:', e)
    return { success: false, error: 'Failed to send reset email' }
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: string | null }> {
  console.log('[Supabase] Attempting signIn for:', email)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('[Supabase] signIn response:', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      error: error?.message,
      errorCode: error?.status
    })

    if (error) {
      return { user: null, session: null, error: error.message }
    }

    return { user: data.user, session: data.session, error: null }
  } catch (e) {
    console.error('[Supabase] signIn exception:', e)
    return { user: null, session: null, error: 'Network error - please try again' }
  }
}

// Sign in using a refresh token (for trusted devices)
export async function signInWithRefreshToken(
  refreshToken: string
): Promise<{ user: User | null; session: Session | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error) {
      console.error('Refresh token login error:', error)
      return { user: null, session: null, error: error.message }
    }

    if (!data.session || !data.user) {
      return { user: null, session: null, error: 'Session refresh failed' }
    }

    return { user: data.user, session: data.session, error: null }
  } catch (err) {
    console.error('Refresh token exception:', err)
    return { user: null, session: null, error: err instanceof Error ? err.message : 'Login failed' }
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  try {
    // Use 'local' scope to only sign out from this browser/device
    // This is more reliable than 'global' which can fail silently
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      console.error('Supabase signOut error:', error)
      return { error: error.message }
    }
    return { error: null }
  } catch (err) {
    console.error('signOut exception:', err)
    // Force clear local auth state even if API call fails
    return { error: err instanceof Error ? err.message : 'Sign out failed' }
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name'>>
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)

  return { success: !error, error: error?.message || null }
}

export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  return profile?.role === 'admin'
}

export async function getAllClients(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  return data || []
}

// ============================================
// TASK TEMPLATE FUNCTIONS
// ============================================

export async function getTaskTemplates(section?: string): Promise<TaskTemplate[]> {
  let query = supabase
    .from('task_templates')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true })

  if (section) {
    query = query.eq('section', section)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching task templates:', error)
    return []
  }

  return data || []
}

export async function createTaskTemplate(
  template: Omit<TaskTemplate, 'created_at'>
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.from('task_templates').insert(template)
  return { success: !error, error: error?.message || null }
}

export async function updateTaskTemplate(
  id: string,
  updates: Partial<TaskTemplate>
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('task_templates')
    .update(updates)
    .eq('id', id)
  return { success: !error, error: error?.message || null }
}

// ============================================
// CLIENT TASK FUNCTIONS
// ============================================

export async function initializeClientTasks(userId: string): Promise<void> {
  const { error } = await supabase.rpc('initialize_client_tasks', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error initializing client tasks:', error)
  }
}

// Cache for client tasks to avoid repeated queries
const clientTasksCache = new Map<string, { tasks: ClientTask[]; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

export async function getClientTasks(
  userId: string,
  section?: string
): Promise<ClientTask[]> {
  const cacheKey = userId
  const cached = clientTasksCache.get(cacheKey)

  // Use cache if valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    let tasks = cached.tasks
    if (section) {
      tasks = tasks.filter((t) => t.template?.section === section)
    }
    return tasks
  }

  const { data, error } = await supabase
    .from('client_tasks')
    .select(`
      *,
      template:task_templates(*)
    `)
    .eq('user_id', userId)
    .eq('is_hidden', false)

  if (error) {
    console.error('Error fetching client tasks:', error)
    return []
  }

  let tasks = data || []

  // Sort by template order_index
  tasks.sort((a, b) => (a.template?.order_index || 0) - (b.template?.order_index || 0))

  // Cache the full result
  clientTasksCache.set(cacheKey, { tasks, timestamp: Date.now() })

  // Filter by section if specified
  if (section) {
    tasks = tasks.filter((t) => t.template?.section === section)
  }

  return tasks
}

// Clear cache for a user (call after task updates)
export function clearClientTasksCache(userId: string): void {
  clientTasksCache.delete(userId)
}

export async function updateClientTask(
  userId: string,
  taskTemplateId: string,
  updates: Partial<Pick<ClientTask, 'completed' | 'comment'>>
): Promise<{ success: boolean; error: string | null }> {
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  if (updates.completed !== undefined) {
    updateData.completed_at = updates.completed ? new Date().toISOString() : null
  }

  const { error } = await supabase
    .from('client_tasks')
    .update(updateData)
    .eq('user_id', userId)
    .eq('task_template_id', taskTemplateId)

  return { success: !error, error: error?.message || null }
}

export async function toggleTaskCompletion(
  userId: string,
  taskTemplateId: string,
  completed: boolean
): Promise<{ success: boolean; error: string | null }> {
  return updateClientTask(userId, taskTemplateId, { completed })
}

export async function addTaskComment(
  userId: string,
  taskTemplateId: string,
  comment: string
): Promise<{ success: boolean; error: string | null }> {
  return updateClientTask(userId, taskTemplateId, { comment })
}

// Admin function to customize a client's task
export async function customizeClientTask(
  userId: string,
  taskTemplateId: string,
  customization: Partial<Pick<ClientTask, 'custom_title' | 'custom_description' | 'is_hidden'>>
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('client_tasks')
    .update({
      ...customization,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('task_template_id', taskTemplateId)

  return { success: !error, error: error?.message || null }
}

export async function getUserProgress(
  userId: string
): Promise<{ section: string; total_tasks: number; completed_tasks: number; progress_percent: number }[]> {
  const { data, error } = await supabase.rpc('get_user_progress', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error fetching user progress:', error)
    return []
  }

  return data || []
}

// ============================================
// SURVEY FUNCTIONS
// ============================================

export async function getSurveyQuestions(section?: string): Promise<SurveyQuestion[]> {
  let query = supabase
    .from('survey_questions')
    .select('*')
    .order('order_index', { ascending: true })

  if (section) {
    query = query.eq('section', section)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching survey questions:', error)
    return []
  }

  return data || []
}

export async function getClientSurveyResponses(userId: string): Promise<ClientSurvey[]> {
  const { data, error } = await supabase
    .from('client_surveys')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching survey responses:', error)
    return []
  }

  return data || []
}

export async function saveClientSurveyResponse(
  userId: string,
  questionId: string,
  answer: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('client_surveys')
    .upsert(
      { user_id: userId, question_id: questionId, answer },
      { onConflict: 'user_id,question_id' }
    )

  return { success: !error, error: error?.message || null }
}

export async function saveClientSurveyResponses(
  userId: string,
  responses: Record<string, string>
): Promise<{ success: boolean; error: string | null }> {
  const inserts = Object.entries(responses).map(([questionId, answer]) => ({
    user_id: userId,
    question_id: questionId,
    answer,
  }))

  const { error } = await supabase
    .from('client_surveys')
    .upsert(inserts, { onConflict: 'user_id,question_id' })

  return { success: !error, error: error?.message || null }
}

// ============================================
// FILE UPLOAD FUNCTIONS (Updated for user_id)
// ============================================

export async function uploadFile(
  file: File,
  userId: string,
  taskId: string
): Promise<{ success: boolean; data?: UploadedFile; error?: string }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase not configured.' }
  }

  if (!userId) {
    return { success: false, error: 'User ID is required for upload.' }
  }

  try {
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${userId}/${taskId}/${timestamp}_${safeName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    const { data: dbData, error: dbError } = await supabase
      .from('uploaded_files')
      .insert({
        user_id: userId,
        task_id: taskId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_path: uploadData.path,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      await supabase.storage.from('documents').remove([filePath])
      return { success: false, error: dbError.message }
    }

    return { success: true, data: dbData }
  } catch (error) {
    console.error('Upload failed:', error)
    return { success: false, error: 'Upload failed. Please try again.' }
  }
}

export async function getFilesByUser(userId: string): Promise<UploadedFile[]> {
  if (!supabaseUrl || !supabaseAnonKey) return []

  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('Error fetching files:', error)
    return []
  }

  return data || []
}

export async function getFileUrl(filePath: string): Promise<string | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600)

  return data?.signedUrl || null
}

export async function getAllFiles(limit = 50, offset = 0): Promise<UploadedFile[]> {
  if (!supabaseUrl || !supabaseAnonKey) return []

  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching all files:', error)
    return []
  }

  return data || []
}

export async function deleteFile(fileId: string, filePath: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseAnonKey) return false

  try {
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      return false
    }

    const { error: dbError } = await supabase
      .from('uploaded_files')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete failed:', error)
    return false
  }
}

// Legacy function for backward compatibility
export async function getFilesByClient(clientToken: string): Promise<UploadedFile[]> {
  if (!supabaseUrl || !supabaseAnonKey) return []

  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('client_token', clientToken)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('Error fetching files:', error)
    return []
  }

  return data || []
}

export async function getClientList(): Promise<string[]> {
  if (!supabaseUrl || !supabaseAnonKey) return []

  const { data, error } = await supabase
    .from('uploaded_files')
    .select('client_token')

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  const clients = [...new Set(data?.map((d) => d.client_token).filter(Boolean) || [])]
  return clients
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

export interface Notification {
  id: string
  sender_id: string
  recipient_id: string | null
  title: string
  message: string
  type: 'announcement' | 'reminder' | 'congratulations' | 'custom'
  is_read: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  user_name?: string
  user_email?: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

export interface AdminStats {
  total_clients: number
  active_clients: number
  logged_in_today: number
  logged_in_this_week: number
  avg_completion_rate: number
}

export interface ClientProgressSummary {
  section: string
  total_tasks: number
  completed_tasks: number
  progress_percent: number
  last_completed_at: string | null
}

// Get admin dashboard stats
export async function getAdminStats(): Promise<AdminStats | null> {
  const { data, error } = await supabase.rpc('get_admin_stats')

  if (error) {
    console.error('Error fetching admin stats:', error)
    return null
  }

  return data?.[0] || null
}

// Get all clients with progress info
export async function getAllClientsWithProgress(): Promise<(UserProfile & { progress?: number })[]> {
  const { data: clients, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  // Get progress for each client
  const clientsWithProgress = await Promise.all(
    (clients || []).map(async (client) => {
      const progress = await getUserProgress(client.id)
      const totalTasks = progress.reduce((acc, p) => acc + p.total_tasks, 0)
      const completedTasks = progress.reduce((acc, p) => acc + p.completed_tasks, 0)
      const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

      return {
        ...client,
        progress: Math.round(overallProgress),
      }
    })
  )

  return clientsWithProgress
}

// Get client progress summary by section
export async function getClientProgressSummary(userId: string): Promise<ClientProgressSummary[]> {
  const { data, error } = await supabase.rpc('get_client_progress_summary', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error fetching client progress:', error)
    return []
  }

  return data || []
}

// Update last login
export async function updateLastLogin(userId: string): Promise<void> {
  const { error } = await supabase.rpc('update_last_login', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error updating last login:', error)
  }
}

// Log activity
export async function logActivity(
  userId: string,
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.rpc('log_activity', {
    p_user_id: userId,
    p_action: action,
    p_details: details,
  })

  if (error) {
    console.error('Error logging activity:', error)
  }
}

// Get recent activity feed
export async function getRecentActivity(limit = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase.rpc('get_recent_activity', {
    p_limit: limit,
  })

  if (error) {
    console.error('Error fetching activity:', error)
    return []
  }

  return data || []
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

// Create notification
export async function createNotification(
  senderId: string,
  recipientId: string | null, // null = broadcast to all
  title: string,
  message: string,
  type: 'announcement' | 'reminder' | 'congratulations' | 'custom' = 'custom'
): Promise<{ success: boolean; error: string | null }> {
  if (recipientId === null) {
    // Broadcast to all clients
    const clients = await getAllClients()
    const notifications = clients.map((client) => ({
      sender_id: senderId,
      recipient_id: client.id,
      title,
      message,
      type,
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      return { success: false, error: error.message }
    }

    // Trigger push notifications for each recipient
    if (data) {
      for (const notif of data) {
        triggerPushNotification({
          id: notif.id,
          recipient_id: notif.recipient_id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
        })
      }
    }

    return { success: true, error: null }
  } else {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        title,
        message,
        type,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Trigger push notification
    if (data) {
      triggerPushNotification({
        id: data.id,
        recipient_id: data.recipient_id,
        title: data.title,
        message: data.message,
        type: data.type,
      })
    }

    return { success: true, error: null }
  }
}

// Get notifications for user
export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`recipient_id.eq.${userId},recipient_id.is.null`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data || []
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }

  return count || 0
}

// Mark notification as read
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  return !error
}

// Mark all notifications as read
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)

  return !error
}

// Get notification history (for admin)
export async function getNotificationHistory(limit = 100): Promise<(Notification & { recipient_name?: string })[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      recipient:profiles!recipient_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notification history:', error)
    return []
  }

  return (data || []).map((n) => ({
    ...n,
    recipient_name: n.recipient?.full_name || n.recipient?.email || 'All Clients',
  }))
}

// ============================================
// PUSH SUBSCRIPTION FUNCTIONS
// ============================================

export interface PushSubscriptionData {
  id: string
  user_id: string
  endpoint: string
  expiration_time: string | null
  keys_p256dh: string
  keys_auth: string
  user_agent: string | null
  created_at: string
  updated_at: string
}

// Save push subscription to database
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionJSON
): Promise<{ success: boolean; error: string | null }> {
  if (!subscription.endpoint || !subscription.keys) {
    return { success: false, error: 'Invalid subscription object' }
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        expiration_time: subscription.expirationTime
          ? new Date(subscription.expirationTime).toISOString()
          : null,
        keys_p256dh: subscription.keys.p256dh,
        keys_auth: subscription.keys.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    )

  return { success: !error, error: error?.message || null }
}

// Remove push subscription from database
export async function removePushSubscription(
  userId: string,
  endpoint: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

  return { success: !error, error: error?.message || null }
}

// Get push subscriptions for a user
export async function getUserPushSubscriptions(
  userId: string
): Promise<PushSubscriptionData[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching push subscriptions:', error)
    return []
  }

  return data || []
}

// Trigger push notification via Edge Function
export async function triggerPushNotification(notification: {
  id: string
  recipient_id: string
  title: string
  message: string
  type: string
}): Promise<{ success: boolean; sent?: number; error?: string }> {
  if (!notification.recipient_id) {
    return { success: false, error: 'No recipient ID provided' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        notification_id: notification.id,
        recipient_id: notification.recipient_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      },
    })

    if (error) {
      console.error('Push notification edge function error:', error)
      return { success: false, error: error.message }
    }

    console.log('Push notification result:', data)
    return { success: true, sent: data?.sent || 0 }
  } catch (error) {
    const err = error as Error
    console.error('Failed to trigger push notification:', err.message)
    // Don't throw - push failure shouldn't break notification creation
    return { success: false, error: err.message }
  }
}

// ============================================
// CLIENT MANAGEMENT FUNCTIONS
// ============================================

export interface CreateClientParams {
  email: string
  password: string
  fullName: string
  phone?: string
  planType?: PlanType
}

export interface ClientFilterParams {
  search?: string
  planType?: PlanType
  isActive?: boolean
  minProgress?: number
  maxProgress?: number
}

export interface ClientFullDetails extends UserProfile {
  totalTasks: number
  completedTasks: number
  overallProgress: number
  progressBySection: ClientProgressSummary[]
  recentDocuments: UploadedFile[]
  recentNotifications: Notification[]
  recentActivity: ActivityLog[]
}

// Create client from admin panel
export async function createClientFromAdmin(
  params: CreateClientParams
): Promise<{ success: boolean; userId?: string; clientId?: string; error: string | null }> {
  const { email, password, fullName, phone, planType } = params

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'client',
        phone: phone || null,
        plan_type: planType || 'basic',
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Fetch the created profile to get the client_id
  if (data.user) {
    // Small delay to allow trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 500))
    const profile = await getUserProfile(data.user.id)
    return {
      success: true,
      userId: data.user.id,
      clientId: profile?.client_id || undefined,
      error: null,
    }
  }

  return { success: false, error: 'User creation failed' }
}

// Send magic link invite to client
export async function sendInviteLink(
  email: string,
  fullName: string,
  phone?: string,
  planType?: PlanType
): Promise<{ success: boolean; error: string | null }> {
  // Send magic link - client will set password on first login
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        full_name: fullName,
        role: 'client',
        phone: phone || null,
        plan_type: planType || 'basic',
      },
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// Generate shareable signup URL
export function generateSignupLink(planType?: PlanType): string {
  const baseUrl = window.location.origin
  const params = new URLSearchParams()
  if (planType) {
    params.set('plan', planType)
  }
  return `${baseUrl}/signup${params.toString() ? '?' + params.toString() : ''}`
}

// Get clients with filters (uses RPC function for efficiency)
export async function getClientsWithFilters(
  filters: ClientFilterParams = {}
): Promise<ClientWithProgress[]> {
  const { data, error } = await supabase.rpc('get_clients_filtered', {
    p_search: filters.search || null,
    p_plan_type: filters.planType || null,
    p_is_active: filters.isActive ?? null,
    p_min_progress: filters.minProgress ?? null,
    p_max_progress: filters.maxProgress ?? null,
  })

  if (error) {
    console.error('Error fetching filtered clients:', error)
    // Fallback to regular query if RPC not available
    return getAllClientsWithProgress() as Promise<ClientWithProgress[]>
  }

  return (data || []).map((client: Record<string, unknown>) => ({
    id: client.id as string,
    email: client.email as string,
    full_name: client.full_name as string,
    phone: client.phone as string | undefined,
    plan_type: client.plan_type as PlanType | undefined,
    client_id: client.client_id as string | undefined,
    role: client.role as 'client' | 'admin',
    is_active: client.is_active as boolean,
    last_login: client.last_login as string | undefined,
    notes: client.notes as string | undefined,
    created_at: client.created_at as string,
    updated_at: client.created_at as string,
    progress: Number(client.progress_percent) || 0,
  }))
}

// Get full details for a single client
export async function getClientFullDetails(
  userId: string
): Promise<ClientFullDetails | null> {
  // Get basic profile
  const profile = await getUserProfile(userId)
  if (!profile) return null

  // Get all related data in parallel
  const [progressBySection, documents, notifications, activity] = await Promise.all([
    getClientProgressSummary(userId),
    getFilesByUser(userId),
    getNotifications(userId),
    supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then((res) => res.data || []),
  ])

  // Calculate totals
  const totalTasks = progressBySection.reduce((acc, p) => acc + p.total_tasks, 0)
  const completedTasks = progressBySection.reduce((acc, p) => acc + p.completed_tasks, 0)
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return {
    ...profile,
    totalTasks,
    completedTasks,
    overallProgress,
    progressBySection,
    recentDocuments: documents.slice(0, 10),
    recentNotifications: notifications.slice(0, 10),
    recentActivity: activity as ActivityLog[],
  }
}

// Update client profile (admin function)
export async function updateClientProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'phone' | 'plan_type' | 'notes' | 'is_active'>>
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)

  return { success: !error, error: error?.message || null }
}

// Update client notes
export async function updateClientNotes(
  userId: string,
  notes: string
): Promise<{ success: boolean; error: string | null }> {
  return updateClientProfile(userId, { notes })
}

// Deactivate client
export async function deactivateClient(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', userId)

  return !error
}

// Reactivate client
export async function reactivateClient(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', userId)

  return !error
}

// Bulk deactivate clients
export async function bulkDeactivateClients(
  userIds: string[]
): Promise<{ success: boolean; count: number; error: string | null }> {
  const { data, error } = await supabase.rpc('bulk_deactivate_clients', {
    p_user_ids: userIds,
  })

  if (error) {
    // Fallback to manual update
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', userIds)

    if (updateError) {
      return { success: false, count: 0, error: updateError.message }
    }
    return { success: true, count: userIds.length, error: null }
  }

  return { success: true, count: data || userIds.length, error: null }
}

// Export clients to CSV format
export async function exportClientsToCSV(
  filters?: ClientFilterParams
): Promise<string> {
  const clients = await getClientsWithFilters(filters || {})

  // CSV headers
  const headers = [
    'Client ID',
    'Name',
    'Email',
    'Phone',
    'Plan',
    'Status',
    'Progress %',
    'Signup Date',
    'Last Login',
  ]

  // CSV rows
  const rows = clients.map((client) => [
    client.client_id || '',
    client.full_name || '',
    client.email,
    client.phone || '',
    client.plan_type || 'basic',
    client.is_active !== false ? 'Active' : 'Inactive',
    client.progress.toString(),
    new Date(client.created_at).toLocaleDateString(),
    client.last_login ? new Date(client.last_login).toLocaleDateString() : 'Never',
  ])

  // Build CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  return csvContent
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ============================================
// SECTION SETTINGS FUNCTIONS
// ============================================

export interface SectionSetting {
  section: string
  is_enabled: boolean
  is_collapsed: boolean
  display_order: number
}

// Get section settings for user
export async function getSectionSettings(userId: string): Promise<SectionSetting[]> {
  const { data, error } = await supabase
    .from('client_section_settings')
    .select('section, is_enabled, is_collapsed, display_order')
    .eq('user_id', userId)
    .order('display_order')

  if (error) {
    console.error('Error fetching section settings:', error)
    return []
  }

  return data || []
}

// Update section setting
export async function updateSectionSetting(
  userId: string,
  section: string,
  updates: Partial<SectionSetting>
): Promise<boolean> {
  const { error } = await supabase
    .from('client_section_settings')
    .upsert(
      {
        user_id: userId,
        section,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,section' }
    )

  return !error
}

// Toggle section for client (admin function)
export async function toggleClientSection(
  userId: string,
  section: string,
  isEnabled: boolean
): Promise<boolean> {
  return updateSectionSetting(userId, section, { is_enabled: isEnabled })
}

// ============================================
// PLAID BANK CONNECTION FUNCTIONS
// ============================================

export interface BankConnection {
  id: string
  user_id: string
  item_id: string
  institution_id: string
  institution_name: string
  logo_url: string | null
  primary_color: string | null
  treasury_bank_prefix: string | null
  status: 'connected' | 'disconnected' | 'error' | 'pending_reauth'
  error_code: string | null
  error_message: string | null
  accounts_count: number
  linked_at: string
  last_synced_at: string | null
  updated_at: string
  created_at: string
}

export interface BankAccount {
  id: string
  user_id: string
  connection_id: string
  plaid_account_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  mask: string | null
  balance_available: number | null
  balance_current: number | null
  balance_limit: number | null
  created_at: string
  updated_at: string
}

// Get all bank connections for a user
export async function getBankConnections(userId: string): Promise<BankConnection[]> {
  const { data, error } = await supabase
    .from('bank_connections_safe')
    .select('*')
    .eq('user_id', userId)
    .order('linked_at', { ascending: false })

  if (error) {
    console.error('Error fetching bank connections:', error)
    return []
  }

  return data || []
}

// Get all bank accounts for a user
export async function getBankAccounts(userId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('type', { ascending: true })

  if (error) {
    console.error('Error fetching bank accounts:', error)
    return []
  }

  return data || []
}

// Get bank accounts for a specific connection
export async function getBankAccountsByConnection(connectionId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('connection_id', connectionId)
    .order('type', { ascending: true })

  if (error) {
    console.error('Error fetching bank accounts:', error)
    return []
  }

  return data || []
}

// Get bank connection by institution
export async function getBankConnectionByInstitution(
  userId: string,
  institutionId: string
): Promise<BankConnection | null> {
  const { data, error } = await supabase
    .from('bank_connections_safe')
    .select('*')
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching bank connection:', error)
    }
    return null
  }

  return data
}

// Create Plaid Link token via Edge Function
export async function createPlaidLinkToken(): Promise<{ link_token: string; error?: string } | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.error('No session for Plaid link token')
    return null
  }

  console.log('[Plaid] Creating link token...')
  const { data, error } = await supabase.functions.invoke('create-plaid-link-token', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  console.log('[Plaid] Response:', { data, error })

  if (error) {
    console.error('[Plaid] Error creating link token:', error)
    return null
  }

  // Check if the response contains an error from the Edge Function
  if (data?.error) {
    console.error('[Plaid] Edge function error:', data.error, data.details)
    return { link_token: '', error: data.details || data.error }
  }

  return data
}

// Exchange Plaid public token for access token via Edge Function
export async function exchangePlaidToken(
  publicToken: string,
  institution: { institution_id: string; name: string }
): Promise<{ success: boolean; connection?: BankConnection; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Not authenticated' }
  }

  console.log('[Plaid] Exchanging token for:', institution.name)

  try {
    const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        public_token: publicToken,
        institution,
      },
    })

    console.log('[Plaid] Exchange response:', { data, error })

    if (error) {
      console.error('[Plaid] Error exchanging token:', error)
      // Try to extract more details from the error
      const errorMsg = error.message || 'Exchange failed'
      // Check if error has context with more details
      const context = (error as { context?: { body?: string } }).context
      if (context?.body) {
        try {
          const bodyError = JSON.parse(context.body)
          console.error('[Plaid] Error details:', bodyError)
          return { success: false, error: bodyError.details || bodyError.error || errorMsg }
        } catch {
          // Body wasn't JSON
        }
      }
      return { success: false, error: errorMsg }
    }

    // Check for error in the response data (Edge Function can return errors in body)
    if (data?.error) {
      console.error('[Plaid] Edge function returned error:', data.error, data.details)
      return { success: false, error: data.details || data.error }
    }

    if (!data?.connection) {
      console.error('[Plaid] No connection in response')
      return { success: false, error: 'No connection data received' }
    }

    return { success: true, connection: data.connection }
  } catch (err) {
    console.error('[Plaid] Exception during exchange:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================
// BUSINESS INTELLIGENCE FUNCTIONS
// ============================================

export interface BIDashboardStats {
  total_clients: number
  active_this_week: number
  total_revenue: number
  revenue_this_month: number
  plaid_costs_this_month: number
  net_profit_this_month: number
  avg_client_value: number
  monthly_recurring_revenue: number
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  new_clients: number
  churned_clients: number
}

export interface MonthlyPlaidCosts {
  month: string
  total_cost: number
  call_count: number
}

export interface PlaidCostSummary {
  endpoint: string
  call_count: number
  total_cost: number
  avg_cost: number
}

export interface ClientProfitability {
  user_id: string
  full_name: string
  email: string
  revenue: number
  plaid_costs: number
  profit: number
  profit_margin: number
  plan_type: string
  progress: number
}

export interface SectionAnalytics {
  section: string
  total_clients: number
  clients_started: number
  clients_completed: number
  avg_completion_rate: number
  avg_days_to_complete: number
}

export interface ClientAtRisk {
  user_id: string
  full_name: string
  email: string
  plaid_costs: number
  progress: number
  days_since_login: number
  risk_score: number
}

// Get BI dashboard stats
export async function getBIDashboardStats(): Promise<BIDashboardStats | null> {
  const { data, error } = await supabase.rpc('get_bi_dashboard_stats')

  if (error) {
    console.error('Error fetching BI dashboard stats:', error)
    return null
  }

  return data?.[0] || null
}

// Get monthly revenue data
export async function getMonthlyRevenue(monthsBack = 6): Promise<MonthlyRevenue[]> {
  const { data, error } = await supabase.rpc('get_monthly_revenue', {
    months_back: monthsBack,
  })

  if (error) {
    console.error('Error fetching monthly revenue:', error)
    return []
  }

  return data || []
}

// Get monthly Plaid costs
export async function getMonthlyPlaidCosts(monthsBack = 6): Promise<MonthlyPlaidCosts[]> {
  const { data, error } = await supabase.rpc('get_monthly_plaid_costs', {
    months_back: monthsBack,
  })

  if (error) {
    console.error('Error fetching monthly Plaid costs:', error)
    return []
  }

  return data || []
}

// Get Plaid costs summary by endpoint
export async function getPlaidCostsSummary(daysBack = 30): Promise<PlaidCostSummary[]> {
  const { data, error } = await supabase.rpc('get_plaid_costs_summary', {
    days_back: daysBack,
  })

  if (error) {
    console.error('Error fetching Plaid costs summary:', error)
    return []
  }

  return data || []
}

// Get client profitability
export async function getClientProfitability(): Promise<ClientProfitability[]> {
  const { data, error } = await supabase.rpc('get_client_profitability')

  if (error) {
    console.error('Error fetching client profitability:', error)
    return []
  }

  return data || []
}

// Get section analytics
export async function getSectionAnalytics(): Promise<SectionAnalytics[]> {
  const { data, error } = await supabase.rpc('get_section_analytics')

  if (error) {
    console.error('Error fetching section analytics:', error)
    return []
  }

  return data || []
}

// Get clients at risk
export async function getClientsAtRisk(
  costThreshold = 5.0,
  progressThreshold = 25
): Promise<ClientAtRisk[]> {
  const { data, error } = await supabase.rpc('get_clients_at_risk', {
    cost_threshold: costThreshold,
    progress_threshold: progressThreshold,
  })

  if (error) {
    console.error('Error fetching clients at risk:', error)
    return []
  }

  return data || []
}

// Update client revenue
export async function updateClientRevenue(
  userId: string,
  revenue: number,
  planPrice?: number
): Promise<{ success: boolean; error: string | null }> {
  const updates: Record<string, unknown> = {
    revenue,
    updated_at: new Date().toISOString(),
  }

  if (planPrice !== undefined) {
    updates.plan_price = planPrice
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  return { success: !error, error: error?.message || null }
}

// Log Plaid API usage
export async function logPlaidApiUsage(
  userId: string | null,
  endpoint: string,
  cost: number,
  requestId?: string,
  success = true,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase.from('plaid_api_usage').insert({
    user_id: userId,
    endpoint,
    cost,
    request_id: requestId,
    success,
    error_message: errorMessage,
  })

  if (error) {
    console.error('Error logging Plaid API usage:', error)
  }
}

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  plaid_transaction_id: string
  name: string
  merchant_name: string | null
  amount: number
  currency: string | null
  currency_code: string
  category_hint: string | null
  category: string[]
  category_id: string | null
  primary_category: string
  date: string
  datetime: string | null
  authorized_date: string | null
  pending: boolean
  payment_channel: string | null
  location_city: string | null
  location_region: string | null
  location_country: string | null
  raw_json?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Joined data
  account?: BankAccount
}

export interface SpendingByCategory {
  category: string
  total: number
  count: number
  percentage: number
}

export interface CreditUtilization {
  account_id: string
  account_name: string
  mask: string | null
  balance_current: number
  balance_limit: number
  utilization_percent: number
  institution_name: string
  logo_url: string | null
  primary_color: string | null
}

// Sync transactions from Plaid via Edge Function
export async function syncTransactions(
  connectionId?: string
): Promise<{ success: boolean; transactions_synced?: number; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('sync-transactions', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: connectionId ? { connection_id: connectionId } : {},
    })

    if (error) {
      console.error('Sync transactions error:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      transactions_synced: data?.transactions_synced || 0,
    }
  } catch (err) {
    console.error('Sync transactions exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Get transactions for a user (last 30 days by default)
export async function getTransactions(
  userId: string,
  options?: {
    startDate?: string
    endDate?: string
    accountId?: string
    category?: string
    limit?: number
  }
): Promise<Transaction[]> {
  const { startDate, endDate, accountId, category, limit = 100 } = options || {}

  // Default to last 30 days
  const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const defaultEndDate = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('transactions')
    .select(`
      *,
      account:bank_accounts(
        id, name, mask, type, subtype,
        connection:bank_connections(institution_name, logo_url, primary_color)
      )
    `)
    .eq('user_id', userId)
    .gte('date', startDate || defaultStartDate)
    .lte('date', endDate || defaultEndDate)
    .order('date', { ascending: false })
    .limit(limit)

  if (accountId) {
    query = query.eq('account_id', accountId)
  }

  if (category) {
    query = query.eq('primary_category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data || []
}

// Get spending grouped by category for a month (YYYY-MM)
export async function getMonthlySpend(
  userId: string,
  month: string
): Promise<SpendingByCategory[]> {
  const [year, monthPart] = month.split('-')
  if (!year || !monthPart) {
    console.error('Invalid month format, expected YYYY-MM')
    return []
  }

  const startDate = `${year}-${monthPart}-01`
  const start = new Date(`${startDate}T00:00:00Z`)
  const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
  const endDate = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return getSpendingByCategory(userId, startDate, endDate)
}

// Get spending grouped by category
export async function getSpendingByCategory(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<SpendingByCategory[]> {
  // Default to last 30 days
  const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const defaultEndDate = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select('primary_category, amount')
    .eq('user_id', userId)
    .gte('date', startDate || defaultStartDate)
    .lte('date', endDate || defaultEndDate)
    .gt('amount', 0) // Only expenses (positive amounts in Plaid = money out)

  if (error) {
    console.error('Error fetching spending by category:', error)
    return []
  }

  // Group by category
  const categoryMap = new Map<string, { total: number; count: number }>()
  let grandTotal = 0

  for (const tx of data || []) {
    const category = tx.primary_category || 'Other'
    const existing = categoryMap.get(category) || { total: 0, count: 0 }
    existing.total += tx.amount
    existing.count += 1
    categoryMap.set(category, existing)
    grandTotal += tx.amount
  }

  // Convert to array with percentages
  const result: SpendingByCategory[] = []
  for (const [category, { total, count }] of categoryMap) {
    result.push({
      category,
      total,
      count,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    })
  }

  // Sort by total descending
  result.sort((a, b) => b.total - a.total)

  return result
}

// Get credit utilization for all credit accounts
export async function getCreditUtilization(userId: string): Promise<CreditUtilization[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select(`
      id,
      name,
      mask,
      balance_current,
      balance_limit,
      connection:bank_connections(institution_name, logo_url, primary_color)
    `)
    .eq('user_id', userId)
    .eq('type', 'credit')
    .not('balance_limit', 'is', null)

  if (error) {
    console.error('Error fetching credit utilization:', error)
    return []
  }

  return (data || []).map((acc) => {
    const current = acc.balance_current || 0
    const limit = acc.balance_limit || 1
    const connArray = acc.connection as unknown as Array<{ institution_name: string; logo_url: string | null; primary_color: string | null }> | null
    const conn = connArray?.[0] || null

    return {
      account_id: acc.id,
      account_name: acc.name,
      mask: acc.mask,
      balance_current: current,
      balance_limit: limit,
      utilization_percent: Math.min((current / limit) * 100, 100),
      institution_name: conn?.institution_name || 'Unknown',
      logo_url: conn?.logo_url || null,
      primary_color: conn?.primary_color || null,
    }
  }).sort((a, b) => b.utilization_percent - a.utilization_percent)
}
