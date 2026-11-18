import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toYmd, todayIn } from "@/lib/dates";
import { PageHead } from "@/components/ui";
import { TaskList } from "./task-list";

export const metadata = { title: "Tasks · Life Ledger" };

export default async function Tasks() {
  const me = await requireUser();
  const [open, done] = await Promise.all([
    db.task.findMany({ where: { userId: me.id, doneAt: null }, orderBy: [{ deadline: "asc" }, { createdAt: "asc" }] }),
    // ponytail: shows the 30 latest done tasks; full history is in Stats and the CSV export.
    db.task.findMany({ where: { userId: me.id, NOT: { doneAt: null } }, orderBy: { doneAt: "desc" }, take: 30 }),
  ]);
  const plain = (t: (typeof open)[number]) => ({ id: t.id, title: t.title, notes: t.notes, deadline: toYmd(t.deadline), done: !!t.doneAt });
  return (
    <>
      <PageHead title="Tasks" sub={open.length ? `${open.length} to do` : "All clear"} />
      <TaskList today={todayIn(me.tz)} open={open.map(plain)} done={done.map(plain)} />
    </>
  );
}
