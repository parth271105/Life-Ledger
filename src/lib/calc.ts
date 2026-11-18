// Pure date + streak helpers. No imports so calc.check.ts can run with plain `node`.
// Dates are "YYYY-MM-DD" strings in the user's own time zone.

export const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const toDate = (ymd: string) => new Date(ymd + "T00:00:00Z");
export const toYmd = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (ymd: string, n: number) => toYmd(new Date(toDate(ymd).getTime() + n * 864e5));

export function range(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Monday of the week containing ymd. */
export const weekStart = (ymd: string) => addDays(ymd, -((toDate(ymd).getUTCDay() + 6) % 7));

export function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Consecutive met days ending on `day` (inclusive). */
export function streakEnding(met: Set<string>, day: string) {
  let n = 0;
  for (let d = day; met.has(d); d = addDays(d, -1)) n++;
  return n;
}

/** Current streak: today counts if met, otherwise the run up to yesterday still stands. */
export const currentStreak = (met: Set<string>, today: string) =>
  streakEnding(met, met.has(today) ? today : addDays(today, -1));

export function bestStreak(met: Set<string>) {
  let best = 0, run = 0, prev = "";
  for (const d of [...met].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
