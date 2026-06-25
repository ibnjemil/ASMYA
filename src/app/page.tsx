'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { LANGUAGE_DIRECTION } from '@/lib/i18n'
import WelcomeSplash from '@/components/mesjid/WelcomeSplash'
import AccessChoice from '@/components/mesjid/AccessChoice'
import SideSelection from '@/components/mesjid/SideSelection'
import LoginForm from '@/components/mesjid/LoginForm'
import Dashboard from '@/components/mesjid/Dashboard'
import PublicDashboard from '@/components/mesjid/PublicDashboard'

type LoginStep = 'splash' | 'access' | 'side' | 'login' | 'public-login' | 'public-signup'

const PUBLIC_ROLES = ['TEACHER', 'STUDENT', 'PARENT'] as const

export default function Home() {
  const { user, language, theme, setLanguage } = useStore()
  const [loginStep, setLoginStep] = useState<LoginStep>('splash')
  const [publicRole, setPublicRole] = useState<string | null>(null)
  const [selectedSide, setSelectedSide] = useState<'MEN' | 'WOMEN' | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Reset loginStep to splash when user logs out
  useEffect(() => {
    if (mounted && !user) {
      setLoginStep('splash')
      setPublicRole(null)
      setSelectedSide(null)
    }
  }, [user, mounted])

  useEffect(() => {
    if (!mounted) return
    if (theme === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    }
  }, [theme, mounted])

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // Logged in → go straight to dashboard
  if (user && PUBLIC_ROLES.includes(user.role as any)) {
    return (
      <div dir={LANGUAGE_DIRECTION[language]}>
        <PublicDashboard />
      </div>
    )
  }

  if (user && !PUBLIC_ROLES.includes(user.role as any)) {
    return (
      <div dir={LANGUAGE_DIRECTION[language]}>
        <Dashboard />
      </div>
    )
  }

  // Helper to go to public login for a specific role
  const goPublicLogin = (role: string) => {
    setPublicRole(role)
    if (role === 'PARENT') setLanguage('am')
    setLoginStep('public-login')
  }

  return (
    <div dir={LANGUAGE_DIRECTION[language]}>
      <AnimatePresence mode="wait">
        {loginStep === 'splash' && (
          <WelcomeSplash key="splash" onComplete={() => setLoginStep('access')} />
        )}
        {loginStep === 'access' && (
          <AccessChoice
            key="access"
            onPrivate={() => setLoginStep('side')}
            onTeacher={() => goPublicLogin('TEACHER')}
            onStudent={() => goPublicLogin('STUDENT')}
            onParent={() => goPublicLogin('PARENT')}
          />
        )}
        {loginStep === 'side' && (
          <SideSelection
            key="side"
            onNext={(side) => { setSelectedSide(side); setLoginStep('login') }}
            onBack={() => setLoginStep('access')}
          />
        )}
        {loginStep === 'login' && (
          <LoginForm
            key="login"
            side={selectedSide}
            onSuccess={() => {}}
            onBack={() => setLoginStep('side')}
          />
        )}
        {loginStep === 'public-login' && (
          <PublicLoginForm key="pub-login" role={publicRole} onBack={() => setLoginStep('access')} onSignup={() => setLoginStep('public-signup')} />
        )}
        {loginStep === 'public-signup' && (
          <PublicSignupForm key="pub-signup" role={publicRole} onBack={() => setLoginStep('public-login')} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Public Login Form ────────────────────────────────────────────────────────

function PublicLoginForm({ role, onBack, onSignup }: { role: string | null; onBack: () => void; onSignup: () => void }) {
  const { setUser, language } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const roleLabel = role === 'TEACHER' ? 'Teacher (Ustaz)'
    : role === 'STUDENT' ? 'Student'
    : 'Parent'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/public/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success || !data.user) {
        setError(data.error || 'Invalid credentials')
        setLoading(false)
        return
      }

      // Verify the user has the correct role
      if (role && data.user.role !== role) {
        setError(`This account is not a ${roleLabel}`)
        setLoading(false)
        return
      }

      setUser({
        id: data.user.id,
        username: data.user.username,
        displayName: data.user.displayName,
        avatarUrl: data.user.avatarUrl,
        role: data.user.role as any,
        side: data.user.side || ('MEN' as any),
        subAmirId: data.user.subAmirId,
      })
    } catch {
      setError('Connection error')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 mesh-bg islamic-pattern flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 sm:p-8 w-full max-w-sm">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground mb-4 text-sm flex items-center gap-1">
          ← Back
        </button>
        <h2 className="text-xl font-bold gradient-text mb-1">{roleLabel} Login</h2>
        <p className="text-sm text-muted-foreground mb-6">Enter your credentials</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Username</label>
            <input className="glass-input w-full px-4 py-3 rounded-xl text-foreground" placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Password</label>
            <div className="relative">
              <input className="glass-input w-full px-4 py-3 rounded-xl text-foreground pr-10" placeholder="Enter password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading || !username || !password} className="btn-primary w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-secondary/30 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Demo Accounts:</p>
          <p className="text-xs text-muted-foreground">Superior Amir: <span className="text-foreground">ustaz_jihad_m</span> / 12345678</p>
          <p className="text-xs text-muted-foreground">Teacher: <span className="text-foreground">ustaz_jihad</span> / 12345678</p>
          <p className="text-xs text-muted-foreground">Student: <span className="text-foreground">student_ahmed</span> / 12345678</p>
          <p className="text-xs text-muted-foreground">Parent: <span className="text-foreground">parent_mohamed</span> / 12345678</p>
        </div>

        {role !== 'TEACHER' && (
          <button onClick={onSignup} className="w-full mt-4 text-center text-sm text-amber-400 hover:text-amber-300 transition-colors">
            Don't have an account? <span className="font-medium">Request Sign Up</span>
          </button>
        )}
      </motion.div>
    </div>
  )
}

// ─── Public Sign Up Request Form ──────────────────────────────────────────────

function PublicSignupForm({ role, onBack }: { role: string | null; onBack: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [childUsername, setChildUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const roleLabel = role === 'STUDENT' ? 'Student' : 'Parent'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/public/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          displayName: displayName.trim(),
          role,
          childUsername: role === 'PARENT' ? childUsername.trim() : undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit request')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('Connection error')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="fixed inset-0 mesh-bg islamic-pattern flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 sm:p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold gradient-text mb-2">Request Sent!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your {roleLabel} account request has been sent to the Ustaz. You can login once they approve it.
          </p>
          <button onClick={onBack} className="btn-primary w-full py-3 rounded-xl font-medium">Back to Login</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 mesh-bg islamic-pattern flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 sm:p-8 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground mb-4 text-sm flex items-center gap-1">
          ← Back
        </button>
        <h2 className="text-xl font-bold gradient-text mb-1">Request {roleLabel} Account</h2>
        <p className="text-sm text-muted-foreground mb-6">The Ustaz will verify and approve your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Full Name</label>
            <input className="glass-input w-full px-4 py-3 rounded-xl text-foreground" placeholder="Your full name" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Username</label>
            <input className="glass-input w-full px-4 py-3 rounded-xl text-foreground" placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Password (min 6 chars)</label>
            <input className="glass-input w-full px-4 py-3 rounded-xl text-foreground" type="password" placeholder="Choose a password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required minLength={6} />
          </div>

          {role === 'PARENT' && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Child's Username</label>
              <input className="glass-input w-full px-4 py-3 rounded-xl text-foreground" placeholder="Your child's username (from Ustaz)" value={childUsername} onChange={e => setChildUsername(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">Ask the Ustaz for your child's username</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading || !username || !password || !displayName} className="btn-primary w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}