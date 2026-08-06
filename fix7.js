var fs = require('fs');
var base = process.cwd();
var f = fs.readFileSync(base + '/src/app/api/push/send/route.ts', 'utf8');
f = f.replace(/const VAPID_PUBLIC_KEY = process\.env.*\n.*\n.*\n\nif \(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY\) \{[\s\S]*?\}\n\n/, '');
fs.writeFileSync(base + '/src/app/api/push/send/route.ts', f, 'utf8');
console.log('DONE: removed top-level setVapidDetails (was crashing build)');
