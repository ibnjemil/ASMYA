const DB_NAME = 'asmya-msgs'
const DB_VERSION = 1
const STORE = 'messages'
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('chatId', 'chatId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
export async function getCachedMessages(chatId, limit, before) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const idx = tx.objectStore(STORE).index('chatId')
    const req = idx.getAll(chatId)
    req.onsuccess = () => {
      let msgs = req.result || []
      if (before) msgs = msgs.filter(m => m.createdAt < before)
      msgs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      if (limit) msgs = msgs.slice(0, limit)
      msgs.reverse()
      db.close()
      resolve(msgs)
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}
export async function saveMessages(chatId, messages) {
  if (!messages.length) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const msg of messages) {
      if (msg && msg.id && !msg.id.startsWith('temp-')) store.put({ ...msg, chatId })
    }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}