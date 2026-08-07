const fs = require('fs');
let c = fs.readFileSync('src/components/mesjid/CashbookView.tsx', 'utf8');

// Fix the broken delete button and restore proper structure
const broken = `{canManage && <button onClick={() => { const e = cashEntries.find(x => x.id === entry.id); if (e) { setEntryType(e.type); setAmount(String(e.amount)); setCategory(e.category || 'Other'); setDescription(e.description || ''); setDate(e.date || ''); setReceiptImg((e as any).mediaUrl || null); setEditingId(entry.id); setShowForm(true) } }} className="p-1 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>}
                  {canManage && <button onClick={() => handleDelete(entry.hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}`;

const fixed = `{canManage && <button onClick={() => { const e = cashEntries.find(x => x.id === entry.id); if (e) { setEntryType(e.type); setAmount(String(e.amount)); setCategory(e.category || 'Other'); setDescription(e.description || ''); setDate(e.date || ''); setReceiptImg((e as any).mediaUrl || null); setEditingId(entry.id); setShowForm(true) } }} className="p-1 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>}
                  {canManage && <button onClick={() => handleDelete(entry.id)} className="p-1 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}`;

if (c.includes('handleDelete(entry.hover')) {
  c = c.replace(broken, fixed);
  fs.writeFileSync('src/components/mesjid/CashbookView.tsx', c, 'utf8');
  console.log('FIXED: CashbookView delete button');
} else {
  console.log('Pattern not found, trying line fix');
  let lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('handleDelete(entry.hover')) {
      lines[i] = '                  {canManage && <button onClick={() => handleDelete(entry.id)} className="p-1 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}';
      console.log('Fixed line ' + (i+1));
      break;
    }
  }
  c = lines.join('\n');

  // Also restore the missing flex-1 wrapper div
  const brokenSection = `                {(entry as any).mediaUrl && <img src={(entry as any).mediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setViewerImg((entry as any).mediaUrl)} />}
                  <div className="flex items-center gap-2">`;
  const fixedSection = `                {(entry as any).mediaUrl && <img src={(entry as any).mediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setViewerImg((entry as any).mediaUrl)} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">`;
  if (c.includes(brokenSection)) {
    c = c.replace(brokenSection, fixedSection);
    console.log('Restored flex-1 wrapper');
  }

  fs.writeFileSync('src/components/mesjid/CashbookView.tsx', c, 'utf8');
  console.log('SAVED via line fix');
}

console.log('DONE');
