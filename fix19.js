const fs = require('fs');
let c = fs.readFileSync('src/app/api/cash-entries/route.ts', 'utf8');

// Fix: return mediaUrl from request body, not from ORM entry
c = c.replace(
  'mediaUrl: entry.mediaUrl,\n      date: new Date(entry.date as string).toISOString().split',
  'mediaUrl: mediaUrl || null,\n      date: new Date(entry.date as string).toISOString().split'
);

// Fix the second occurrence in POST mapped response too
c = c.replace(
  'mediaUrl: entry.mediaUrl,',
  'mediaUrl: mediaUrl || null,'
);

// Clean up module-level ensureCashMedia placement
c = c.replace(
  "}export const runtime = 'nodejs'\n\n// GET: ?side=X - Get all cash entries for side with\nawait ensureCashMedia(); export async function GET",
  "}\n\nexport const runtime = 'nodejs'\n\n// GET: ?side=X - Get all cash entries for side\nexport async function GET"
);

// Move ensureCashMedia call inside GET
c = c.replace(
  "export async function GET(request: NextRequest) {  try {",
  "export async function GET(request: NextRequest) {\n  await ensureCashMedia()\n  try {"
);

fs.writeFileSync('src/app/api/cash-entries/route.ts', c, 'utf8');
console.log('FIXED: cash-entries mediaUrl in response + cleanup');
console.log('DONE');
