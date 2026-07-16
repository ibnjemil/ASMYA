'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MessageSquare } from 'lucide-react'
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

  const filtered = (chats || []).filter((c) => {
    const q = search.toLowerCase()
    const name = c.type === 'DM'
      ? c.members
          .filter((m) => m.id !== useStore.getState().user?.id)
          .map((m) => m.displayName)
          .join(', ')
      : c.name
    return name.toLowerCase().includes(q)
  })

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">{t(language, 'chat.noChats')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(language, 'chat.search')}
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
            const isDM = chat.type === 'DM'
            const otherMember = isDM
              ? chat.members.find((m) => m.id !== useStore.getState().user?.id)
              : null
            const displayName = isDM && otherMember ? otherMember.displayName : chat.name
            const lastMsg = chat.lastMessage
            const timeStr = lastMsg
              ? formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })
              : ''

            return (
              <motion.button
                key={chat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => onSelect(chat)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-colors text-left
                  ${isActive
                    ? 'bg-primary/15 border border-primary/30'
                    : 'hover:bg-muted/60 border border-transparent'
                  }`}
              >
                {lastMsg?.sender ? (
                  <UserAvatar user={lastMsg.sender} size="sm" />
                ) : otherMember ? (
                  <UserAvatar user={otherMember} size="sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {isDM && otherMember ? `${t(language, 'chat.title')} — ${displayName}` : displayName}
                    </span>
                    {timeStr && (
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {timeStr}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {lastMsg.content.length > 40
                        ? lastMsg.content.slice(0, 40) + '…'
                        : lastMsg.content}
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