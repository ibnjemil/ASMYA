'use client'

import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Plus, Calendar, Clock, Users, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Circle, FileText, Edit, Trash2,
} from 'lucide-react'
import UserAvatar from './UserAvatar'
import {
  useStore, canCreatePlans, canEditPlan, canDeleteContent,
  MAIN_AMIR_ROLES, SUB_AMIR_ROLES, ALL_AMIR_ROLES,
} from '@/lib/store'
import { t, LANGUAGE_DIRECTION } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  OVERDUE: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const STATUS_ICONS: Record<string, typeof Circle> = {
  PENDING: Circle, IN_PROGRESS: Clock, COMPLETED: CheckCircle, OVERDUE: AlertTriangle,
}

const STATUS_FLOW = ['PENDING', 'IN_PROGRESS', 'COMPLETED']

export default function PlansReportsView() {
  const { user, language, plans, setPlans, reports, setReports, users } = useStore()
  const { toast } = useToast()
  const dir = LANGUAGE_DIRECTION[language]

  const [tab, setTab] = useState<'plans' | 'reports'>('plans')
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reportPlanId, setReportPlanId] = useState<string | null>(null)

  const [pTitle, setPTitle] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pDue, setPDue] = useState('')
  const [pAssignees, setPAssignees] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [rTitle, setRTitle] = useState('')
  const [rContent, setRContent] = useState('')
  const [rPlanId, setRPlanId] = useState('')
  const [irTitle, setIrTitle] = useState('')
  const [irContent, setIrContent] = useState('')

  const resetPlanForm = () => { setPTitle(''); setPDesc(''); setPDue(''); setPAssignees([]); setShowPlanForm(false) }
  const resetReportForm = () => { setRTitle(''); setRContent(''); setRPlanId(''); setShowReportForm(false) }
  const toggleAssignee = (id: string) => setPAssignees((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])

  const refetchPlans = async () => {
    if (!user) return
    const res = await fetch(`/api/plans?side=${user.side}`)
    if (res.ok) setPlans(await res.json())
  }
  const refetchReports = async () => {
    if (!user) return
    const res = await fetch(`/api/reports?side=${user.side}`)
    if (res.ok) setReports(await res.json())
  }

  const handleCreatePlan = async (e: FormEvent) => {
    e.preventDefault()
    if (!pTitle.trim() || !user) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pTitle.trim(), description: pDesc.trim(),
          dueDate: pDue || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdBy: user.id, side: user.side, assignmentIds: pAssignees,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Plan created successfully' })
      resetPlanForm()
      await refetchPlans()
    } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }
    finally { setSubmitting(false) }
  }

  const handleStatusChange = async (planId: string, status: string) => {
    try {
      const res = await fetch('/api/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, status }),
      })
      if (!res.ok) throw new Error()
      setPlans(plans.map((p) => (p.id === planId ? { ...p, status } : p)))
    } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      const res = await fetch(`/api/plans?planId=${planId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Plan deleted' })
      setPlans(plans.filter((p) => p.id !== planId))
    } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }
  }

  const handleCreateReport = async (e: FormEvent, planId?: string | null) => {
    e.preventDefault()
    if (!rTitle.trim() && !irTitle.trim()) return
    const title = planId ? irTitle.trim() : rTitle.trim()
    const content = planId ? irContent.trim() : rContent.trim()
    if (!title) return
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, planId: planId || null, createdBy: user.id, side: user.side }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Report created' })
      if (planId) { setReportPlanId(null); setIrTitle(''); setIrContent('') }
      else resetReportForm()
      await refetchReports()
    } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }
  }

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports?reportId=${reportId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setReports(reports.filter((r) => r.id !== reportId))
    } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }
  }

  const planReports = (pid: string) => reports.filter((r) => r.planId === pid)
  const sortedPlans = [...plans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const sortedReports = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div dir={dir} className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {(['plans', 'reports'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {key === 'plans' ? t(language, 'plans.title') : t(language, 'reports.title')}
          </button>
        ))}
      </div>

      {/* Plans Tab */}
      {tab === 'plans' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold gradient-text">{t(language, 'plans.title')}</h2>
            {user && canCreatePlans(user.role) && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowPlanForm(!showPlanForm)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> {t(language, 'plans.newPlan')}
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {showPlanForm && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleCreatePlan} className="glass-card p-4 space-y-3 overflow-hidden">
                <input type="text" placeholder={t(language, 'plans.titleField')} value={pTitle} onChange={(e) => setPTitle(e.target.value)} className="glass-input w-full p-3 text-sm" required />
                <textarea placeholder={t(language, 'plans.descriptionField')} value={pDesc} onChange={(e) => setPDesc(e.target.value)} rows={3} className="glass-input w-full p-3 text-sm resize-none" />
                <input type="date" value={pDue} onChange={(e) => setPDue(e.target.value)} className="glass-input w-full p-3 text-sm" />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t(language, 'plans.assignMembers')}</p>
                  <div className="flex flex-wrap gap-2">
                    {users.map((u) => (
                      <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-colors ${pAssignees.includes(u.id) ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30'}`}>
                        <UserAvatar avatarUrl={u.avatarUrl} displayName={u.displayName} size="sm" /> {u.displayName}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={resetPlanForm} className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:bg-muted transition-colors">{t(language, 'plans.cancel')}</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 text-sm">{submitting && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}{t(language, 'plans.create')}</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {sortedPlans.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">{t(language, 'plans.noPlans')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
              <AnimatePresence>
                {sortedPlans.map((plan) => {
                  const isExpanded = expandedId === plan.id
                  const canEdit = user && canEditPlan(user.role, plan.createdBy, user.id)
                  const currentReports = planReports(plan.id)
                  const nextIdx = STATUS_FLOW.indexOf(plan.status) + 1
                  const nextStatus = nextIdx < STATUS_FLOW.length ? STATUS_FLOW[nextIdx] : null
                  const StatusIcon = STATUS_ICONS[plan.status] || Circle

                  return (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card p-4">
                      <div className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${plan.status === 'PENDING' ? 'text-yellow-400' : plan.status === 'IN_PROGRESS' ? 'text-blue-400' : plan.status === 'COMPLETED' ? 'text-emerald-400' : 'text-red-400'}`} />
                              <h3 className="font-semibold text-sm">{plan.title}</h3>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[plan.status] || STATUS_COLORS.PENDING}`}>{plan.status.replace('_', ' ')}</span>
                              {plan.isUrgent && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t(language, 'plans.urgent')}</span>}
                              {currentReports.length > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />{currentReports.length}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{plan.description}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {plan.dueDate && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(plan.dueDate), 'MMM d, yyyy')}{plan.daysLeft != null && plan.daysLeft >= 0 && <span className="ml-1 text-muted-foreground/60">({plan.daysLeft} {t(language, 'plans.daysLeft')})</span>}</span>
                          )}
                          <div className="flex items-center gap-1.5"><UserAvatar avatarUrl={plan.creator.avatarUrl} displayName={plan.creator.displayName} size="sm" /><span>{plan.creator.displayName}</span></div>
                        </div>
                        {plan.assignments.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            {plan.assignments.map((a) => <UserAvatar key={a.id} avatarUrl={a.user.avatarUrl} displayName={a.user.displayName} size="sm" className="ring-1 ring-border" />)}
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-border/50 space-y-3 overflow-hidden">
                            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{plan.description}</p>
                            {canEdit && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {nextStatus && (
                                  <button onClick={() => handleStatusChange(plan.id, nextStatus)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                                    <Edit className="w-3 h-3" />{nextStatus.replace('_', ' ')}
                                  </button>
                                )}
                                <button onClick={() => handleDeletePlan(plan.id)} className="flex items-center gap-1 text-xs text-destructive/60 hover:text-destructive transition-colors px-2 py-1">
                                  <Trash2 className="w-3.5 h-3.5" />{t(language, 'general.delete')}
                                </button>
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground">{t(language, 'plans.reports')} ({currentReports.length})</p>
                                <button onClick={() => setReportPlanId(reportPlanId === plan.id ? null : plan.id)} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"><Plus className="w-3 h-3" />{t(language, 'plans.addReport')}</button>
                              </div>
                              {reportPlanId === plan.id && (
                                <form onSubmit={(e) => handleCreateReport(e, plan.id)} className="glass-card p-3 space-y-2">
                                  <input type="text" placeholder={t(language, 'plans.reportTitle')} value={irTitle} onChange={(e) => setIrTitle(e.target.value)} className="glass-input w-full p-2 text-xs" required />
                                  <textarea placeholder={t(language, 'plans.reportContent')} value={irContent} onChange={(e) => setIrContent(e.target.value)} rows={2} className="glass-input w-full p-2 text-xs resize-none" />
                                  <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => { setReportPlanId(null); setIrTitle(''); setIrContent('') }} className="text-xs text-muted-foreground">{t(language, 'general.cancel')}</button>
                                    <button type="submit" className="btn-primary text-xs py-1 px-3">{t(language, 'general.create')}</button>
                                  </div>
                                </form>
                              )}
                              {currentReports.length === 0 ? <p className="text-xs text-muted-foreground/50">{t(language, 'plans.noReports')}</p> : (
                                <div className="space-y-1.5">
                                  {currentReports.map((r) => (
                                    <div key={r.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/30">
                                      <div className="min-w-0"><p className="text-xs font-medium">{r.title}</p><p className="text-[10px] text-muted-foreground line-clamp-1">{r.content}</p></div>
                                      {canEdit && <button onClick={() => handleDeleteReport(r.id)} className="p-1 text-destructive/40 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>}
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
        </motion.div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold gradient-text">{t(language, 'reports.title')}</h2>
            {user && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowReportForm(!showReportForm)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> {t(language, 'reports.newReport')}
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {showReportForm && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={(e) => handleCreateReport(e, null)} className="glass-card p-4 space-y-3 overflow-hidden">
                <input type="text" placeholder={t(language, 'reports.titleField')} value={rTitle} onChange={(e) => setRTitle(e.target.value)} className="glass-input w-full p-3 text-sm" required />
                <textarea placeholder={t(language, 'reports.contentField')} value={rContent} onChange={(e) => setRContent(e.target.value)} rows={4} className="glass-input w-full p-3 text-sm resize-none" />
                <select value={rPlanId} onChange={(e) => setRPlanId(e.target.value)} className="glass-input w-full p-3 text-sm">
                  <option value="">{t(language, 'reports.linkedPlan')} (optional)</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={resetReportForm} className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:bg-muted transition-colors">{t(language, 'reports.cancel')}</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 text-sm">{submitting && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}{t(language, 'reports.create')}</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {sortedReports.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">{t(language, 'reports.noReports')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
              <AnimatePresence>
                {sortedReports.map((report) => (
                  <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{report.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className="flex items-center gap-1.5"><UserAvatar avatarUrl={report.creator.avatarUrl} displayName={report.creator.displayName} size="sm" /><span className="text-xs text-muted-foreground">{report.creator.displayName}</span></div>
                          <span className="text-xs text-muted-foreground/50">•</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(report.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        {report.plan && <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{report.plan.title}</span>}
                      </div>
                      {user && (canDeleteContent(user.role) || report.createdBy === user.id) && (
                        <button onClick={() => handleDeleteReport(report.id)} className="shrink-0 p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{report.content}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}