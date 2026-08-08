const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\reyan\\ASMYA\\src\\components\\mesjid';
let fixes = 0;

// 1. Dashboard.tsx - remove useConfirm from inside useStore(), add after it
console.log('=== Dashboard.tsx ===');
let d = fs.readFileSync(path.join(dir, 'Dashboard.tsx'), 'utf8');
let lines = d.split(/\r?\n/);
let changed = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'const { confirm, dialog } = useConfirm()' && i > 0 && lines[i-1].trim().endsWith(',')) {
    console.log('  Found at line ' + (i+1) + ', removing...');
    lines.splice(i, 1);
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].trim() === '} = useStore()') {
        lines.splice(j + 1, 0, '', '  const { confirm, dialog } = useConfirm()');
        break;
      }
    }
    changed = true;
    break;
  }
}
if (changed) { fs.writeFileSync(path.join(dir, 'Dashboard.tsx'), lines.join('\n')); fixes++; console.log('  FIXED'); }
else { console.log('  Not found or already fixed'); }

// 2. ChatView.tsx - sg.id] -> [msg.id]
console.log('=== ChatView.tsx ===');
let c = fs.readFileSync(path.join(dir, 'ChatView.tsx'), 'utf8');
if (c.includes('sg.id]')) { c = c.replace(/sg\.id\]/g, '[msg.id]'); fs.writeFileSync(path.join(dir, 'ChatView.tsx'), c); fixes++; console.log('  FIXED'); }
else { console.log('  Already fixed'); }

// 3. PlansReportsView.tsx - remove duplicate import
console.log('=== PlansReportsView.tsx ===');
let p = fs.readFileSync(path.join(dir, 'PlansReportsView.tsx'), 'utf8');
let pL = p.split(/\r?\n/);
let pFixed = false;
if (p.includes("import ConfirmDialog, { useConfirm }")) {
  let out = [];
  for (let i = 0; i < pL.length; i++) {
    if (!pFixed && pL[i].trim() === "import { useConfirm } from './ConfirmDialog'") { pFixed = true; continue; }
    out.push(pL[i]);
  }
  if (pFixed) { fs.writeFileSync(path.join(dir, 'PlansReportsView.tsx'), out.join('\n')); fixes++; console.log('  FIXED'); }
} else { console.log('  OK'); }

// 4. CashbookView.tsx - remove duplicate import
console.log('=== CashbookView.tsx ===');
let cb = fs.readFileSync(path.join(dir, 'CashbookView.tsx'), 'utf8');
let cbL = cb.split(/\r?\n/);
let cbFixed = false;
if (cb.includes("import ConfirmDialog, { useConfirm }")) {
  let out = [];
  for (let i = 0; i < cbL.length; i++) {
    if (!cbFixed && cbL[i].trim() === "import { useConfirm } from './ConfirmDialog'") { cbFixed = true; continue; }
    out.push(cbL[i]);
  }
  if (cbFixed) { fs.writeFileSync(path.join(dir, 'CashbookView.tsx'), out.join('\n')); fixes++; console.log('  FIXED'); }
} else { console.log('  OK'); }

console.log('\n=== fix26: ' + fixes + ' files fixed ===');
