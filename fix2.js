const fs = require('fs');
const path = require('path');
const base = process.cwd();

// Fix 1: layout.tsx - broken imports + duplicate );
let layout = fs.readFileSync(path.join(base, 'src', 'app', 'layout.tsx'), 'utf8');
layout = layout.replace(
  "import PWAInstallPrompt\nimport PushSetup from '@/components/mesjid/PushSetup' from \"@/components/mesjid/PWAInstallPrompt\";",
  'import PWAInstallPrompt from "@/components/mesjid/PWAInstallPrompt";\nimport PushSetup from \'@/components/mesjid/PushSetup\';'
);
layout = layout.replace(/  \);\n  \);\n\}/, '  );\n}\n');
fs.writeFileSync(path.join(base, 'src', 'app', 'layout.tsx'), layout, 'utf8');
console.log('1/2 layout.tsx - fixed broken imports + duplicate );');

// Fix 2: UrgentPlanBanner - BIGGER
let banner = fs.readFileSync(path.join(base, 'src', 'components', 'mesjid', 'UrgentPlanBanner.tsx'), 'utf8');
banner = banner.replace('py-3.5 px-4', 'py-5 px-5');
banner = banner.replace('text-sm truncate">{urgentPlan.title}', 'text-lg truncate">{urgentPlan.title}');
banner = banner.replace('text-white/70 text-xs', 'text-white/80 text-sm');
banner = banner.replace('w-6 h-6 animate-pulse', 'w-8 h-8 animate-pulse');
banner = banner.replace('text-xs font-bold uppercase', 'text-sm font-bold uppercase');
fs.writeFileSync(path.join(base, 'src', 'components', 'mesjid', 'UrgentPlanBanner.tsx'), banner, 'utf8');
console.log('2/2 UrgentPlanBanner.tsx - made bigger');

console.log('\nDone! Now find chat route:');
console.log('dir /s /b src\\app\\api\\*route.ts');
