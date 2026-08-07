const fs = require('fs');

// 1. FIX reports/route.ts
let r = fs.readFileSync('src/app/api/reports/route.ts', 'utf8');

// Add ensureReportMedia() call at start of POST
r = r.replace(
  "export async function POST(request: NextRequest) {\n  try {\n    const body = await request.json()",
  "export async function POST(request: NextRequest) {\n  try {\n    await ensureReportMedia()\n    const body = await request.json()"
);

// Remove mediaUrl from ORM create (raw SQL handles it after)
r = r.replace(
  "        planId: planId || null,\n        createdBy,\n        side: side as Side,\n        mediaUrl: mediaUrl || null,",
  "        planId: planId || null,\n        createdBy,\n        side: side as Side,"
);

// Fix PUT handler - missing closing })
r = r.replace(
  "      },\n\n    return NextResponse.json(updated)",
  "      },\n    })\n\n    return NextResponse.json(updated)"
);

fs.writeFileSync('src/app/api/reports/route.ts', r, 'utf8');
console.log('FIXED: reports/route.ts');

// 2. FIX users/route.ts
let u = fs.readFileSync('src/app/api/users/route.ts', 'utf8');

// Fix GET: raw -> return raw
u = u.replace(
  "    return NextResponse.json(users)",
  "    return NextResponse.json(raw)"
);

// Fix PUT handler broken catch
u = u.replace(
  "    console.error('PUT /api/users error:', error) 500 })",
  "    console.error('PUT /api/users error:', error)\n    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })"
);

fs.writeFileSync('src/app/api/users/route.ts', u, 'utf8');
console.log('FIXED: users/route.ts');

console.log('\nDONE fix15.js');
