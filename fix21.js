const fs = require('fs');

// 1. REMOVE broken ConfirmDialog from files where it was added wrong
// 2. RESTORE window.confirm() in those files
// 3. FIX ChatView crash (Dialog used without hook)
// 4. Make cashbook thumbnail bigger

const badFiles = [
  'src/components/mesjid/Dashboard.tsx',
  'src/components/mesjid/PublicDashboard.tsx',
  'src/components/mesjid/AnnouncementsView.tsx',
  'src/components/mesjid/ChatView.tsx',
  'src/components/mesjid/PublicFeed.tsx',
  'src/components/mesjid/UsersView.tsx',
  'src/components/mesjid/PlansView.tsx',
  'src/components/mesjid/ReportsView.tsx',
];

for (const fp of badFiles) {
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');

  // Remove ConfirmDialog import
  c = c.replace(/\n?import ConfirmDialog, \{ useConfirm \} from '\.\/ConfirmDialog'/, '');

  // Remove useConfirm hook call
  c = c.replace(/\n?const \{ confirm, Dialog \} = useConfirm\(\)/, '');

  // Remove <Dialog />
  c = c.replace(/\n?      <Dialog \/>/, '');

  // Restore window.confirm for logout in Dashboard
  c = c.replace(
    "confirm('Log Out?', 'Are you sure you want to log out?', () => logout())",
    "if (window.confirm('Are you sure you want to log out?')) logout()"
  );

  fs.writeFileSync(fp, c, 'utf8');
  console.log('CLEANED: ' + fp);
}

// Restore window.confirm in Dashboard logout
let dash = fs.readFileSync('src/components/mesjid/Dashboard.tsx', 'utf8');
if (dash.includes("confirm('Log Out?")) {
  dash = dash.replace(
    "confirm('Log Out?', 'Are you sure you want to log out?', () => logout())",
    "if (window.confirm('Are you sure you want to log out?')) logout()"
  );
  fs.writeFileSync('src/components/mesjid/Dashboard.tsx', dash, 'utf8');
}

// Add back window.confirm to files that had it removed
const confirmRestores = {
  'src/components/mesjid/AnnouncementsView.tsx': "const handleDelete = async (id: string) => {\n    if (!window.confirm('Are you sure you want to delete this announcement?')) return;",
  'src/components/mesjid/ChatView.tsx': "const handleDelete = async (msgId: string) => {\n    if (!window.confirm('Are you sure you want to delete this message?')) return;",
  'src/components/mesjid/PublicFeed.tsx': "const handleDeletePost = async (postId: string) => {\n    if (!window.confirm('Are you sure you want to delete this post?')) return;",
  'src/components/mesjid/UsersView.tsx': "const handleDelete = async (userId: string) => {\n    if (!window.confirm('Are you sure you want to remove this member? This cannot be undone.')) return;",
};

for (const [fp, replacement] of Object.entries(confirmRestores)) {
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');
  // Find the function declaration and add confirm after it
  if (fp.includes('AnnouncementsView')) {
    c = c.replace(
      'const handleDelete = async (id: string) => {\n    try {',
      "const handleDelete = async (id: string) => {\n    if (!window.confirm('Are you sure you want to delete this announcement?')) return;\n    try {"
    );
  } else if (fp.includes('ChatView')) {
    c = c.replace(
      'const handleDelete = async (msgId: string) => {\n    const res',
      "const handleDelete = async (msgId: string) => {\n    if (!window.confirm('Are you sure you want to delete this message?')) return;\n    const res"
    );
  } else if (fp.includes('PublicFeed')) {
    c = c.replace(
      'const handleDeletePost = async (postId: string) => {\n    try {',
      "const handleDeletePost = async (postId: string) => {\n    if (!window.confirm('Are you sure you want to delete this post?')) return;\n    try {"
    );
    if (c.includes('const handleDeleteComment = async (commentId:')) {
      c = c.replace(
        'const handleDeleteComment = async (commentId:',
        "// Add confirm for comment delete\n    const handleDeleteComment = async (commentId:"
      );
    }
  } else if (fp.includes('UsersView')) {
    c = c.replace(
      'const handleDelete = (userId: string) => {\n    if (!user) return\n    try {',
      "const handleDelete = async (userId: string) => {\n    if (!user) return;\n    if (!window.confirm('Are you sure you want to remove this member? This cannot be undone.')) return;\n    try {"
    );
    // Fix: it was changed to sync, need async back
    c = c.replace(
      'const handleDelete = (userId: string) => {',
      'const handleDelete = async (userId: string) => {'
    );
  }
  fs.writeFileSync(fp, c, 'utf8');
  console.log('RESTORED confirm: ' + fp);
}

// Make cashbook thumbnail bigger (w-10 h-10 -> w-14 h-14)
let cb = fs.readFileSync('src/components/mesjid/CashbookView.tsx', 'utf8');
cb = cb.replace('w-10 h-10 rounded-lg object-cover shrink-0 border border-border cursor-pointer', 'w-14 h-14 rounded-lg object-cover shrink-0 border border-border cursor-pointer');
fs.writeFileSync('src/components/mesjid/CashbookView.tsx', cb, 'utf8');
console.log('FIXED: cashbook thumbnail bigger');

console.log('\nDONE fix21.js');
