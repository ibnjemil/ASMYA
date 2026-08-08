const fs = require('fs');
const dir = 'C:\\Users\\reyan\\ASMYA\\src\\components\\mesjid';
let fixes = 0;

// ═══ FIX 1: ChatView.tsx - Remove duplicate cached lines ═══
console.log('=== ChatView.tsx ===');
let cv = fs.readFileSync(dir + '\\ChatView.tsx', 'utf8');
let cvLines = cv.split(/\r?\n/);
let removed = 0;
let out = [];
for (let i = 0; i < cvLines.length; i++) {
  // Skip the second occurrence of the duplicate pair
  if (cvLines[i].trim() === 'const cached = loadCachedMsgs()' && removed === 0 && i > 0 && out.length > 0) {
    let prev = out[out.length - 1].trim();
    if (prev === 'const cached = loadCachedMsgs()' || prev === "if (cached && cached.length > 0) setMessages(cached)") {
      // Check if previous line in output is the if line
      if (out[out.length-1].trim().startsWith("if (cached")) {
        // This is the duplicate - skip this line and the next if line
        removed = 1;
        console.log('  Skipping duplicate at line ' + (i+1));
        continue;
      }
    }
  }
  if (removed === 1 && cvLines[i].trim().startsWith("if (cached &&")) {
    removed = 2;
    console.log('  Skipping duplicate if at line ' + (i+1));
    continue;
  }
  out.push(cvLines[i]);
}
if (removed >= 2) {
  fs.writeFileSync(dir + '\\ChatView.tsx', out.join('\n'));
  fixes++;
  console.log('  FIXED - removed duplicate cached lines');
} else {
  console.log('  Duplicate pattern not found, trying alt...');
  // Fallback: just remove any duplicate const cached lines
  let seen = false;
  out = [];
  for (let i = 0; i < cvLines.length; i++) {
    if (cvLines[i].trim() === 'const cached = loadCachedMsgs()') {
      if (seen) {
        console.log('  Removing duplicate at line ' + (i+1));
        // Also remove the next line if it is the if(cached) line
        if (i+1 < cvLines.length && cvLines[i+1].trim().startsWith("if (cached")) {
          i++; // skip next line too
          console.log('  Removing duplicate if at line ' + (i+1));
        }
        fixes++;
        continue;
      }
      seen = true;
    }
    out.push(cvLines[i]);
  }
  if (fixes > 0) {
    fs.writeFileSync(dir + '\\ChatView.tsx', out.join('\n'));
    fixes = 0; // reset since we already counted
    console.log('  FIXED (fallback)');
    fixes = 1;
  }
}

// ═══ FIX 2: CashbookView.tsx - Edit deletes old + confirm dialog ═══
console.log('\n=== CashbookView.tsx ===');
let cb = fs.readFileSync(dir + '\\CashbookView.tsx', 'utf8');
let cbLines = cb.split(/\r?\n/);

// 2a: Modify handleCreate to handle editing mode (delete old entry after creating new)
let handleCreateIdx = -1;
for (let i = 0; i < cbLines.length; i++) {
  if (cbLines[i].includes('const handleCreate = async')) { handleCreateIdx = i; break; }
}

if (handleCreateIdx >= 0) {
  // Find the line with setCashEntries([data, ...cashEntries])
  let setDataLine = -1;
  for (let i = handleCreateIdx; i < Math.min(handleCreateIdx + 30, cbLines.length); i++) {
    if (cbLines[i].includes('setCashEntries([data, ...cashEntries])')) { setDataLine = i; break; }
  }
  if (setDataLine >= 0) {
    // Replace with edit-aware version
    let oldLine = cbLines[setDataLine];
    let newLine = '      if (editingId) { setCashEntries(cashEntries.map(e => e.id === editingId ? data : e)); setEditingId(null) } else { setCashEntries([data, ...cashEntries]) }';
    // Also need to delete old entry from API after creating new one
    // Insert delete call before toast
    let toastLine = -1;
    for (let i = setDataLine; i < Math.min(setDataLine + 5, cbLines.length); i++) {
      if (cbLines[i].includes("toast({ title: 'Entry created'")) { toastLine = i; break; }
    }
    cbLines[setDataLine] = newLine;
    if (toastLine >= 0) {
      cbLines.splice(toastLine, 0, '      if (editingId) { try { await fetch(`/api/cash-entries?entryId=${editingId}`, { method: "DELETE" }) } catch(e) {} }');
    }
    console.log('  Modified handleCreate for edit mode');
  }
}

// 2b: Add confirm dialog to edit button
for (let i = 0; i < cbLines.length; i++) {
  if (cbLines[i].includes('setEditingId(entry.id); setShowForm(true)') && cbLines[i].includes('Edit3')) {
    // Replace the onClick handler with confirm
    cbLines[i] = cbLines[i].replace(
      'onClick={() => { const e = cashEntries.find(x => x.id === entry.id); if (e) { setEntryType(e.type); setAmount(String(e.amount)); setCategory(e.category || \'Other\'); setDescription(e.description || \'\'); setDate(e.date || \'\'); setReceiptImg((e as any).mediaUrl || null); setEditingId(entry.id); setShowForm(true) } }}',
      'onClick={() => confirm(\'Edit Entry?\', \'Are you sure you want to edit this entry?\', () => { const e = cashEntries.find(x => x.id === entry.id); if (e) { setEntryType(e.type); setAmount(String(e.amount)); setCategory(e.category || \'Other\'); setDescription(e.description || \'\'); setDate(e.date || \'\'); setReceiptImg((e as any).mediaUrl || null); setEditingId(entry.id); setShowForm(true) } })}'
    );
    console.log('  Added confirm dialog to edit button');
    break;
  }
}

// 2c: Clean up duplicate import
let cbOut = [];
let importSeen = false;
for (let i = 0; i < cbLines.length; i++) {
  if (!importSeen && cbLines[i].trim() === "import ConfirmDialog, { useConfirm } from './ConfirmDialog'") {
    importSeen = true;
    cbOut.push(cbLines[i]);
    continue;
  }
  if (cbLines[i].trim() === "import { useConfirm } from './ConfirmDialog'") {
    console.log('  Removing duplicate import');
    continue;
  }
  cbOut.push(cbLines[i]);
}

fs.writeFileSync(dir + '\\CashbookView.tsx', cbOut.join('\n'));
fixes++;
console.log('  CashbookView.tsx SAVED');

console.log('\n=== fix31: ' + fixes + ' files fixed ===');
