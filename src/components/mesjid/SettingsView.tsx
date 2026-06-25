'use client'

import { useState, useRef, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  Settings,
  Camera,
  Loader2,
  Sun,
  Moon,
  Globe,
  Save,
  Lock,
  Shield,
  CalendarDays,
} from 'lucide-react'
import {
  useStore,
  type Language,
  type Theme,
  isAmir,
  MAIN_AMIR_ROLES,
} from '@/lib/store'
import { t, LANGUAGE_DIRECTION, LANGUAGE_NAMES } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import UserAvatar from './UserAvatar'

export default function SettingsView() {
  const {
    user,
    language,
    theme,
    setTheme,
    setLanguage,
    setUser,
    messages,
    setMessages,
    chats,
    setChats,
    users,
    setUsers,
    announcements,
    setAnnouncements,
    plans,
    setPlans,
  } = useStore()
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [savingName, setSavingName] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')

  const dir = LANGUAGE_DIRECTION[language]

  const canEditName = user ? isAmir(user.role) : false
  const canEditUsername =
    user && (user.role === 'SUPERIOR_AMIR' || user.role === 'VICE_AMIR')

  // Avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const fd = new FormData()
    fd.append('avatar', file)
    fd.append('userId', user.id)
    try {
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const newUrl = data.avatarUrl

      // Propagate avatar to all store slices
      const updatedUser = { ...user, avatarUrl: newUrl }
      setUser(updatedUser)
      setMessages(
        messages.map((m) =>
          m.senderId === user.id
            ? { ...m, sender: { ...m.sender, avatarUrl: newUrl } }
            : m
        )
      )
      setChats(
        chats.map((c) => ({
          ...c,
          members: c.members.map((m) =>
            m.id === user.id ? { ...m, avatarUrl: newUrl } : m
          ),
        }))
      )
      setUsers(users.map((u) => (u.id === user.id ? { ...u, avatarUrl: newUrl } : u)))
      setAnnouncements(
        announcements.map((a) =>
          a.creator.id === user.id
            ? { ...a, creator: { ...a.creator, avatarUrl: newUrl } }
            : a
        )
      )
      setPlans(
        plans.map((p) =>
          p.creator.id === user.id
            ? { ...p, creator: { ...p.creator, avatarUrl: newUrl } }
            : p
        )
      )
      toast({ title: t(language, 'settings.uploadSuccess') })
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Display name save
  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return
    setSavingName(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, displayName: displayName.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setUser({ ...user, displayName: displayName.trim() })
      toast({ title: t(language, 'general.save') })
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    } finally {
      setSavingName(false)
    }
  }

  // Password change
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!newPassword || !currentPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      setPwdMsg(t(language, 'settings.passwordMismatch'))
      return
    }
    setChangingPwd(true)
    setPwdMsg('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPwdMsg(data.error || t(language, 'settings.wrongPassword'))
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwdMsg(t(language, 'settings.passwordChanged'))
      toast({ title: t(language, 'settings.passwordChanged') })
    } catch {
      setPwdMsg(t(language, 'general.error'))
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <div dir={dir} className="p-4 space-y-6">
      <h2 className="text-xl font-bold gradient-text">
        {t(language, 'settings.title')}
      </h2>

      {/* Profile picture */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar
              avatarUrl={user?.avatarUrl || null}
              displayName={user?.displayName || ''}
              size="xl"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -end-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="font-semibold">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground">@{user?.username}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              {t(language, 'settings.profilePicture')}
            </p>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="w-4 h-4 text-primary" />
          {t(language, 'settings.displayName')}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={!canEditName}
            className="glass-input flex-1 p-3 text-sm disabled:opacity-50"
            placeholder={t(language, 'settings.displayName')}
          />
          {canEditName && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveName}
              disabled={savingName || displayName === user?.displayName}
              className="btn-primary p-3"
            >
              {savingName ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </motion.button>
          )}
        </div>
        {!canEditName && (
          <p className="text-[10px] text-muted-foreground/50">
            {t(language, 'settings.onlyAmirs')}
          </p>
        )}
      </div>

      {/* Password change */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lock className="w-4 h-4 text-primary" />
          {t(language, 'settings.changePassword')}
        </div>
        <form onSubmit={handleChangePassword} className="space-y-2">
          <input
            type="password"
            placeholder={t(language, 'settings.currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="glass-input w-full p-3 text-sm"
            required
          />
          <input
            type="password"
            placeholder={t(language, 'settings.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="glass-input w-full p-3 text-sm"
            minLength={6}
            required
          />
          <input
            type="password"
            placeholder={t(language, 'settings.confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="glass-input w-full p-3 text-sm"
            required
          />
          {pwdMsg && (
            <p
              className={`text-xs ${
                pwdMsg.includes(t(language, 'settings.passwordChanged'))
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}
            >
              {pwdMsg}
            </p>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={changingPwd}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            {changingPwd && <Loader2 className="w-4 h-4 animate-spin" />}
            {t(language, 'settings.changePassword')}
          </motion.button>
        </form>
      </div>

      {/* Appearance */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-primary" />
          ) : (
            <Sun className="w-4 h-4 text-primary" />
          )}
          {t(language, 'settings.theme')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors border ${
              theme === 'dark'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground/30'
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors border ${
              theme === 'light'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground/30'
            }`}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Globe className="w-4 h-4 text-primary" />
          {t(language, 'settings.language')}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['en', 'am', 'ar'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`py-2.5 rounded-xl text-sm transition-colors border ${
                language === lang
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/30'
              }`}
            >
              {LANGUAGE_NAMES[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Role info */}
      {user && (
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="w-4 h-4 text-primary" />
            Role & Info
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium">{user.role.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Side</p>
              <p className="font-medium">{user.side}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
