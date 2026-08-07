const fs = require('fs');
let c = fs.readFileSync('src/components/mesjid/CashbookView.tsx', 'utf8');

// Check if the hook call exists (not just the import)
if (!c.includes('const { confirm, Dialog } = useConfirm()')) {
  c = c.replace(
    'const dir = LANGUAGE_DIRECTION[language]',
    'const dir = LANGUAGE_DIRECTION[language]\n  const { confirm, Dialog } = useConfirm()\n  const [viewerImg, setViewerImg] = useState<string | null>(null)\n  const [editingId, setEditingId] = useState<string | null>(null)'
  );
  console.log('Added hook + state');
}

// Merge Edit3 into main lucide import
if (c.includes("import { Edit3 } from 'lucide-react'")) {
  c = c.replace("import { Edit3 } from 'lucide-react'", '');
  c = c.replace(
    'Lock, ImagePlus,\n}',
    'Lock, ImagePlus, Edit3,\n}'
  );
  console.log('Merged Edit3 import');
}

fs.writeFileSync('src/components/mesjid/CashbookView.tsx', c, 'utf8');
console.log('SAVED');
