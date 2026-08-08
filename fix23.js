const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'src', 'components', 'mesjid');
const apiBase = path.join(__dirname, 'src', 'app', 'api');
let fixed = [];
function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, c) { fs.writeFileSync(p, c, 'utf8'); fixed.push(p.replace(__dirname + "\\", "")); }

// ============================================================
// 1. REWRITE ConfirmDialog.tsx — self-contained hook, NO provider needed
// ============================================================
write(path.join(base, "ConfirmDialog.tsx"), [
"'use client'",
"",
"import { useState, useCallback } from 'react'",
"import { AlertTriangle } from 'lucide-react'",
"import { motion, AnimatePresence } from 'framer-motion'",
"",
"interface ConfirmState { open: boolean; title: string; message: string; variant: 'danger' | 'warning'; onConfirm: (() => void) | null }",
"",
"export function useConfirm() {",
"  const [state, setState] = useState<ConfirmState>({ open: false, title: '', message: '', variant: 'danger', onConfirm: null })",
"  const confirm = useCallback((message: string, onConfirm: () => void, variant: 'danger' | 'warning' = 'danger') => {",
"    setState({ open: true, title: variant === 'danger' ? 'Delete?' : 'Confirm', message, variant, onConfirm })",
"  }, [])",
"  const close = useCallback(() => setState(s => ({ ...s, open: false, onConfirm: null })), [])",
"  const handleConfirm = useCallback(() => { state.onConfirm?.(); close() }, [state.onConfirm, close])",
"",
"  const Dialog = useCallback(() => (",
"    <AnimatePresence>",
"      {state.open && (",
"        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}",
"          className='fixed inset-0 z-[100] flex items-center justify-center p-4' onClick={close}>",
"          <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' />",
"          <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}",
"          transition={{type:'spring',duration:0.3}}",
"          className='relative glass-card p-5 max-w-xs w-full rounded-2xl border shadow-2xl'",
"          style={{borderColor:state.variant==='danger'?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)'}}",
"          onClick={e=>e.stopPropagation()}>",
"          <div className='flex flex-col items-center text-center gap-3'>",
"            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${state.variant==='danger'?'bg-red-500/15':'bg-amber-500/15'}`}>",
"              <AlertTriangle className={`w-6 h-6 ${state.variant==='danger'?'text-red-400':'text-amber-400'}`} />",
"            </div>",
"            <h3 className='font-semibold text-sm text-foreground'>{state.title}</h3>",
"            <p className='text-xs text-muted-foreground leading-relaxed'>{state.message}</p>",
"            <div className='flex gap-2 w-full mt-1'>",
"              <button onClick={close} className='flex-1 px-4 py-2 text-xs rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors'>Cancel</button>",
"              <button onClick={handleConfirm} className={`flex-1 px-4 py-2 text-xs rounded-xl text-white transition-colors ${state.variant==='danger'?'bg-red-500 hover:bg-red-600':'bg-amber-500 hover:bg-amber-600'}`}>{state.variant==='danger'?'Delete':'Confirm'}</button>",
"            </div>",
"          </div>",
"        </motion.div>",
"      )}",
"    </AnimatePresence>",
"  ), [state, close, handleConfirm])",
"",
"  return { confirm, Dialog }",
"}",
"",
"export default function ConfirmDialog() { return null }",
].join("\n"));

// ============================================================
// 2. FIX ChatView — add error handling + null guards
// ============================================================
{
  const fp = path.join(base, "ChatView.tsx");
  let c = read(fp);

  // Add null guard on sender in message rendering
  if (!c.includes("msg.sender?.displayName") && c.includes("msg.sender.displayName")) {
    c = c.replace(/msg\.sender\.displayName/g, "msg.sender?.displayName");
  }

  // Fix handleSend — add catch block so errors dont crash the component
  if (c.includes("} finally { setSending(false) }") && !c.includes("} catch {")) {
    c = c.replace(
      "} finally { setSending(false) }",
      "} catch (err) { console.error('send error:', err) } finally { setSending(false) }"
    );
  }

  // Fix duplicate setMessages/setStatuses lines
  if (c.includes("setMessages(p=>p.filter(m=>m.id!==tempId))\n        setStatuses(p=>({...p,[msg.id]:'sent'}))\n        setMessages(p=>p.filter(m=>m.id!==tempId))")) {
    c = c.replace(
      "setMessages(p=>p.filter(m=>m.id!==tempId))\n        setStatuses(p=>({...p,[msg.id]:'sent'}))\n        setMessages(p=>p.filter(m=>m.id!==tempId))\n        setStatuses(p=>({...p,[msg.id]:'sent'}))",
      "setMessages(p=>p.filter(m=>m.id!==tempId))\n        setStatuses(p=>({...p,[msg.id]:'sent'}))"
    );
  }

  write(fp, c);
}

// ============================================================
// 3. FIX messages API — handle 'after' param + remove dup return
// ============================================================
{
  const fp = path.join(apiBase, "messages", "route.ts");
  let c = read(fp);

  // Remove duplicate return
  c = c.replace(/return NextResponse\.json\(msgs\)\s*\n(\s*)return NextResponse\.json\(msgs\)/, "return NextResponse.json(msgs)");

  // Add 'after' support
  if (!c.includes("const after")) {
    c = c.replace(
      "const before = searchParams.get('before')",
      "const before = searchParams.get('before')\n    const after = searchParams.get('after')"
    );
    c = c.replace(
      "if (before) wc.createdAt = { lt: new Date(before) }",
      "if (before) wc.createdAt = { lt: new Date(before) }\n    if (after) wc.createdAt = { gt: new Date(after) }"
    );
  }

  // Add mediaUrl column check for Message table
  if (!c.includes("ensureMessageColumns")) {
    const colCheck = [
      "async function ensureMessageColumns() {",
      "  try {",
      "    const { createClient } = await import('@libsql/client')",
      "    const cl = createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })",
      "    const info = await cl.execute('PRAGMA table_info(\"Message\")')",
      "    const cols = new Set(info.rows.map((r: any) => r.name))",
      "    if (!cols.has('mediaUrl')) { await cl.execute('ALTER TABLE \"Message\" ADD COLUMN \"mediaUrl\" TEXT'); console.log('Added mediaUrl to Message') }",
      "  } catch (e) { console.error('ensureMessageColumns:', e) }",
      "}",
      ""
    ].join("\n");
    c = c.replace("export const runtime", colCheck + "export const runtime");
    c = c.replace(
      "const { chatId, senderId, type, content, mediaUrl }",
      "await ensureMessageColumns()\n    const { chatId, senderId, type, content, mediaUrl }"
    );
  }

  write(fp, c);
}

// ============================================================
// 4. FIX reports API — more robust column check
// ============================================================
{
  const fp = path.join(apiBase, "reports", "route.ts");
  let c = read(fp);

  // Ensure the column check exists and runs
  if (c.includes("ensureReportColumns")) {
    // Make sure it runs before body parse
    if (!c.includes("await ensureReportColumns()")) {
      c = c.replace(
        "const body = await request.json()",
        "await ensureReportColumns()\n    const body = await request.json()"
      );
    }
  }

  // Also add a try-catch around the whole POST with better error logging
  if (!c.includes("console.error('POST report details:")) {
    c = c.replace(
      'console.error(\'POST /api/reports error:\', error)',
      "console.error('POST /api/reports error:', error, error instanceof Error ? error.stack : '')"
    );
  }

  write(fp, c);
}

console.log("FIXED:");
fixed.forEach(f => console.log("  " + f));
console.log("\nDONE fix23.js");
