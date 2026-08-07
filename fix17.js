const fs = require('fs');
let c = fs.readFileSync('src/components/mesjid/CashbookView.tsx', 'utf8');

// Fix corrupted list wrapper
c = c.replace(') : (o">', ') : (\n        <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">');

// Add Edit3 to lucide imports
if (!c.includes('Edit3')) {
  c = c.replace(
    'TrendingUp, TrendingDown, Scale, Lock, ImagePlus,',
    'TrendingUp, TrendingDown, Scale, Lock, ImagePlus, Edit3,'
  );
  console.log('Added Edit3 import');
}

// Ensure ConfirmDialog and FullscreenImageViewer imports exist
if (!c.includes('ConfirmDialog')) {
  c = c.replace(
    "import UserAvatar from './UserAvatar'",
    "import UserAvatar from './UserAvatar'\nimport ConfirmDialog, { useConfirm } from './ConfirmDialog'\nimport FullscreenImageViewer from './FullscreenImageViewer'"
  );
  console.log('Added ConfirmDialog + FullscreenImageViewer imports');
}

// Ensure useConfirm hook + viewer state exist
if (!c.includes('useConfirm')) {
  c = c.replace(
    'const dir = LANGUAGE_DIRECTION[language]',
    'const dir = LANGUAGE_DIRECTION[language]\n  const { confirm, Dialog } = useConfirm()\n  const [viewerImg, setViewerImg] = useState<string | null>(null)\n  const [editingId, setEditingId] = useState<string | null>(null)'
  );
  console.log('Added useConfirm hook + state');
}

// Fix the delete button if still broken
if (c.includes('handleDelete(entry.hover')) {
  c = c.replace(
    /handleDelete\(entry\.hover[^}]*\}\/>/,
    'handleDelete(entry.id)} className="p-1 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>'
  );
  console.log('Fixed delete button');
}

fs.writeFileSync('src/components/mesjid/CashbookView.tsx', c, 'utf8');
console.log('SAVED');
