const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
let fixes = 0;

// ===== FIX 1: i18n.ts =====
console.log('=== FIX 1: i18n.ts ===');
try {
  const { execSync } = require('child_process');
  let clean;
  for (const c of ['HEAD~2','HEAD~3','HEAD~4','HEAD~5']) {
    try {
      const content = execSync('git show ' + c + ':src/lib/i18n.ts', { encoding: 'utf8' });
      if (content.includes('\u0627\u0644\u0639\u0631\u0628\u064a\u0629')) {
        clean = content;
        console.log('  Clean version found at ' + c);
        break;
      }
    } catch {}
  }
  if (!clean) { console.log('  ERROR: no clean version found'); process.exit(1); }

  clean = clean.replace(
    "export type Language = 'en' | 'am' | 'ar'",
    "export type Language = 'en' | 'am' | 'ar' | 'om' | 'ti' | 'so'"
  );
  clean = clean.replace(
    /export const LANGUAGE_NAMES: Record<Language, string> = \{[\s\S]*?\}/,
    "export const LANGUAGE_NAMES: Record<Language, string> = {\n  en: 'English',\n  am: '\u12a0\u121b\u122d\u12c8',\n  ar: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',\n  om: 'Afaan Oromoo',\n  ti: '\u1275\u1320\u122d\u129b',\n  so: 'Soomaali',\n}"
  );
  clean = clean.replace(
    /export const LANGUAGE_DIRECTION: Record<Language, 'ltr' \| 'rtl'> = \{[\s\S]*?\}/,
    "export const LANGUAGE_DIRECTION: Record<Language, 'ltr' | 'rtl'> = {\n  en: 'ltr',\n  am: 'ltr',\n  ar: 'rtl',\n  om: 'ltr',\n  ti: 'ltr',\n  so: 'ltr',\n}"
  );
  clean = clean.replace(
    '// Supports: English (en), Amharic (am), Arabic (ar)',
    '// Supports: English (en), Amharic (am), Arabic (ar), Oromo (om), Tigrinya (ti), Somali (so)'
  );
  var oldT = "export function t(lang: Language, key: TranslationKey): string {\n  return translations[lang]?.[key] ?? key\n}";
  var newT = "export function t(lang: Language, key: TranslationKey): string {\n  const direct = translations[lang]?.[key]\n  if (direct !== undefined) return direct\n  if (lang !== 'en') {\n    const fallback = translations.en[key]\n    if (fallback !== undefined) return fallback\n  }\n  return key\n}";
  clean = clean.replace(oldT, newT);
  fs.writeFileSync(path.join(ROOT, 'src/lib/i18n.ts'), clean, 'utf8');
  console.log('  i18n.ts FIXED');
  fixes++;
} catch(e) { console.error('  FAILED:', e.message); }

// ===== FIX 2: upload-avatar =====
console.log('\n=== FIX 2: upload-avatar/route.ts ===');
try {
  let f = fs.readFileSync(path.join(ROOT, 'src/app/api/upload-avatar/route.ts'), 'utf8');
  f = f.replace(
    "const UPLOAD_DIR = '/home/z/my-project/upload/avatars'",
    "const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.join(process.env.UPLOAD_DIR, 'avatars') : '/tmp/asmya-uploads/avatars'"
  );
  if (!f.includes('mkdir(')) {
    f = f.replace("import { writeFile, unlink } from 'fs/promises'", "import { writeFile, unlink, mkdir } from 'fs/promises'");
    f = f.replace(
      'const buffer = Buffer.from(await avatarFile.arrayBuffer())\n    await writeFile(filePath, buffer)',
      'const buffer = Buffer.from(await avatarFile.arrayBuffer())\n    if (!existsSync(UPLOAD_DIR)) { await mkdir(UPLOAD_DIR, { recursive: true }) }\n    await writeFile(filePath, buffer)'
    );
  }
  fs.writeFileSync(path.join(ROOT, 'src/app/api/upload-avatar/route.ts'), f, 'utf8');
  console.log('  upload-avatar FIXED');
  fixes++;
} catch(e) { console.error('  FAILED:', e.message); }

// ===== FIX 3: SettingsView logout (if not already done) =====
console.log('\n=== FIX 3: SettingsView.tsx ===');
try {
  let f = fs.readFileSync(path.join(ROOT, 'src/components/mesjid/SettingsView.tsx'), 'utf8');
  if (!f.includes('Log Out')) {
    f = f.replace("import { t, LANGUAGE_DIRECTION, LANGUAGE_NAMES, type Language } from '@/lib/i18n'",
      "import { t, LANGUAGE_DIRECTION, LANGUAGE_NAMES } from '@/lib/i18n'");
    if (!f.includes(',\n  LogOut,')) f = f.replace('  CalendarDays,\n} from', '  CalendarDays,\n  LogOut,\n} from');
    if (!f.includes('useConfirm')) f = f.replace("import UserAvatar from './UserAvatar'",
      "import UserAvatar from './UserAvatar'\nimport { useConfirm } from './ConfirmDialog'");
    if (!f.includes('    logout,')) f = f.replace('    plans,\n    setPlans,\n  } = useStore()',
      '    plans,\n    setPlans,\n    logout,\n  } = useStore()');
    if (!f.includes('const { confirm, dialog }')) f = f.replace('  const { toast } = useToast()',
      '  const { toast } = useToast()\n  const { confirm, dialog } = useConfirm()');
    f = f.replace("(['en', 'am', 'ar'] as Language[])", "(['en', 'am', 'ar', 'om', 'ti', 'so'] as any[])");
    f = f.replace("(['en', 'am', 'ar'] as any[])", "(['en', 'am', 'ar', 'om', 'ti', 'so'] as any[])");
    fs.writeFileSync(path.join(ROOT, 'src/components/mesjid/SettingsView.tsx'), f, 'utf8');
    console.log('  SettingsView imports + languages FIXED (logout may need manual add)');
  } else {
    console.log('  Logout already present');
  }
  fixes++;
} catch(e) { console.error('  FAILED:', e.message); }

console.log('\nDone: ' + fixes + '/3 fixes applied');
