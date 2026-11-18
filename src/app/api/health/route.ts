import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const t = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up", ms: Date.now() - t });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
