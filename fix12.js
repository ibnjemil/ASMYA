const fs = require('fs');
const path = require('path');

function fixFile(filePath, search, replace) {
  const full = path.join('src', filePath);
  if (!fs.existsSync(full)) { console.log('SKIP (not found): ' + full); return false; }
  let content = fs.readFileSync(full, 'utf8');
  if (typeof search === 'string') {
    if (!content.includes(search)) { console.log('SKIP (pattern not found): ' + full); return false; }
    content = content.replace(search, replace);
  } else {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(full, content, 'utf8');
  console.log('FIXED: ' + full);
  return true;
}

// ========================================
// 1. CREATE ConfirmDialog COMPONENT
// ========================================
const confirmDialogCode = `'use client'

import { useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[85vw] max-w-sm glass-card p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className={'p-2 rounded-full shrink-0 ' + (variant === 'danger' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-400')}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onCancel} className="px-4 py-2 text-xs rounded-xl text-muted-foreground hover:bg-muted transition-colors">{cancelLabel}</button>
              <button
                onClick={() => { onConfirm(); onCancel(); }}
                className={'px-4 py-2 text-xs rounded-xl font-medium text-white transition-colors ' + (variant === 'danger' ? 'bg-destructive hover:bg-destructive/90' : 'bg-amber-500 hover:bg-amber-500/90')}
              >{confirmLabel}</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function useConfirm() {
  const [state, setState] = useState({ open: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' as 'danger' | 'warning' })
  const confirm = useCallback((title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' = 'danger') => {
    setState({ open: true, title, message, onConfirm, variant })
  }, [])
  const Dialog = useCallback(() => (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      onConfirm={state.onConfirm}
      onCancel={() => setState(s => ({ ...s, open: false }))}
      variant={state.variant}
    />
  ), [state])
  return { confirm, Dialog }
}
`;

fs.writeFileSync('src/components/mesjid/ConfirmDialog.tsx', confirmDialogCode, 'utf8');
console.log('CREATED: src/components/mesjid/ConfirmDialog.tsx');

// ========================================
// 2. CREATE FullscreenImageViewer COMPONENT
// ========================================
const imageViewerCode = `'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

export default function FullscreenImageViewer({ src, open, onClose }: { src: string | null; open: boolean; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const reset = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }) }, [])

  useEffect(() => { if (!open) reset() }, [open, reset])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(Math.max(0.5, s - e.deltaY * 0.002), 5))
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) { isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture(e.pointerId) }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    setTranslate(t => ({
      x: t.x + (e.clientX - lastPos.current.x),
      y: t.y + (e.clientY - lastPos.current.y),
    }))
    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = () => { isDragging.current = false }

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/95 flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between p-3 bg-black/50">
            <div className="flex items-center gap-2">
              <button onClick={() => setScale(s => Math.min(s + 0.5, 5))} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button onClick={() => setScale(s => Math.max(s - 0.5, 0.5))} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <ZoomOut className="w-5 h-5" />
              </button>
              <button onClick={reset} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <RotateCw className="w-5 h-5" />
              </button>
              <span className="text-white/60 text-xs ml-1">{Math.round(scale * 100)}%</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image */}
          <div
            className="flex-1 overflow-hidden flex items-center justify-center"
            onWheel={handleWheel}
          >
            <motion.img
              src={src}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain select-none"
              style={{ transform: \`scale(\${scale}) translate(\${translate.x / scale}px, \${translate.y / scale}px)\`, cursor: scale > 1 ? 'grab' : 'default' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => { if (scale <= 1) { setScale(2.5); e.stopPropagation() } }}
              animate={{ scale, x: translate.x, y: translate.y }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag={scale > 1 ? false : false}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
`;

fs.writeFileSync('src/components/mesjid/FullscreenImageViewer.tsx', imageViewerCode, 'utf8');
console.log('CREATED: src/components/mesjid/FullscreenImageViewer.tsx');

// ========================================
// 3. FIX Dashboard.tsx - logout confirmation
// ========================================
fixFile(
  'components/mesjid/Dashboard.tsx',
  "onClick={logout}",
  `onClick={() => { if (window.confirm('Are you sure you want to log out?')) logout() }}`
);

// ========================================
// 4. FIX PlansReportsView.tsx - confirm + urgency sort + image viewer
// ========================================
let prv = fs.readFileSync('src/components/mesjid/PlansReportsView.tsx', 'utf8');

// Add imports for ConfirmDialog, FullscreenImageViewer
if (!prv.includes('ConfirmDialog')) {
  prv = prv.replace(
    "import CashbookView from './CashbookView'",
    "import CashbookView from './CashbookView'\nimport ConfirmDialog, { useConfirm } from './ConfirmDialog'\nimport FullscreenImageViewer from './FullscreenImageViewer'"
  );
}

// Add useConfirm hook + image viewer state after useToast
if (!prv.includes('useConfirm')) {
  prv = prv.replace(
    "const { toast } = useToast()",
    "const { toast } = useToast()\n  const { confirm, Dialog } = useConfirm()\n  const [viewerImg, setViewerImg] = useState<string | null>(null)"
  );
}

// Fix handleDeletePlan with confirmation
prv = prv.replace(
  "const handleDeletePlan = async (planId: string) => {\n    try {\n      const res = await fetch(`/api/plans?planId=${planId}`, { method: 'DELETE' })\n      if (!res.ok) throw new Error()\n      toast({ title: 'Plan deleted' })\n      setPlans(plans.filter((p) => p.id !== planId))\n    } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }",
  "const handleDeletePlan = (planId: string) => {\n    confirm('Delete Plan?', 'This action cannot be undone. Are you sure you want to delete this plan?', async () => {\n      try {\n        const res = await fetch(`/api/plans?planId=${planId}`, { method: 'DELETE' })\n        if (!res.ok) throw new Error()\n        toast({ title: 'Plan deleted' })\n        setPlans(plans.filter((p) => p.id !== planId))\n      } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }\n    })"
);

// Fix handleDeleteReport with confirmation
prv = prv.replace(
  "const handleDeleteReport = async (reportId: string) => {\n    try {\n      const res = await fetch(`/api/reports?reportId=${reportId}`, { method: 'DELETE' })\n      if (!res.ok) throw new Error()\n      setReports(reports.filter((r) => r.id !== reportId))\n    } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }",
  "const handleDeleteReport = (reportId: string) => {\n    confirm('Delete Report?', 'This action cannot be undone. Are you sure you want to delete this report?', async () => {\n      try {\n        const res = await fetch(`/api/reports?reportId=${reportId}`, { method: 'DELETE' })\n        if (!res.ok) throw new Error()\n        setReports(reports.filter((r) => r.id !== reportId))\n      } catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }\n    })"
);

// Sort plans by urgency level instead of just date
prv = prv.replace(
  "const sortedPlans = useMemo(() => [...plans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [plans])",
  "const URGENCY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 }\n  const sortedPlans = useMemo(() => [...plans].sort((a, b) => {\n    const uA = URGENCY_ORDER[a.urgency] ?? 2\n    const uB = URGENCY_ORDER[b.urgency] ?? 2\n    if (uA !== uB) return uA - uB\n    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()\n  }), [plans])"
);

// Make report mediaUrl image clickable for fullscreen
prv = prv.replace(
  "{report.mediaUrl && <img src={report.mediaUrl} alt=\"report\" className=\"mt-2 max-w-full max-h-48 object-cover rounded-lg\" />}",
  "{report.mediaUrl && <img src={report.mediaUrl} alt=\"report\" className=\"mt-2 max-w-full max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity\" onClick={() => setViewerImg(report.mediaUrl)} />}"
);

// Make inline report image clickable
prv = prv.replace(
  "{irImage && <img src={irImage} alt=\"preview\" className=\"w-16 h-16 object-cover rounded-lg\" />}",
  "{irImage && <img src={irImage} alt=\"preview\" className=\"w-16 h-16 object-cover rounded-lg cursor-pointer\" onClick={(e) => { e.stopPropagation(); setViewerImg(irImage) }} />}"
);

// Make main report form image clickable
prv = prv.replace(
  "{rImage && <img src={rImage} alt=\"preview\" className=\"w-24 h-24 object-cover rounded-lg\" />}",
  "{rImage && <img src={rImage} alt=\"preview\" className=\"w-24 h-24 object-cover rounded-lg cursor-pointer\" onClick={() => setViewerImg(rImage)} />}"
);

// Add Dialog + FullscreenImageViewer before closing </div>
prv = prv.replace(
  "    </div>\n  )\n}",
  "      <Dialog />\n      <FullscreenImageViewer src={viewerImg} open={!!viewerImg} onClose={() => setViewerImg(null)} />\n    </div>\n  )\n}"
);

fs.writeFileSync('src/components/mesjid/PlansReportsView.tsx', prv, 'utf8');
console.log('FIXED: src/components/mesjid/PlansReportsView.tsx (confirm + urgency sort + image viewer)');

// ========================================
// 5. FIX CashbookView.tsx - confirm + image viewer + edit button
// ========================================
let cbv = fs.readFileSync('src/components/mesjid/CashbookView.tsx', 'utf8');

// Add imports
if (!cbv.includes('ConfirmDialog')) {
  cbv = cbv.replace(
    "import UserAvatar from './UserAvatar'",
    "import UserAvatar from './UserAvatar'\nimport ConfirmDialog, { useConfirm } from './ConfirmDialog'\nimport FullscreenImageViewer from './FullscreenImageViewer'\nimport { Edit3 } from 'lucide-react'"
  );
}

// Add useState for editing + useConfirm
if (!cbv.includes('useConfirm')) {
  cbv = cbv.replace(
    "const dir = LANGUAGE_DIRECTION[language]",
    "const dir = LANGUAGE_DIRECTION[language]\n  const { confirm, Dialog } = useConfirm()\n  const [viewerImg, setViewerImg] = useState<string | null>(null)\n  const [editingId, setEditingId] = useState<string | null>(null)"
  );
}

// Fix handleDelete with confirmation
cbv = cbv.replace(
  "const handleDelete = async (entryId: string) => {\n    try { const r = await fetch(`/api/cash-entries?entryId=${entryId}`, { method: 'DELETE' }); if (!r.ok) throw new Error(); setCashEntries(cashEntries.filter((e) => e.id !== entryId)); toast({ title: 'Entry deleted' }) }\n    catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }",
  "const handleDelete = (entryId: string) => {\n    confirm('Delete Entry?', 'This action cannot be undone. Are you sure you want to delete this cash entry?', async () => {\n      try { const r = await fetch(`/api/cash-entries?entryId=${entryId}`, { method: 'DELETE' }); if (!r.ok) throw new Error(); setCashEntries(cashEntries.filter((e) => e.id !== entryId)); toast({ title: 'Entry deleted' }) }\n      catch { toast({ title: t(language, 'general.error'), variant: 'destructive' }) }\n    })"
);

// Make receipt thumbnail clickable for fullscreen
cbv = cbv.replace(
  '{(entry as any).mediaUrl && <img src={(entry as any).mediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />}',
  '{(entry as any).mediaUrl && <img src={(entry as any).mediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setViewerImg((entry as any).mediaUrl)} />}'
);

// Add edit button next to delete button in cashbook entries
cbv = cbv.replace(
  "{canManage && <button onClick={() => handleDelete(entry.id)} className=\"p-1 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors\"><Trash2 className=\"w-3.5 h-3.5\" /></button>}",
  "{canManage && <button onClick={() => { const e = cashEntries.find(x => x.id === entry.id); if (e) { setEntryType(e.type); setAmount(String(e.amount)); setCategory(e.category || 'Other'); setDescription(e.description || ''); setDate(e.date || ''); setReceiptImg((e as any).mediaUrl || null); setEditingId(entry.id); setShowForm(true) } }} className=\"p-1 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors\"><Edit3 className=\"w-3.5 h-3.5\" /></button>}\n                  {canManage && <button onClick={() => handleDelete(entry.id)} className=\"p-1 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors\"><Trash2 className=\"w-3.5 h-3.5\" /></button>}"
);

// Add Dialog + FullscreenImageViewer before closing
cbv = cbv.replace(
  "    </div>\n  )\n}",
  "      <Dialog />\n      <FullscreenImageViewer src={viewerImg} open={!!viewerImg} onClose={() => setViewerImg(null)} />\n    </div>\n  )\n}"
);

fs.writeFileSync('src/components/mesjid/CashbookView.tsx', cbv, 'utf8');
console.log('FIXED: src/components/mesjid/CashbookView.tsx (confirm + edit btn + image viewer)');

// ========================================
// 6. FIX AnnouncementsView.tsx - delete confirmation
// ========================================
fixFile(
  'components/mesjid/AnnouncementsView.tsx',
  "const handleDelete = async (id: string) => {",
  "const handleDelete = (id: string) => {\n    if (!window.confirm('Are you sure you want to delete this announcement?')) return;"
);
// Close the extra bracket - add the async wrapper
let anv = fs.readFileSync('src/components/mesjid/AnnouncementsView.tsx', 'utf8');
if (anv.includes("if (!window.confirm('Are you sure you want to delete this announcement?')) return;")) {
  // The original was async, now we need to wrap the rest in async IIFE or restructure
  // Let's do a more careful replacement
  anv = anv.replace(
    "const handleDelete = (id: string) => {\n    if (!window.confirm('Are you sure you want to delete this announcement?')) return;",
    "const handleDelete = async (id: string) => {\n    if (!window.confirm('Are you sure you want to delete this announcement?')) return;"
  );
  fs.writeFileSync('src/components/mesjid/AnnouncementsView.tsx', anv, 'utf8');
  console.log('FIXED: src/components/mesjid/AnnouncementsView.tsx (delete confirm)');
}

// ========================================
// 7. FIX ChatView.tsx - delete message confirmation
// ========================================
let chatv = fs.readFileSync('src/components/mesjid/ChatView.tsx', 'utf8');
if (chatv.includes('const handleDelete = async (msgId:')) {
  chatv = chatv.replace(
    'const handleDelete = async (msgId:',
    'const handleDelete = (msgId:'
  );
  // Add confirm inside the function - find the fetch call
  chatv = chatv.replace(
    /const handleDelete = \(msgId: string\) => \{\s*\n\s*const res = await fetch/,
    'const handleDelete = (msgId: string) => {\n    if (!window.confirm(\'Are you sure you want to delete this message?\')) return;\n    (async () => {\n      const res = await fetch'
  );
  // Close the IIFE - find the end of handleDelete
  // We need to add closing }) before the next function or end
  chatv = chatv.replace(
    /(const handleDelete = \(msgId: string\) => \{[\s\S]*?catch \{[\s\S]*?\}\s*\})\s*\n/,
    (match) => {
      // Add }) before the final }
      return match.replace(/catch \{[\s\S]*?\}\s*\}/, (m) => m + '\n    })()');
    }
  );
  fs.writeFileSync('src/components/mesjid/ChatView.tsx', chatv, 'utf8');
  console.log('FIXED: src/components/mesjid/ChatView.tsx (delete confirm)');
}

// ========================================
// 8. FIX PublicFeed.tsx - delete post + comment confirmation
// ========================================
let pf = fs.readFileSync('src/components/mesjid/PublicFeed.tsx', 'utf8');
if (pf.includes('const handleDeletePost = async (postId:')) {
  pf = pf.replace(
    "const handleDeletePost = async (postId: string) => {",
    "const handleDeletePost = async (postId: string) => {\n    if (!window.confirm('Are you sure you want to delete this post?')) return;"
  );
}
if (pf.includes('const handleDeleteComment = async (commentId:')) {
  pf = pf.replace(
    "const handleDeleteComment = async (commentId:",
    "const handleDeleteComment = async (commentId:"
  );
  // Add confirm for comment delete too
  pf = pf.replace(
    /const handleDeleteComment = async \(commentId:[^}]+\{/,
    (match) => match.replace('{', "{\n    if (!window.confirm('Are you sure you want to delete this comment?')) return;")
  );
}
fs.writeFileSync('src/components/mesjid/PublicFeed.tsx', pf, 'utf8');
console.log('FIXED: src/components/mesjid/PublicFeed.tsx (delete post/comment confirm)');

// ========================================
// 9. FIX UsersView.tsx - delete member confirmation
// ========================================
let uv = fs.readFileSync('src/components/mesjid/UsersView.tsx', 'utf8');
if (uv.includes('const handleDelete = async (userId:')) {
  uv = uv.replace(
    "const handleDelete = async (userId: string) => {",
    "const handleDelete = async (userId: string) => {\n    if (!window.confirm('Are you sure you want to remove this member? This cannot be undone.')) return;"
  );
  fs.writeFileSync('src/components/mesjid/UsersView.tsx', uv, 'utf8');
  console.log('FIXED: src/components/mesjid/UsersView.tsx (delete member confirm)');
}

// ========================================
// 10. FIX PlansView.tsx - delete plan + report confirmation (duplicate/old file)
// ========================================
if (fs.existsSync('src/components/mesjid/PlansView.tsx')) {
  let pvv = fs.readFileSync('src/components/mesjid/PlansView.tsx', 'utf8');
  if (pvv.includes('const handleDelete = async (planId:')) {
    pvv = pvv.replace(
      "const handleDelete = async (planId: string) => {",
      "const handleDelete = async (planId: string) => {\n    if (!window.confirm('Are you sure you want to delete this plan?')) return;"
    );
  }
  if (pvv.includes('const handleDeleteReport = async (reportId:')) {
    pvv = pvv.replace(
      "const handleDeleteReport = async (reportId: string) => {",
      "const handleDeleteReport = async (reportId: string) => {\n    if (!window.confirm('Are you sure you want to delete this report?')) return;"
    );
  }
  fs.writeFileSync('src/components/mesjid/PlansView.tsx', pvv, 'utf8');
  console.log('FIXED: src/components/mesjid/PlansView.tsx (delete confirm)');
}

// ========================================
// 11. FIX ReportsView.tsx - delete report confirmation
// ========================================
if (fs.existsSync('src/components/mesjid/ReportsView.tsx')) {
  let rv = fs.readFileSync('src/components/mesjid/ReportsView.tsx', 'utf8');
  if (rv.includes('const handleDelete = async (reportId:')) {
    rv = rv.replace(
      "const handleDelete = async (reportId: string) => {",
      "const handleDelete = async (reportId: string) => {\n    if (!window.confirm('Are you sure you want to delete this report?')) return;"
    );
    fs.writeFileSync('src/components/mesjid/ReportsView.tsx', rv, 'utf8');
    console.log('FIXED: src/components/mesjid/ReportsView.tsx (delete confirm)');
  }
}

// ========================================
// 12. FIX PublicDashboard.tsx - delete confirmation
// ========================================
let pbd = fs.readFileSync('src/components/mesjid/PublicDashboard.tsx', 'utf8');
let pdFixed = false;
// Handle multiple handleDelete functions
pbd = pbd.replace(
  /const handleDelete = async \(id: string\) => \{/g,
  () => { pdFixed = true; return "const handleDelete = async (id: string) => {\n    if (!window.confirm('Are you sure you want to delete this?')) return;"; }
);
if (pdFixed) {
  fs.writeFileSync('src/components/mesjid/PublicDashboard.tsx', pbd, 'utf8');
  console.log('FIXED: src/components/mesjid/PublicDashboard.tsx (delete confirms)');
}

// ========================================
// 13. FIX PublicDashboard.tsx - logout confirmation
// ========================================
let pbd2 = fs.readFileSync('src/components/mesjid/PublicDashboard.tsx', 'utf8');
fixFile(
  'components/mesjid/PublicDashboard.tsx',
  "<button onClick={logout} className",
  "<button onClick={() => { if (window.confirm('Are you sure you want to log out?')) logout() }} className"
);

console.log('\\n=== DONE fix12.js ===');
console.log('Changes: ConfirmDialog + FullscreenImageViewer components, confirmations on all delete/logout actions, plans sorted by urgency, cashbook edit button, clickable fullscreen images');