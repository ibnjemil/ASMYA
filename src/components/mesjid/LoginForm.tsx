'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { useStore, type AuthUser, type Side } from '@/lib/store'
import { t } from '@/lib/i18n'

interface LoginFormProps {
  side: Side | null
  onSuccess: () => void
  onBack: () => void
}

export default function LoginForm({ side, onSuccess, onBack }: LoginFormProps) {
  const { language, setUser, setView } = useStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()
      const user = data.user

      if (!res.ok) {
        setError(t(language, 'login.invalidCredentials'))
        return
      }

      // Validate side — user must belong to the selected side
      if (user.side !== side) {
        setError(t(language, 'login.wrongSide'))
        return
      }

      // Success — store user and navigate
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        side: user.side,
        subAmirId: user.subAmirId,
      }

      setUser(authUser)
      setView('chat')
      onSuccess()
    } catch {
      setError(t(language, 'login.invalidCredentials'))
    } finally {
      setIsLoading(false)
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="fixed inset-0 mesh-bg islamic-pattern flex items-center justify-center p-4">
      <motion.div
        className="glass-card p-6 sm:p-8 w-full max-w-md"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Back button */}
        <motion.button
          variants={item}
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </motion.button>

        {/* Title */}
        <motion.div variants={item} className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            {t(language, 'login.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {side === 'MEN' ? "Men's Side" : side === 'WOMEN' ? "Women's Side" : 'Admin Side'}
          </p>
        </motion.div>

        {/* Form */}
        <motion.form variants={item} onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground px-1">
              {t(language, 'login.username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t(language, 'login.username')}
              className="glass-input w-full px-4 py-3 text-sm"
              autoComplete="username"
              required
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground px-1">
              {t(language, 'login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t(language, 'login.password')}
                className="glass-input w-full px-4 py-3 pr-12 text-sm"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-400 px-1"
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <motion.button
            variants={item}
            type="submit"
            disabled={isLoading || !username || !password}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>...</span>
              </>
            ) : (
              t(language, 'login.loginButton')
            )}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  )
}