import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role =
  | 'SUPERIOR_AMIR'
  | 'VICE_AMIR'
  | 'SECRETARY'
  | 'EDUCATION_AMIR'
  | 'COMMUNITY_AMIR'
  | 'ADMIN_AMIR'
  | 'FINANCE_AMIR'
  | 'PROGRAM_AMIR'
  | 'SOCIAL_MEDIA_AMIR'
  | 'FOLLOWER'

export type Side = 'MEN' | 'WOMEN'

export type Theme = 'dark' | 'light'

export type ViewMode =
  | 'chat'
  | 'announcements'
  | 'plans-reports'
  | 'users'
  | 'cashbook'
  | 'settings'
  | 'finance'
  | 'public-feed'

export type DashboardTab = 'all' | 'announcements' | 'plans'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  role: Role
  side: Side
  subAmirId?: string | null
}

export interface ChatInfo {
  id: string
  name: string
  type: string
  side: Side
  createdAt: string
  updatedAt: string
  members: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    role: Role
    side: Side
  }[]
  lastMessage?: {
    id: string
    content: string
    type: string
    createdAt: string
    sender: {
      id: string
      displayName: string
      avatarUrl: string | null
    }
  }
  _label?: string
}

export interface MessageInfo {
  id: string
  chatId: string
  senderId: string
  type: string
  content: string
  mediaUrl: string | null
  createdAt: string
  sender: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    role: Role
    side: Side
  }
}

export interface PlanInfo {
  id: string
  title: string
  description: string
  status: string
  dueDate: string
  reminderAt: string | null
  createdBy: string
  side: Side
  createdAt: string
  updatedAt: string
  isUrgent?: boolean
  daysLeft?: number
  creator: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  assignments: {
    id: string
    userId: string
    user: {
      id: string
      displayName: string
      avatarUrl: string | null
    }
  }[]
  _reportCount?: number
}

export interface ReportInfo {
  id: string
  title: string
  content: string
  planId: string | null
  createdBy: string
  side: Side
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  plan?: {
    id: string
    title: string
  } | null
}

export interface AnnouncementInfo {
  id: string
  title: string
  content: string
  mediaUrl: string | null
  createdBy: string
  side: Side
  isPublic: boolean
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
}

export interface PublicPostInfo {
  id: string
  content: string
  mediaUrl: string | null
  mediaType: string | null
  postedBy: string | null
  side: Side
  createdAt: string
  updatedAt: string
  poster: {
    id: string
    displayName: string
    avatarUrl: string | null
  } | null
  comments: {
    id: string
    content: string
    postedBy: string | null
    createdAt: string
    poster: {
      id: string
      displayName: string
      avatarUrl: string | null
    } | null
  }[]
}

export interface PublicCommentInfo {
  id: string
  content: string
  postedBy: string | null
  createdAt: string
  poster: {
    id: string
    displayName: string
    avatarUrl: string | null
  } | null
}

export interface CashEntryInfo {
  id: string
  type: string
  amount: number
  category: string
  description: string | null
  accountType: string
  createdBy: string
  side: Side
  date: string
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
}

export interface UserInfo {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  role: Role
  side: Side
  subAmirId: string | null
  followers?: UserInfo[]
}

// ─── Role Constants ──────────────────────────────────────────────────────────

export const MAIN_AMIR_ROLES: Role[] = [
  'SUPERIOR_AMIR',
  'VICE_AMIR',
  'SECRETARY',
]

export const SUB_AMIR_ROLES: Role[] = [
  'EDUCATION_AMIR',
  'COMMUNITY_AMIR',
  'ADMIN_AMIR',
]

export const SMALL_AMIR_ROLES: Role[] = [
  'FINANCE_AMIR',
  'PROGRAM_AMIR',
  'SOCIAL_MEDIA_AMIR',
]

export const ALL_AMIR_ROLES: Role[] = [
  ...MAIN_AMIR_ROLES,
  ...SUB_AMIR_ROLES,
  ...SMALL_AMIR_ROLES,
]

export const SMALL_AMIR_TO_SUB_AMIR: Record<string, Role> = {
  FINANCE_AMIR: 'ADMIN_AMIR',
  PROGRAM_AMIR: 'EDUCATION_AMIR',
  SOCIAL_MEDIA_AMIR: 'COMMUNITY_AMIR',
}

// ─── Permission Helpers ──────────────────────────────────────────────────────

export function canManageUsers(role: Role): boolean {
  return (
    MAIN_AMIR_ROLES.includes(role) ||
    SUB_AMIR_ROLES.includes(role) ||
    SMALL_AMIR_ROLES.includes(role)
  )
}

export function canDeleteContent(role: Role): boolean {
  return ['SUPERIOR_AMIR', 'VICE_AMIR'].includes(role)
}

// Vice Amir has same authority as Superior Amir (except cross-side access)
export function hasFullAuthority(role: Role): boolean {
  return ['SUPERIOR_AMIR', 'VICE_AMIR'].includes(role)
}

export function canPostAnnouncements(role: Role): boolean {
  return MAIN_AMIR_ROLES.includes(role) || SUB_AMIR_ROLES.includes(role)
}

export function isMainAmir(role: Role): boolean {
  return MAIN_AMIR_ROLES.includes(role)
}

export function isSubAmir(role: Role): boolean {
  return SUB_AMIR_ROLES.includes(role)
}

export function isSmallAmir(role: Role): boolean {
  return SMALL_AMIR_ROLES.includes(role)
}

export function canSeeAllChats(role: Role): boolean {
  return role === 'SUPERIOR_AMIR'
}

export function canAccessCashbook(role: Role): boolean {
  return true
}

export function canManageCashbook(role: Role): boolean {
  return role === 'FINANCE_AMIR'
}

export function isAmir(role: Role): boolean {
  return ALL_AMIR_ROLES.includes(role)
}

export function canCreatePlans(role: Role): boolean {
  return !['FOLLOWER'].includes(role)
}

export function canEditPlan(
  role: Role,
  planCreatorId: string,
  currentUserId: string,
): boolean {
  if (['SUPERIOR_AMIR', 'VICE_AMIR'].includes(role)) return true
  return planCreatorId === currentUserId
}

// ─── localStorage helpers ────────────────────────────────────────────────────

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLS(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function removeLS(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function applyThemeClass(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }
}

// ─── Zustand Store ─────────────────────────────────────────────────────────────

interface AppState {
  // State
  user: AuthUser | null
  side: Side | null
  isAuthenticated: boolean
  loginRole: Role | null
  loginSubAmirId: string | null
  language: 'en' | 'am' | 'ar'
  theme: Theme
  isOffline: boolean
  currentView: ViewMode
  previousView: ViewMode | null
  dashboardTab: DashboardTab
  chats: ChatInfo[]
  currentChat: ChatInfo | null
  messages: MessageInfo[]
  plans: PlanInfo[]
  currentPlan: PlanInfo | null
  reports: ReportInfo[]
  announcements: AnnouncementInfo[]
  publicPosts: unknown[]
  cashEntries: CashEntryInfo[]
  cashTotalIn: number
  cashTotalOut: number
  cashBalance: number
  users: UserInfo[]
  isLoading: boolean
  unreadCounts: Record<string, number>

  // Actions
  setSide: (side: Side) => void
  setLoginRole: (role: Role | null) => void
  setLoginSubAmirId: (id: string | null) => void
  setUser: (user: AuthUser | null) => void
  logout: () => void
  setLanguage: (lang: 'en' | 'am' | 'ar') => void
  setTheme: (theme: Theme) => void
  setOffline: (offline: boolean) => void
  setView: (view: ViewMode) => void
  goBack: () => void
  setDashboardTab: (tab: DashboardTab) => void
  setChats: (chats: ChatInfo[]) => void
  setCurrentChat: (chat: ChatInfo | null) => void
  setMessages: (messages: MessageInfo[]) => void
  addMessage: (message: MessageInfo) => void
  setPlans: (plans: PlanInfo[]) => void
  setCurrentPlan: (plan: PlanInfo | null) => void
  setReports: (reports: ReportInfo[]) => void
  setAnnouncements: (announcements: AnnouncementInfo[]) => void
  setPublicPosts: (posts: unknown[]) => void
  setCashEntries: (entries: CashEntryInfo[]) => void
  setUsers: (users: UserInfo[]) => void
  setIsLoading: (loading: boolean) => void
  incrementUnread: (chatId: string) => void
  clearUnread: (chatId: string) => void
}

// Default state values (used for reset on logout)
const defaultState = {
  side: null,
  isAuthenticated: false,
  loginRole: null,
  loginSubAmirId: null,
  language: 'en' as const,
  theme: 'dark' as const,
  isOffline: false,
  currentView: 'chat' as ViewMode,
  previousView: null as ViewMode | null,
  dashboardTab: 'all' as DashboardTab,
  chats: [],
  currentChat: null,
  messages: [],
  unreadCounts: {},
  plans: [],
  currentPlan: null,
  reports: [],
  announcements: [],
  publicPosts: [],  // deprecated - kept for compat
  unreadCounts: {},
  unreadCounts: readLS<Record<string, number>>('mesjid-unread', {}),
  unreadCounts: {},
  cashEntries: [],
  cashTotalIn: 0,
  cashTotalOut: 0,
  cashBalance: 0,
  users: [],
  isLoading: false,
  unreadCounts: {},
}

export const useStore = create<AppState>((set, get) => ({
  // ── Initial state with localStorage hydration ────────────────────────────
  user: readLS<AuthUser | null>('mesjid-user', null),
  side: readLS<AuthUser | null>('mesjid-user', null)?.side ?? null,
  isAuthenticated: readLS<AuthUser | null>('mesjid-user', null) !== null,
  loginRole: readLS<AuthUser | null>('mesjid-user', null)?.role ?? null,
  loginSubAmirId:
    readLS<AuthUser | null>('mesjid-user', null)?.subAmirId ?? null,
  language: readLS<'en' | 'am' | 'ar'>('mesjid-lang', 'en'),
  theme: (() => {
    const saved = readLS<Theme>('mesjid-theme', 'dark')
    applyThemeClass(saved)
    return saved
  })(),
  isOffline: false,
  currentView: 'chat' as ViewMode,
  previousView: null as ViewMode | null,
  dashboardTab: 'all' as DashboardTab,
  chats: [],
  currentChat: null,
  messages: [],
  unreadCounts: {},
  plans: [],
  currentPlan: null,
  reports: [],
  announcements: [],
  publicPosts: [],
  unreadCounts: {},
  unreadCounts: readLS<Record<string, number>>('mesjid-unread', {}),
  unreadCounts: {},
  cashEntries: [],
  cashTotalIn: 0,
  cashTotalOut: 0,
  cashBalance: 0,
  users: [],
  isLoading: false,

  // ── Actions ─────────────────────────────────────────────────────────────

  setSide: (side) => set({ side }),

  setLoginRole: (role) => set({ loginRole: role }),

  setLoginSubAmirId: (id) => set({ loginSubAmirId: id }),

  setUser: (user) => {
    if (user) {
      writeLS('mesjid-user', user)
      set({
        user,
        side: user.side,
        isAuthenticated: true,
        loginRole: user.role,
        loginSubAmirId: user.subAmirId ?? null,
      })
    } else {
      removeLS('mesjid-user')
      set({
        user: null,
        side: null,
        isAuthenticated: false,
        loginRole: null,
        loginSubAmirId: null,
      })
    }
  },

  logout: () => {
    removeLS('mesjid-user')
    removeLS('mesjid-lang')
    removeLS('mesjid-theme')
    set({
      user: null,
      ...defaultState,
    })
  },

  setLanguage: (lang) => {
    writeLS('mesjid-lang', lang)
    set({ language: lang })
  },

  setTheme: (theme) => {
    writeLS('mesjid-theme', theme)
    applyThemeClass(theme)
    set({ theme })
  },

  setOffline: (offline) => set({ isOffline: offline }),

  setView: (view) =>
    set((state) => ({
      previousView: state.currentView,
      currentView: view,
    })),

  goBack: () =>
    set((state) => {
      if (state.previousView) {
        return {
          currentView: state.previousView,
          previousView: null,
        }
      }
      return {}
    }),

  setDashboardTab: (tab) => set({ dashboardTab: tab }),

  setChats: (chats) => set({ chats }),
  setCurrentChat: (chat) => set({ currentChat: chat }),

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setPlans: (plans) => set({ plans }),
  setCurrentPlan: (plan) => set({ currentPlan: plan }),

  setReports: (reports) => set({ reports }),
  setAnnouncements: (announcements) => set({ announcements }),

  setPublicPosts: () => {},  // removed - no-op

  setCashEntries: (entries) => set({
    cashEntries: entries,
    cashTotalIn: entries.filter((e) => e.type === 'CASH_IN').reduce((s, e) => s + e.amount, 0),
    cashTotalOut: entries.filter((e) => e.type === 'CASH_OUT').reduce((s, e) => s + e.amount, 0),
    cashBalance: entries.filter((e) => e.type === 'CASH_IN').reduce((s, e) => s + e.amount, 0)
                - entries.filter((e) => e.type === 'CASH_OUT').reduce((s, e) => s + e.amount, 0),
  }),

  setUsers: (users) => set({ users }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  incrementUnread: (chatId) => set((s) => ({ unreadCounts: { ...s.unreadCounts, [chatId]: (s.unreadCounts[chatId] || 0) + 1 } })),
  clearUnread: (chatId) => set((s) => ({ unreadCounts: { ...s.unreadCounts, [chatId]: 0 } })),
}))
