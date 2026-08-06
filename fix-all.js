const fs = require('fs');
const path = require('path');
const base = process.cwd();

let f1 = fs.readFileSync(path.join(base, 'src', 'components', 'mesjid', 'PlansReportsView.tsx'), 'utf8');
f1 = f1.replace(
  /const handleImgUpload = async \(file, setImg\) => \{[\s\S]*?setUploadingImg\(false\)\n  \}/,
  'const handleImgUpload = (file: File, setImg: (u: string | null) => void) => {\n    const r = new FileReader()\n    r.onload = () => setImg(r.result as string)\n    r.readAsDataURL(file)\n  }'
);
fs.writeFileSync(path.join(base, 'src', 'components', 'mesjid', 'PlansReportsView.tsx'), f1, 'utf8');
console.log('1/4 PlansReportsView.tsx - instant image upload');

let f2 = fs.readFileSync(path.join(base, 'src', 'components', 'mesjid', 'CashbookView.tsx'), 'utf8');
f2 = f2.replace(
  '{(entry) => (nimate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card p-3 flex items-center gap-3">',
  '{sorted.map((entry) => (\n                <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card p-3 flex items-center gap-3">'
);
f2 = f2.replace('w-5h-5', 'w-5 h-5');
fs.writeFileSync(path.join(base, 'src', 'components', 'mesjid', 'CashbookView.tsx'), f2, 'utf8');
console.log('2/4 CashbookView.tsx - fixed motion.div + icon class');

let f3 = fs.readFileSync(path.join(base, 'src', 'app', 'api', 'cash-entries', 'route.ts'), 'utf8');
f3 = f3.replace(
  'await ensureCashMedia(); export async function GET(request: NextRequest) {  try {',
  'export async function GET(request: NextRequest) {\n  await ensureCashMedia()\n  try {'
);
f3 = f3.replace(
  'await ensureCashMedia(); export async function POST(request: NextRequest) {',
  'export async function POST(request: NextRequest) {\n  await ensureCashMedia()'
);
f3 = f3.replace(
  '        date: new Date(date),\n      },\n    }) as Record<string, unknown>',
  '        date: new Date(date),\n        mediaUrl: mediaUrl || null,\n      },\n    }) as Record<string, unknown>'
);
fs.writeFileSync(path.join(base, 'src', 'app', 'api', 'cash-entries', 'route.ts'), f3, 'utf8');
console.log('3/4 cash-entries/route.ts - ensureCashMedia + mediaUrl create');

let f4 = fs.readFileSync(path.join(base, 'src', 'app', 'api', 'plans', 'route.ts'), 'utf8');
f4 = f4.replace(
  'await ensureColumns(); export async function GET(request: NextRequest) {',
  'export async function GET(request: NextRequest) {\n  await ensureColumns()'
);
f4 = f4.replace(
  'await ensureColumns(); export async function POST(request: NextRequest) {',
  'export async function POST(request: NextRequest) {\n  await ensureColumns()'
);
fs.writeFileSync(path.join(base, 'src', 'app', 'api', 'plans', 'route.ts'), f4, 'utf8');
console.log('4/4 plans/route.ts - ensureColumns placement');

console.log('\nAll 4 files fixed!');
