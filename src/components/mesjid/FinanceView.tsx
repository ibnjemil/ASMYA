'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Scale,
  Lock,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react'
import { useStore, canAccessCashbook } from '@/lib/store'
import { t, LANGUAGE_DIRECTION } from '@/lib/i18n'
import UserAvatar from './UserAvatar'

export default function FinanceView() {
  const {
    user,
    language,
    cashEntries,
    cashTotalIn,
    cashTotalOut,
    cashBalance,
  } = useStore()

  const dir = LANGUAGE_DIRECTION[language]
  const hasAccess = user ? canAccessCashbook(user.role) : false

  // Monthly cash flow data
  const monthlyData = useMemo(() => {
    const months: Record<string, { in: number; out: number }> = {}
    cashEntries.forEach((entry) => {
      const date = new Date(entry.date || entry.createdAt)
      const key = format(date, 'MMM yyyy')
      if (!months[key]) months[key] = { in: 0, out: 0 }
      if (entry.type === 'CASH_IN') {
        months[key].in += entry.amount
      } else {
        months[key].out += entry.amount
      }
    })
    return Object.entries(months)
      .sort(([a], [b]) => {
        const da = new Date(a)
        const db = new Date(b)
        return da.getTime() - db.getTime()
      })
      .slice(-6)
  }, [cashEntries])

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { amount: number; type: string }> = {}
    cashEntries.forEach((entry) => {
      if (!cats[entry.category]) cats[entry.category] = { amount: 0, type: entry.type }
      cats[entry.category].amount += entry.amount
    })
    const total = Object.values(cats).reduce((sum, c) => sum + c.amount, 0)
    return Object.entries(cats)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
        type: data.type,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [cashEntries])

  // Find max bar value for scaling
  const maxBar = useMemo(() => {
    return Math.max(
      ...monthlyData.map(([, d]) => Math.max(d.in, d.out)),
      1
    )
  }, [monthlyData])

  // Recent transactions
  const recent = useMemo(
    () =>
      [...cashEntries]
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 10),
    [cashEntries]
  )

  if (!hasAccess) {
    return (
      <div className="p-4">
        <div className="glass-card p-12 text-center">
          <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Access Denied</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {t(language, 'settings.onlySuperior')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div dir={dir} className="p-4 space-y-6">
      {/* Header */}
      <h2 className="text-xl font-bold gradient-text">
        {t(language, 'dashboard.finance')}
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 text-center"
        >
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t(language, 'cashbook.totalIn')}
          </p>
          <p className="text-lg font-bold text-emerald-400 mt-1">
            {cashTotalIn.toLocaleString()}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4 text-center"
        >
          <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-400" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t(language, 'cashbook.totalOut')}
          </p>
          <p className="text-lg font-bold text-red-400 mt-1">
            {cashTotalOut.toLocaleString()}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 text-center"
        >
          <Scale className="w-6 h-6 mx-auto mb-2 text-amber-400" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t(language, 'cashbook.balance')}
          </p>
          <p className="text-lg font-bold text-amber-400 mt-1">
            {cashBalance.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Cash Flow Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Cash Flow (Last 6 months)</h3>
        </div>

        {monthlyData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No data yet
          </p>
        ) : (
          <div className="space-y-3">
            {monthlyData.map(([month, data]) => (
              <div key={month} className="space-y-1">
                <p className="text-[10px] text-muted-foreground">{month}</p>
                <div className="flex gap-1 items-center">
                  {/* Cash In bar */}
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 h-4 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500/70 transition-all duration-500"
                        style={{
                          width: `${Math.max((data.in / maxBar) * 100, 2)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-emerald-400 w-10 text-end shrink-0">
                      {data.in.toLocaleString()}
                    </span>
                  </div>
                  {/* Cash Out bar */}
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 h-4 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500/70 transition-all duration-500"
                        style={{
                          width: `${Math.max((data.out / maxBar) * 100, 2)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-red-400 w-10 text-end shrink-0">
                      {data.out.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                Cash In
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                Cash Out
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4"
      >
        <h3 className="text-sm font-semibold mb-3">Category Breakdown</h3>
        {categoryBreakdown.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No entries yet
          </p>
        ) : (
          <div className="space-y-2">
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{cat.name}</span>
                  <span className="font-medium">
                    {cat.amount.toLocaleString()} ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cat.type === 'CASH_IN' ? 'bg-emerald-500/70' : 'bg-red-500/70'
                    }`}
                    style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-4"
      >
        <h3 className="text-sm font-semibold mb-3">Recent Transactions</h3>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {t(language, 'cashbook.noEntries')}
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/20"
              >
                {entry.type === 'CASH_IN' ? (
                  <ArrowUpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ArrowDownCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        entry.type === 'CASH_IN' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {entry.type === 'CASH_IN' ? '+' : '-'}
                      {entry.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{entry.category}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50">
                    {format(new Date(entry.date || entry.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <UserAvatar
                  avatarUrl={entry.creator.avatarUrl}
                  displayName={entry.creator.displayName}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
