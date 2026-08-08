const fs = require('fs');
const dir = 'C:\\Users\\reyan\\ASMYA\\src\\components\\mesjid';

console.log('=== ChatView.tsx ===');
let c = fs.readFileSync(dir + '\\ChatView.tsx', 'utf8');
let lines = c.split(/\r?\n/);
let fixed = 0;

for (let i = 0; i < lines.length; i++) {
  // Fix the broken setStatuses line - replace entire line
  if (lines[i].includes('setStatuses') && lines[i].includes('sent') && lines[i].includes('sg.id]')) {
    lines[i] = '        setStatuses(p=>({...p,[msg.id]:\'sent\'}))';
    fixed++;
    console.log('  Fixed setStatuses line at ' + (i+1));
  }
}

// Clean up any [m[m[... corruption in msg.id references
// Replace [m[m[m[m[...msg.id] back to [msg.id]
let result = lines.join('\n');
let rounds = 0;
while (result.includes('[m[msg.id]') && rounds < 10) {
  result = result.split('[m[msg.id]').join('[msg.id]');
  rounds++;
}
// Also clean [m[m[m[ at start
while (result.includes('[m[m[m[') && rounds < 10) {
  result = result.split('[m[m[m[').join('[');
  rounds++;
}
if (rounds > 0) {
  console.log('  Cleaned up ' + rounds + ' rounds of [m[ corruption');
  fixed++;
}

if (fixed > 0) {
  fs.writeFileSync(dir + '\\ChatView.tsx', result);
  console.log('  SAVED');
} else {
  console.log('  No changes needed');
}
