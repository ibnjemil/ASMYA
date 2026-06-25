'use client'

import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, LogOut, CheckCircle2, XCircle, Clock, BookOpen, Users,
  MessageSquare, ChevronLeft, ChevronRight, Plus, Camera, Upload,
  GraduationCap, Baby, Loader2, X, Eye, Send, BookCopy, BarChart3, Megaphone,
  UserPlus, Shield, Calendar, AlertTriangle, FileText, UserCheck, UserX,
  RefreshCw, Languages, BookMarked, TrendingUp, PieChart, Trash2, Trophy, BookCheck
} from 'lucide-react'
import { useStore, type AuthUser } from '@/lib/store'
import { t, LANGUAGE_DIRECTION, LANGUAGE_NAMES, type Language } from '@/lib/i18n'

// Error Boundary
class DashErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-lg mb-4 max-w-md break-all">{this.state.error.message}</p>
          <button onClick={() => { this.setState({ error: null }); window.location.reload() }} className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Types
type PublicRole = 'TEACHER' | 'STUDENT' | 'PARENT'
type TeacherView = 'students' | 'student-detail' | 'daily' | 'parents' | 'chat' | 'requests' | 'attendance-stats' | 'announcements'
type StudentView = 'dashboard' | 'results' | 'debts' | 'ranks'
type ParentView = 'child' | 'announcements' | 'chat' | 'ranks'

interface StudentInfo {
  id: string; userId: string; displayName: string; username: string
  parentId: string | null; parent?: { id: string; displayName: string } | null
  todayAttendance: string | null; testCount: number; debtCount: number; avgScore: number | null
}

interface TestResultInfo {
  id: string; title: string; score: number; maxScore: number; imageUrl: string | null
  notes: string | null; createdAt: string; teacher: { displayName: string }
}

interface AttendanceInfo {
  id: string; studentId: string; date: string; status: string; hasBook?: boolean; kitabDay?: string | null; notes: string | null
  student?: { displayName: string }
}

interface AttendanceStats {
  total: number; present: number; absent: number; late: number; rate: number; bookRate: number
}

interface FullStats {
  week: AttendanceStats; month: AttendanceStats
  overall?: AttendanceStats
  kitabDays: { day: string; label: string; total: number; present: number; absent: number; late: number; rate: number; bookRate: number }[]
  bookStats: { total: number; hadBook: number; rate: number }
}

interface DailyActivityInfo {
  studentId: string; displayName: string
  attendance: string; revising: boolean; reading: boolean; readingSkipped: boolean
}

interface DebtInfo {
  id: string; studentId: string; date: string; reason: string; status: string
  student?: { displayName: string }
}

interface ParentInfo {
  id: string; userId: string; displayName: string; username: string
  user: { id: string; displayName: string; username: string }
  children: { userId: string; user: { displayName: string } }[]
}

interface ChatMsg {
  id: string; senderId: string; content: string; createdAt: string
  sender?: { displayName: string }
}

// Helpers
function getPublicRole(user: AuthUser): PublicRole {
  if (user.role === 'TEACHER') return 'TEACHER'
  if (user.role === 'PARENT') return 'PARENT'
  return 'STUDENT'
}

function apiHeaders(user: AuthUser) {
  return { 'x-public-role': getPublicRole(user), 'x-public-user-id': user.id, 'Content-Type': 'application/json' }
}

function apiHeadersNoContent(user: AuthUser) {
  return { 'x-public-role': getPublicRole(user), 'x-public-user-id': user.id }
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function pctColor(p: number) {
  if (p >= 80) return 'text-emerald-400'
  if (p >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function fetchApi(url: string, user: AuthUser) {
  return fetch(url, { headers: apiHeaders(user) }).then(r => r.json()).catch(() => null)
}

function Loader() {
  return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
}

function Avatar({ name, color = 'blue' }: { name: string; color?: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-500/10 text-blue-400', green: 'bg-emerald-500/10 text-emerald-400', purple: 'bg-purple-500/10 text-purple-400', amber: 'bg-amber-500/10 text-amber-400' }
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${colors[color] || colors.blue}`}>
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </div>
  )
}

function StatPill({ label, value, color, suffix }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}{suffix || ''}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  )
}

// Main Component
export default function PublicDashboard() {
  const { user, language, theme, setTheme, setLanguage, logout } = useStore()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApi('/api/public', user).then(d => {
      if (d && !d.error) setProfile(d)
      setLoading(false)
    })
  }, [user])

  if (!user || loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
    </div>
  )

  const role = getPublicRole(user)

  return (
    <DashErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {role === 'TEACHER' && <TeacherDash user={user} lang={language} theme={theme} profile={profile} setTheme={setTheme} setLanguage={setLanguage} logout={logout} />}
        {role === 'STUDENT' && <StudentDash user={user} lang={language} theme={theme} profile={profile} setTheme={setTheme} setLanguage={setLanguage} logout={logout} />}
        {role === 'PARENT' && <ParentDash user={user} lang={language} theme={theme} profile={profile} setTheme={setTheme} setLanguage={setLanguage} logout={logout} />}
      </div>
    </DashErrorBoundary>
  )
}

// Header
function Header({ title, subtitle, theme, setTheme, language, setLanguage, logout }: any) {
  return (
    <div className="glass-nav sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-base font-bold text-foreground">{title}</h1>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn-icon-glass p-2 rounded-lg">
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
        </button>
        <button onClick={logout} className="btn-icon-glass p-2 rounded-lg"><LogOut className="w-4 h-4 text-muted-foreground" /></button>
      </div>
    </div>
  )
}

// TEACHER DASHBOARD
function TeacherDash({ user, lang, theme, profile, setTheme, setLanguage, logout }: any) {
  const [view, setView] = useState<TeacherView>('students')
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [selStudent, setSelStudent] = useState<StudentInfo | null>(null)
  const [parents, setParents] = useState<ParentInfo[]>([])
  const [daily, setDaily] = useState<DailyActivityInfo[]>([])
  const [chatParent, setChatParent] = useState<ParentInfo | null>(null)
  const [signupRequests, setSignupRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddStudent, setShowAddStudent] = useState(false)

  const refreshStudentList = useCallback(() => {
    fetchApi('/api/public/students', user).then(d => { if (d) setStudents(Array.isArray(d) ? d : []) })
  }, [user])

  useEffect(() => {
    fetchApi('/api/public/students', user).then(d => { if (d) { setStudents(Array.isArray(d) ? d : []); setLoading(false) } }).catch(() => setLoading(false))
  }, [user])
  useEffect(() => { if (view === 'parents') fetchApi('/api/public/parents', user).then(d => { if (d) setParents(Array.isArray(d) ? d : []) }) }, [view, user])
  useEffect(() => { if (view === 'daily') fetchApi('/api/public/daily-activities', user).then(d => { if (d) setDaily(Array.isArray(d) ? d : []) }) }, [view, user])
  useEffect(() => { if (view === 'requests') fetchApi('/api/public/signup-request?status=PENDING', user).then(d => { if (Array.isArray(d)) setSignupRequests(d) }) }, [view, user])

  const openStudent = (s: StudentInfo) => { setSelStudent(s); setView('student-detail') }
  const openChat = (p: ParentInfo) => { setChatParent(p); setView('chat') }

  return (
    <>
      <Header title={profile?.displayName || 'Teacher'} subtitle="ASMYA" theme={theme} setTheme={setTheme} language={lang} setLanguage={setLanguage} logout={logout} />
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <AnimatePresence mode="wait">
          {view === 'students' && (
            <motion.div key="stu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-foreground">Students</h2>
                <button onClick={() => setShowAddStudent(true)} className="btn-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Add Student</button>
              </div>
              {loading ? <Loader /> : students.length === 0 ? <p className="text-center text-muted-foreground py-10">No students yet</p> : students.map((s, i) => (
                <motion.div key={s.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => openStudent(s)} className="glass-card p-3.5 flex items-center gap-3 cursor-pointer hover:border-amber-500/30 transition-all active:scale-[0.98]">
                  <Avatar name={s.displayName} color="blue" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{s.displayName}</p>
                    <p className="text-xs text-muted-foreground">{s.avgScore != null ? `${s.avgScore}% avg` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.todayAttendance === 'PRESENT' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {s.todayAttendance === 'ABSENT' && <XCircle className="w-4 h-4 text-red-400" />}
                    {s.todayAttendance === 'LATE' && <Clock className="w-4 h-4 text-amber-400" />}
                    {s.debtCount > 0 && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">{s.debtCount}</span>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
              {showAddStudent && <AddStudentModal user={user} onClose={() => setShowAddStudent(false)} onCreated={() => { setShowAddStudent(false); refreshStudentList() }} />}
            </motion.div>
          )}

          {view === 'student-detail' && selStudent && (
            <StudentDetail key="det" student={selStudent} user={user} lang={lang} onBack={() => { setView('students'); refreshStudentList() }} />
          )}

          {view === 'daily' && (
            <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground mb-2">Today&apos;s Activities</h2>
              {daily.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const readers = daily.filter(d => d.reading && d.attendance !== 'ABSENT')
                    const revisers = daily.filter(d => d.revising && d.attendance !== 'ABSENT')
                    return (
                      <>
                        <div className="glass-card p-3 text-center">
                          <BookOpen className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                          <p className="text-[10px] text-muted-foreground">Today&apos;s Reader{readers.length !== 1 ? 's' : ''}</p>
                          <p className="text-xs font-semibold text-foreground mt-1">{readers.length > 0 ? readers.map(r => r.displayName.split(' ')[0]).join(', ') : 'None yet'}</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                          <BookCopy className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                          <p className="text-[10px] text-muted-foreground">Today&apos;s Reviser{revisers.length !== 1 ? 's' : ''}</p>
                          <p className="text-xs font-semibold text-foreground mt-1">{revisers.length > 0 ? revisers.map(r => r.displayName.split(' ')[0]).join(', ') : 'None yet'}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
              {daily.length === 0 ? <p className="text-center text-muted-foreground py-10">No students enrolled</p> : daily.map((d, i) => (
                <div key={d.studentId} className="glass-card p-3 flex items-center gap-3">
                  <Avatar name={d.displayName} color={d.attendance === 'ABSENT' ? 'amber' : 'green'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.displayName}</p>
                    <p className="text-xs text-muted-foreground">{d.attendance === 'ABSENT' ? 'Absent' : d.attendance === 'PRESENT' ? 'Present' : d.attendance === 'LATE' ? 'Late' : ''}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className={`px-2 py-1 rounded ${d.attendance === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400' : d.attendance === 'ABSENT' ? 'bg-red-500/20 text-red-400' : 'bg-secondary text-muted-foreground'}`}>
                      {d.attendance === 'PRESENT' ? 'Present' : d.attendance === 'ABSENT' ? 'Absent' : '—'}
                    </span>
                    <span className={`px-2 py-1 rounded ${d.revising ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary text-muted-foreground'}`}>Revise {d.revising ? '✓' : '○'}</span>
                    <span className={`px-2 py-1 rounded ${d.readingSkipped ? 'bg-amber-500/20 text-amber-400 line-through' : d.reading ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>
                      Read {d.readingSkipped ? 'Skip' : d.reading ? '✓' : '○'}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {view === 'parents' && (
            <motion.div key="par" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground mb-2">Parents</h2>
              {parents.length === 0 ? <p className="text-center text-muted-foreground py-10">No parents linked yet</p> : parents.map((p, i) => (
                <motion.div key={p.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="glass-card p-3.5 flex items-center gap-3">
                  <Avatar name={p.user.displayName} color="purple" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{p.user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{p.children?.length || 0} child(ren)</p>
                  </div>
                  <button onClick={() => openChat(p)} className="btn-icon-glass p-2 rounded-lg hover:!border-amber-500/30">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {view === 'chat' && chatParent && (
            <ChatPanel key="chat" user={user} otherUser={chatParent.user} lang={lang} onBack={() => setView('parents')} />
          )}

          {view === 'requests' && (
            <motion.div key="req" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Shield className="w-5 h-5 text-amber-400" /> Sign-Up Requests</h2>
              {signupRequests.length === 0 ? <p className="text-center text-muted-foreground py-10">No pending requests</p> : signupRequests.map((req: any) => (
                <div key={req.id} className="glass-card p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div><p className="font-medium text-foreground text-sm">{req.displayName}</p><p className="text-xs text-muted-foreground">@{req.username} · {req.role}</p></div>
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{req.status}</span>
                  </div>
                  {req.childUsername && <p className="text-xs text-muted-foreground">Child: {req.childUsername}</p>}
                  <div className="flex gap-2">
                    <button onClick={async () => { await fetch('/api/public/signup-request', { method: 'PUT', headers: apiHeaders(user), body: JSON.stringify({ id: req.id, action: 'approve' }) }); setSignupRequests(prev => prev.filter(r => r.id !== req.id)) }} className="flex-1 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">Approve</button>
                    <button onClick={async () => { await fetch('/api/public/signup-request', { method: 'PUT', headers: apiHeaders(user), body: JSON.stringify({ id: req.id, action: 'reject' }) }); setSignupRequests(prev => prev.filter(r => r.id !== req.id)) }} className="flex-1 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400">Reject</button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {view === 'attendance-stats' && <StatsWithLeaderboard user={user} />}

          {view === 'announcements' && <TeacherAnnouncements user={user} />}
        </AnimatePresence>
      </div>

      <nav className="glass-nav fixed bottom-0 inset-x-0 flex items-center justify-around py-2 px-1 z-50">
        {([
          { key: 'students' as TeacherView, icon: Users, label: 'Students' },
          { key: 'daily' as TeacherView, icon: BookCopy, label: 'Daily' },
          { key: 'attendance-stats' as TeacherView, icon: BarChart3, label: 'Stats' },
          { key: 'announcements' as TeacherView, icon: Megaphone, label: 'Announce' },
          { key: 'requests' as TeacherView, icon: Shield, label: 'Requests' },
        ]).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setView(key)} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${view === key ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-5 h-5" /><span className="text-[10px]">{label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

// STATS WITH LEADERBOARD
function StatsWithLeaderboard({ user }: { user: AuthUser }) {
  const [tab, setTab] = useState<'stats' | 'ranks'>('stats')
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex gap-2 mb-2">
        <button onClick={() => setTab('stats')} className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === 'stats' ? 'bg-amber-500/20 text-amber-400' : 'glass-card text-muted-foreground'}`}>Attendance Stats</button>
        <button onClick={() => setTab('ranks')} className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === 'ranks' ? 'bg-amber-500/20 text-amber-400' : 'glass-card text-muted-foreground'}`}>Leaderboard</button>
      </div>
      {tab === 'stats' ? <AttendanceStatsView user={user} /> : <LeaderboardView user={user} />}
    </motion.div>
  )
}

// ATTENDANCE STATS VIEW
function AttendanceStatsView({ user }: { user: AuthUser }) {
  const [stats, setStats] = useState<FullStats | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetchApi('/api/public/attendance?mode=stats', user).then(d => { if (d) setStats(d as FullStats); setLoading(false) }) }, [user])
  if (loading) return <Loader />
  const week = stats?.week; const month = stats?.month; const bookStats = stats?.bookStats; const kitabDays = stats?.kitabDays || []
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-400" /> Attendance &amp; Statistics</h2>
      {week && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /> This Week</h3>
          <div className="grid grid-cols-4 gap-2">
            <StatPill label="Total" value={week.total} color="text-foreground" />
            <StatPill label="Present" value={week.present} color="text-emerald-400" />
            <StatPill label="Absent" value={week.absent} color="text-red-400" />
            <StatPill label="Late" value={week.late} color="text-amber-400" />
          </div>
          <div className="mt-3"><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Rate</span><span className={`font-bold ${pctColor(week.rate)}`}>{week.rate}%</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${week.rate >= 80 ? 'bg-emerald-500' : week.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${week.rate}%` }} /></div></div>
        </div>
      )}
      {month && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> This Month</h3>
          <div className="grid grid-cols-4 gap-2">
            <StatPill label="Total" value={month.total} color="text-foreground" />
            <StatPill label="Present" value={month.present} color="text-emerald-400" />
            <StatPill label="Absent" value={month.absent} color="text-red-400" />
            <StatPill label="Late" value={month.late} color="text-amber-400" />
          </div>
          <div className="mt-3"><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Rate</span><span className={`font-bold ${pctColor(month.rate)}`}>{month.rate}%</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${month.rate >= 80 ? 'bg-emerald-500' : month.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${month.rate}%` }} /></div></div>
        </div>
      )}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BookMarked className="w-4 h-4 text-amber-400" /> Kitab Days</h3>
        <div className="space-y-3">
          {kitabDays.map(kd => (
            <div key={kd.day}>
              <div className="flex justify-between items-center mb-1"><span className="text-sm text-foreground font-medium">{kd.label}</span><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{kd.present}/{kd.total}</span><span className={`text-xs font-bold ${pctColor(kd.rate)}`}>{kd.rate}%</span></div></div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${kd.rate >= 80 ? 'bg-emerald-500' : kd.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${kd.rate}%` }} /></div>
            </div>
          ))}
          {kitabDays.every(kd => kd.total === 0) && <p className="text-center text-muted-foreground text-xs py-4">No attendance recorded this month</p>}
        </div>
      </div>
      {bookStats && bookStats.total > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400" /> Book Tracking</h3>
          <div className="grid grid-cols-3 gap-2">
            <StatPill label="Total" value={bookStats.total} color="text-foreground" />
            <StatPill label="Had Book" value={bookStats.hadBook} color="text-emerald-400" />
            <StatPill label="Missing" value={bookStats.total - bookStats.hadBook} color="text-red-400" />
          </div>
          <div className="mt-3"><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Book Rate</span><span className={`font-bold ${pctColor(bookStats.rate)}`}>{bookStats.rate}%</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${bookStats.rate >= 80 ? 'bg-emerald-500' : bookStats.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${bookStats.rate}%` }} /></div></div>
        </div>
      )}
    </motion.div>
  )
}

// LEADERBOARD (Teacher)
function LeaderboardView({ user }: { user: AuthUser }) {
  const [board, setBoard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<string>('compositeScore')
  useEffect(() => {
    fetch('/api/public/test-results', { method: 'PUT', headers: apiHeaders(user) }).then(r => r.json()).then(d => { if (Array.isArray(d)) setBoard(d); setLoading(false) }).catch(() => setLoading(false))
  }, [user])
  const labels: Record<string, string> = { compositeScore: 'Overall', avgScore: 'Avg Score', attendanceRate: 'Attend %', totalRevised: 'Revisions', totalRead: 'Readings', bookRate: 'Book %' }
  if (loading) return <Loader />
  const sorted = [...board].sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Leaderboard</h2>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(Object.keys(labels) as string[]).map(m => (
          <button key={m} onClick={() => setMetric(m)} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap ${metric === m ? 'bg-amber-500/20 text-amber-400' : 'glass-card text-muted-foreground'}`}>{labels[m]}</button>
        ))}
      </div>
      {sorted.length === 0 ? <p className="text-center text-muted-foreground py-10 text-sm">No students yet</p> : sorted.map((s, i) => (
        <div key={s.userId} className="glass-card p-3 flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</div>
          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{s.displayName}</p><p className="text-[10px] text-muted-foreground">{s.totalTests} tests · {s.pendingDebts} debts</p></div>
          <p className={`text-sm font-bold ${pctColor(Math.min(Math.round(s[metric] || 0), 100))}`}>{typeof s[metric] === 'number' ? (['avgScore','attendanceRate','bookRate'].includes(metric) ? Math.round(s[metric]) + '%' : s[metric]) : 0}</p>
        </div>
      ))}
    </motion.div>
  )
}

// STUDENT RANKS (Student + Parent read-only)
function StudentRanks({ user }: { user: AuthUser }) {
  const [board, setBoard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/public/test-results', { method: 'PUT', headers: apiHeaders(user) }).then(r => r.json()).then(d => { if (Array.isArray(d)) setBoard(d); setLoading(false) }).catch(() => setLoading(false))
  }, [user])
  if (loading) return <Loader />
  const sorted = [...board].sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Leaderboard</h2>
      {sorted.length === 0 ? <p className="text-center text-muted-foreground py-10 text-sm">No students yet</p> : sorted.map((s, i) => {
        const isMe = s.userId === user.id
        return (
          <div key={s.userId} className={`glass-card p-3 flex items-center gap-3 ${isMe ? 'border-amber-500/40' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</div>
            <div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${isMe ? 'text-amber-400' : 'text-foreground'}`}>{s.displayName}{isMe ? ' (You)' : ''}</p><p className="text-[10px] text-muted-foreground">{s.totalTests} tests · {s.pendingDebts} debts</p></div>
            <p className={`text-sm font-bold ${pctColor(Math.min(Math.round(s.compositeScore || 0), 100))}`}>{Math.round(s.compositeScore || 0)}</p>
          </div>
        )
      })}
    </motion.div>
  )
}

// TEACHER ANNOUNCEMENTS
function TeacherAnnouncements({ user }: { user: AuthUser }) {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const load = useCallback(() => { fetchApi('/api/public/announcements', user).then(d => { if (Array.isArray(d)) setAnnouncements(d) }) }, [user])
  useEffect(() => { load() }, [load])
  const handlePost = async () => {
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    try { await fetch('/api/public/announcements', { method: 'POST', headers: apiHeaders(user), body: JSON.stringify({ title: title.trim(), content: content.trim() }) }); setTitle(''); setContent(''); setShowForm(false); load() } catch {}
    setSubmitting(false)
  }
  const handleDelete = async (id: string) => { await fetch(`/api/public/announcements?id=${id}`, { method: 'DELETE', headers: apiHeaders(user) }); setAnnouncements(prev => prev.filter(a => a.id !== id)) }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex justify-between items-center"><h2 className="text-lg font-bold text-foreground">Announcements</h2><button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New</button></div>
      <AnimatePresence>{showForm && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="glass-card p-4 space-y-2.5">
            <input className="glass-input w-full px-3 py-2 rounded-lg text-sm text-foreground" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className="glass-input w-full px-3 py-2 rounded-lg text-sm text-foreground resize-none" rows={3} placeholder="Content..." value={content} onChange={e => setContent(e.target.value)} />
            <button onClick={handlePost} disabled={submitting || !title.trim() || !content.trim()} className="btn-primary w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}</button>
          </div>
        </motion.div>
      )}</AnimatePresence>
      {announcements.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">No announcements yet</p>}
      {announcements.map((a: any) => (
        <div key={a.id} className="glass-card p-3"><div className="flex justify-between items-start"><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-foreground">{a.title}</h3><p className="text-xs text-muted-foreground mt-1">{a.content}</p><p className="text-[10px] text-muted-foreground mt-2">{formatDate(a.createdAt)}</p></div><button onClick={() => handleDelete(a.id)} className="text-red-400/60 hover:text-red-400 p-1"><X className="w-4 h-4" /></button></div></div>
      ))}
    </motion.div>
  )
}

// STUDENT DETAIL
function StudentDetail({ student, user, lang, onBack }: { student: StudentInfo; user: AuthUser; lang: Language; onBack: () => void }) {
  const [tab, setTab] = useState<'results' | 'attendance' | 'report' | 'daily'>('results')
  const [results, setResults] = useState<TestResultInfo[]>([])
  const [attendance, setAttendance] = useState<AttendanceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(null)
  const [hasBook, setHasBook] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([fetchApi(`/api/public/test-results?studentId=${student.userId}`, user), fetchApi(`/api/public/attendance?studentId=${student.userId}`, user)]).then(([r, a]) => { if (Array.isArray(r)) setResults(r); if (Array.isArray(a)) setAttendance(a); setLoading(false) }).catch(() => setLoading(false))
  }, [student.userId, user])
  useEffect(() => { loadData() }, [loadData])

  const markAttendance = async (status: string) => {
    setMarkingAttendance(status)
    try {
      const res = await fetch('/api/public/attendance', { method: 'POST', headers: apiHeaders(user), body: JSON.stringify({ studentId: student.userId, status, hasBook }) })
      if (res.ok) loadData()
    } catch {}
    setMarkingAttendance(null)
  }

  const refreshResults = useCallback(() => { fetchApi(`/api/public/test-results?studentId=${student.userId}`, user).then(d => { if (Array.isArray(d)) setResults(d) }) }, [student.userId, user])

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-3 text-sm"><ChevronLeft className="w-4 h-4" /> Back</button>
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={student.displayName} color="blue" />
          <div className="flex-1"><h2 className="text-lg font-bold text-foreground">{student.displayName}</h2><p className="text-xs text-muted-foreground">{student.testCount} tests · {student.debtCount} debts</p></div>
          {student.avgScore != null && <div className="text-center"><p className={`text-xl font-bold ${pctColor(student.avgScore)}`}>{student.avgScore}%</p><p className="text-[10px] text-muted-foreground">Avg</p></div>}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => markAttendance('PRESENT')} disabled={!!markingAttendance} className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${student.todayAttendance === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'glass-card text-muted-foreground'}`}>{markingAttendance === 'PRESENT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Present</button>
          <button onClick={() => markAttendance('ABSENT')} disabled={!!markingAttendance} className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${student.todayAttendance === 'ABSENT' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'glass-card text-muted-foreground'}`}>{markingAttendance === 'ABSENT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Absent</button>
          <button onClick={() => markAttendance('LATE')} disabled={!!markingAttendance} className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${student.todayAttendance === 'LATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'glass-card text-muted-foreground'}`}>{markingAttendance === 'LATE' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />} Late</button>
        </div>
        <div className="flex items-center justify-between mt-3 glass-card p-2.5 rounded-lg cursor-pointer" onClick={() => setHasBook(!hasBook)}>
          <div className="flex items-center gap-2"><BookOpen className={`w-4 h-4 ${hasBook ? 'text-emerald-400' : 'text-red-400'}`} /><span className="text-xs text-foreground font-medium">Has Kitab</span></div>
          <div className={`w-9 h-5 rounded-full transition-colors relative ${hasBook ? 'bg-emerald-500' : 'bg-red-500/40'}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${hasBook ? 'left-[18px]' : 'left-0.5'}`} /></div>
        </div>
        <StudentQuickDaily studentId={student.userId} user={user} disabled={student.todayAttendance === 'ABSENT'} />
      </div>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {(['results', 'attendance', 'report', 'daily'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === tb ? 'bg-amber-500/20 text-amber-400' : 'text-muted-foreground glass-card'}`}>{tb === 'results' ? 'Tests' : tb === 'attendance' ? 'Attendance' : tb === 'report' ? 'Report' : 'Daily'}</button>
        ))}
      </div>
      {loading ? <Loader /> : <>
        {tab === 'results' && <ResultsTab results={results} user={user} studentId={student.userId} onResultAdded={refreshResults} />}
        {tab === 'attendance' && <AttendanceTab records={attendance} />}
        {tab === 'report' && <ReportTab student={student} results={results} attendance={attendance} />}
        {tab === 'daily' && <StudentDailyTab studentId={student.userId} user={user} />}
      </>}
    </motion.div>
  )
}

// Results Tab
function ResultsTab({ results, user, studentId, onResultAdded }: { results: TestResultInfo[]; user: AuthUser; studentId: string; onResultAdded: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState(''); const [score, setScore] = useState(''); const [maxScore, setMaxScore] = useState('100')
  const [notes, setNotes] = useState(''); const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false); const [submitting, setSubmitting] = useState(false)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try { const res = await fetch('/api/public/upload-image', { method: 'POST', headers: apiHeadersNoContent(user), body: fd }); const data = await res.json(); if (data.imageUrl) setImageUrl(data.imageUrl) } catch {}
    setUploading(false)
  }
  const handleSubmit = async () => {
    if (!title || !score) return; setSubmitting(true)
    await fetch('/api/public/test-results', { method: 'POST', headers: apiHeaders(user), body: JSON.stringify({ studentId, title, score, maxScore, notes, imageUrl: imageUrl || null }) })
    setSubmitting(false); setTitle(''); setScore(''); setNotes(''); setImageUrl(''); setShowForm(false); onResultAdded()
  }
  const handleDelete = async (id: string) => { await fetch(`/api/public/test-results?id=${id}`, { method: 'DELETE', headers: apiHeaders(user) }); onResultAdded() }
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center"><h3 className="font-semibold text-foreground text-sm">Test Results</h3><button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button></div>
      <AnimatePresence>{showForm && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="glass-card p-4 space-y-2.5">
            <input className="glass-input w-full px-3 py-2 rounded-lg text-sm text-foreground" placeholder="Test title" value={title} onChange={e => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2"><input className="glass-input px-3 py-2 rounded-lg text-sm text-foreground" placeholder="Score" type="number" value={score} onChange={e => setScore(e.target.value)} /><input className="glass-input px-3 py-2 rounded-lg text-sm text-foreground" placeholder="Max" type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)} /></div>
            <input className="glass-input w-full px-3 py-2 rounded-lg text-sm text-foreground" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex items-center gap-2"><input type="file" accept="image/*" onChange={handleUpload} className="hidden" id="test-img" /><label htmlFor="test-img" className="glass-card px-3 py-2 rounded-lg text-xs text-muted-foreground cursor-pointer hover:text-foreground">{uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : <Camera className="w-3.5 h-3.5 inline" />} Photo</label></div>
            {imageUrl && <img src={imageUrl} alt="preview" className="w-full h-28 object-cover rounded-lg" />}
            <button onClick={handleSubmit} disabled={submitting || !title || !score} className="btn-primary w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50">{submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Result'}</button>
          </div>
        </motion.div>
      )}</AnimatePresence>
      {results.length === 0 ? <p className="text-center text-muted-foreground py-6 text-sm">No results yet</p> : results.map(r => {
        const p = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0
        return (
          <div key={r.id} className="glass-card p-3">
            <div className="flex justify-between items-start"><div><p className="font-medium text-foreground text-sm">{r.title}</p><p className="text-xs text-muted-foreground">{r.teacher?.displayName || ''} · {formatDate(r.createdAt)}</p></div><span className={`text-lg font-bold ${pctColor(p)}`}>{p}%</span></div>
            {r.imageUrl && <img src={r.imageUrl} alt="Test" className="mt-2 w-full h-28 object-cover rounded-lg border border-white/5" />}
            {r.notes && <p className="text-xs text-muted-foreground mt-2">{r.notes}</p>}
            <button onClick={() => handleDelete(r.id)} className="mt-2 text-red-400/60 hover:text-red-400 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
          </div>
        )
      })}
    </div>
  )
}

// Attendance Tab
function AttendanceTab({ records }: { records: AttendanceInfo[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-foreground text-sm">Attendance</h3>
      {records.length === 0 ? <p className="text-muted-foreground text-xs py-3">No records</p> : records.map(a => (
        <div key={a.id} className="glass-card p-3 flex items-center gap-3">
          {a.status === 'PRESENT' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : a.status === 'ABSENT' ? <XCircle className="w-4 h-4 text-red-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
          <div className="flex-1"><p className="text-sm text-foreground">{a.status}</p><p className="text-[10px] text-muted-foreground">{formatDate(a.date)}{a.kitabDay ? ` · ${a.kitabDay}` : ''}</p></div>
          {a.hasBook === false && <BookOpen className="w-3.5 h-3.5 text-red-400" />}
        </div>
      ))}
    </div>
  )
}

// Report Tab
function ReportTab({ student, results, attendance }: { student: StudentInfo; results: TestResultInfo[]; attendance: AttendanceInfo[] }) {
  const avgPct = results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0), 0) / results.length) : 0
  const totalDays = attendance.length; const presentDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
  const bookRate = totalDays > 0 ? Math.round((attendance.filter(a => a.hasBook).length / totalDays) * 100) : 0
  const highest = results.length > 0 ? Math.round(Math.max(...results.map(r => r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0))) : 0
  const lowest = results.length > 0 ? Math.round(Math.min(...results.map(r => r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0))) : 0
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground text-sm">Report</h3>
      <div className="glass-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/30 rounded-lg p-3 text-center"><p className={`text-2xl font-bold ${pctColor(avgPct)}`}>{avgPct}%</p><p className="text-[10px] text-muted-foreground">Average</p></div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-foreground">{totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0}%</p><p className="text-[10px] text-muted-foreground">Attendance</p></div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-emerald-400">{highest}%</p><p className="text-[10px] text-muted-foreground">Highest</p></div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-blue-400">{bookRate}%</p><p className="text-[10px] text-muted-foreground">Book Rate</p></div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-lg font-bold text-foreground">{results.length}</p><p className="text-[10px] text-muted-foreground">Tests</p></div>
          <div><p className="text-lg font-bold text-amber-400">{student.debtCount}</p><p className="text-[10px] text-muted-foreground">Debts</p></div>
          <div><p className="text-lg font-bold text-red-400">{lowest}%</p><p className="text-[10px] text-muted-foreground">Lowest</p></div>
        </div>
      </div>
    </div>
  )
}

// Student Daily Tab (teacher marks)
function StudentDailyTab({ studentId, user }: { studentId: string; user: AuthUser }) {
  const [revise, setRevise] = useState(false); const [read, setRead] = useState(false); const [loading, setLoading] = useState(true)
  useEffect(() => { fetchApi(`/api/public/daily-activities?studentId=${studentId}`, user).then(d => { if (d && Array.isArray(d)) { d.forEach((r: any) => { if (r.type === 'REVISING') setRevise(r.completed); if (r.type === 'READING') setRead(r.completed) }) }; setLoading(false) }) }, [studentId])
  const toggle = async (type: string, completed: boolean) => { await fetch('/api/public/daily-activities', { method: 'POST', headers: apiHeaders(user), body: JSON.stringify({ studentId, type, completed }) }); if (type === 'REVISING') setRevise(completed); else setRead(completed) }
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground text-sm mb-2">Today&apos;s Tasks</h3>
      <div className="glass-card p-4 flex items-center justify-between" onClick={() => toggle('REVISING', !revise)}><div className="flex items-center gap-3"><BookCopy className="w-5 h-5 text-blue-400" /><div><p className="text-sm font-medium text-foreground">Revising</p><p className="text-xs text-muted-foreground">Revise today&apos;s lesson</p></div></div>{revise ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />}</div>
      <div className="glass-card p-4 flex items-center justify-between" onClick={() => toggle('READING', !read)}><div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-emerald-400" /><div><p className="text-sm font-medium text-foreground">Reading</p><p className="text-xs text-muted-foreground">Read during teaching</p></div></div>{read ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />}</div>
    </div>
  )
}

// Student Quick Daily (in student detail, teacher only)
function StudentQuickDaily({ studentId, user, disabled }: { studentId: string; user: AuthUser; disabled?: boolean }) {
  const [revise, setRevise] = useState(false); const [read, setRead] = useState(false)
  useEffect(() => { fetchApi(`/api/public/daily-activities?studentId=${studentId}`, user).then((d: any) => { if (Array.isArray(d)) { const r = d.find((x: any) => x.type === 'REVISING'); const rd = d.find((x: any) => x.type === 'READING'); if (r) setRevise(r.completed); if (rd) setRead(rd.completed) } }) }, [studentId])
  const toggle = async (ttype: string, val: boolean) => { if (ttype === 'REVISING') setRevise(val); else setRead(val); await fetch('/api/public/daily-activities', { method: 'POST', headers: apiHeaders(user), body: JSON.stringify({ studentId, type: ttype, completed: val }) }) }
  return (
    <div className="flex gap-2 mt-3">
      <button disabled={disabled} onClick={() => toggle('REVISING', !revise)} className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${revise ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : (disabled ? 'glass-card text-muted-foreground/40 cursor-not-allowed' : 'glass-card text-muted-foreground cursor-pointer')}`}><BookCopy className="w-3.5 h-3.5" /> Revise {revise ? 'OK' : '--'}</button>
      <button disabled={disabled} onClick={() => toggle('READING', !read)} className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${read ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : (disabled ? 'glass-card text-muted-foreground/40 cursor-not-allowed' : 'glass-card text-muted-foreground cursor-pointer')}`}><BookCheck className="w-3.5 h-3.5" /> Read {read ? 'OK' : '--'}</button>
    </div>
  )
}

// STUDENT DASHBOARD
function StudentDash({ user, lang, theme, profile, setTheme, setLanguage, logout }: any) {
  const [view, setView] = useState<StudentView>('dashboard')
  const [results, setResults] = useState<TestResultInfo[]>([])
  const [debts, setDebts] = useState<DebtInfo[]>([])
  const [dailyActs, setDailyActs] = useState<any[]>([])
  useEffect(() => {
    fetchApi(`/api/public/test-results?studentId=${user.id}`, user).then(d => { if (Array.isArray(d)) setResults(d) })
    fetchApi('/api/public/revision-debts', user).then(d => { if (Array.isArray(d)) setDebts(d) })
    fetchApi('/api/public/daily-activities', user).then(d => { if (Array.isArray(d)) setDailyActs(d) })
  }, [user])
  const todayTasks = dailyActs.length > 0 ? dailyActs : [{ type: 'REVISING', completed: false }, { type: 'READING', completed: false }]
  const avgPct = results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0), 0) / results.length) : null

  return (
    <>
      <Header title={profile?.displayName || 'Student'} subtitle="ASMYA" theme={theme} setTheme={setTheme} language={lang} setLanguage={setLanguage} logout={logout} />
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">My Dashboard</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="glass-card p-3 text-center"><p className={`text-xl font-bold ${avgPct != null ? pctColor(avgPct) : 'text-muted-foreground'}`}>{avgPct ?? '—'}</p><p className="text-[10px] text-muted-foreground">Average</p></div>
                <div className="glass-card p-3 text-center"><p className="text-xl font-bold text-foreground">{results.length}</p><p className="text-[10px] text-muted-foreground">Tests</p></div>
                <div className="glass-card p-3 text-center"><p className="text-xl font-bold text-red-400">{debts.length}</p><p className="text-[10px] text-muted-foreground">Debts</p></div>
              </div>
              <h3 className="text-sm font-semibold text-foreground mt-4">Today&apos;s Tasks</h3>
              {todayTasks.map((t: any) => (
                <div key={t.type} className="glass-card p-3.5 flex items-center gap-3">
                  {t.type === 'REVISING' ? <BookCopy className="w-5 h-5 text-blue-400" /> : <BookOpen className="w-5 h-5 text-emerald-400" />}
                  <div className="flex-1"><p className="text-sm font-medium text-foreground">{t.type === 'REVISING' ? 'Revising' : 'Reading'}</p><p className="text-xs text-muted-foreground">{t.type === 'REVISING' ? 'Revise today\'s lesson' : 'Read during teaching'}</p></div>
                  {t.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
                </div>
              ))}
              <h3 className="text-sm font-semibold text-foreground mt-4">Recent Results</h3>
              {results.length === 0 ? <p className="text-muted-foreground text-xs py-3">No results yet</p> : results.slice(0, 5).map(r => {
                const p = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0
                return (
                  <div key={r.id} className="glass-card p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${p >= 80 ? 'bg-emerald-500/10 text-emerald-400' : p >= 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{p}%</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{r.title}</p><p className="text-xs text-muted-foreground">{r.score}/{r.maxScore} · {formatDate(r.createdAt)}</p></div>
                  </div>
                )
              })}
            </motion.div>
          )}
          {view === 'results' && (
            <motion.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Test Results</h2>
              {results.map(r => { const p = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0; return (
                <div key={r.id} className="glass-card p-3"><div className="flex justify-between items-start"><div><p className="font-medium text-foreground text-sm">{r.title}</p><p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p></div><span className={`text-lg font-bold ${pctColor(p)}`}>{p}%</span></div>{r.imageUrl && <img src={r.imageUrl} alt="Test" className="mt-2 w-full h-28 object-cover rounded-lg border border-white/5" />}{r.notes && <p className="text-xs text-muted-foreground mt-2">{r.notes}</p>}</div>
              )})}
            </motion.div>
          )}
          {view === 'ranks' && <StudentRanks user={user} />}
          {view === 'debts' && (
            <motion.div key="deb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Revision Debts</h2>
              {debts.length === 0 ? <p className="text-center text-muted-foreground py-10">No pending debts</p> : debts.map(d => (
                <div key={d.id} className="glass-card p-3 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" /><div className="flex-1"><p className="text-sm text-foreground">{d.reason}</p><p className="text-xs text-muted-foreground">{formatDate(d.date)}</p></div><span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{d.status}</span></div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <nav className="glass-nav fixed bottom-0 inset-x-0 flex items-center justify-around py-2 px-1 z-50">
        {([
          { key: 'dashboard' as StudentView, icon: BarChart3, label: 'Home' },
          { key: 'results' as StudentView, icon: GraduationCap, label: 'Results' },
          { key: 'ranks' as StudentView, icon: Trophy, label: 'Ranks' },
          { key: 'debts' as StudentView, icon: AlertTriangle, label: 'Debts' },
        ]).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setView(key)} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${view === key ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="w-5 h-5" /><span className="text-[10px]">{label}</span></button>
        ))}
      </nav>
    </>
  )
}

// PARENT DASHBOARD
function ParentDash({ user, lang, theme, profile, setTheme, setLanguage, logout }: any) {
  const [view, setView] = useState<ParentView>('child')
  const [childData, setChildData] = useState<any>(null)
  const [results, setResults] = useState<TestResultInfo[]>([])
  const [attendance, setAttendance] = useState<AttendanceInfo[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [chatTeacher, setChatTeacher] = useState<any>(null)
  useEffect(() => {
    if (!profile?.children || profile.children.length === 0) return
    const child = profile.children[0]; if (!child) return
    fetchApi(`/api/public/student/${child.userId}`, user).then(d => { if (d) setChildData(d) })
    fetchApi(`/api/public/test-results?studentId=${child.userId}`, user).then(d => { if (Array.isArray(d)) setResults(d) })
    fetchApi('/api/public/attendance', user).then(d => { if (Array.isArray(d)) setAttendance(d) })
  }, [profile])
  useEffect(() => { if (view === 'announcements') fetchApi('/api/public/announcements', user).then(d => { if (Array.isArray(d)) setAnnouncements(d) }).catch(() => {}) }, [view, user])
  useEffect(() => { if (view === 'chat' && !chatTeacher) fetchApi('/api/public/teacher', user).then((d: any) => { if (d?.id) setChatTeacher({ id: d.id, displayName: d.displayName }) }).catch(() => {}) }, [view])
  const child = profile?.children?.[0]; const childName = child?.user?.displayName || 'My Child'
  const presentCount = attendance.filter(a => a.status === 'PRESENT').length; const absentCount = attendance.filter(a => a.status === 'ABSENT').length
  const avgPct = results.length > 0 ? Math.round(results.reduce((s: number, r: any) => s + (r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0), 0) / results.length) : null

  return (
    <>
      <Header title={profile?.displayName || 'Parent'} subtitle="ASMYA" theme={theme} setTheme={setTheme} language={lang} setLanguage={setLanguage} logout={logout} />
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <AnimatePresence mode="wait">
          {view === 'child' && (
            <motion.div key="ch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center gap-3 mb-2"><Avatar name={childName} color="green" /><div><h2 className="text-base font-bold text-foreground">{childName}</h2></div></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="glass-card p-2.5 text-center"><p className={`text-lg font-bold ${avgPct != null ? pctColor(avgPct) : 'text-muted-foreground'}`}>{avgPct != null ? avgPct + '%' : '—'}</p><p className="text-[9px] text-muted-foreground">Avg</p></div>
                <div className="glass-card p-2.5 text-center"><p className="text-lg font-bold text-emerald-400">{presentCount}</p><p className="text-[9px] text-muted-foreground">Present</p></div>
                <div className="glass-card p-2.5 text-center"><p className="text-lg font-bold text-red-400">{absentCount}</p><p className="text-[9px] text-muted-foreground">Absent</p></div>
              </div>
              <h3 className="text-sm font-semibold text-foreground mt-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /> Attendance</h3>
              {attendance.length === 0 ? <p className="text-xs text-muted-foreground py-2">No records yet</p> : attendance.slice(0, 10).map((a: any) => (
                <div key={a.id} className="glass-card p-3 flex items-center gap-3">
                  {a.status === 'PRESENT' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : a.status === 'ABSENT' ? <XCircle className="w-5 h-5 text-red-400 shrink-0" /> : <Clock className="w-5 h-5 text-amber-400 shrink-0" />}
                  <div className="flex-1"><p className="text-sm text-foreground">{a.status === 'PRESENT' ? 'Present' : a.status === 'ABSENT' ? 'Absent' : 'Late'}</p><p className="text-[10px] text-muted-foreground">{new Date(a.date).toLocaleDateString()}{a.kitabDay ? ` · ${a.kitabDay}` : ''}</p></div>
                </div>
              ))}
              <h3 className="text-sm font-semibold text-foreground mt-4 flex items-center gap-2"><FileText className="w-4 h-4 text-purple-400" /> Test Results</h3>
              {results.length === 0 ? <p className="text-xs text-muted-foreground py-2">No results yet</p> : results.slice(0, 8).map(r => {
                const p = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0
                return (<div key={r.id} className="glass-card p-3 flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${p >= 80 ? 'bg-emerald-500/10 text-emerald-400' : p >= 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{p}%</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{r.title}</p><p className="text-xs text-muted-foreground">{r.score}/{r.maxScore} · {formatDate(r.createdAt)}</p></div></div>)
              })}
            </motion.div>
          )}
          {view === 'announcements' && (
            <motion.div key="ann" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h2 className="text-base font-bold text-foreground">Announcements</h2>
              {announcements.length === 0 ? <p className="text-center text-muted-foreground py-10 text-sm">No announcements</p> : announcements.map((a: any) => (<div key={a.id} className="glass-card p-3"><h3 className="text-sm font-semibold text-foreground">{a.title}</h3><p className="text-xs text-muted-foreground mt-1">{a.content}</p><p className="text-[10px] text-muted-foreground mt-2">{formatDate(a.createdAt)}</p></div>))}
            </motion.div>
          )}
          {view === 'chat' && <ChatPanel key="pchat" user={user} otherUser={chatTeacher || { id: 'teacher', displayName: 'Ustaz' }} lang={lang} onBack={() => {}} />}
          {view === 'ranks' && <StudentRanks user={user} />}
        </AnimatePresence>
      </div>
      <nav className="glass-nav fixed bottom-0 inset-x-0 flex items-center justify-around py-2 px-1 z-50">
        {([
          { key: 'child' as ParentView, icon: GraduationCap, label: 'Child' },
          { key: 'ranks' as ParentView, icon: Trophy, label: 'Rank' },
          { key: 'announcements' as ParentView, icon: Megaphone, label: 'News' },
          { key: 'chat' as ParentView, icon: MessageSquare, label: 'Chat' },
        ]).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setView(key)} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${view === key ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="w-5 h-5" /><span className="text-[10px]">{label}</span></button>
        ))}
      </nav>
    </>
  )
}

// CHAT PANEL
function ChatPanel({ user, otherUser, lang, onBack }: { user: AuthUser; otherUser: { id: string; displayName: string }; lang: Language; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [text, setText] = useState(''); const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { fetch('/api/chats/dm', { method: 'POST', headers: apiHeaders(user), body: JSON.stringify({ otherUserId: otherUser.id }) }).then(r => r.json()).then(d => { if (d?.messages) setMessages(d.messages) }).catch(() => {}) }, [otherUser.id])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [messages])
  const send = async () => {
    if (!text.trim() || sending) return; setSending(true)
    try { const res = await fetch('/api/chats/dm', { method: 'POST', headers: apiHeaders(user), body: JSON.stringify({ otherUserId: otherUser.id, content: text.trim() }) }); const data = await res.json(); if (data?.message) setMessages(prev => [...prev, data.message]); setText('') } catch {}
    setSending(false)
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      {onBack && <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-2 text-sm"><ChevronLeft className="w-4 h-4" /> Back</button>}
      <div className="glass-card p-3 mb-3 flex items-center gap-3"><Avatar name={otherUser.displayName} color="purple" /><div><p className="text-sm font-semibold text-foreground">{otherUser.displayName}</p><p className="text-[10px] text-muted-foreground">Direct Message</p></div></div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0">
        {messages.length === 0 && <p className="text-center text-muted-foreground text-xs py-10">No messages yet</p>}
        {messages.map(m => { const isMine = m.senderId === user.id; return (
          <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-amber-500/20 text-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'}`}><p>{m.content}</p><p className="text-[9px] text-muted-foreground mt-1">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>
        )})}
      </div>
      <div className="flex gap-2 shrink-0"><input className="glass-input flex-1 px-3 py-2.5 rounded-xl text-sm text-foreground" placeholder="Type a message..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} /><button onClick={send} disabled={sending || !text.trim()} className="btn-primary p-2.5 rounded-xl"><Send className="w-4 h-4" /></button></div>
    </motion.div>
  )
}

// ADD STUDENT MODAL
function AddStudentModal({ user, onClose, onCreated }: { user: AuthUser; onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState(''); const [displayName, setDisplayName] = useState(''); const [password, setPassword] = useState('12345678')
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!username.trim() || !displayName.trim()) return; setLoading(true); setError('')
    try { const res = await fetch('/api/public/students', { method: 'POST', headers: apiHeaders(user), body: JSON.stringify({ username: username.trim(), displayName: displayName.trim(), password }) }); if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setLoading(false); return }; onCreated() } catch { setError('Connection error') }
    setLoading(false)
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="glass-card p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-foreground">Add New Student</h3><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Full Name</label><input className="glass-input w-full px-3 py-2 rounded-lg text-sm text-foreground" placeholder="Student name" value={displayName} onChange={e => setDisplayName(e.target.value)} required /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Username</label><input className="glass-input w-full px-3 py-2 rounded-lg text-sm text-foreground" placeholder="e.g. student_name" value={username} onChange={e => setUsername(e.target.value)} required /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Password</label><input className="glass-input w-full px-3 py-2 rounded-lg text-sm text-foreground" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button type="submit" disabled={loading || !username.trim() || !displayName.trim()} className="btn-primary w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Student'}</button>
          {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg mt-2">{error}</p>}
        </form>
      </motion.div>
    </motion.div>
  )
}
