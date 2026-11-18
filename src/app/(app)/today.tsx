"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteGoal, deleteWeight, logGoal, logWeight, saveGoal } from "@/app/actions";
import { ActionForm, Bar, Field, Sheet, SubmitRow, callAction } from "@/components/ui";
import { fmtDay, num } from "@/lib/format";

type Goal = { id: string; name: string; target: number; unit: string; value: number; streakBefore: number };

const IDEAS = [
  { name: "Work", target: 5, unit: "hours" },
  { name: "Read", target: 10, unit: "pages" },
  { name: "Sleep", target: 8, unit: "hours" },
  { name: "Water", target: 8, unit: "glasses" },
  { name: "Workout", target: 30, unit: "min" },
  { name: "Meditate", target: 1, unit: "" },
];

const isHabit = (g: { target: number; unit: string }) => g.target === 1 && !g.unit;

export function GoalList({ goals, date, showStreak }: { goals: Goal[]; date: string; showStreak: boolean }) {
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  return (
    <>
      {goals.length === 0 ? (
        <div className="card text-center">
          <p className="text-[16px]">Add the things you want to do every day.</p>
          <p className="mt-1 text-[14px] text-muted">Work 5 hours, read 10 pages, drink 8 glasses of water…</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {goals.map((g) => (
            <GoalCard key={g.id + date} g={g} date={date} showStreak={showStreak} onEdit={() => setEditing(g)} />
          ))}
        </ul>
      )}
      <button className="btn btn-soft mt-3 w-full" onClick={() => setEditing("new")}>
        + Add a goal
      </button>
      <GoalSheet goal={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function GoalCard({ g, date, showStreak, onEdit }: { g: Goal; date: string; showStreak: boolean; onEdit: () => void }) {
  const [value, setValue] = useState(g.value);
  const [draft, setDraft] = useState(String(g.value));
  const [, start] = useTransition();
  useEffect(() => setDraft(String(value)), [value]);

  const set = (v: number) => {
    v = Math.min(100000, Math.max(0, Math.round(v * 100) / 100));
    if (v === value) return;
    const prev = value;
    setValue(v);
    start(async () => {
      if (!(await callAction(() => logGoal(g.id, date, v)))) setValue(prev);
    });
  };

  const done = value >= g.target;
  const streak = g.streakBefore + (done ? 1 : 0);
  const step = g.target >= 20 ? 5 : 1;

  return (
    <li className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[18px] font-semibold">{g.name}</h3>
          <p className="tabular text-[14px] text-muted">
            {isHabit(g) ? (done ? "Done" : "Not yet") : `${num(value)} / ${num(g.target)} ${g.unit}`}
            {showStreak && streak > 0 && <span className="ml-2 font-semibold text-honey">🔥 {streak} day{streak > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button onClick={onEdit} className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted" aria-label={`Edit ${g.name}`}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
          </svg>
        </button>
      </div>

      {isHabit(g) ? (
        <button onClick={() => set(done ? 0 : 1)} className={`btn mt-3 w-full ${done ? "bg-sage text-white" : "btn-ghost"}`} aria-pressed={done}>
          {done ? "✓ Done" : "Mark done"}
        </button>
      ) : (
        <>
          <div className="mt-3">
            <Bar pct={value / g.target} tone={done ? "sage" : "clay"} />
          </div>
          <div className="mt-3 grid grid-cols-[56px_1fr_56px] items-center gap-2">
            <button className="btn btn-ghost px-0 text-2xl" onClick={() => set(value - step)} aria-label={`Less ${g.name}`} disabled={value <= 0}>
              −
            </button>
            <input
              className="input tabular text-center text-[18px] font-semibold"
              inputMode="decimal"
              aria-label={`${g.name} amount`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={() => {
                const v = Number(draft.replace(",", "."));
                Number.isFinite(v) ? set(v) : setDraft(String(value));
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <button className="btn btn-primary px-0 text-2xl" onClick={() => set(value + step)} aria-label={`More ${g.name}`}>
              +
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function GoalSheet({ goal, onClose }: { goal: Goal | "new" | null; onClose: () => void }) {
  const g = goal && goal !== "new" ? goal : null;
  const [prefill, setPrefill] = useState<{ name: string; target: number; unit: string } | null>(null);
  const v = g ?? prefill;
  const close = () => {
    onClose();
    setPrefill(null);
  };
  return (
    <Sheet open={!!goal} onClose={close} title={g ? "Edit goal" : "New daily goal"}>
      {!g && (
        <div className="mb-4 flex flex-wrap gap-2">
          {IDEAS.map((i) => (
            <button key={i.name} type="button" className="rounded-full border border-line px-3 py-2 text-[14px] font-medium" onClick={() => setPrefill(i)}>
              {i.name} {i.unit ? `${i.target} ${i.unit}` : "(yes/no)"}
            </button>
          ))}
        </div>
      )}
      <ActionForm key={JSON.stringify(v)} action={saveGoal} onDone={close}>
        {g && <input type="hidden" name="id" value={g.id} />}
        <Field label="Goal">
          <input className="input" name="name" defaultValue={v?.name} placeholder="Read" maxLength={40} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Daily target">
            <input className="input" name="target" inputMode="decimal" defaultValue={v?.target ?? ""} placeholder="10" required />
          </Field>
          <Field label="Unit">
            <input className="input" name="unit" defaultValue={v?.unit} placeholder="pages" maxLength={15} />
          </Field>
        </div>
        <p className="-mt-2 text-[13px] text-muted">For a yes/no habit, use target 1 and leave the unit empty.</p>
        <SubmitRow
          label={g ? "Save" : "Add goal"}
          onDelete={
            g
              ? async () => {
                  if (confirm(`Delete "${g.name}" and all its history?`) && (await callAction(() => deleteGoal(g.id)))) close();
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
  const [open, setOpen] = useState(false);
  const last = weights[0];
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
        <ActionForm action={logWeight} onDone={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (kg)">
              <input className="input" name="kg" inputMode="decimal" defaultValue={last?.kg ?? ""} required />
            </Field>
            <Field label="Date">
              <input className="input" name="date" type="date" defaultValue={today} max={today} required />
            </Field>
          </div>
          <SubmitRow label="Save" />
        </ActionForm>
        {weights.length > 0 && (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {weights.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-1">
                <span className="text-[15px] text-muted">{fmtDay(w.date)}</span>
                <span className="flex items-center gap-1">
                  <span className="tabular font-semibold">{num(w.kg)} kg</span>
                  <button className="grid size-11 place-items-center text-muted" aria-label={`Delete ${fmtDay(w.date)} weight`} onClick={() => confirm("Delete this entry?") && callAction(() => deleteWeight(w.id))}>
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
