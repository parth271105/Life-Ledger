"use client";

import { useState, useTransition } from "react";
import { deleteTask, saveTask, toggleTask } from "@/app/actions";
import { ActionForm, Field, Sheet, SubmitRow, callAction } from "@/components/ui";
import { addDays } from "@/lib/calc";
import { fmtDay } from "@/lib/format";

type Task = { id: string; title: string; notes: string; deadline: string; done: boolean };

export function TaskList({ today, open, done }: { today: string; open: Task[]; done: Task[] }) {
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const overdue = open.filter((t) => t.deadline < today);
  const upcoming = open.filter((t) => t.deadline >= today);

  const label = (d: string) => {
    if (d < today) {
      const n = Math.round((Date.parse(today) - Date.parse(d)) / 864e5);
      return n === 1 ? "Yesterday" : `${n} days late`;
    }
    if (d === today) return "Today";
    if (d === addDays(today, 1)) return "Tomorrow";
    return fmtDay(d);
  };

  const group = (title: string, list: Task[], tone = "") =>
    list.length > 0 && (
      <section className="mb-6">
        <h2 className={`mb-2 text-[15px] font-semibold tracking-wide uppercase ${tone || "text-muted"}`}>{title}</h2>
        <ul className="card divide-y divide-line p-0">
          {list.map((t) => (
            <TaskRow key={t.id} t={t} label={label(t.deadline)} late={!t.done && t.deadline < today} soon={t.deadline === today} onOpen={() => setEditing(t)} />
          ))}
        </ul>
      </section>
    );

  return (
    <>
      <button className="btn btn-primary mb-6 w-full" onClick={() => setEditing("new")}>
        + Add task
      </button>
      {open.length === 0 && done.length === 0 && <p className="card text-center text-muted">No tasks yet. Add one with a deadline and you'll get a reminder the day before and on the day.</p>}
      {group("Overdue", overdue, "text-berry")}
      {group("Coming up", upcoming)}
      {group("Done", done)}
      <TaskSheet task={editing} today={today} onClose={() => setEditing(null)} />
    </>
  );
}

function TaskRow({ t, label, late, soon, onOpen }: { t: Task; label: string; late: boolean; soon: boolean; onOpen: () => void }) {
  const [done, setDone] = useState(t.done);
  const [, start] = useTransition();
  const toggle = () => {
    setDone(!done);
    start(async () => {
      if (!(await callAction(() => toggleTask(t.id, !done)))) setDone(done);
    });
  };
  return (
    <li className="flex items-center gap-1 pr-2">
      <button onClick={toggle} className="grid size-14 shrink-0 place-items-center" aria-label={done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`} aria-pressed={done}>
        <span className={`grid size-7 place-items-center rounded-full border-2 ${done ? "border-sage bg-sage text-white" : late ? "border-berry" : "border-line"}`}>
          {done && (
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          )}
        </span>
      </button>
      <button onClick={onOpen} className="min-w-0 flex-1 py-3 text-left">
        <span className={`block truncate text-[16px] font-medium ${done ? "text-muted line-through" : ""}`}>{t.title}</span>
        <span className={`block truncate text-[13px] ${done ? "text-muted" : late ? "font-semibold text-berry" : soon ? "font-semibold text-clay-dark" : "text-muted"}`}>
          {label}
          {t.notes && <span className="font-normal text-muted"> · {t.notes}</span>}
        </span>
      </button>
    </li>
  );
}

function TaskSheet({ task, today, onClose }: { task: Task | "new" | null; today: string; onClose: () => void }) {
  const t = task && task !== "new" ? task : null;
  return (
    <Sheet open={!!task} onClose={onClose} title={t ? "Edit task" : "New task"}>
      <ActionForm action={saveTask} onDone={onClose}>
        {t && <input type="hidden" name="id" value={t.id} />}
        <Field label="Task">
          <input className="input" name="title" defaultValue={t?.title} maxLength={120} required autoFocus={!t} />
        </Field>
        <Field label="Deadline">
          <input className="input" name="deadline" type="date" defaultValue={t?.deadline ?? today} required />
        </Field>
        <Field label="Notes">
          <textarea className="input" name="notes" defaultValue={t?.notes} maxLength={1000} placeholder="Optional" />
        </Field>
        <SubmitRow
          label={t ? "Save" : "Add task"}
          onDelete={t ? async () => confirm("Delete this task?") && (await callAction(() => deleteTask(t.id))) && onClose() : undefined}
        />
      </ActionForm>
    </Sheet>
  );
}
