'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'

interface ChatListProps {
  chats?: any[]
  onSelect?: (chat: any) => void
  onSelectChat?: (chatId: string) => void
  activeChatId?: string
}

export default function ChatList({ chats: propChats, onSelect, onSelectChat, activeChatId: propActiveId }: ChatListProps) {
  const store = useStore()
  const { chats: storeChats, currentChat, user } = store
  const unreadCounts = (store as any).unreadCounts || {}
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const chats = propChats || storeChats || []
  const activeChatId = propActiveId || currentChat?.id

  const handleChatClick = (chat: any) => {
    if (onSelect) {
      onSelect(chat)
    } else if (onSelectChat) {
      onSelectChat(chat.id)
    }
  }

  const sortedChats = useMemo(() => {
    return [...chats].sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.lastMessage?.createdAt || a.createdAt).getTime()
      const dateB = new Date(b.updatedAt || b.lastMessage?.createdAt || b.createdAt).getTime()
      return dateB - dateA
    })
  }, [chats])

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const oneDay = 86400000
    if (diffMs < oneDay && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    const yesterday = new Date(now.getTime() - oneDay)
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
      return 'Yesterday'
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getLastMsg = (chat: any) => {
    if (!chat.lastMessage) return ''
    const lm = chat.lastMessage
    if (lm.type === 'IMAGE') return 'Photo'
    if (lm.type === 'FILE') return (lm.fileName || 'File')
    return lm.content || ''
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#17212b]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chats</h2>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          sortedChats.map((chat: any, index: number) => {
            const isActive = chat.id === activeChatId
            const unread = unreadCounts[chat.id] || 0
            const lastMsgTime = chat.lastMessage?.createdAt || chat.updatedAt

            return (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.015, duration: 0.2 }}
                onClick={() => handleChatClick(chat)}
                className={`flex items-center px-3 py-2.5 cursor-pointer transition-colors duration-100 group
                  ${isActive
                    ? 'bg-[#419fd9]/15 dark:bg-[#2b5278] border-r-2 border-[#419fd9]'
                    : 'hover:bg-gray-100 dark:hover:bg-white/5 border-r-2 border-transparent'
                  }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xl overflow-hidden shadow-sm">
                    {chat.avatar ? (
                      <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                    ) : (
                      (chat.name || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  {chat.isOnline && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#17212b]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 ml-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[15px] truncate pr-2 ${unread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                      {chat.name}
                    </span>
                    <span className={`text-xs flex-shrink-0 ${unread > 0 ? 'text-[#419fd9] dark:text-[#6ab2f2] font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                      {formatTime(lastMsgTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-[13px] truncate pr-2 ${unread > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {getLastMsg(chat)}
                    </p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 bg-[#419fd9] text-white text-[11px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}