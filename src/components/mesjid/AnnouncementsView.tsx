'use client'

import { useState, useRef, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Megaphone,
  Plus,
  Trash2,
  X,
  Loader2,
  ImageIcon,
} from 'lucide-react'
import {
  useStore,
  type AnnouncementInfo,
  canPostAnnouncements,
  canDeleteContent,
} from '@/lib/store'
import { t, LANGUAGE_DIRECTION } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import UserAvatar from './UserAvatar'

export default function AnnouncementsView() {
  const {
    user,
    language,
    announcements,
    setAnnouncements,
  } = useStore()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [imgPreview, setImgPreview] = useState("")

  const dir = LANGUAGE_DIRECTION[language]

  const handleImagePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setMediaUrl(reader.result); setImgPreview(reader.result) }
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setMediaUrl(''); setImgPreview('')
    setShowForm(false)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !user) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          mediaUrl: mediaUrl.trim() || null,
          createdBy: user.id,
          side: user.side,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      toast({ title: t(language, 'announcements.created') })
      resetForm()
      const data = await res.json()
      setAnnouncements([data, ...announcements])
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/announcements?announcementId=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: t(language, 'announcements.deleted') })
      setAnnouncements(announcements.filter((a) => a.id !== id))
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const sorted = [...announcements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div dir={dir} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold gradient-text">
          {t(language, 'announcements.title')}
        </h2>
        {user && canPostAnnouncements(user.role) && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {t(language, 'announcements.newAnnouncement')}
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
              placeholder={t(language, 'announcements.titleField')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full p-3 text-sm"
              required
            />
            <textarea
              placeholder={t(language, 'announcements.contentField')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="glass-input w-full p-3 text-sm resize-none"
              required
            />
            <input
              type="text"
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <ImageIcon className="w-4 h-4" />
              From Device
            </button>
            {imgPreview && <img src={imgPreview} className="w-12 h-12 rounded-lg object-cover" />}
                          placeholder="Image URL (optional)"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="glass-input w-full p-3 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                {t(language, 'announcements.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t(language, 'announcements.create')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {t(language, 'announcements.noAnnouncements')}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
          <AnimatePresence>
            {sorted.map((ann) => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-4"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    avatarUrl={ann.creator.avatarUrl}
                    displayName={ann.creator.displayName}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm truncate">
                        {ann.title}
                      </h3>
                      {user && canDeleteContent(user.role) && (
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="shrink-0 p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {ann.creator.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground/50">•</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ann.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>

                {ann.mediaUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden">
                    <img
                      src={ann.mediaUrl}
                      alt={ann.title}
                      className="w-full h-auto max-h-64 object-cover"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
