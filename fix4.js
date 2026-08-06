var fs = require('fs');
var path = require('path');
var base = process.cwd();

var r = fs.readFileSync(path.join(base, 'src/app/api/reports/route.ts'), 'utf8');

var migrationCode = "let _rm = false\n" +
"async function ensureReportMedia() {\n" +
"  if (_rm) return; _rm = true\n" +
"  try {\n" +
"    var libsql = await import('@libsql/client')\n" +
"    var cl = libsql.createClient({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })\n" +
"    var info = await cl.execute('PRAGMA table_info(\"Report\")')\n" +
"    var cols = new Set(info.rows.map(function(r) { return r.name }))\n" +
"    if (!cols.has('mediaUrl')) await cl.execute('ALTER TABLE \"Report\" ADD COLUMN \"mediaUrl\" TEXT')\n" +
"  } catch (e) { console.error('Report migrate:', e) }\n" +
"}\n\n";

r = r.replace("export const runtime = 'nodejs'", migrationCode + "export const runtime = 'nodejs'");

r = r.replace(
  'export async function GET(request: NextRequest) {\n  try {',
  'export async function GET(request: NextRequest) {\n  await ensureReportMedia()\n  try {'
);

r = r.replace(
  'export async function POST(request: NextRequest) {\n  try {',
  'export async function POST(request: NextRequest) {\n  await ensureReportMedia()\n  try {'
);

fs.writeFileSync(path.join(base, 'src/app/api/reports/route.ts'), r, 'utf8');
console.log('DONE: reports/route.ts - added mediaUrl auto-migration');
console.log('Push with: git add . ; git commit -m "fix: report mediaUrl migration" ; git push');
