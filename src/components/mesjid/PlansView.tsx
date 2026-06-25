'use client'

import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Target,
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import {
  useStore,
  type PlanInfo,
  type ReportInfo,
  canCreatePlans,
  canEditPlan,
} from '@/lib/store'
import { t, LANGUAGE_DIRECTION } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import UserAvatar from './UserAvatar'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  OVERDUE: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const STATUS_FLOW = ['PENDING', 'IN_PROGRESS', 'COMPLETED']

export default function PlansView() {
  const {
    user,
    language,
    plans,
    setPlans,
    users,
    reports,
    setReports,
  } = useStore()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Inline report form state
  const [reportPlanId, setReportPlanId] = useState<string | null>(null)
  const [reportTitle, setReportTitle] = useState('')
  const [reportContent, setReportContent] = useState('')

  const dir = LANGUAGE_DIRECTION[language]

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setSelectedAssignees([])
    setShowForm(false)
  }

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          dueDate: dueDate || null,
          assignees: selectedAssignees,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      toast({ title: 'Plan created successfully' })
      resetForm()
      const data = await res.json()
      setPlans([data.plan, ...plans])
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (planId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setPlans(
        plans.map((p) => (p.id === planId ? { ...p, status: newStatus } : p))
      )
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const handleDelete = async (planId: string) => {
    try {
      const res = await fetch(`/api/plans?planId=${planId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'Plan deleted successfully' })
      setPlans(plans.filter((p) => p.id !== planId))
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const handleAddReport = async (e: FormEvent) => {
    e.preventDefault()
    if (!reportTitle.trim() || !reportPlanId || !user) return
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reportTitle.trim(),
          content: reportContent.trim(),
          planId: reportPlanId,
        }),
      })
      if (!res.ok) throw new Error('Failed to create report')
      const data = await res.json()
      setReports([...reports, data.report])
      setReportPlanId(null)
      setReportTitle('')
      setReportContent('')
      toast({ title: 'Report added' })
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports?reportId=${reportId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setReports(reports.filter((r) => r.id !== reportId))
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const planReports = (planId: string) =>
    reports.filter((r) => r.planId === planId)

  const sorted = [...plans].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div dir={dir} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold gradient-text">
          {t(language, 'plans.title')}
        </h2>
        {user && canCreatePlans(user.role) && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {t(language, 'plans.newPlan')}
          </motion.button>
        )}
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
            <input
              type="text"
              placeholder={t(language, 'plans.titleField')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full p-3 text-sm"
              required
            />
            <textarea
              placeholder={t(language, 'plans.descriptionField')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="glass-input w-full p-3 text-sm resize-none"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="glass-input w-full p-3 text-sm"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {t(language, 'plans.assignMembers')}
              </p>
              <div className="flex flex-wrap gap-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-colors ${
                      selectedAssignees.includes(u.id)
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    <UserAvatar avatarUrl={u.avatarUrl} displayName={u.displayName} size="sm" />
                    {u.displayName}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                {t(language, 'plans.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t(language, 'plans.create')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Plans list */}
      {sorted.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {t(language, 'plans.noPlans')}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
          <AnimatePresence>
            {sorted.map((plan) => {
              const isExpanded = expandedId === plan.id
              const canEdit = user && canEditPlan(user.role, plan.createdBy, user.id)
              const currentReports = planReports(plan.id)
              const nextStatusIdx = STATUS_FLOW.indexOf(plan.status) + 1
              const nextStatus = nextStatusIdx < STATUS_FLOW.length ? STATUS_FLOW[nextStatusIdx] : null

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass-card p-4"
                >
                  {/* Plan header */}
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{plan.title}</h3>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[plan.status] || STATUS_COLORS.PENDING}`}
                          >
                            {plan.status.replace('_', ' ')}
                          </span>
                          {plan.isUrgent && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {t(language, 'plans.urgent')}
                            </span>
                          )}
                          {currentReports.length > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {currentReports.length}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {plan.description}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {plan.dueDate && (
                        <span>
                          {format(new Date(plan.dueDate), 'MMM d, yyyy')}
                          {plan.daysLeft != null && plan.daysLeft >= 0 && (
                            <span className="ml-1 text-muted-foreground/60">
                              ({plan.daysLeft} {t(language, 'plans.daysLeft')})
                            </span>
                          )}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <UserAvatar
                          avatarUrl={plan.creator.avatarUrl}
                          displayName={plan.creator.displayName}
                          size="sm"
                        />
                        <span>{plan.creator.displayName}</span>
                      </div>
                    </div>

                    {/* Assignee chips */}
                    {plan.assignments.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {plan.assignments.map((a) => (
                          <UserAvatar
                            key={a.id}
                            avatarUrl={a.user.avatarUrl}
                            displayName={a.user.displayName}
                            size="sm"
                            className="ring-1 ring-border"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-border/50 space-y-3 overflow-hidden"
                      >
                        {/* Full description */}
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {plan.description}
                        </p>

                        {/* Actions */}
                        {canEdit && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {nextStatus && (
                              <button
                                onClick={() => handleStatusChange(plan.id, nextStatus)}
                                className="btn-primary text-xs py-1.5 px-3"
                              >
                                {nextStatus.replace('_', ' ')}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(plan.id)}
                              className="flex items-center gap-1 text-xs text-destructive/60 hover:text-destructive transition-colors px-2 py-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {t(language, 'general.delete')}
                            </button>
                          </div>
                        )}

                        {/* Reports sub-list */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">
                              {t(language, 'plans.reports')} ({currentReports.length})
                            </p>
                            <button
                              onClick={() =>
                                setReportPlanId(reportPlanId === plan.id ? null : plan.id)
                              }
                              className="text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              {t(language, 'plans.addReport')}
                            </button>
                          </div>

                          {/* Inline report form */}
                          {reportPlanId === plan.id && (
                            <form
                              onSubmit={handleAddReport}
                              className="glass-card p-3 space-y-2"
                            >
                              <input
                                type="text"
                                placeholder={t(language, 'plans.reportTitle')}
                                value={reportTitle}
                                onChange={(e) => setReportTitle(e.target.value)}
                                className="glass-input w-full p-2 text-xs"
                                required
                              />
                              <textarea
                                placeholder={t(language, 'plans.reportContent')}
                                value={reportContent}
                                onChange={(e) => setReportContent(e.target.value)}
                                rows={2}
                                className="glass-input w-full p-2 text-xs resize-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportPlanId(null)
                                    setReportTitle('')
                                    setReportContent('')
                                  }}
                                  className="text-xs text-muted-foreground"
                                >
                                  {t(language, 'general.cancel')}
                                </button>
                                <button type="submit" className="btn-primary text-xs py-1 px-3">
                                  {t(language, 'general.create')}
                                </button>
                              </div>
                            </form>
                          )}

                          {currentReports.length === 0 ? (
                            <p className="text-xs text-muted-foreground/50">
                              {t(language, 'plans.noReports')}
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {currentReports.map((r) => (
                                <div
                                  key={r.id}
                                  className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/30"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium">{r.title}</p>
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                                      {r.content}
                                    </p>
                                  </div>
                                  {canEdit && (
                                    <button
                                      onClick={() => handleDeleteReport(r.id)}
                                      className="p-1 text-destructive/40 hover:text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
