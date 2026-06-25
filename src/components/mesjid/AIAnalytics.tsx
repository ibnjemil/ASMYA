'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, ShieldAlert, Loader2, Clock } from 'lucide-react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'

// ── Types ────────────────────────────────────────────────────────────────────

interface GroupedStat {
  category: string
  language: string
  _count: { id: number }
  _avg: { responseTimeMs: number | null }
  _min: { createdAt: string }
  _max: { createdAt: string }
}

interface RecentEntry {
  id: string
  query: string
  category: string
  language: string
  side: string
  responseTimeMs: number | null
  createdAt: string
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AIAnalytics() {
  const { user, language } = useStore()
  const [stats, setStats] = useState<GroupedStat[]>([])
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthorized = user?.role === 'SUPERIOR_AMIR'

  // ── Fetch data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !isAuthorized) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [statsRes, recentRes] = await Promise.all([
          fetch(`/api/ai-usage?userId=${user.id}`),
          fetch(`/api/ai-usage?userId=${user.id}&mode=recent&limit=20`),
        ])

        if (!statsRes.ok || !recentRes.ok) throw new Error('Failed to fetch analytics')

        const statsData: GroupedStat[] = await statsRes.json()
        const recentData: RecentEntry[] = await recentRes.json()

        setStats(statsData)
        setRecent(recentData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // ── Compute totals ───────────────────────────────────────────────────────
  const totalQueries = stats.reduce((sum, s) => sum + s._count.id, 0)

  // ── Top categories (aggregate across languages) ───────────────────────────
  const categoryTotals = stats.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + s._count.id
    return acc
  }, {})
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(language === 'am' ? 'am-ET' : language === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const categoryKey = (cat: string) => `ai.categories.${cat}` as const

  // ── Loading State ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 px-4">
        <ShieldAlert className="w-8 h-8 text-red-400" />
        <p className="text-sm text-muted-foreground text-center">{error}</p>
      </div>
    )
  }

  // ── Access Denied ────────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          This section is only available to the Superior Amir.
        </p>
      </div>
    )
  }

  // ── Empty State ──────────────────────────────────────────────────────────
  if (stats.length === 0 && recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{t(language, 'aiAnalytics.title')}</h2>
        <p className="text-sm text-muted-foreground">{t(language, 'aiAnalytics.noData')}</p>
      </div>
    )
  }

  // ── Main Render ──────────────────────────────────────────────────────────
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  }
  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          {t(language, 'aiAnalytics.title')}
        </h1>
      </motion.div>

      {/* Stat Card: Total Queries */}
      <motion.div variants={fadeUp}>
        <div className="glass-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
            {t(language, 'aiAnalytics.totalQueries')}
          </p>
          <p className="text-3xl font-bold gradient-text">{totalQueries.toLocaleString()}</p>
        </div>
      </motion.div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <motion.div variants={fadeUp} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {t(language, 'aiAnalytics.topCategories')}
          </h2>
          <ul className="space-y-2">
            {topCategories.map(([category, count]) => {
              const pct = totalQueries > 0 ? Math.round((count / totalQueries) * 100) : 0
              return (
                <li key={category} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground truncate">
                        {t(language, categoryKey(category))}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600"
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </motion.div>
      )}

      {/* Recent Queries */}
      {recent.length > 0 && (
        <motion.div variants={fadeUp} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {t(language, 'aiAnalytics.recentQueries')}
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recent.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm text-foreground truncate">{entry.query}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium">
                      {t(language, categoryKey(entry.category))}
                    </span>
                    <span className="shrink-0 uppercase">{entry.language}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>
                </div>
                {entry.responseTimeMs && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {Math.round(entry.responseTimeMs)}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
