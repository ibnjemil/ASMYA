'use client'

import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Wallet,
  Plus,
  Trash2,
  X,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Lock,
  Globe,
} from 'lucide-react'
import {
  useStore,
  type CashEntryInfo,
  canAccessCashbook,
} from '@/lib/store'
import { t, LANGUAGE_DIRECTION } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import UserAvatar from './UserAvatar'

const CATEGORIES = [
  'Donation',
  'Event',
  'Maintenance',
  'Salary',
  'Transport',
  'Food',
  'Rent',
  'Utilities',
  'Other',
]

export default function CashbookView() {
  const {
    user,
    language,
    cashEntries,
    setCashEntries,
    cashTotalIn,
    cashTotalOut,
    cashBalance,
  } = useStore()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)

  const [entryType, setEntryType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Other')
  const [description, setDescription] = useState('')
  const [accountType, setAccountType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [date, setDate] = useState('')

  const dir = LANGUAGE_DIRECTION[language]

  if (!user || !canAccessCashbook(user.role)) {
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

  const resetForm = () => {
    setEntryType('CASH_IN')
    setAmount('')
    setCategory('Other')
    setDescription('')
    setAccountType('PUBLIC')
    setDate('')
    setShowForm(false)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/cash-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: entryType,
          amount: parseFloat(amount),
          category,
          description: description.trim() || null,
          accountType,
          date: date || new Date().toISOString().split('T')[0],
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      setCashEntries([data.entry, ...cashEntries])
      toast({ title: 'Entry created' })
      resetForm()
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (entryId: string) => {
    try {
      const res = await fetch(`/api/cash-entries?entryId=${entryId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setCashEntries(cashEntries.filter((e) => e.id !== entryId))
      toast({ title: 'Entry deleted' })
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const filtered =
    accountFilter === 'all'
      ? cashEntries
      : cashEntries.filter((e) => e.accountType === accountFilter)

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div dir={dir} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold gradient-text">
          {t(language, 'cashbook.title')}
        </h2>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {t(language, 'cashbook.newEntry')}
        </motion.button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-xs text-muted-foreground">{t(language, 'cashbook.totalIn')}</p>
          <p className="text-sm font-bold text-emerald-400">{cashTotalIn.toLocaleString()}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <p className="text-xs text-muted-foreground">{t(language, 'cashbook.totalOut')}</p>
          <p className="text-sm font-bold text-red-400">{cashTotalOut.toLocaleString()}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <Scale className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-xs text-muted-foreground">{t(language, 'cashbook.balance')}</p>
          <p className="text-sm font-bold text-amber-400">{cashBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Account filter */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        {(['all', 'PUBLIC', 'PRIVATE'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setAccountFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              accountFilter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'All' : f === 'PUBLIC' ? (
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Public</span>
            ) : (
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Private</span>
            )}
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="glass-card p-4 space-y-3 overflow-hidden"
          >
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntryType('CASH_IN')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  entryType === 'CASH_IN'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                {t(language, 'cashbook.cashIn')}
              </button>
              <button
                type="button"
                onClick={() => setEntryType('CASH_OUT')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  entryType === 'CASH_OUT'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                {t(language, 'cashbook.cashOut')}
              </button>
            </div>

            <input
              type="number"
              placeholder={t(language, 'cashbook.amount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input w-full p-3 text-sm"
              min="0"
              step="0.01"
              required
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass-input w-full p-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder={t(language, 'cashbook.description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input w-full p-3 text-sm"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as 'PUBLIC' | 'PRIVATE')}
                className="glass-input w-full p-3 text-sm"
              >
                <option value="PUBLIC">{t(language, 'cashbook.publicAccount')}</option>
                <option value="PRIVATE">{t(language, 'cashbook.privateAccount')}</option>
              </select>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass-input w-full p-3 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                {t(language, 'cashbook.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t(language, 'cashbook.create')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Entries list */}
      {sorted.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {t(language, 'cashbook.noEntries')}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
          <AnimatePresence>
            {sorted.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-3 flex items-center gap-3"
              >
                {entry.type === 'CASH_IN' ? (
                  <ArrowUpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <ArrowDownCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold text-sm ${
                        entry.type === 'CASH_IN' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {entry.type === 'CASH_IN' ? '+' : '-'}
                      {entry.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {entry.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {format(new Date(entry.date || entry.createdAt), 'MMM d')}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {entry.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <UserAvatar
                    avatarUrl={entry.creator.avatarUrl}
                    displayName={entry.creator.displayName}
                    size="sm"
                  />
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
