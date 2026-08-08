const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'src', 'components', 'mesjid');
let fixed = [];
function R(p) { return fs.readFileSync(p, 'utf8'); }
function W(p, c) { fs.writeFileSync(p, c, 'utf8'); fixed.push(p.replace(__dirname + "\\", "")); }

// ================================================================
// 1. FIX ConfirmDialog — accept (title, message, action, variant)
// ================================================================
W(path.join(base, "ConfirmDialog.tsx"), [
"'use client'",
"",
"import { useState, useCallback } from 'react'",
"import { AlertTriangle } from 'lucide-react'",
"import { motion, AnimatePresence } from 'framer-motion'",
"",
"interface CS { open: boolean; title: string; message: string; variant: 'danger' | 'warning'; action: (() => void) | null }",
"",
"export function useConfirm() {",
"  const [s, setS] = useState<CS>({ open: false, title: '', message: '', variant: 'danger', action: null })",
"  const confirm = useCallback((titleOrMsg: string, messageOrAction: string | (() => void), actionOrVariant?: (() => void) | 'danger' | 'warning', variant?: 'danger' | 'warning') => {",
"    let title: string, message: string, action: () => void, v: 'danger' | 'warning' = 'danger'",
"    if (typeof messageOrAction === 'function') { title = 'Confirm'; message = titleOrMsg; action = messageOrAction; v = (actionOrVariant as 'danger' | 'warning') || 'danger' }",
"    else { title = titleOrMsg; message = messageOrAction; action = (actionOrVariant as () => void); v = variant || 'danger' }",
"    setS({ open: true, title, message, variant: v, action })",
"  }, [])",
"  const close = useCallback(() => setS(p => ({ ...p, open: false, action: null })), [])",
"  const doIt = useCallback(() => { try { s.action?.() } catch(e) { console.error('confirm action:', e) } close() }, [s.action, close])",
"",
"  const dialog = s.open ? (",
"    <motion.div key='cd' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}",
"      className='fixed inset-0 z-[100] flex items-center justify-center p-4' onClick={close}>",
"      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' />",
"      <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.85,opacity:0}}",
"        transition={{type:'spring',duration:0.25,damping:25,stiffness:300}}",
"        className='relative glass-card p-5 max-w-xs w-full rounded-2xl border shadow-2xl'",
"        style={{borderColor:s.variant==='danger'?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)'}}",
"        onClick={e=>e.stopPropagation()}>",
"        <div className='flex flex-col items-center text-center gap-3'>",
"          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.variant==='danger'?'bg-red-500/15':'bg-amber-500/15'}`}>",
"            <AlertTriangle className={`w-6 h-6 ${s.variant==='danger'?'text-red-400':'bg-amber-400'}`} />",
"          </div>",
"          <h3 className='font-semibold text-sm text-foreground'>{s.title}</h3>",
"          <p className='text-xs text-muted-foreground leading-relaxed'>{s.message}</p>",
"          <div className='flex gap-2 w-full mt-1'>",
"            <button onClick={close} className='flex-1 px-4 py-2 text-xs rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors'>Cancel</button>",
"            <button onClick={doIt} className={`flex-1 px-4 py-2 text-xs rounded-xl text-white font-medium transition-colors ${s.variant==='danger'?'bg-red-500 hover:bg-red-600':'bg-amber-500 hover:bg-amber-600'}`}>{s.variant==='danger'?'Delete':'Confirm'}</button>",
"          </div>",
"        </div>",
"      </motion.div>",
"    </motion.div>",
"  ) : null",
"",
"  return { confirm, dialog }",
"}",
"",
"export default function ConfirmDialog() { return null }",
].join("\n"));

// ================================================================
// 2. PLANS/REPORTS — wrap deletes + add {dialog}
// ================================================================
{
  let c = R(path.join(base, "PlansReportsView.tsx"));
  // Fix broken img tag
  c = c.replace(
    'onClick={() => setViewerImg(report.mediaUrl)} />\n                    <p',
    'onClick={() => setViewerImg(report.mediaUrl)} />\n                    </div>\n                    {report.content && <p'
  );
  // Wrap delete plan
  c = c.replace(
    'onClick={() => handleDeletePlan(plan.id)}',
    "onClick={() => confirm('Delete Plan?', 'Are you sure you want to delete this plan?', () => handleDeletePlan(plan.id))}"
  );
  // Wrap delete report in plan expanded
  c = c.replace(
    'onClick={() => handleDeleteReport(r.id)}',
    "onClick={() => confirm('Delete Report?', 'Are you sure?', () => handleDeleteReport(r.id))}"
  );
  // Wrap delete report in reports tab
  c = c.replace(
    "onClick={() => handleDeleteReport(report.id)} className=\"shrink-0",
    "onClick={() => confirm('Delete Report?', 'Are you sure?', () => handleDeleteReport(report.id))} className=\"shrink-0"
  );
  W(path.join(base, "PlansReportsView.tsx"), c);
}

// ================================================================
// 3. ANNOUNCEMENTS — wrap delete + add {dialog}
// ================================================================
{
  let c = R(path.join(base, "AnnouncementsView.tsx"));
  c = c.replace(
    'onClick={() => handleDelete(ann.id)}',
    "onClick={() => confirm('Delete Announcement?', 'Are you sure?', () => handleDelete(ann.id))}"
  );
  if (!c.includes('{dialog}')) {
    const i = c.lastIndexOf('</div>');
    c = c.substring(0, i) + '      {dialog}\n    ' + c.substring(i);
  }
  W(path.join(base, "AnnouncementsView.tsx"), c);
}

// ================================================================
// 4. CHAT VIEW — wrap delete + add {dialog} + null guard replyTo
// ================================================================
{
  let c = R(path.join(base, "ChatView.tsx"));
  c = c.replace(
    '{isOwn && <button onClick={() => handleDelete(msg.id)}',
    "{isOwn && <button onClick={() => confirm('Delete Message?', 'Are you sure?', () => handleDelete(msg.id))}"
  );
  // Null guard replyTo.sender
  c = c.replace(
    'replyTo.sender.displayName',
    'replyTo.sender?.displayName'
  );
  W(path.join(base, "ChatView.tsx"), c);
}

// ================================================================
// 5. PUBLIC FEED — wrap deletes + add {dialog}
// ================================================================
{
  let c = R(path.join(base, "PublicFeed.tsx"));
  c = c.replace(
    'onClick={() => handleDeletePost(post.id)}',
    "onClick={() => confirm('Delete Post?', 'Are you sure?', () => handleDeletePost(post.id))}"
  );
  c = c.replace(
    'onClick={() => handleDeleteComment(post.id, comment.id)}',
    "onClick={() => confirm('Delete Comment?', 'Are you sure?', () => handleDeleteComment(post.id, comment.id))}"
  );
  if (!c.includes('{dialog}')) {
    const i = c.lastIndexOf('</div>');
    c = c.substring(0, i) + '      {dialog}\n    ' + c.substring(i);
  }
  W(path.join(base, "PublicFeed.tsx"), c);
}

// ================================================================
// 6. USERS VIEW — wrap delete + add {dialog}
// ================================================================
{
  let c = R(path.join(base, "UsersView.tsx"));
  c = c.replace(
    'onClick={() => handleDelete(u.id)}',
    "onClick={() => confirm('Remove Member?', 'This cannot be undone. Are you sure?', () => handleDelete(u.id))}"
  );
  if (!c.includes('{dialog}')) {
    const i = c.lastIndexOf('</div>');
    c = c.substring(0, i) + '      {dialog}\n    ' + c.substring(i);
  }
  W(path.join(base, "UsersView.tsx"), c);
}

// ================================================================
// 7. DASHBOARD — replace window.confirm with ASMYA confirm
// ================================================================
{
  let c = R(path.join(base, "Dashboard.tsx"));
  c = c.replace(
    "onClick={() => { if (window.confirm('Are you sure you want to log out?')) logout() }}",
    "onClick={() => confirm('Logout?', 'Are you sure you want to logout?', logout, 'warning')}"
  );
  W(path.join(base, "Dashboard.tsx"), c);
}

// ================================================================
// 8. CLEANUP: remove duplicate imports
// ================================================================
const dupFiles = ["CashbookView.tsx", "PlansReportsView.tsx"];
for (const f of dupFiles) {
  const fp = path.join(base, f);
  let c = R(fp);
  // Remove "import ConfirmDialog, { useConfirm }" line
  c = c.replace(/import ConfirmDialog, \{ useConfirm \} from '\.\/ConfirmDialog'\}\n/g, '');
  W(fp, c);
}

console.log("FIXED:");
fixed.forEach(f => console.log("  " + f));
console.log("\nDONE fix25.js");
