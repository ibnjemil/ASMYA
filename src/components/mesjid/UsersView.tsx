'use client'

import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Trash2,
  X,
  Loader2,
  Search,
  UserPlus,
  Shield,
  Heart,
} from 'lucide-react'
import {
  useStore,
  type UserInfo,
  type Role,
  type Side,
  canManageUsers,
} from '@/lib/store'
import { t, LANGUAGE_DIRECTION } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import UserAvatar from './UserAvatar'

const ROLE_LABELS: Record<Role, string> = {
  SUPERIOR_AMIR: 'Superior Leader',
  VICE_AMIR: 'Vice Leader',
  SECRETARY: 'Secretary',
  EDUCATION_AMIR: 'Education Leader',
  COMMUNITY_AMIR: 'Community Leader',
  ADMIN_AMIR: 'Admin Leader',
  FINANCE_AMIR: 'Finance Leader',
  PROGRAM_AMIR: 'Program Leader',
  SOCIAL_MEDIA_AMIR: 'Social Media Leader',
  FOLLOWER: 'Follower',
}

const SIDE_COLORS: Record<Side, string> = {
  MEN: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  WOMEN: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
}

export default function UsersView() {
  const {
    user,
    language,
    users,
    setUsers,
  } = useStore()
  const { toast } = useToast()

  const [tab, setTab] = useState<'all' | 'followers'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<Role>('FOLLOWER')
  const [side, setSide] = useState<Side>('MEN')
  const [subAmirId, setSubAmirId] = useState('')

  const dir = LANGUAGE_DIRECTION[language]

  const resetForm = () => {
    setUsername('')
    setPassword('')
    setDisplayName('')
    setRole('FOLLOWER')
    setSide('MEN')
    setSubAmirId('')
    setShowForm(false)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim() || !displayName.trim() || !user) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        username: username.trim(),
        password: password.trim(),
        displayName: displayName.trim(),
        role,
        side,
      }
      if (role === 'FOLLOWER') {
        if (user.role !== 'FOLLOWER') {
          body.subAmirId = user.id
        } else if (subAmirId) {
          body.subAmirId = subAmirId
        }
      }
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      setUsers([...users, data])
      toast({ title: 'Member created successfully' })
      resetForm()
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/users?userId=${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setUsers(users.filter((u) => u.id !== userId))
      toast({ title: 'Member removed' })
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const FOLLOWER_ASSIGNABLE_ROLES = ['FINANCE_AMIR', 'COMMUNITY_AMIR', 'SOCIAL_MEDIA_AMIR', 'EDUCATION_AMIR']
  const potentialLeaders = users.filter((u) =>
    FOLLOWER_ASSIGNABLE_ROLES.includes(u.role)
  )

  // Filtered users
  const displayedUsers =
    tab === 'followers' && user
      ? users.filter((u) => u.subAmirId === user.id)
      : users.filter(
          (u) =>
            u.displayName.toLowerCase().includes(search.toLowerCase()) ||
            u.username.toLowerCase().includes(search.toLowerCase())
        )

  const availableRoles = (_s: Side): Role[] => ['FOLLOWER']

  return (
    <div dir={dir} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold gradient-text">
          {t(language, 'users.title')}
        </h2>
        {user && canManageUsers(user.role) && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {t(language, 'users.addUser')}
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        <button
          onClick={() => setTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          {t(language, 'users.allMembers')} ({users.length})
        </button>
        {user && (
          <button
            onClick={() => setTab('followers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'followers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            {t(language, 'users.myFollowers')} (
            {users.filter((u) => u.subAmirId === user.id).length})
          </button>
        )}
      </div>

      {/* Search */}
      {tab === 'all' && (
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t(language, 'general.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full ps-9 pe-3 py-2.5 text-sm"
          />
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
              placeholder={t(language, 'users.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input w-full p-3 text-sm"
              required
            />
            <input
              type="password"
              placeholder={t(language, 'users.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full p-3 text-sm"
              required
            />
            <input
              type="text"
              placeholder={t(language, 'users.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="glass-input w-full p-3 text-sm"
              required
            />
            <select
              value={side}
              onChange={(e) => {
                const newSide = e.target.value as Side
                setSide(newSide)
              }}
              className="glass-input w-full p-3 text-sm"
            >
              <option value="MEN">Men</option>
              <option value="WOMEN">Women</option>
            </select>
            {user?.role === 'FOLLOWER' && (
              <select
                value={subAmirId}
                onChange={(e) => setSubAmirId(e.target.value)}
                className="glass-input w-full p-3 text-sm"
              >
                <option value="">Choose a leader to work under *</option>
                {potentialLeaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.displayName} ({ROLE_LABELS[l.role]})
                  </option>
                ))}
              </select>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                {t(language, 'users.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t(language, 'users.create')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Users list */}
      {displayedUsers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {t(language, 'users.noUsers')}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
          <AnimatePresence>
            {displayedUsers.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-3 flex items-center gap-3"
              >
                <UserAvatar
                  avatarUrl={u.avatarUrl}
                  displayName={u.displayName}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{u.displayName}</span>
                    <span className="text-xs text-muted-foreground">@{u.username}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                      <Shield className="w-3 h-3 inline me-0.5" />
                      {ROLE_LABELS[u.role]}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${SIDE_COLORS[u.side]}`}
                    >
                      {u.side}
                    </span>
                  </div>
                </div>
                {user && canManageUsers(user.role) && (
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="shrink-0 p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
