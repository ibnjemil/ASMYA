'use client'

import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  FileText,
  Plus,
  Trash2,
  X,
  Loader2,
  Filter,
} from 'lucide-react'
import { useStore, type ReportInfo } from '@/lib/store'
import { t, LANGUAGE_DIRECTION } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import UserAvatar from './UserAvatar'

export default function ReportsView() {
  const {
    user,
    language,
    reports,
    setReports,
    plans,
  } = useStore()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const dir = LANGUAGE_DIRECTION[language]

  const resetForm = () => {
    setTitle('')
    setContent('')
    setSelectedPlanId('')
    setShowForm(false)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          planId: selectedPlanId || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      setReports([data.report, ...reports])
      toast({ title: 'Report created successfully' })
      resetForm()
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports?reportId=${reportId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setReports(reports.filter((r) => r.id !== reportId))
      toast({ title: 'Report deleted' })
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const filtered =
    planFilter === 'all'
      ? reports
      : reports.filter((r) => r.planId === planFilter)

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const uniquePlanIds = [...new Set(reports.filter((r) => r.planId).map((r) => r.planId!))]

  return (
    <div dir={dir} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold gradient-text">
          {t(language, 'reports.title')}
        </h2>
        {user && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {t(language, 'reports.newReport')}
          </motion.button>
        )}
      </div>

      {/* Filter */}
      {uniquePlanIds.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => setPlanFilter('all')}
            className={`shrink-0 px-3 py-1 rounded-full text-xs transition-colors ${
              planFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {uniquePlanIds.map((pid) => {
            const plan = plans.find((p) => p.id === pid)
            return (
              <button
                key={pid}
                onClick={() => setPlanFilter(pid)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs transition-colors ${
                  planFilter === pid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {plan?.title || 'Unknown Plan'}
              </button>
            )
          })}
        </div>
      )}

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
            <input
              type="text"
              placeholder={t(language, 'reports.titleField')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full p-3 text-sm"
              required
            />
            <textarea
              placeholder={t(language, 'reports.contentField')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="glass-input w-full p-3 text-sm resize-none"
            />
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="glass-input w-full p-3 text-sm"
            >
              <option value="">{t(language, 'reports.linkedPlan')} (optional)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                {t(language, 'reports.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t(language, 'reports.create')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Reports list */}
      {sorted.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {t(language, 'reports.noReports')}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto">
          <AnimatePresence>
            {sorted.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{report.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar
                          avatarUrl={report.creator.avatarUrl}
                          displayName={report.creator.displayName}
                          size="sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          {report.creator.displayName}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground/50">•</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(report.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {report.plan && (
                      <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {report.plan.title}
                      </span>
                    )}
                  </div>
                  {user && report.createdBy === user.id && (
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="shrink-0 p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {report.content}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
