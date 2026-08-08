const fs = require('fs');
const dir = 'C:\\Users\\reyan\\ASMYA\\src';

// 1. ChatView.tsx - remove duplicate offline block
console.log('=== ChatView.tsx ===');
let cv = fs.readFileSync(dir + '\\components\\mesjid\\ChatView.tsx', 'utf8');
let lines = cv.split(/\r?\n/);
let out = [];
let seenOffline = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('!navigator.onLine')) {
    if (seenOffline) {
      // Skip this duplicate block and the next 7 lines
      console.log('  Removing duplicate offline block at line ' + (i+1));
      for (let j = 0; j < 8; j++) i++;
      continue;
    }
    seenOffline = true;
  }
  out.push(lines[i]);
}
fs.writeFileSync(dir + '\\components\\mesjid\\ChatView.tsx', out.join('\n'));
console.log('  Fixed - removed duplicate offline check');

// 2. messages/route.ts - return actual error message
console.log('=== messages/route.ts ===');
let mr = fs.readFileSync(dir + '\\app\\api\\messages\\route.ts', 'utf8');
// Change generic error responses to include the actual error
mr = mr.split("return NextResponse.json({ error: 'err' }, { status: 500 })").join(
  "return NextResponse.json({ error: 'err', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })"
);
fs.writeFileSync(dir + '\\app\\api\\messages\\route.ts', mr);
console.log('  Fixed - error responses now include detail');

console.log('\nDone');
