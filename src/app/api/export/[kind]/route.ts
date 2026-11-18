import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toYmd, todayIn } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Cell = string | number | null | undefined;

// Strings starting with = + - @ get a ' so spreadsheets don't run them as formulas.
const cell = (v: Cell) => {
  let s = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function rows(kind: string, userId: string): Promise<Cell[][] | null> {
  switch (kind) {
    case "goals": {
      const goals = await db.goal.findMany({ where: { userId }, include: { logs: { orderBy: { date: "asc" } } }, orderBy: { createdAt: "asc" } });
      return [["Date", "Goal", "Value", "Target", "Unit", "Met"], ...goals.flatMap((g) => g.logs.map((l) => [toYmd(l.date), g.name, l.value, g.target, g.unit, l.value >= g.target ? "yes" : "no"]))];
    }
    case "weight": {
      const w = await db.weightLog.findMany({ where: { userId }, orderBy: { date: "asc" } });
      return [["Date", "Weight (kg)"], ...w.map((x) => [toYmd(x.date), x.kg])];
    }
    case "tasks": {
      const t = await db.task.findMany({ where: { userId }, orderBy: { deadline: "asc" } });
      return [["Task", "Notes", "Deadline", "Done", "Done on"], ...t.map((x) => [x.title, x.notes, toYmd(x.deadline), x.doneAt ? "yes" : "no", x.doneAt ? toYmd(x.doneAt) : ""])];
    }
    case "money": {
      const t = await db.transaction.findMany({ where: { userId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
      return [["Date", "Type", "Amount", "Category", "Note"], ...t.map((x) => [toYmd(x.date), x.type === "IN" ? "In" : "Out", Number(x.amount), x.category, x.note])];
    }
    case "budgets": {
      const b = await db.budget.findMany({ where: { userId }, orderBy: { category: "asc" } });
      return [["Category", "Monthly limit"], ...b.map((x) => [x.category, Number(x.monthlyLimit)])];
    }
  }
  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const me = await currentUser();
  if (!me) return new Response("Please log in first.", { status: 401 });
  const { kind } = await params;
  try {
    const data = await rows(kind, me.id);
    if (!data) return new Response("Not found", { status: 404 });
    const csv = "﻿" + data.map((r) => r.map(cell).join(",")).join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="life-ledger-${kind}-${todayIn(me.tz)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Couldn't build the export right now. Please try again.", { status: 503 });
  }
}
