import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
export const runtime = "nodejs";
export async function GET() {
  const results: any[] = [];
  results.push({ env: { hasAsmya: !!process.env.ASMYA_DB_URL, hasToken: !!process.env.TURSO_AUTH_TOKEN, urlPrefix: (process.env.ASMYA_DB_URL || "").substring(0, 60) } });
  try {
    const prisma = new PrismaClient();
    const count = await prisma.user.count();
    await prisma.$disconnect();
    results.push({ label: "a: native prisma", ok: true, count });
  } catch (e: any) {
    results.push({ label: "a: native prisma", ok: false, err: e.message?.substring(0, 300) });
  }
  try {
    const libsql = createClient({ url: process.env.ASMYA_DB_URL || "", authToken: process.env.TURSO_AUTH_TOKEN });
    const r = await libsql.execute("SELECT count(*) as c FROM users");
    results.push({ label: "b: raw libsql", ok: true, count: r.rows[0].c });
  } catch (e: any) {
    results.push({ label: "b: raw libsql", ok: false, err: e.message?.substring(0, 300) });
  }
  return Response.json(results);
}
