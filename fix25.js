const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\reyan\\ASMYA\\src\\components\\mesjid';

let fixes = 0;

// 1. Fix Dashboard.tsx - useConfirm() inside useStore() destructuring
console.log('Fixing Dashboard.tsx ...');
let d = fs.readFileSync(path.join(dir, 'Dashboard.tsx'), 'utf8');
const dashOld = '    setIsLoading,\n  const { confirm, dialog } = useConfirm()\n    incrementUnread,';
const dashNew = '    setIsLoading,\n    incrementUnread,';
if (d.includes(dashOld)) {
  d = d.replace(dashOld, dashNew);
  d = d.replace(
    "} = useStore()\n\n  const [showUpdateBanner",
    "} = useStore()\n\n  const { confirm, dialog } = useConfirm()\n\n  const [showUpdateBanner"
  );
  fs.writeFileSync(path.join(dir, 'Dashboard.tsx'), d);
  fixes++;
  console.log('  Dashboard.tsx FIXED');
} else { console.log('  Dashboard.tsx - pattern not found or already fixed'); }

// 2. Fix ChatView.tsx - sg.id] instead of [msg.id]
console.log('Fixing ChatView.tsx ...');
let c = fs.readFileSync(path.join(dir, 'ChatView.tsx'), 'utf8');
if (c.includes('sg.id]')) {
  c = c.replace('sg.id]', '[msg.id]');
  fs.writeFileSync(path.join(dir, 'ChatView.tsx'), c);
  fixes++;
  console.log('  ChatView.tsx FIXED (sg.id] -> [msg.id])');
} else { console.log('  ChatView.tsx - no sg.id] found'); }

// 3. Fix PlansReportsView.tsx - duplicate import
console.log('Fixing PlansReportsView.tsx ...');
let p = fs.readFileSync(path.join(dir, 'PlansReportsView.tsx'), 'utf8');
const pOld = "import { useConfirm } from './ConfirmDialog'\nimport {\n  useStore, canCreatePlans, canEditPlan, canDeleteContent,\n  MAIN_AMIR_ROLES, SUB_AMIR_ROLES, ALL_AMIR_ROLES, canAccessCashbook,\n} from '@/lib/store'\nimport CashbookView from './CashbookView'\nimport ConfirmDialog, { useConfirm } from './ConfirmDialog'";
const pNew = "import {\n  useStore, canCreatePlans, canEditPlan, canDeleteContent,\n  MAIN_AMIR_ROLES, SUB_AMIR_ROLES, ALL_AMIR_ROLES, canAccessCashbook,\n} from '@/lib/store'\nimport CashbookView from './CashbookView'\nimport { useConfirm } from './ConfirmDialog'";
if (p.includes(pOld)) {
  p = p.replace(pOld, pNew);
  fs.writeFileSync(path.join(dir, 'PlansReportsView.tsx'), p);
  fixes++;
  console.log('  PlansReportsView.tsx FIXED');
} else { console.log('  PlansReportsView.tsx - pattern not found or already fixed'); }

// 4. Fix CashbookView.tsx - duplicate import
console.log('Fixing CashbookView.tsx ...');
let cb = fs.readFileSync(path.join(dir, 'CashbookView.tsx'), 'utf8');
const cbOld = "import { useConfirm } from './ConfirmDialog'\nimport ConfirmDialog, { useConfirm } from './ConfirmDialog'";
const cbNew = "import { useConfirm } from './ConfirmDialog'";
if (cb.includes(cbOld)) {
  cb = cb.replace(cbOld, cbNew);
  fs.writeFileSync(path.join(dir, 'CashbookView.tsx'), cb);
  fixes++;
  console.log('  CashbookView.tsx FIXED');
} else { console.log('  CashbookView.tsx - pattern not found or already fixed'); }

console.log('\n=== fix25 complete: ' + fixes + ' files fixed ===');
