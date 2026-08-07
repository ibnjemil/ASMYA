const fs = require('fs');
let c = fs.readFileSync('src/components/mesjid/ChatView.tsx', 'utf8');
const lines = c.split('\n');
let fixed = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleDelete = (msgId: string) => {') && !fixed) {
    lines[i] = '  const handleDelete = async (msgId: string) => {';
    lines[i+1] = "    if (!window.confirm('Are you sure you want to delete this message?')) return;";
    lines[i+2] = "    const res = await fetch('/api/messages?messageId=' + msgId, { method: 'DELETE' })";
    lines[i+3] = '    if (res.ok) {';
    lines[i+4] = "      setMessages(messages.filter((m) => m.id !== msgId))";
    lines[i+5] = '    }';
    lines[i+6] = '  }';
    fixed = true;
    console.log('Fixed handleDelete at line ' + (i+1));
    break;
  }
}
if (fixed) {
  fs.writeFileSync('src/components/mesjid/ChatView.tsx', lines.join('\n'), 'utf8');
  console.log('SAVED');
} else {
  console.log('NOT FOUND - trying alt pattern');
  c = c.replace(/const handleDelete = \(msgId: string\) => \{\s*\n\s*if \(!window\.confirm\([^)]+\)\) return;\s*\n\s*\(async \(\) => \{\s*\n\s*const res = await fetch\([^)]+\)\s*\n\s*if \(res\.ok\) \{\s*\n\s*setMessages\([^)]+\)\s*\n\s*\}\s*\n\s*\}/, "const handleDelete = async (msgId: string) => {\n    if (!window.confirm('Are you sure you want to delete this message?')) return;\n    const res = await fetch('/api/messages?messageId=' + msgId, { method: 'DELETE' })\n    if (res.ok) {\n      setMessages(messages.filter((m) => m.id !== msgId))\n    }\n  }");
  fs.writeFileSync('src/components/mesjid/ChatView.tsx', c, 'utf8');
  console.log('SAVED via regex');
}
console.log('DONE');
