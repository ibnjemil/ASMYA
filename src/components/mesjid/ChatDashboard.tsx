'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatList from './ChatList'
import ChatView from './ChatView'
import { useStore } from '@/lib/store'

export default function ChatDashboard() {
  const { activeChat, setActiveChat, clearUnread } = useStore()
  const [showChat, setShowChat] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 768
      setIsMobile(m)
      if (!m) setShowChat(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChat(chatId)
    clearUnread(chatId)
    setShowChat(true)
  }, [setActiveChat, clearUnread])

  const handleBack = useCallback(() => {
    setShowChat(false)
  }, [])

  useEffect(() => {
    if (!activeChat) setShowChat(false)
  }, [activeChat])

  return (
    <div className="flex h-full rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-white">
      {/* Left panel - Chat List */}
      <div
        className={`${isMobile
          ? showChat ? 'hidden' : 'w-full'
          : 'w-[380px] flex-shrink-0'
        } bg-white border-r border-gray-100`}
      >
        <ChatList onSelectChat={handleSelectChat} />
      </div>

      {/* Right panel - Chat View */}
      <div
        className={`${isMobile
          ? showChat ? 'w-full' : 'hidden'
          : 'flex-1 min-w-0'
        } bg-gray-50`}
      >
        {activeChat ? (
          <ChatView onBack={handleBack} isMobile={isMobile} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full select-none">
            <div className="w-32 h-32 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-400 mb-1">Select a chat</p>
            <p className="text-sm text-gray-300">Choose from your existing conversations or start a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}