'use client'

import { useEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import ChatList from './ChatList'
import ChatView from './ChatView'

export default function ChatDashboard() {
  const { chats, currentChat, setCurrentChat, setMessages, user, language } = useStore()
  const redirectDone = useRef(false)

  useEffect(() => {
    if (!user || user.role !== 'FOLLOWER' || redirectDone.current || currentChat) return
    redirectDone.current = true
    const followerChat = chats.find((c) =>
      c.type === 'SMALL_AMIR_GROUP' || c.type === 'SUB_AMIR_GROUP'
    )
    if (followerChat) {
      setCurrentChat(followerChat)
      fetch(`/api/messages?chatId=${followerChat.id}`)
        .then((r) => r.json())
        .then((msgs) => setMessages(msgs))
        .catch(() => {})
    }
  }, [user, chats, currentChat, setCurrentChat, setMessages])

  const isFollower = user?.role === 'FOLLOWER'

  const handleSelect = async (chat: (typeof chats)[number]) => {
    setCurrentChat(chat)
    try {
      const res = await fetch(`/api/messages?chatId=${chat.id}`)
      if (res.ok) {
        const msgs = await res.json()
        setMessages(msgs)
      }
    } catch {
    }
  }

  const handleBack = () => {
    if (isFollower) return
    setCurrentChat(null)
  }

  return (
    <div className="flex h-full">
      {!isFollower && (
        <div className={`w-full md:w-80 md:border-r border-border flex-shrink-0 ${currentChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          <ChatList
            chats={chats}
            onSelect={handleSelect}
            activeChatId={currentChat?.id}
          />
        </div>
      )}
      <div className={`flex-1 flex flex-col min-w-0 ${!currentChat ? 'hidden md:flex' : 'flex'}`}>
        {currentChat ? (
          <ChatView chat={currentChat} onBack={handleBack} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">
              {language === 'am'
                ? 'ውይይት ይምረጡ'
                : language === 'ar'
                  ? 'اختر محادثة لبدء المراسلة'
                  : 'Select a chat to start messaging'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
