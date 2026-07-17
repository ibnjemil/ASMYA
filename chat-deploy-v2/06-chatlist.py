#!/usr/bin/env python3
"""Fix 6: ChatList - TG dark mode, unread badges, last message preview improvements"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/components/mesjid/ChatList.tsx')

content = r"""'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MessageSquare, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useStore, ChatInfo } from '@/lib/store'
import { t } from '@/lib/i18n'
import UserAvatar from './UserAvatar'

interface ChatListProps {
  chats: ChatInfo[]
  onSelect: (chat: ChatInfo) => void
  activeChatId?: string
}

export default function ChatList({ chats, onSelect, activeChatId }: ChatListProps) {
  const [search, setSearch] = useState('')
  const language = useStore((s) => s.language)
  const unreadCounts = useStore((s) => s.unreadCounts)
  const currentUserId = useStore((s) => s.user?.id)

  const filtered = chats.filter((c) => {
    const q = search.toLowerCase()
    const name = c.type === 'DM' || c.type === 'DIRECT'
      ? c.members
          .filter((m) => m.id !== currentUserId)
          .map((m) => m.displayName)
          .join(', ')
      : c.name
    return name.toLowerCase().includes(q)
  })

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">{t(language, 'chat.noChats')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <Users className="w-5 h-5 text-[#419fd9]" />
        <h2 className="font-semibold text-sm">{t(language, 'chat.title') || 'Chats'}</h2>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(language, 'chat.search') || 'Search...'}
            className="glass-input w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            {t(language, 'chat.noChats')}
          </p>
        ) : (
          filtered.map((chat, i) => {
            const isActive = chat.id === activeChatId
            const isDM = chat.type === 'DM' || chat.type === 'DIRECT'
            const otherMember = isDM
              ? chat.members.find((m) => m.id !== currentUserId)
              : null
            const displayName = isDM && otherMember ? otherMember.displayName : chat.name
            const lastMsg = chat.lastMessage
            const timeStr = lastMsg
              ? formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })
              : ''
            const unread = unreadCounts[chat.id] || 0

            return (
              <motion.button
                key={chat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => onSelect(chat)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-0.5 transition-colors text-left
                  ${isActive
                    ? 'bg-[#2b5278]/40 border border-[#419fd9]/30'
                    : 'hover:bg-white/5 border border-transparent'
                  }`}
              >
                {lastMsg?.sender ? (
                  <UserAvatar user={lastMsg.sender} size="sm" />
                ) : otherMember ? (
                  <UserAvatar user={otherMember} size="sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#2b5278]/60 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-[#419fd9]" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {displayName}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {timeStr && (
                        <span className="text-[11px] text-muted-foreground">
                          {timeStr}
                        </span>
                      )}
                      {unread > 0 && (
                        <span className="min-w-[20px] h-5 rounded-full bg-[#419fd9] text-white text-[11px] font-semibold flex items-center justify-center px-1.5">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {!isDM && (
                        <span className="text-foreground/70">{lastMsg.sender?.displayName}: </span>
                      )}
                      {lastMsg.type === 'IMAGE' ? '\ud83d\udcf7 Photo' :
                       lastMsg.type === 'VIDEO' ? '\ud83c\udfac Video' :
                       lastMsg.type === 'VOICE' ? '\ud83c\udfa4 Voice' :
                       lastMsg.type === 'FILE' ? '\ud83d\udcc4 File' :
                       (lastMsg.content.length > 40
                         ? lastMsg.content.slice(0, 40) + '\u2026'
                         : lastMsg.content)}
                    </p>
                  )}
                </div>
              </motion.button>
            )
          })
        )}
      </div>
    </div>
  )
}
"""

with open(FILE, 'w') as f:
    f.write(content)

print(f"✅ Updated {FILE} with TG dark mode, unread badges, media type icons")