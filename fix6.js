var fs = require('fs');
var base = process.cwd();
var f = fs.readFileSync(base + '/src/app/api/cash-entries/route.ts', 'utf8');
f = f.replace(
  'db.user.findMany({ where: { side } })',
  "db.user.findMany({ where: { side, role: { in: ['SUPERIOR_AMIR', 'VICE_AMIR', 'FINANCE_AMIR', 'ADMIN_AMIR'] } } })"
);
fs.writeFileSync(base + '/src/app/api/cash-entries/route.ts', f, 'utf8');
console.log('DONE: cashbook push now role-based (leadership + finance only)');
