const fs = require('fs');

function addCD(fp, impAfter, hookAfter, jsxBefore) {
  let c = fs.readFileSync(fp, 'utf8');
  let ch = false;
  if (!c.includes('from ConfirmDialog') && !c.includes('from "./ConfirmDialog"')) {
    c = c.replace(impAfter, impAfter + "\nimport ConfirmDialog, { useConfirm } from './ConfirmDialog'");
    ch = true;
  }
  if (!c.includes('const { confirm, Dialog } = useConfirm()')) {
    c = c.replace(hookAfter, hookAfter + "\n  const { confirm, Dialog } = useConfirm()");
    ch = true;
  }
  if (!c.includes('<Dialog />')) {
    c = c.replace(jsxBefore, '      <Dialog />\n' + jsxBefore);
    ch = true;
  }
  if (ch) { fs.writeFileSync(fp, c, 'utf8'); console.log('FIXED: ' + fp); }
  else console.log('SKIP: ' + fp);
}

// Dashboard
let d = fs.readFileSync('src/components/mesjid/Dashboard.tsx', 'utf8');
if (d.includes("window.confirm")) {
  d = d.replace(/if \(window\.confirm\([^)]+\)\) ([^;]+);/g, 'confirm("Are you sure?", "This action cannot be undone.", () => $1)');
  d = d.replace(/onClick=\{\(\) => \{ confirm\("Are you sure\?", "This action cannot be undone\.", \(\) => ([^}]+)\) \}\}/g, (m, action) => m);
  fs.writeFileSync('src/components/mesjid/Dashboard.tsx', d, 'utf8');
}
d = fs.readFileSync('src/components/mesjid/Dashboard.tsx', 'utf8');
d = d.replace("if (window.confirm('Are you sure you want to log out?')) logout()", "confirm('Log Out?', 'Are you sure you want to log out?', () => logout())");
d = d.replace("if (window.confirm(\"Are you sure you want to log out?\")) logout()", "confirm('Log Out?', 'Are you sure you want to log out?', () => logout())");
fs.writeFileSync('src/components/mesjid/Dashboard.tsx', d, 'utf8');
addCD('src/components/mesjid/Dashboard.tsx', "import { useStore } from '@/lib/store'", "const { toast } = useToast()", '    </div>\n  )\n}');

// PublicDashboard
let pd = fs.readFileSync('src/components/mesjid/PublicDashboard.tsx', 'utf8');
pd = pd.replace(/if \(!window\.confirm\([^)]+\)\) return;/g, '');
pd = pd.replace(/onClick=\{\(\) => \{ if \(window\.confirm\([^)]+\)\) ([^}]+) \}\}/g, 'onClick={() => { confirm("Are you sure?", "This cannot be undone.", () => $1) }}');
fs.writeFileSync('src/components/mesjid/PublicDashboard.tsx', pd, 'utf8');
addCD('src/components/mesjid/PublicDashboard.tsx', "import { useStore } from '@/lib/store'", "const { toast } = useToast()", '</div>');

// AnnouncementsView
let an = fs.readFileSync('src/components/mesjid/AnnouncementsView.tsx', 'utf8');
an = an.replace(/if \(!window\.confirm\([^)]+\)\) return;/g, '');
fs.writeFileSync('src/components/mesjid/AnnouncementsView.tsx', an, 'utf8');
addCD('src/components/mesjid/AnnouncementsView.tsx', "import { useToast } from '@/hooks/use-toast'", "const { toast } = useToast()", '    </div>\n  )\n}');

// ChatView
let cv = fs.readFileSync('src/components/mesjid/ChatView.tsx', 'utf8');
cv = cv.replace(/if \(!window\.confirm\([^)]+\)\) return;/g, '');
fs.writeFileSync('src/components/mesjid/ChatView.tsx', cv, 'utf8');
addCD('src/components/mesjid/ChatView.tsx', "import UserAvatar from './UserAvatar'", "const { toast } = useToast()", '    </div>\n  )\n}');

// PublicFeed
let pf = fs.readFileSync('src/components/mesjid/PublicFeed.tsx', 'utf8');
pf = pf.replace(/if \(!window\.confirm\([^)]+\)\) return;/g, '');
fs.writeFileSync('src/components/mesjid/PublicFeed.tsx', pf, 'utf8');
addCD('src/components/mesjid/PublicFeed.tsx', "import { useToast } from '@/hooks/use-toast'", "const { toast } = useToast()", '    </div>\n  )\n}');

// UsersView
let uv = fs.readFileSync('src/components/mesjid/UsersView.tsx', 'utf8');
uv = uv.replace(/if \(!window\.confirm\([^)]+\)\) return;/g, '');
fs.writeFileSync('src/components/mesjid/UsersView.tsx', uv, 'utf8');
addCD('src/components/mesjid/UsersView.tsx', "import { useToast } from '@/hooks/use-toast'", "const { toast } = useToast()", '    </div>\n  )\n}');

// PlansView
if (fs.existsSync('src/components/mesjid/PlansView.tsx')) {
  let pv = fs.readFileSync('src/components/mesjid/PlansView.tsx', 'utf8');
  pv = pv.replace(/if \(!window\.confirm\([^)]+\)\) return;/g, '');
  fs.writeFileSync('src/components/mesjid/PlansView.tsx', pv, 'utf8');
  addCD('src/components/mesjid/PlansView.tsx', "import { useToast } from '@/hooks/use-toast'", "const { toast } = useToast()", '    </div>\n  )\n}');
}

// ReportsView
if (fs.existsSync('src/components/mesjid/ReportsView.tsx')) {
  let rv = fs.readFileSync('src/components/mesjid/ReportsView.tsx', 'utf8');
  rv = rv.replace(/if \(!window\.confirm\([^)]+\)\) return;/g, '');
  fs.writeFileSync('src/components/mesjid/ReportsView.tsx', rv, 'utf8');
  addCD('src/components/mesjid/ReportsView.tsx', "import { useToast } from '@/hooks/use-toast'", "const { toast } = useToast()", '    </div>\n  )\n}');
}

console.log('\nDONE fix20.js');
