import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
export const runtime = "nodejs";

async function test(label: string, opts: any) {
  try {
    const prisma = new PrismaClient(opts);
    const count = await prisma.user.count();
    await prisma.$disconnect();
    return { label, ok: true, count };
  } catch (e: any) {
    return { label, ok: false, err: e.message?.substring(0, 150) };
  }
}

export async function GET() {
  const tursoUrl = process.env.ASMYA_DB_URL || process.env.DATABASE_URL || "";
  const token = process.env.TURSO_AUTH_TOKEN;

  const libsql = createClient({ url: tursoUrl, authToken: token });
  const adapter = new PrismaLibSQL(libsql);

  // Test 1: Adapter with correct Turso URL + token
  const r1 = await test("a: adapter (turso)", { adapter });

  // Test 2: datasourceUrl with Turso URL (no adapter, needs libsql:// prefix)
  const r2 = await test("b: datasourceUrl (turso)", { datasourceUrl: tursoUrl });

  // Test 3: Raw libsql with correct URL + token
  let r3: any;
  try {
    const result = await libsql.execute("SELECT count(*) as c FROM users");
    r3 = { label: "c: raw libsql (turso)", ok: true, count: result.rows[0].c };
  } catch (e: any) {
    r3 = { label: "c: raw libsql (turso)", ok: false, err: e.message?.substring(0, 150) };
  }

  return Response.json([
    { env: { hasAsmya: !!process.env.ASMYA_DB_URL, hasDbUrl: !!process.env.DATABASE_URL, hasToken: !!token, urlPrefix: tursoUrl.substring(0, 40) } },
    r1, r2, r3,
  ]);
}
