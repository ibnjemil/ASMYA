'use client'

import { useState, useRef, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Newspaper,
  Plus,
  Trash2,
  X,
  Loader2,
  ImagePlus,
  Send,
  MessageCircle,
} from 'lucide-react'
import {
  useStore,
  type PublicPostInfo,
} from '@/lib/store'
import { t, LANGUAGE_DIRECTION } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import UserAvatar from './UserAvatar'

export default function PublicFeed() {
  const {
    user,
    language,
    publicPosts,
    setPublicPosts,
  } = useStore()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  const dir = LANGUAGE_DIRECTION[language]

  const resetForm = () => {
    setContent('')
    setImageFile(null)
    setShowForm(false)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/public-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          mediaUrl: null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      setPublicPosts([data.post, ...publicPosts])
      toast({ title: 'Post created' })
      resetForm()
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/public-posts?postId=${postId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setPublicPosts(publicPosts.filter((p) => p.id !== postId))
      toast({ title: 'Post deleted' })
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim()
    if (!text || !user) return
    try {
      const res = await fetch('/api/public-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          commentOn: postId,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()

      // Optimistically update local state
      setPublicPosts(
        publicPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...(p.comments || []), data.comment],
              }
            : p
        )
      )
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      const res = await fetch(`/api/public-posts?postId=${postId}&commentId=${commentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed')
      setPublicPosts(
        publicPosts.map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
            : p
        )
      )
    } catch {
      toast({ title: t(language, 'general.error'), variant: 'destructive' })
    }
  }

  const canDeletePost = (post: PublicPostInfo): boolean => {
    if (!user) return false
    return post.postedBy === user.id || user.role === 'SUPERIOR_AMIR'
  }

  const sorted = [...publicPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div dir={dir} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold gradient-text">
          {t(language, 'publicFeed.title')}
        </h2>
        {user && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {t(language, 'publicFeed.newPost')}
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
            <textarea
              placeholder={t(language, 'publicFeed.content')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="glass-input w-full p-3 text-sm resize-none"
              required
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <ImagePlus className="w-4 h-4" />
                <span>Add Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                >
                  {t(language, 'general.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Send className="w-3.5 h-3.5" />
                  {t(language, 'publicFeed.post')}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Posts list */}
      {sorted.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Newspaper className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {t(language, 'publicFeed.noPosts')}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
          <AnimatePresence>
            {sorted.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-4"
              >
                {/* Post header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={post.poster?.avatarUrl || null}
                      displayName={post.poster?.displayName || 'Anonymous'}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {post.poster?.displayName || 'Anonymous'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(post.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  {canDeletePost(post) && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="mt-3 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Image */}
                {post.mediaUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden">
                    <img
                      src={post.mediaUrl}
                      alt="Post image"
                      className="w-full h-auto max-h-72 object-cover"
                    />
                  </div>
                )}

                {/* Comments */}
                <div className="mt-3 pt-3 border-t border-border/30">
                  {/* Existing comments */}
                  {post.comments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex items-start justify-between gap-2"
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <UserAvatar
                              avatarUrl={comment.poster?.avatarUrl || null}
                              displayName={comment.poster?.displayName || ''}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium">
                                  {comment.poster?.displayName || 'Anonymous'}
                                </span>
                                <span className="text-[10px] text-muted-foreground/50">
                                  {format(new Date(comment.createdAt), 'MMM d')}
                                </span>
                              </div>
                              <p className="text-xs text-foreground/70 mt-0.5">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                          {user && comment.postedBy === user.id && (
                            <button
                              onClick={() => handleDeleteComment(post.id, comment.id)}
                              className="shrink-0 p-1 text-destructive/40 hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  {user && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder={t(language, 'publicFeed.addComment')}
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id)
                        }}
                        className="glass-input flex-1 p-2 text-xs"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
