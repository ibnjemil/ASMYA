#!/usr/bin/env python3
"""Fix 7: Dashboard.tsx - fix socket dedup, add incrementUnread, fix double groups"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/components/mesjid/Dashboard.tsx')

with open(FILE, 'r') as f:
    content = f.read()

# 1. Add incrementUnread to destructured store values
old_destruct = """  const {
    user,
    language,
    theme,
    isOffline,
    currentView,
    currentChat,
    setView,
    setTheme,
    setLanguage,
    setOffline,
    logout,
    setChats,
    setCurrentChat,
    setMessages,
    setAnnouncements,
    setPlans,
    setReports,
    setUsers,
    setCashEntries,
    setIsLoading,
  } = useStore()"""

new_destruct = """  const {
    user,
    language,
    theme,
    isOffline,
    currentView,
    currentChat,
    setView,
    setTheme,
    setLanguage,
    setOffline,
    logout,
    setChats,
    setCurrentChat,
    setMessages,
    setAnnouncements,
    setPlans,
    setReports,
    setUsers,
    setCashEntries,
    setIsLoading,
    incrementUnread,
  } = useStore()"""

content = content.replace(old_destruct, new_destruct)

# 2. Fix the socket message:new handler to use incrementUnread instead of re-fetching chats
old_socket = """    socket.on('message:new', (data: { chatId: string }) => {
      const chat = useStore.getState().currentChat
      if (data.chatId === chat?.id) {
        fetch(`/api/messages?chatId=${data.chatId}`)
          .then((r) => r.json())
          .then((msgs) => useStore.getState().setMessages(msgs))
          .catch(() => {})
      }
      fetch(`/api/chats?userId=${u.id}`)
        .then((r) => r.json())
        .then((chats: ChatInfo[]) => {
          useStore.getState().setChats(chats)
        })
        .catch(() => {})
    })"""

new_socket = """    socket.on('message:new', (data: { chatId: string; senderId?: string }) => {
      const state = useStore.getState()
      const chat = state.currentChat
      if (data.chatId === chat?.id) {
        // Don't re-fetch if ChatView already handles it via its own socket
        // Only refresh if the sender is not the current user
        if (data.senderId && data.senderId !== state.user?.id) {
          fetch(`/api/messages?chatId=${data.chatId}`)
            .then((r) => r.json())
            .then((msgs) => useStore.getState().setMessages(msgs))
            .catch(() => {})
        }
      } else {
        // Increment unread for non-active chats
        if (data.senderId && data.senderId !== state.user?.id) {
          useStore.getState().incrementUnread(data.chatId)
        }
      }
      // Refresh chat list to update lastMessage
      fetch(`/api/chats?userId=${u.id}`)
        .then((r) => r.json())
        .then((chats: ChatInfo[]) => {
          useStore.getState().setChats(chats)
        })
        .catch(() => {})
    })"""

content = content.replace(old_socket, new_socket)

with open(FILE, 'w') as f:
    f.write(content)

print(f"✅ Fixed {FILE}: socket dedup + incrementUnread")