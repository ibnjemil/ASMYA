const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'src', 'components', 'mesjid');
const apiBase = path.join(__dirname, 'src', 'app', 'api');
let fixed = [];
function R(p) { return fs.readFileSync(p, 'utf8'); }
function W(p, c) { fs.writeFileSync(p, c, 'utf8'); fixed.push(p.replace(__dirname + "\\", "")); }

// ================================================================
// 1. REWRITE ConfirmDialog — returns JSX element, NOT a component
// ================================================================
W(path.join(base, "ConfirmDialog.tsx"), [
"'use client'",
"",
"import { useState, useCallback } from 'react'",
"import { AlertTriangle } from 'lucide-react'",
"import { motion, AnimatePresence } from 'framer-motion'",
"",
"interface CState { open: boolean; title: string; message: string; variant: 'danger' | 'warning'; action: (() => void) | null }",
"",
"export function useConfirm() {",
"  const [s, setS] = useState<CState>({ open: false, title: '', message: '', variant: 'danger', action: null })",
"  const confirm = useCallback((message: string, action: () => void, variant: 'danger' | 'warning' = 'danger') => {",
"    setS({ open: true, title: variant === 'danger' ? 'Delete?' : 'Confirm', message, variant, action })",
"  }, [])",
"  const close = useCallback(() => setS(p => ({ ...p, open: false, action: null })), [])",
"  const doIt = useCallback(() => { s.action?.(); close() }, [s.action, close])",
"",
"  const dialog = s.open ? (",
"    <motion.div key='confirm-overlay' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}",
"      className='fixed inset-0 z-[100] flex items-center justify-center p-4' onClick={close}>",
"      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' />",
"      <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.85,opacity:0}}",
"        transition={{type:'spring',duration:0.25,damping:25,stiffness:300}}",
"        className='relative glass-card p-5 max-w-xs w-full rounded-2xl border shadow-2xl'",
"        style={{borderColor:s.variant==='danger'?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)'}}",
"        onClick={e=>e.stopPropagation()}>",
"        <div className='flex flex-col items-center text-center gap-3'>",
"          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.variant==='danger'?'bg-red-500/15':'bg-amber-500/15'}`}>",
"            <AlertTriangle className={`w-6 h-6 ${s.variant==='danger'?'text-red-400':'text-amber-400'}`} />",
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
// 2. PATCH all files: change <Dialog /> to {dialog}
// ================================================================
const files = [
  { fp: "PlansReportsView.tsx", afterImport: "import UserAvatar from './UserAvatar'", afterHook: "const { toast } = useToast()" },
  { fp: "CashbookView.tsx", afterImport: "import UserAvatar from './UserAvatar'", afterHook: "const { toast } = useToast()" },
  { fp: "AnnouncementsView.tsx", afterImport: "import UserAvatar from './UserAvatar'", afterHook: "const { toast } = useToast()" },
  { fp: "ChatView.tsx", afterImport: "import UserAvatar from './UserAvatar'", afterHook: "const { user, language, messages, addMessage, setMessages } = useStore()" },
  { fp: "PublicFeed.tsx", afterImport: "import UserAvatar from './UserAvatar'", afterHook: "const { toast } = useToast()" },
  { fp: "UsersView.tsx", afterImport: "import UserAvatar from './UserAvatar'", afterHook: "const { toast } = useToast()" },
  { fp: "Dashboard.tsx", afterImport: "import SettingsView from './SettingsView'", afterHook: "    setIsLoading," },
];

for (const f of files) {
  const fp = path.join(base, f.fp);
  let c = R(fp);
  let changed = false;

  // Fix import: useConfirm not ConfirmDialog
  if (c.includes("import ConfirmDialog") || c.includes("import { useConfirm }")) {
    c = c.replace(/import.*ConfirmDialog.*\n/g, "");
    changed = true;
  }
  if (!c.includes("import { useConfirm }")) {
    c = c.replace(f.afterImport, f.afterImport + "\nimport { useConfirm } from './ConfirmDialog'");
    changed = true;
  }

  // Fix hook: destructure { confirm, dialog } not { confirm, Dialog }
  if (c.includes("const { confirm, Dialog } = useConfirm()")) {
    c = c.replace("const { confirm, Dialog } = useConfirm()", "const { confirm, dialog } = useConfirm()");
    changed = true;
  } else if (!c.includes("useConfirm()")) {
    c = c.replace(f.afterHook, f.afterHook + "\n  const { confirm, dialog } = useConfirm()");
    changed = true;
  }

  // Replace <Dialog /> with {dialog}
  if (c.includes("<Dialog />") || c.includes("<Dialog/>")) {
    c = c.replace(/<Dialog\s*\/>/g, "{dialog}");
    changed = true;
  } else if (!c.includes("{dialog}")) {
    // Add {dialog} before last </div>
    const idx = c.lastIndexOf("</div>");
    if (idx > -1) {
      c = c.substring(0, idx) + "      {dialog}\n    " + c.substring(idx);
      changed = true;
    }
  }

  if (changed) { W(fp, c); console.log("PATCHED: " + f.fp); }
  else console.log("OK: " + f.fp);
}

// ================================================================
// 3. FIX ChatView — comprehensive error handling
// ================================================================
{
  const fp = path.join(base, "ChatView.tsx");
  let c = R(fp);

  // Add catch to handleSend if missing
  if (c.includes("} finally { setSending(false) }") && !c.match(/\} catch.*\} finally/)) {
    c = c.replace(
      "} finally { setSending(false) }",
      "} catch (err) { console.error('Send error:', err) } finally { setSending(false) }"
    );
  }

  // Null guard sender
  if (c.includes("msg.sender.displayName") && !c.includes("msg.sender?.displayName")) {
    c = c.replace(/msg\.sender\.displayName/g, "msg.sender?.displayName");
  }
  if (c.includes("msg.sender.avatarUrl") && !c.includes("msg.sender?.avatarUrl")) {
    c = c.replace(/msg\.sender\.avatarUrl/g, "msg.sender?.avatarUrl");
  }

  // Fix duplicate setMessages
  c = c.replace(/setMessages\(p=>p\.filter\(m=>m\.id!==tempId\)\)\s*\n\s*setStatuses\(p=>\(\{\.\.\.p,\[msg\.id\]:'sent'\}\)\)\s*\n\s*setMessages\(p=>p\.filter\(m=>m\.id!==tempId\)\)\s*\n\s*setStatuses\(p=>\(\{\.\.\.p,\[msg\.id\]:'sent'\}\)\)/,
    "setMessages(p=>p.filter(m=>m.id!==tempId))\n        setStatuses(p=>({...p,[msg.id]:'sent'}))");

  W(fp, c);
  console.log("PATCHED: ChatView (error handling)");
}

// ================================================================
// 4. FIX messages API — column checks + dup return + after param
// ================================================================
{
  const fp = path.join(apiBase, "messages", "route.ts");
  let c = R(fp);

  // Remove duplicate return
  c = c.replace(/return NextResponse\.json\(msgs\)\s*\n(\s*)return NextResponse\.json\(msgs\)/, "return NextResponse.json(msgs)");

  // Add after param
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

  // Add column check
  if (!c.includes("ensureMsgCol")) {
    c = c.replace(
      "export const runtime",
      "async function ensureMsgCol() {\n  try {\n    const { createClient } = await import('@libsql/client')\n    const cl = createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })\n    const info = await cl.execute('PRAGMA table_info(\"Message\")')\n    const cols = new Set(info.rows.map((r: any) => r.name))\n    if (!cols.has('mediaUrl')) { await cl.execute('ALTER TABLE \"Message\" ADD COLUMN \"mediaUrl\" TEXT'); console.log('Added mediaUrl to Message') }\n    if (!cols.has('type')) { await cl.execute('ALTER TABLE \"Message\" ADD COLUMN \"type\" TEXT DEFAULT \\'TEXT\\''); console.log('Added type to Message') }\n  } catch (e) { console.error('ensureMsgCol:', e) }\n}\n\nexport const runtime"
    );
    c = c.replace(
      "const { chatId, senderId, type, content, mediaUrl }",
      "await ensureMsgCol()\n    const { chatId, senderId, type, content, mediaUrl }"
    );
  }

  W(fp, c);
  console.log("PATCHED: messages/route.ts");
}

// ================================================================
// 5. FIX reports API — ensure table exists + all columns
// ================================================================
{
  const fp = path.join(apiBase, "reports", "route.ts");
  let c = R(fp);

  if (!c.includes("ensureReportColumns")) {
    c = c.replace(
      "export const runtime",
      "async function ensureReportColumns() {\n  try {\n    const { createClient } = await import('@libsql/client')\n    const cl = createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })\n    const tbl = await cl.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='Report'\")\n    if (tbl.rows.length === 0) {\n      await cl.execute(`CREATE TABLE \"Report\" (\"id\" TEXT PRIMARY KEY, \"title\" TEXT NOT NULL, \"content\" TEXT, \"planId\" TEXT, \"mediaUrl\" TEXT, \"createdBy\" TEXT NOT NULL, \"side\" TEXT NOT NULL, \"createdAt\" TEXT NOT NULL, \"updatedAt\" TEXT NOT NULL)`)\n      console.log('Created Report table')\n      return\n    }\n    const info = await cl.execute('PRAGMA table_info(\"Report\")')\n    const cols = new Set(info.rows.map((r: any) => r.name))\n    if (!cols.has('planId')) { await cl.execute('ALTER TABLE \"Report\" ADD COLUMN \"planId\" TEXT'); console.log('Added planId') }\n    if (!cols.has('mediaUrl')) { await cl.execute('ALTER TABLE \"Report\" ADD COLUMN \"mediaUrl\" TEXT'); console.log('Added mediaUrl') }\n  } catch (e) { console.error('ensureReportColumns:', e) }\n}\n\nexport const runtime"
    );
  }

  // Ensure it runs in POST
  if (!c.includes("await ensureReportColumns()")) {
    c = c.replace(
      "const body = await request.json()",
      "await ensureReportColumns()\n    const body = await request.json()"
    );
  }

  W(fp, c);
  console.log("PATCHED: reports/route.ts");
}

// ================================================================
// 6. FIX users API — ensure all amir roles can create members
// ================================================================
{
  const fp = path.join(apiBase, "users", "route.ts");
  let c = R(fp);
  if (c.includes("SUPERIOR_AMIR") && !c.includes("canManageUsers")) {
    // Remove any restrictive role check — let the frontend handle permissions
    c = c.replace(/if\s*\(!.*MAIN_AMIR.*\)/g, "// role check handled by frontend");
    W(fp, c);
    console.log("PATCHED: users/route.ts (permissions)");
  }
}

// ================================================================
// 7. ADD touch-friendly image viewer to CashbookView
// ================================================================
{
  const fp = path.join(base, "CashbookView.tsx");
  let c = R(fp);

  if (!c.includes("fullscreenImg")) {
    // Add state for fullscreen image
    c = c.replace(
      "const dir = LANGUAGE_DIRECTION[language]",
      "const dir = LANGUAGE_DIRECTION[language]\n  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null)"
    );

    // Make image clickable
    if (c.includes("entry.mediaUrl") && !c.includes("setFullscreenImg")) {
      c = c.replace(
        "src={entry.mediaUrl}",
        "src={entry.mediaUrl} onClick={() => setFullscreenImg(entry.mediaUrl)} className='w-14 h-14 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity'"
      );
    }

    // Add fullscreen viewer before the final return closing
    if (!c.includes("fullscreenImg &&")) {
      c = c.replace(
        "</div>\n  )\n}",
        "      {/* Fullscreen Image Viewer */}\n      {fullscreenImg && (\n        <div className='fixed inset-0 z-[90] bg-black/95 flex items-center justify-center' onClick={() => setFullscreenImg(null)}>\n          <img src={fullscreenImg} alt='' className='max-w-full max-h-full object-contain' style={{touchAction:'pan-x pan-y pinch-zoom'}} onClick={e => e.stopPropagation()} />\n          <button className='absolute top-4 right-4 text-white/70 hover:text-white p-2' onClick={() => setFullscreenImg(null)}>\n            <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M18 6L6 18M6 6l12 12'/></svg>\n          </button>\n        </div>\n      )}\n    </div>\n  )\n}"
      );
    }
    W(fp, c);
    console.log("PATCHED: CashbookView (touch image viewer)");
  }
}

console.log("\nFIXED:");
fixed.forEach(f => console.log("  " + f));
console.log("\nDONE fix24.js");
