const fs = require('fs');
const dir = 'C:\\Users\\reyan\\ASMYA\\src\\components\\mesjid';

// Fix ChatView.tsx - sg.id] -> [msg.id] using split/join (no regex)
console.log('=== ChatView.tsx ===');
let c = fs.readFileSync(dir + '\\ChatView.tsx', 'utf8');
let before = c;
c = c.split('sg.id]').join('[msg.id]');
if (c !== before) {
  fs.writeFileSync(dir + '\\ChatView.tsx', c);
  console.log('  FIXED');
} else {
  console.log('  No change - searching for the line...');
  let lines = c.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('sg.id]')) {
      console.log('  Found at line ' + (i+1) + ': ' + lines[i].trim());
    }
  }
}
