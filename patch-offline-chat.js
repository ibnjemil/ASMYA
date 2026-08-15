const fs = require('fs');
let f = fs.readFileSync('src/components/mesjid/ChatView.tsx', 'utf8');

// 1. Add cache helpers after LIMIT
f = f.replace(
  'const LIMIT = 40',
  'const LIMIT = 40\nconst CCP = \'asmya-chat-\'\nconst CQK = \'asmya-chat-q\'\nfunction cGet(cid) { try { const d = localStorage.getItem(CCP + cid); return d ? JSON.parse(d) : null } catch { return null } }\nfunction cSet(cid, msgs) { try { localStorage.setItem(CCP + cid, JSON.stringify(msgs)) } catch {} }\nfunction qQet() { try { const d = localStorage.getItem(CQK); return d ? JSON.parse(d) : [] } catch { return [] } }\nfunction qAdd(m) { const q = qGet(); q.push(m); try { localStorage.setItem(CQK, JSON.stringify(q)) } catch {} }\nfunction qClear() { try { localStorage.removeItem(cQK) } catch {} }'
);

// 2. Cache-first load
f = f.replace(
  '     const load = async () => {\n      try {\n        const r = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT)\n        if (r.ok && !cancelled) { const d = await r.json(); setMessages(d); lastMsgCountRef.current = d.length; if (d.length > 0) lastMsgDateRef.current = d[d.length - 1].createdAt }\n      } catch {}\n    }\n    load()\n    pollRef.current = setInterval(async () => {\n      try {\n        const r = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT + '&after=' + lastMsgDateRef.current)\n        if (r.ok && !cancelled) { const d = await r.json(); setMessages(d); lastMsgCountRef.current = d.length; if (d.length > 0) lastMsgDateRef.current = d[d.length - 1].createdAt }\n      } catch {}\n    }, 4000)',
  '      const cached = cGet(chat.id)\n      if (cached && cached.length > 0 && !cancelled) {\n        setMessages(cached)\n        lastMsgCountRef.current = cached.length\n        if (cached.length > 0) lastMsgDateRef.current = cached[cached.length - 1].createdAt\n        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50)\n      }\n      const load = async () => {\n        try {\n          const r = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT)\n          if (r.ok && !cancelled) { const d = await r.json(); setMessages(d); cSet(chat.id, d); lastMsgCountRef.current = d.length; if (d.length > 0) lastMsgDateRef.current = d[d.length - 1].createdAt }\n        } catch {}\n      }\n      load()\n      pollRef.current = setInterval(async () => {\n        try {\n          const r = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT + '&after=' + lastMsgDateRef.current)\n          if (r.ok && !cancelled) { const d = await r.json(); setMessages(d); cSet(chat.id, d); lastMsgCountRef.current = d.length; if (d.length > 0) lastMsgDateRef.current = d[d.length - 1].createdAt }\n        } catch {}\n      }, 4000)'
);

// 3. Online sync effect
f = f.replace(
  '  const scrollToBottom = useCallback((smooth = true) => { bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' }) }, [])\n  useEffect(() => { scrollToBottom(false) }, [chatMessages.length])',
  '  const scrollToBottom = useCallback((smooth = true) => { bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' }) }, [])\n  useEffect(() => {\n    const goOnline = async () => {\n      const q = qGet()\n      if (q.length === 0) return\n      for (const m of q) {\n        try {\n          const r = await fetch('/api/messages', {\n            method: 'POST', headers: { 'Content-Type': 'application/json' },\n            body: JSON.stringify({ chatId: m.chatId, senderId: m.senderId, type: m.type, content: m.content, mediaUrl: m.mediaUrl }),\n          })\n          if (r.ok) {\n            setMessages(p => p.filter(x => x.id !== m.tempId))\n            const msg = await r.json()\n            addMessage(msg)\n            setStatuses(p => ({ ...p, [msg.id]: 'sent' }))\n          }\n        } catch {}\n      }\n      qClear()\n    }\n    window.addEventListener('online', goOnline)\n    return () => window.removeEventListener('online', oonline)\n  }, [addMessage])\n  useEffect(() => { scrollToBottom(false) }, [chatMessages.length])'
);

// 4. Offline queue in handleSend*f = f.replace(
  '     #setStatuses(p=>({...p,[tempId]:'sending'}));\n      const res = await fetch('/api/messages', {',
  '      setStatuses(p=>({...p,[tempId]:'sending'}));\n      if (!navigator.onLine) {\n        qAdd({ chatId: chat.id, senderId: user.id, type: msgType, content: msgContent, mediaUrl, tempId })\n        setStatuses(p => ({ ...p, [tempId]: 'queued' }))\n        setInput(''); setReplyTo(null); setPending(null); setSending(false)\n        return\n      }\n      const res = await fetch('/api/messages', {'
);

// 5. Fix catch(err)
f = f.replace(
  "} catch (err) { console.error('Send error:', err) } finally { setSending(false) }",
  '} catch {} finally { setSending(false) }'
);

// 6. Queued status icon
f = f.replace(
  'if(s==='sending')return<Clock size={12} className="opacity-40 ml-1"/>;',
  'if(s==='queued')return<Clock size={12} className="opacity-70 ml-1 text-amber-300"/>;\n            if(s==='sending')return<Clock size={12} className="opacity-40 ml-1"/>;'
);

// 7. Cache loadMore
f = f.replace(
  '          setMessages([...older, ...messages])\n          requestAnimationFrame',
  '         const combined = [...older, ...messages]\n          setMessages(combined)\n          cSet(chat.id, combined)\n          requestAnimationFrame'
);

nfs.writeFileSync('src/components/mesjid/ChatView.tsx', f);
console.log('DONE - offline chat patched');