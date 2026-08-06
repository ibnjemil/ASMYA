var fs = require('fs');
var f = fs.readFileSync('src/app/api/push/send/route.ts', 'utf8');
var lines = f.split(/\r?\n/);
var newLines = [];
var skip = false;
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('const VAPID_PUBLIC_KEY') === 0) {
    skip = true;
    continue;
  }
  if (skip && lines[i].trim() === '}') {
    skip = false;
    continue;
  }
  if (skip) continue;
  newLines.push(lines[i]);
}
var result = newLines.join('\n').replace(/\n\n\n+/g, '\n\n');
fs.writeFileSync('src/app/api/push/send/route.ts', result, 'utf8');
console.log('Fixed! Lines removed.');
