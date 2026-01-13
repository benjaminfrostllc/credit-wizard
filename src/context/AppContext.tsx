/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { ChecklistTask } from '../components/Checklist'
import {
  supabase,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  signInWithRefreshToken,
  getUserProfile,
  initializeClientTasks,
  getClientTasks,
  toggleTaskCompletion,
  addTaskComment,
  getUserProgress,
  type UserProfile,
  type ClientTask,
} from '../lib/supabase'
import { saveAccount, trustDevice, untrustDevice, getTrustedRefreshToken, getSessionRefreshToken, updateSessionRefreshToken } from '../lib/savedAccounts'
import type { User } from '@supabase/supabase-js'

// Section keys - new FINANCIAL ASCENT structure
type SectionKey = 'foundry' | 'identity' | 'treasury' | 'creditCore' | 'control' | 'command' | 'theVault'

interface AppState {
  // Auth state
  isAuthenticated: boolean
  isAdmin: boolean
  user: User | null
  profile: UserProfile | null
  clientId: string | null
  clientName: string
  loading: boolean
  // Task state by section
  foundry: ChecklistTask[]
  identity: ChecklistTask[]
  treasury: ChecklistTask[]
  creditCore: ChecklistTask[]
  control: ChecklistTask[]
  command: ChecklistTask[]
  theVault: ChecklistTask[]
  // Progress by section
  progress: Record<SectionKey, number>
}

interface AppContextType extends AppState {
  // Auth methods
  login: (email: string, password: string, options?: { trustDevice?: boolean }) => Promise<{ success: boolean; error: string | null; session?: { refresh_token: string } }>
  loginWithTrustedDevice: (accountId: string) => Promise<{ success: boolean; error: string | null }>
  switchAccount: (accountId: string) => Promise<{ success: boolean; error: string | null }>
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error: string | null }>
  logout: () => Promise<void>
  trustCurrentDevice: () => Promise<boolean>
  untrustCurrentDevice: () => void
  // Task methods
  toggleTask: (section: SectionKey, id: string) => Promise<void>
  addComment: (section: SectionKey, id: string, comment: string) => Promise<void>
  refreshTasks: (section?: SectionKey) => Promise<void>
  // Progress
  getOverallProgress: () => number
  getSectionProgress: (section: SectionKey) => number
}

// Default empty state
const defaultState: AppState = {
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  profile: null,
  clientId: null,
  clientName: '',
  loading: false,
  foundry: [],
  identity: [],
  treasury: [],
  creditCore: [],
  control: [],
  command: [],
  theVault: [],
  progress: {
    foundry: 0,
    identity: 0,
    treasury: 0,
    creditCore: 0,
    control: 0,
    command: 0,
    theVault: 0,
  },
}

// Map database section names to state keys
const sectionMap: Record<string, SectionKey> = {
  foundry: 'foundry',
  identity: 'identity',
  treasury: 'treasury',
  credit_core: 'creditCore',
  control: 'control',
  command: 'command',
  the_vault: 'theVault',
}

// Reverse map for database queries
const dbSectionMap: Record<SectionKey, string> = {
  foundry: 'foundry',
  identity: 'identity',
  treasury: 'treasury',
  creditCore: 'credit_core',
  control: 'control',
  command: 'command',
  theVault: 'the_vault',
}

export const AppContext = createContext<AppContextType | undefined>(undefined)

// Convert ClientTask from database to ChecklistTask for UI
function clientTaskToChecklistTask(task: ClientTask): ChecklistTask {
  return {
    id: task.task_template_id,
    title: task.custom_title || task.template?.title || '',
    description: task.custom_description || task.template?.description || '',
    tips: task.template?.tips || undefined,
    resources: task.template?.resources || undefined,
    completed: task.completed,
    comment: task.comment || undefined,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState)

  // Load all tasks for user - optimized to single query
  const loadAllTasks = useCallback(async (userId: string) => {
    // Single query gets all tasks, then we filter by section client-side
    const [allTasks, progressData] = await Promise.all([
      getClientTasks(userId), // Gets all tasks in one query (with caching)
      getUserProgress(userId),
    ])

    const sections: SectionKey[] = ['foundry', 'identity', 'treasury', 'creditCore', 'control', 'command', 'theVault']
    const newTaskState: Partial<Record<SectionKey, ChecklistTask[]>> = {}

    sections.forEach((section) => {
      const dbSection = dbSectionMap[section]
      const sectionTasks = allTasks
        .filter((t) => t.template?.section === dbSection)
        .map(clientTaskToChecklistTask)
      newTaskState[section] = sectionTasks
    })

    const newProgress: Record<SectionKey, number> = { ...defaultState.progress }
    progressData.forEach((p) => {
      const stateKey = sectionMap[p.section]
      if (stateKey) {
        newProgress[stateKey] = p.progress_percent || 0
      }
    })

    return { tasks: newTaskState, progress: newProgress }
  }, [])

  // Use ref to avoid re-subscription on every render
  const loadAllTasksRef = useRef(loadAllTasks)
  useEffect(() => {
    loadAllTasksRef.current = loadAllTasks
  }, [loadAllTasks])

  // Initialize auth state listener - runs once on mount
  useEffect(() => {
    let isMounted = true

    // Simple auth check - no blocking, no timeouts
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return

      if (session?.user) {
        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          user: session.user,
          clientId: session.user.id,
        }))

        // Load profile in background
        getUserProfile(session.user.id).then((profile) => {
          if (!isMounted || !profile) return
          setState((prev) => ({
            ...prev,
            isAdmin: profile.role === 'admin',
            profile,
            clientName: profile.full_name || session.user.email || '',
          }))
        }).catch(console.error)

        // Load tasks in background
        initializeClientTasks(session.user.id)
          .then(() => loadAllTasksRef.current(session.user.id))
          .then((result) => {
            if (!isMounted) return
            setState((prev) => ({
              ...prev,
              ...result.tasks,
              progress: result.progress,
            }))
          })
          .catch(console.error)
      }
    }).catch(console.error)

    // Listen for sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_OUT') {
        setState({ ...defaultState })
        return
      }

      if (session?.user?.id && session.refresh_token) {
        updateSessionRefreshToken(session.user.id, session.refresh_token)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Auth methods
  const login = async (
    email: string,
    password: string,
    options?: { trustDevice?: boolean }
  ): Promise<{ success: boolean; error: string | null; session?: { refresh_token: string } }> => {
    const { user, session, error } = await supabaseSignIn(email, password)

    if (error || !user || !session) {
      return { success: false, error: error || 'Login failed' }
    }

    // Trust device if requested
    if (options?.trustDevice && session.refresh_token) {
      trustDevice(user.id, session.refresh_token)
    }
    if (session.refresh_token) {
      updateSessionRefreshToken(user.id, session.refresh_token)
    }

    // Set authenticated
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      user: user,
      clientId: user.id,
    }))

    // Load profile and tasks in background
    getUserProfile(user.id).then((profile) => {
      if (profile) {
        saveAccount({
          id: user.id,
          email: user.email || '',
          name: profile.full_name || user.email || '',
          isAdmin: profile.role === 'admin',
          sessionRefreshToken: session.refresh_token,
        })
        setState((prev) => ({
          ...prev,
          isAdmin: profile.role === 'admin',
          profile,
          clientName: profile.full_name || user.email || '',
        }))
      }
    }).catch(console.error)

    initializeClientTasks(user.id)
      .then(() => loadAllTasksRef.current(user.id))
      .then((result) => {
        setState((prev) => ({
          ...prev,
          ...result.tasks,
          progress: result.progress,
        }))
      })
      .catch(console.error)

    return {
      success: true,
      error: null,
      session: { refresh_token: session.refresh_token }
    }
  }

  // Login with a trusted device (no password required)
  const loginWithTrustedDevice = async (
    accountId: string
  ): Promise<{ success: boolean; error: string | null }> => {
    const refreshToken = getTrustedRefreshToken(accountId)

    if (!refreshToken) {
      return { success: false, error: 'Device not trusted or token expired' }
    }

    const { user, session, error } = await signInWithRefreshToken(refreshToken)

    if (error || !user || !session) {
      untrustDevice(accountId)
      return { success: false, error: error || 'Session expired. Please log in with password.' }
    }

    // Update refresh token if rotated
    if (session.refresh_token) {
      trustDevice(user.id, session.refresh_token)
      updateSessionRefreshToken(user.id, session.refresh_token)
    }

    // Set authenticated
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      user: user,
      clientId: user.id,
    }))

    // Load profile and tasks in background
    getUserProfile(user.id).then((profile) => {
      if (profile) {
        saveAccount({
          id: user.id,
          email: user.email || '',
          name: profile.full_name || user.email || '',
          isAdmin: profile.role === 'admin',
          sessionRefreshToken: session.refresh_token,
        })
        setState((prev) => ({
          ...prev,
          isAdmin: profile.role === 'admin',
          profile,
          clientName: profile.full_name || user.email || '',
        }))
      }
    }).catch(console.error)

    initializeClientTasks(user.id)
      .then(() => loadAllTasksRef.current(user.id))
      .then((result) => {
        setState((prev) => ({
          ...prev,
          ...result.tasks,
          progress: result.progress,
        }))
      })
      .catch(console.error)

    return { success: true, error: null }
  }

  const switchAccount = async (
    accountId: string
  ): Promise<{ success: boolean; error: string | null }> => {
    const refreshToken = getSessionRefreshToken(accountId)

    if (!refreshToken) {
      return { success: false, error: 'Session expired. Please log in again.' }
    }

    const { user, session, error } = await signInWithRefreshToken(refreshToken)

    if (error || !user || !session) {
      return { success: false, error: error || 'Session expired. Please log in again.' }
    }

    if (session.refresh_token) {
      updateSessionRefreshToken(user.id, session.refresh_token)
    }

    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      user: user,
      clientId: user.id,
    }))

    getUserProfile(user.id).then((profile) => {
      if (profile) {
        saveAccount({
          id: user.id,
          email: user.email || '',
          name: profile.full_name || user.email || '',
          isAdmin: profile.role === 'admin',
          sessionRefreshToken: session.refresh_token,
        })
        setState((prev) => ({
          ...prev,
          isAdmin: profile.role === 'admin',
          profile,
          clientName: profile.full_name || user.email || '',
        }))
      }
    }).catch(console.error)

    initializeClientTasks(user.id)
      .then(() => loadAllTasksRef.current(user.id))
      .then((result) => {
        setState((prev) => ({
          ...prev,
          ...result.tasks,
          progress: result.progress,
        }))
      })
      .catch(console.error)

    return { success: true, error: null }
  }

  // Trust the current device for passwordless login
  const trustCurrentDevice = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.id || !session.refresh_token) {
      return false
    }

    trustDevice(session.user.id, session.refresh_token)
    return true
  }

  // Remove trust from the current device
  const untrustCurrentDevice = (): void => {
    if (state.user?.id) {
      untrustDevice(state.user.id)
    }
  }

  const signup = async (email: string, password: string, fullName: string): Promise<{ success: boolean; error: string | null }> => {
    setState((prev) => ({ ...prev, loading: true }))

    const { user, error } = await supabaseSignUp(email, password, fullName)

    if (error || !user) {
      setState((prev) => ({ ...prev, loading: false }))
      return { success: false, error: error || 'Signup failed' }
    }

    // For Supabase with email confirmation disabled, user is logged in immediately
    // Auth state change listener will handle the rest
    return { success: true, error: null }
  }

  const logout = async () => {
    // Set loading to prevent UI flash
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const result = await supabaseSignOut()
      if (result.error) {
        console.error('Logout error:', result.error)
      }
    } catch (error) {
      console.error('Logout exception:', error)
    }

    // Always reset state to logged out, regardless of API result
    // This ensures user can always log out even if there's a network issue
    setState({ ...defaultState, loading: false })
  }

  // Task methods
  const toggleTask = async (section: SectionKey, id: string) => {
    if (!state.user) return

    // Optimistic update
    setState((prev) => ({
      ...prev,
      [section]: prev[section].map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      ),
    }))

    // Get current completion state
    const task = state[section].find((t) => t.id === id)
    const newCompleted = task ? !task.completed : true

    // Update in database
    const { success } = await toggleTaskCompletion(state.user.id, id, newCompleted)

    if (!success) {
      // Revert on failure
      setState((prev) => ({
        ...prev,
        [section]: prev[section].map((t) =>
          t.id === id ? { ...t, completed: !newCompleted } : t
        ),
      }))
    } else {
      // Refresh progress
      const progressData = await getUserProgress(state.user.id)
      const newProgress: Record<SectionKey, number> = { ...state.progress }
      progressData.forEach((p) => {
        const stateKey = sectionMap[p.section]
        if (stateKey) {
          newProgress[stateKey] = p.progress_percent || 0
        }
      })
      setState((prev) => ({ ...prev, progress: newProgress }))
    }
  }

  const addComment = async (section: SectionKey, id: string, comment: string) => {
    if (!state.user) return

    // Optimistic update
    setState((prev) => ({
      ...prev,
      [section]: prev[section].map((task) =>
        task.id === id ? { ...task, comment } : task
      ),
    }))

    // Update in database
    await addTaskComment(state.user.id, id, comment)
  }

  const refreshTasks = async (section?: SectionKey) => {
    if (!state.user) return

    if (section) {
      const dbSection = dbSectionMap[section]
      const allTasks = await getClientTasks(state.user.id)
      const sectionTasks = allTasks
        .filter((t) => t.template?.section === dbSection)
        .map(clientTaskToChecklistTask)
      setState((prev) => ({ ...prev, [section]: sectionTasks }))
    } else {
      const { tasks, progress } = await loadAllTasks(state.user.id)
      setState((prev) => ({ ...prev, ...tasks, progress }))
    }
  }

  // Progress methods
  const getOverallProgress = (): number => {
    const allTasks = [
      ...state.foundry,
      ...state.identity,
      ...state.treasury,
      ...state.creditCore,
      ...state.control,
      ...state.command,
      ...state.theVault,
    ]
    const completed = allTasks.filter((t) => t.completed).length
    return allTasks.length > 0 ? (completed / allTasks.length) * 100 : 0
  }

  const getSectionProgress = (section: SectionKey): number => {
    return state.progress[section] || 0
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        loginWithTrustedDevice,
        switchAccount,
        signup,
        logout,
        trustCurrentDevice,
        untrustCurrentDevice,
        toggleTask,
        addComment,
        refreshTasks,
        getOverallProgress,
        getSectionProgress,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// Re-export useApp from the separate file to maintain backward compatibility
export { useApp } from './useApp'

// Export section keys for use in other components
export type { SectionKey }
