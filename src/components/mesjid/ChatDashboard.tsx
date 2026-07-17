'use client'

import { MessageSquare } from 'lucide-react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import ChatList from './ChatList'
import ChatView from './ChatView'

export default function ChatDashboard() {
  const { chats, currentChat, setCurrentChat, setMessages, user, language } = useStore()

  const handleSelect = async (chat: (typeof chats)[number]) => {
    setCurrentChat(chat)
    // Clear unread for this chat
    const store = useStore.getState() as any
    if (store.clearUnread) store.clearUnread(chat.id)

    try {
      const res = await fetch(`/api/messages?chatId=${chat.id}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        const msgs = Array.isArray(data.messages) ? data.messages : Array.isArray(data) ? data : []
        setMessages(msgs)
      }
    } catch {
      // silent
    }
  }

  const handleBack = () => {
    setCurrentChat(null)
    setMessages([])
  }

  return (
    <div className="flex h-full">
      {/* Left panel — chat list */}
      <div className={`w-full md:w-80 md:border-r border-border flex-shrink-0 ${currentChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
        <ChatList
          chats={chats}
          onSelect={handleSelect}
          activeChatId={currentChat?.id}
        />
      </div>

      {/* Right panel — chat view */}
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