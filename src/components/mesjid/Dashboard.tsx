'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Megaphone,
  ClipboardCheck,
  Users,
  Wallet,
  Settings,
  LogOut,
  Sun,
  Moon,
  Loader2,
  WifiOff,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'

import { useStore, canManageUsers, canAccessCashbook, canManageCashbook } from '@/lib/store'
import { t, LANGUAGE_DIRECTION, Language, LANGUAGE_NAMES } from '@/lib/i18n'
import type { ViewMode, Side, ChatInfo, CashEntryInfo } from '@/lib/store'

import ChatDashboard from './ChatDashboard'
import AnnouncementsView from './AnnouncementsView'
import PlansReportsView from './PlansReportsView'
import UsersView from './UsersView'
import CashbookView from './CashbookView'
import FinanceView from './FinanceView'
import SettingsView from './SettingsView'

// ── Cache Helpers ──────────────────────────────────────────────────────────

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full — silently ignore
  }
}

// =============================================================================
// Dashboard Component
// =============================================================================

export default function Dashboard() {
  const {
    user,
    language,
    theme,
    isOffline,
    currentView,
    currentChat,
    setView,
    setTheme,
    setLanguage,
    setOffline,
    logout,
    setChats,
    setCurrentChat,
    setMessages,
    setAnnouncements,
    setPlans,
    setReports,
    setUsers,
    setCashEntries,
    setCashTotals,
    setIsLoading,
    incrementUnread,
  } = useStore()

  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const langRef = useRef<HTMLDivElement>(null)

  const isSuperiorAmir = user?.role === 'SUPERIOR_AMIR'

  // ── Data Fetching with aggressive offline caching ────────────────────────

  const fetchAllData = useCallback(async () => {
    const u = useStore.getState().user
    if (!u) return
    setIsLoading(true)
    const side = u.side

    const fetchWithCache = async <T,>(
      url: string,
      cacheKey: string,
      setter: (data: T) => void,
    ) => {
      // Always load from cache first for instant offline experience
      const cached = readCache<T | null>(cacheKey, null)
      if (cached) setter(cached as T)

      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: T = await res.json()
        setter(data)
        writeCache(cacheKey, data)
      } catch {
        // Already loaded from cache above, so silent fail
      }
    }

    const otherSide: Side = side === 'MEN' ? 'WOMEN' : 'MEN'
    const otherSideLabel = otherSide === 'MEN' ? "(Men's)" : "(Women's)"
    const isSA = u.role === 'SUPERIOR_AMIR'

    await Promise.all([
      // Chats
      (async () => {
        const cached = readCache<ChatInfo[] | null>(`asmya-cache-chats-${side}`, null)
        if (cached) setChats(cached)
        try {
          const res = await fetch(`/api/chats?userId=${u.id}`)
          if (!res.ok) throw new Error()
          const data: ChatInfo[] = await res.json()
          if (isSA) {
            const otherRes = await fetch(`/api/chats?userId=${u.id}&side=${otherSide}`)
            if (otherRes.ok) {
              const otherData: ChatInfo[] = await otherRes.json()
              data.push(...otherData.map((c) => ({ ...c, _label: otherSideLabel })))
            }
          }
          setChats(data)
          writeCache(`asmya-cache-chats-${side}`, data)
        } catch { /* cached already loaded */ }
      })(),

      // Announcements
      (async () => {
        const cached = readCache(`asmya-cache-announcements-${side}`, null)
        if (cached) setAnnouncements(cached)
        try {
          const res = await fetch(`/api/announcements?side=${side}`)
          if (!res.ok) throw new Error()
          const data = await res.json()
          let allAnnouncements = data
          if (isSA) {
            const otherRes = await fetch(`/api/announcements?side=${otherSide}`)
            if (otherRes.ok) {
              const otherData = await otherRes.json()
              allAnnouncements = [
                ...allAnnouncements,
                ...otherData.map((a: Record<string, unknown>) => ({ ...a, _label: otherSideLabel })),
              ]
            }
          }
          setAnnouncements(allAnnouncements)
          writeCache(`asmya-cache-announcements-${side}`, allAnnouncements)
        } catch { /* cached */ }
      })(),

      // Plans
      (async () => {
        const cached = readCache(`asmya-cache-plans-${side}`, null)
        if (cached) setPlans(cached)
        try {
          const res = await fetch(`/api/plans?side=${side}`)
          if (!res.ok) throw new Error()
          const data = await res.json()
          let allPlans = data
          if (isSA) {
            const otherRes = await fetch(`/api/plans?side=${otherSide}`)
            if (otherRes.ok) {
              const otherData = await otherRes.json()
              allPlans = [
                ...allPlans,
                ...otherData.map((p: Record<string, unknown>) => ({ ...p, _label: otherSideLabel })),
              ]
            }
          }
          setPlans(allPlans)
          writeCache(`asmya-cache-plans-${side}`, allPlans)
        } catch { /* cached */ }
      })(),

      // Reports
      fetchWithCache(`/api/reports?side=${side}`, `asmya-cache-reports-${side}`, setReports),

      // Users
      fetchWithCache(`/api/users?side=${side}`, `asmya-cache-users-${side}`, setUsers),

      // Cash Entries
      (async () => {
        try {
          const cached = readCache<Record<string, unknown> | null>(`asmya-cache-cashentries-${side}`, null)
          if (cached && Array.isArray(cached.entries)) setCashEntries(cached.entries as CashEntryInfo[])
        } catch { /* ignore */ }
        try {
          const res = await fetch(`/api/cash-entries?side=${side}`)
          if (!res.ok) throw new Error()
          const data = await res.json()
          setCashEntries(data.entries)
          writeCache(`asmya-cache-cashentries-${side}`, data)
        } catch { /* cached */ }
      })(),
    ])

    setIsLoading(false)
    setDataLoaded(true)
  }, [setChats, setAnnouncements, setPlans, setReports, setUsers, setCashEntries, setCashTotals, setMessages, setIsLoading])

  // ── Mount: fetch data ────────────────────────────────────────────────────

  useEffect(() => {
    fetchAllData()
  }, [])

  // ── Socket.IO Connection ────────────────────────────────────────────────

  useEffect(() => {
    const u = useStore.getState().user
    if (!u) return
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join', {
        userId: u.id,
        chatIds: (u as Record<string, unknown>).chatIds || [],
      })
    })

    socket.on('message:new', (data: { chatId: string }) => {
      if (data.chatId !== useStore.getState().currentChat?.id) {
        useStore.getState().incrementUnread(data.chatId)
      }
      const chat = useStore.getState().currentChat
      if (data.chatId === chat?.id) {
        fetch(`/api/messages?chatId=${data.chatId}`)
          .then((r) => r.json())
          .then((msgs) => useStore.getState().setMessages(msgs))
          .catch(() => {})
      }
      fetch(`/api/chats?userId=${u.id}`)
        .then((r) => r.json())
        .then((chats: ChatInfo[]) => {
          useStore.getState().setChats(chats)
        })
        .catch(() => {})
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // ── Offline Detection ───────────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false)
      // Re-fetch all data when coming back online
      fetchAllData()
    }
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setOffline(!navigator.onLine)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [fetchAllData])

  // ── Service Worker Update Banner ────────────────────────────────────────

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdateBanner(true)
      })
    }
  }, [])

  // ── Close lang dropdown on outside click ────────────────────────────────

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Theme toggle ────────────────────────────────────────────────────────

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [theme, setTheme])

  // ── Language change ─────────────────────────────────────────────────────

  const changeLanguage = (lang: Language) => {
    setLanguage(lang)
    setLangDropdownOpen(false)
  }

  // ── Bottom Nav Items (all screens, no sidebar) ──────────────────────────

  const allNavItems: { view: ViewMode; labelKey: string; icon: React.ElementType; show: boolean }[] = [
    { view: 'chat', labelKey: 'dashboard.chat', icon: MessageSquare, show: true },
    { view: 'announcements', labelKey: 'dashboard.announcements', icon: Megaphone, show: true },
    { view: 'plans-reports', labelKey: 'dashboard.plans', icon: ClipboardCheck, show: true },
    { view: 'users', labelKey: 'dashboard.users', icon: Users, show: user ? canManageUsers(user.role) : false },
    { view: 'cashbook', labelKey: 'dashboard.cashbook', icon: Wallet, show: user ? canManageCashbook(user.role) : false },
    { view: 'settings', labelKey: 'dashboard.settings', icon: Settings, show: true },
  ]

  // ── Auth Gate ───────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    )
  }

  // ── View Renderer ───────────────────────────────────────────────────────

  const renderView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatDashboard />
      case 'announcements':
        return <AnnouncementsView />
      case 'plans-reports':
        return <PlansReportsView />
      case 'users':
        return <UsersView />
      case 'cashbook':
        return <CashbookView />
      case 'finance':
        return <FinanceView />
      case 'settings':
        return <SettingsView />
      default:
        return <ChatDashboard />
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const dir = LANGUAGE_DIRECTION[language]

  return (
    <div className="min-h-screen mesh-bg flex flex-col" dir={dir}>
      {/* Offline Indicator */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/90 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2 z-[60] overflow-hidden"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>{t(language, 'offline.message') || 'You are offline. Viewing cached data.'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Banner */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500/90 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-3 z-[60] overflow-hidden"
          >
            <span>A new version is available</span>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Update Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-3 md:px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="gradient-text font-bold text-lg tracking-tight">ASMYA</span>
            <span className="hidden sm:block text-muted-foreground text-sm truncate">
              {user.displayName}
            </span>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="btn-icon-glass p-2 flex items-center gap-1 text-sm"
                aria-label="Select language"
              >
                <span className="hidden sm:inline text-xs font-medium">{LANGUAGE_NAMES[language]}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {langDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute end-0 top-full mt-1.5 glass-card py-1 min-w-[130px] z-50"
                  >
                    {(['en', 'am', 'ar'] as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => changeLanguage(lang)}
                        className={`w-full text-start px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                          language === lang ? 'text-amber-400 font-semibold' : 'text-foreground/80'
                        }`}
                      >
                        {LANGUAGE_NAMES[lang]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn-icon-glass p-2"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="btn-icon-glass p-2 hover:!border-red-500/30 hover:!text-red-400"
              aria-label={t(language, 'dashboard.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content - full width, no sidebar */}
      <main className="flex-1 overflow-hidden pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-y-auto"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - ALL screens, primary navigation */}
      <nav className="glass-nav fixed bottom-0 inset-x-0 z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {allNavItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.view
              return (
                <button
                  key={item.view}
                  onClick={() => setView(item.view)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[52px] transition-colors ${
                    isActive ? 'text-amber-400' : 'text-muted-foreground'
                  }`}
                  aria-label={t(language, item.labelKey)}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {isActive && <span className="nav-glow-dot absolute -bottom-1.5 left-1/2 -translate-x-1/2" />}
                  </div>
                  <span className="text-[10px] font-medium leading-tight">
                    {t(language, item.labelKey)}
                  </span>
                </button>
              )
            })}
        </div>
      </nav>

      {/* AI Orb */}
    </div>
  )
}