"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deleteGoal, deleteWeight, logGoal, logWeight, saveGoal } from "@/app/actions";
import { ActionForm, Field, Sheet, SubmitRow, callAction, isTemp, listOp, runOptimistic, tempId } from "@/components/ui";
import { fmtDay, num } from "@/lib/format";

type Goal = { id: string; name: string; done: boolean; streakBefore: number };

const IDEAS = ["Work 5 hours", "Read 10 pages", "Sleep 8 hours", "Drink 8 glasses of water", "Workout 30 min", "Meditate"];

export function GoalList({ goals, date, showStreak }: { goals: Goal[]; date: string; showStreak: boolean }) {
  const [list, change] = useOptimistic(goals, listOp<Goal>);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const doneCount = list.filter((g) => g.done).length;

  return (
    <>
      {list.length === 0 ? (
        <div className="card text-center">
          <p className="text-[16px]">Add the things you want to do every day.</p>
          <p className="mt-1 text-[14px] text-muted">Then just tick them off.</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-[14px] font-medium text-muted">
            {doneCount} of {list.length} done
          </p>
          <ul className="card divide-y divide-line p-0">
            {list.map((g) => (
              <GoalRow key={g.id + date} g={g} date={date} showStreak={showStreak} onEdit={() => setEditing(g)} />
            ))}
          </ul>
        </>
      )}
      <button className="btn btn-soft mt-3 w-full" onClick={() => setEditing("new")}>
        + Add a goal
      </button>
      <GoalSheet
        goal={editing}
        onClose={() => setEditing(null)}
        onSave={(fd) => {
          const id = String(fd.get("id") || tempId());
          const old = list.find((g) => g.id === id);
          change({ type: "upsert", item: { id, name: String(fd.get("name")).trim(), done: old?.done ?? false, streakBefore: old?.streakBefore ?? 0 } });
        }}
        onDelete={(id) => runOptimistic(() => change({ type: "delete", id }), () => deleteGoal(id))}
      />
    </>
  );
}

function GoalRow({ g, date, showStreak, onEdit }: { g: Goal; date: string; showStreak: boolean; onEdit: () => void }) {
  const [done, setDone] = useState(g.done);
  const [, start] = useTransition();
  const saving = isTemp(g.id);

  const toggle = () => {
    const next = !done;
    setDone(next);
    start(async () => {
      if (!(await callAction(() => logGoal(g.id, date, next)))) setDone(!next);
    });
  };

  const streak = g.streakBefore + (done ? 1 : 0);

  return (
    <li className="flex items-center gap-1 pr-1">
      <button
        onClick={toggle}
        disabled={saving}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left"
        role="checkbox"
        aria-checked={done}
        aria-label={g.name}
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-[10px] border-2 transition-colors ${done ? "border-sage bg-sage text-white" : "border-line bg-white"}`}>
          {done && (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          )}
        </span>
        <span className="min-w-0">
          <span className={`block truncate text-[17px] font-medium ${done ? "text-muted line-through decoration-1" : ""}`}>{g.name}</span>
          {saving ? (
            <span className="block text-[13px] text-muted">Saving…</span>
          ) : (
            showStreak && streak > 0 && <span className="block text-[13px] font-semibold text-honey">🔥 {streak} day streak</span>
          )}
        </span>
      </button>
      {!saving && (
        <button onClick={onEdit} className="grid size-11 shrink-0 place-items-center rounded-full text-muted" aria-label={`Edit ${g.name}`}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
          </svg>
        </button>
      )}
    </li>
  );
}

function GoalSheet({
  goal,
  onClose,
  onSave,
  onDelete,
}: {
  goal: Goal | "new" | null;
  onClose: () => void;
  onSave: (fd: FormData) => void;
  onDelete: (id: string) => void;
}) {
  const g = goal && goal !== "new" ? goal : null;
  const [name, setName] = useState<string | null>(null);
  const close = () => {
    onClose();
    setName(null);
  };
  return (
    <Sheet open={!!goal} onClose={close} title={g ? "Edit goal" : "New daily goal"}>
      <ActionForm action={saveGoal} onDone={close} optimistic={onSave}>
        {g && <input type="hidden" name="id" value={g.id} />}
        <Field label="Goal">
          <input
            className="input"
            name="name"
            value={name ?? g?.name ?? ""}
            onChange={(e) => setName(e.target.value)}
            placeholder="Read 10 pages"
            maxLength={40}
            required
            autoFocus={!g}
          />
        </Field>
        {!g && (
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((i) => (
              <button key={i} type="button" className="min-h-10 rounded-full border border-line px-3 text-[14px] font-medium" onClick={() => setName(i)}>
                {i}
              </button>
            ))}
          </div>
        )}
        <SubmitRow
          label={g ? "Save" : "Add goal"}
          onDelete={
            g
              ? () => {
                  if (confirm(`Delete "${g.name}" and all its history?`)) {
                    close();
                    onDelete(g.id);
                  }
                }
              : undefined
          }
        />
      </ActionForm>
    </Sheet>
  );
}

type Weight = { id: string; date: string; kg: number };

export function WeightCard({ today, weights }: { today: string; weights: Weight[] }) {
  const [list, change] = useOptimistic(weights, listOp<Weight>);
  const [open, setOpen] = useState(false);
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  return (
    <div className="card flex items-center justify-between gap-3">
      <div>
        <p className="text-[14px] font-medium text-muted">Weight</p>
        <p className="tabular text-[22px] font-semibold">
          {last ? `${num(last.kg)} kg` : "—"}
          {last && <span className="ml-2 text-[13px] font-medium text-muted">{last.date === today ? "today" : fmtDay(last.date, { day: "numeric", month: "short" })}</span>}
        </p>
      </div>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        Log weight
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Log weight">
        <ActionForm
          action={logWeight}
          onDone={() => setOpen(false)}
          optimistic={(fd) => {
            const date = String(fd.get("date"));
            const kg = Number(fd.get("kg"));
            change({ type: "upsert", item: { id: list.find((w) => w.date === date)?.id ?? tempId(), date, kg } });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (kg)">
              <input className="input" name="kg" type="number" inputMode="decimal" step="0.1" min="20" max="400" defaultValue={last?.kg ?? ""} required />
            </Field>
            <Field label="Date">
              <input className="input" name="date" type="date" defaultValue={today} max={today} required />
            </Field>
          </div>
          <SubmitRow label="Save" />
        </ActionForm>
        {sorted.length > 0 && (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {sorted.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-1">
                <span className="text-[15px] text-muted">{fmtDay(w.date)}</span>
                <span className="flex items-center gap-1">
                  <span className="tabular font-semibold">{num(w.kg)} kg</span>
                  {!isTemp(w.id) && (
                    <button
                      className="grid size-11 place-items-center text-muted"
                      aria-label={`Delete ${fmtDay(w.date)} weight`}
                      onClick={() => confirm("Delete this entry?") && runOptimistic(() => change({ type: "delete", id: w.id }), () => deleteWeight(w.id))}
                    >
                      ×
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
