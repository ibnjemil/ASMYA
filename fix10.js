var fs = require('fs');
var path = require('path');
var base = process.cwd();

// 1. Banner - reduce size so it doesn't push nav off
var b = fs.readFileSync(path.join(base, 'src/components/mesjid/UrgentPlanBanner.tsx'), 'utf8');
b = b.replace('py-6 px-6', 'py-3 px-4');
b = b.replace('w-10 h-10', 'w-7 h-7');
b = b.replace('text-xl truncate', 'text-base truncate');
b = b.replace('text-base mt-1', 'text-sm mt-0.5');
b = b.replace('text-2xl text-yellow-300', 'text-lg text-yellow-300');
b = b.replace('p-3 rounded-full', 'p-2 rounded-full');
b = b.replace('px-4 py-2.5 rounded-xl', 'px-3 py-1.5 rounded-lg');
fs.writeFileSync(path.join(base, 'src/components/mesjid/UrgentPlanBanner.tsx'), b, 'utf8');
console.log('1/3 Banner size reduced');

// 2. Reports POST - save mediaUrl via raw SQL after create
var r = fs.readFileSync(path.join(base, 'src/app/api/reports/route.ts'), 'utf8');
var rsql = '    if (mediaUrl) {\n' +
'      try {\n' +
"        var lib = await import('@libsql/client')\n" +
"        var cl = lib.createClient({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })\n" +
'        await cl.execute({ sql: \'UPDATE "Report" SET "mediaUrl" = ? WHERE id = ?\', args: [mediaUrl, report.id] })\n' +
'        report.mediaUrl = mediaUrl\n' +
"      } catch (e) { console.error('Report mediaUrl:', e) }\n" +
'    }\n';
r = r.replace("    return NextResponse.json(report, { status: 201 })", rsql + "    return NextResponse.json(report, { status: 201 })");
fs.writeFileSync(path.join(base, 'src/app/api/reports/route.ts'), r, 'utf8');
console.log('2/3 Reports - raw SQL mediaUrl save added');

// 3. Cashbook POST - save mediaUrl via raw SQL after create
var c = fs.readFileSync(path.join(base, 'src/app/api/cash-entries/route.ts'), 'utf8');
var csql = '    if (mediaUrl) {\n' +
'      try {\n' +
"        var lib = await import('@libsql/client')\n" +
"        var cl = lib.createClient({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })\n" +
'        await cl.execute({ sql: \'UPDATE "CashEntry" SET "mediaUrl" = ? WHERE id = ?\', args: [mediaUrl, entry.id] })\n' +
'        entry.mediaUrl = mediaUrl\n' +
"      } catch (e) { console.error('CashEntry mediaUrl:', e) }\n" +
'    }\n';
c = c.replace('    try { const sideUsers', csql + '    try { const sideUsers');
fs.writeFileSync(path.join(base, 'src/app/api/cash-entries/route.ts'), c, 'utf8');
console.log('3/3 Cashbook - raw SQL mediaUrl save added');

console.log('\nAll done! Push now.');
