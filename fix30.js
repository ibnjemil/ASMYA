const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\reyan\\ASMYA\\src';

let fixes = 0;

// ═══════════════════════════════════════════════════════════════════════
// FIX 1: users/route.ts - Auto-create group chats when creating followers
// ═══════════════════════════════════════════════════════════════════════
console.log('=== Fixing users/route.ts ===');
let u = fs.readFileSync(path.join(dir, 'app', 'api', 'users', 'route.ts'), 'utf8');
let lines = u.split(/\r?\n/);

// Find the follower block start: } else if (role === Role.FOLLOWER && subAmirId) {
let startIdx = -1;
let endIdx = -1;
let braceCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (startIdx < 0 && lines[i].includes('role === Role.FOLLOWER && subAmirId')) {
    startIdx = i;
    braceCount = 0;
  }
  if (startIdx >= 0) {
    for (let ch of lines[i]) {
      if (ch === '{') braceCount++;
      if (ch === '}') braceCount--;
    }
    // The block ends when braceCount goes back to 0 or -1 after the initial {
    if (i > startIdx + 2 && braceCount <= 0) {
      endIdx = i;
      break;
    }
  }
}

if (startIdx >= 0 && endIdx >= 0) {
  console.log('  Found follower block at lines ' + (startIdx+1) + '-' + (endIdx+1));

  const newBlock = [
    '    } else if (role === Role.FOLLOWER && subAmirId) {',
    '      // Find the sub-amir user who is creating this follower',
    '      const subAmirUser = await db.user.findUnique({',
    '        where: { id: subAmirId },',
    '        select: { role: true },',
    '      })',
    '',
    '      if (subAmirUser) {',
    '        // Helper: find or create a group chat',
    '        async function findOrCreateGroup(name, type, chatSide) {',
    '          let group = await db.chat.findFirst({',
    '            where: { name, type },',
    '            select: { id: true },',
    '          })',
    '          if (!group) {',
    '            group = await db.chat.create({',
    '              data: { name, type, side: chatSide },',
    '              select: { id: true },',
    '            })',
    '            // Also add the amir to their own newly created group',
    '            await db.chatMember.upsert({',
    '              where: { chatId_userId: { chatId: group.id, userId: subAmirId } },',
    '              create: { chatId: group.id, userId: subAmirId },',
    '              update: {},',
    '            })',
    '            console.log("Created group chat:", name, "id:", group.id)',
    '          }',
    '          return group',
    '        }',
    '',
    '        if (SUB_AMIR_ROLES.includes(subAmirUser.role)) {',
    '          const roleLabel = subAmirUser.role.replace("_AMIR", "")',
    '          const group = await findOrCreateGroup(',
    '            roleLabel + "_GROUP_" + side, "SUB_AMIR_GROUP", side',
    '          )',
    '          if (group) chatIdsToAdd.push(group.id)',
    '        } else if (SMALL_AMIR_ROLES.includes(subAmirUser.role)) {',
    '          // Add to SMALL_AMIR_GROUP',
    '          const roleLabel = subAmirUser.role.replace("_AMIR", "")',
    '          const smallGroup = await findOrCreateGroup(',
    '            roleLabel + "_GROUP_" + side, "SMALL_AMIR_GROUP", side',
    '          )',
    '          if (smallGroup) chatIdsToAdd.push(smallGroup.id)',
    '',
    '          // Also add to parent SUB_AMIR_GROUP that the small amir belongs to',
    '          const parentMemberships = await db.chatMember.findMany({',
    '            where: { userId: subAmirId, chat: { type: "SUB_AMIR_GROUP" } },',
    '            include: { chat: { select: { id: true } } },',
    '          })',
    '          for (const m of parentMemberships) {',
    '            chatIdsToAdd.push(m.chat.id)',
    '          }',
    '        }',
    '      }',
  ];

  lines.splice(startIdx, endIdx - startIdx + 1, ...newBlock);
  fs.writeFileSync(path.join(dir, 'app', 'api', 'users', 'route.ts'), lines.join('\n'));
  fixes++;
  console.log('  FIXED - group chats will now auto-create');
} else {
  console.log('  Could not find follower block');
}

// ═══════════════════════════════════════════════════════════════════════
// FIX 2: ChatView.tsx - Add offline message cache + send queue
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== Fixing ChatView.tsx for offline ===');
let cv = fs.readFileSync(path.join(dir, 'components', 'mesjid', 'ChatView.tsx'), 'utf8');
let cvLines = cv.split(/\r?\n/);

// Find: const LIMIT = 30
let limitIdx = -1;
for (let i = 0; i < cvLines.length; i++) {
  if (cvLines[i].includes('const LIMIT = 30')) { limitIdx = i; break; }
}

if (limitIdx >= 0) {
  // Insert offline helpers after the LIMIT line
  const offlineHelpers = [
    '',
    '  // Offline: cache key for this chat',
    '  const msgCacheKey = "asmya-msg-" + chat.id',
    '  const queueKey = "asmya-queue-" + chat.id',
    '',
    '  // Save messages to localStorage',
    '  function cacheMsgs(msgs) { try { localStorage.setItem(msgCacheKey, JSON.stringify(msgs)) } catch(e) {} }',
    '  // Load cached messages',
    '  function loadCachedMsgs() { try { const r = localStorage.getItem(msgCacheKey); return r ? JSON.parse(r) : null } catch(e) { return null } }',
    '  // Add to offline send queue',
    '  function queueMessage(payload) { try { const q = JSON.parse(localStorage.getItem(queueKey) || "[]"); q.push(payload); localStorage.setItem(queueKey, JSON.stringify(q)) } catch(e) {} }',
    '  // Flush offline queue',
    '  async function flushQueue() {',
    '    try {',
    '      const q = JSON.parse(localStorage.getItem(queueKey) || "[]");',
    '      if (q.length === 0) return',
    '      localStorage.setItem(queueKey, "[]")',
    '      for (const payload of q) {',
    '        await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })',
    '      }',
    '      // Refresh messages after flush',
    '      const r = await fetch("/api/messages?chatId=" + chat.id + "&limit=" + LIMIT)',
    '      if (r.ok) { const fresh = await r.json(); setMessages(fresh); cacheMsgs(fresh) }',
    '    } catch(e) { console.error("Flush error:", e) }',
    '  }',
    '',
    '  // Auto-flush when coming back online',
    '  React.useEffect(() => {',
    '    const goOnline = () => { flushQueue() }',
    '    window.addEventListener("online", goOnline)',
    '    return () => window.removeEventListener("online", goOnline)',
    '  }, [])',
    '',
  ];

  cvLines.splice(limitIdx + 1, 0, ...offlineHelpers);
  console.log('  Added offline helpers after LIMIT line');
}

// Find the initial message fetch and add cache load before it
let fetchIdx = -1;
for (let i = 0; i < cvLines.length; i++) {
  if (cvLines[i].includes("fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT)") && !cvLines[i].includes('after')) {
    fetchIdx = i;
    break;
  }
}

if (fetchIdx >= 0) {
  // Insert cache load + cache save around the fetch
  // Find the useEffect that contains this fetch
  // Insert cached message loading right before the fetch, and cache saving after setMessages
  // We need to add: load cached msgs first, then after fetch cache them

  // Add cache load before the fetch try block
  // Find the opening { of the try/catch or the useEffect
  for (let i = fetchIdx; i >= Math.max(0, fetchIdx - 10); i--) {
    if (cvLines[i].trim() === 'try {') {
      // Insert cache load before the try
      cvLines.splice(i, 0, '      const cached = loadCachedMsgs()',
        '      if (cached && cached.length > 0) setMessages(cached)');
      console.log('  Added cache load before message fetch');
      break;
    }
  }
}

// Find setMessages(msgs) after the fetch and add cacheMsgs after it
let setMsgIdx = -1;
for (let i = 0; i < cvLines.length; i++) {
  if (cvLines[i].includes('setMessages(msgs)') && cvLines[i+1] && cvLines[i+1].includes('setLoading(false)')) {
    setMsgIdx = i;
    break;
  }
}
if (setMsgIdx < 0) {
  for (let i = 0; i < cvLines.length; i++) {
    if (cvLines[i].trim() === 'setMessages(msgs)' || cvLines[i].includes('setMessages(msgs)')) {
      // Make sure this is inside the initial fetch, not handleSend
      setMsgIdx = i;
      break;
    }
  }
}
if (setMsgIdx >= 0) {
  cvLines.splice(setMsgIdx + 1, 0, '        cacheMsgs(msgs)');
  console.log('  Added cacheMsgs after setMessages');
}

// Find handleSend and add offline queue support
let sendIdx = -1;
for (let i = 0; i < cvLines.length; i++) {
  if (cvLines[i].includes('const handleSend = async') || cvLines[i].includes('const handleSend=async')) {
    sendIdx = i;
    break;
  }
}

if (sendIdx >= 0) {
  // Find the fetch POST inside handleSend
  for (let i = sendIdx; i < Math.min(sendIdx + 50, cvLines.length); i++) {
    if (cvLines[i].includes("fetch('/api/messages'") && cvLines[i+1] && cvLines[i+1].includes("POST")) {
      // Wrap the fetch in an offline check
      // Before the fetch, add: if offline, queue and return optimistic
      cvLines.splice(i, 0,
        '      // Offline: queue message if no network',
        '      if (!navigator.onLine) {',
        '        const payload = { chatId: chat.id, senderId: user.id, type: msgType, content: msgContent, mediaUrl }',
        '        queueMessage(payload)',
        '        setMessages(p => [...p, { id: "queued-" + Date.now(), chatId: chat.id, type: msgType, content: msgContent, mediaUrl, createdAt: new Date().toISOString(), sender: { id: user.id, username: "", displayName: "You", avatarUrl: null, role: "", side: "" } }])',
        '        setInput(""); setReplyTo(null); setPending(null)',
        '        return',
        '      }',
        ''
      );
      console.log('  Added offline queue in handleSend');
      break;
    }
  }
}

fs.writeFileSync(path.join(dir, 'components', 'mesjid', 'ChatView.tsx'), cvLines.join('\n'));
fixes++;
console.log('  ChatView.tsx SAVED with offline support');

// ═══════════════════════════════════════════════════════════════════════
// FIX 3: Dashboard.tsx - Show cached chats when offline, skip fetch
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== Fixing Dashboard.tsx for offline chat ===');
let dash = fs.readFileSync(path.join(dir, 'components', 'mesjid', 'Dashboard.tsx'), 'utf8');
let dashLines = dash.split(/\r?\n/);

// Find the chat fetch line and wrap with offline check
for (let i = 0; i < dashLines.length; i++) {
  if (dashLines[i].includes("/api/chats?userId=") && dashLines[i].includes("fetch(")) {
    // Before this fetch, add offline skip
    dashLines.splice(i, 0,
      '        if (navigator.onLine) {'
    );
    // Find the closing of this fetch block (the setChats/writeCache part)
    for (let j = i + 1; j < Math.min(i + 30, dashLines.length); j++) {
      if (dashLines[j].includes('writeCache')) {
        // After writeCache, close the if block
        dashLines.splice(j + 1, 0, '        }');
        break;
      }
    }
    console.log('  Wrapped chat fetch in online check');
    break;
  }
}

fs.writeFileSync(path.join(dir, 'components', 'mesjid', 'Dashboard.tsx'), dashLines.join('\n'));
fixes++;
console.log('  Dashboard.tsx SAVED with offline chat support');

console.log('\n=== fix30 complete: ' + fixes + ' files fixed ===');
