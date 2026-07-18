'use client'

import { MessageSquare } from 'lucide-react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import ChatList from './ChatList'
import ChatView from './ChatView'

export default function ChatDashboard() {
  const { chats, currentChat, setCurrentChat, setMessages, user, language, clearUnread } = useStore()

  const handleSelect = async (chat: (typeof chats)[number]) => {
    setCurrentChat(chat)
    clearUnread(chat.id)
    try {
      const res = await fetch(`/api/messages?chatId=${chat.id}&limit=30`)
      if (res.ok) {
        const msgs = await res.json()
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
    <div className="flex h-[calc(100dvh-3.5rem-4rem)]">
      {/* Left panel — chat list */}
      <div className={`w-full md:w-80 md:border-r border-border flex-shrink-0 ${currentChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
        <ChatList
          chats={chats}
          onSelect={handleSelect}
          activeChatId={currentChat?.id}
        />
      </div>

      {/* Right panel — chat view */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${!currentChat ? 'hidden md:flex' : 'flex'}`}>
        {currentChat ? (
          <ChatView key={currentChat.id} chat={currentChat} onBack={handleBack} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">
              {language === 'am'
                ? '\u1235\u12cd\u129b\u1275\u1275 \u1295\u130b\u1260\u12a8'
                : language === 'ar'
                  ? '\u0627\u062e\u062a\u0631 \u0645\u062d\u0627\u062f\u062b\u0629 \u0644\u0628\u062f\u0621 \u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0629'
                  : 'Select a chat to start messaging'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
