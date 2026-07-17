'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MessageSquare, Image, FileText, Users } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useStore, ChatInfo } from '@/lib/store'
import { t } from '@/lib/i18n'
import UserAvatar from './UserAvatar'

interface ChatListProps {
  chats: ChatInfo[]
  onSelect: (chat: ChatInfo) => void
  activeChatId?: string
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return format(d, 'HH:mm')
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return format(d, 'EEE')
    return format(d, 'MMM d')
  } catch {
    return ''
  }
}

export default function ChatList({ chats, onSelect, activeChatId }: ChatListProps) {
  const [search, setSearch] = useState('')
  const language = useStore((s) => s.language)
  const user = useStore((s) => s.user)
  const unreadCounts = (useStore as any)((s: any) => s.unreadCounts) || {}

  const filtered = (chats || []).filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = c.type === 'DM'
      ? c.members
          .filter((m) => m.id !== user?.id)
          .map((m) => m.displayName)
          .join(', ')
      : c.name
    return name.toLowerCase().includes(q)
  })

  if (!filtered || filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-white/30" />
        </div>
        <p className="text-white/40 text-sm">{t(language, 'chat.noChats') || 'No chats yet'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#17212b] light:bg-gray-100">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(language, 'chat.search') || 'Search chats...'}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#419fd9]/50 transition-colors light:bg-white light:border-gray-200 light:text-gray-900 light:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.map((chat, i) => {
          const isActive = chat.id === activeChatId
          const isDM = chat.type === 'DM'
          const otherMember = isDM
            ? chat.members.find((m) => m.id !== user?.id)
            : null
          const displayName = isDM && otherMember ? otherMember.displayName : chat.name
          const lastMsg = chat.lastMessage
          const unread = (unreadCounts[chat.id] || 0) as number

          // Determine last message preview
          let preview = ''
          let previewIcon = null
          if (lastMsg) {
            if (lastMsg.type === 'IMAGE') {
              preview = lastMsg.sender ? `${lastMsg.sender.displayName}: Photo` : 'Photo'
              previewIcon = <Image className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            } else if (lastMsg.type === 'VIDEO') {
              preview = lastMsg.sender ? `${lastMsg.sender.displayName}: Video` : 'Video'
              previewIcon = <FileText className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            } else if (lastMsg.type === 'VOICE') {
              preview = lastMsg.sender ? `${lastMsg.sender.displayName}: Voice message` : 'Voice message'
              previewIcon = <FileText className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            } else if (lastMsg.type === 'FILE') {
              preview = lastMsg.sender ? `${lastMsg.sender.displayName}: ${lastMsg.content}` : lastMsg.content
              previewIcon = <FileText className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            } else {
              preview = lastMsg.sender
                ? `${lastMsg.sender.displayName}: ${lastMsg.content}`
                : lastMsg.content
            }
          }

          return (
            <motion.button
              key={chat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              onClick={() => onSelect(chat)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl mb-0.5 transition-colors text-left
                ${isActive
                  ? 'bg-[#2b5278] light:bg-blue-50'
                  : 'hover:bg-white/5 light:hover:bg-gray-200'
                }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {lastMsg?.sender && !isDM ? (
                  <UserAvatar user={lastMsg.sender} size="sm" />
                ) : otherMember ? (
                  <UserAvatar user={otherMember} size="sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white/40" />
                  </div>
                )}
                {/* Online dot for DM */}
                {isDM && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-[#17212b] light:border-gray-100" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-medium text-sm truncate ${isActive ? 'text-white light:text-gray-900' : 'text-white light:text-gray-900'}`}>
                    {displayName}
                  </span>
                  {lastMsg && (
                    <span className={`text-[11px] flex-shrink-0 ${unread > 0 ? 'text-[#419fd9]' : 'text-white/40 light:text-gray-400'}`}>
                      {formatTime(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {previewIcon}
                  <p className={`text-[13px] truncate ${unread > 0 ? 'text-white/80 light:text-gray-700' : 'text-white/40 light:text-gray-500'}`}>
                    {preview.length > 45 ? preview.slice(0, 45) + '...' : preview}
                  </p>
                </div>
              </div>

              {/* Unread badge */}
              {unread > 0 && (
                <div className="flex-shrink-0 min-w-[20px] h-5 rounded-full bg-[#419fd9] flex items-center justify-center px-1.5">
                  <span className="text-[11px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}