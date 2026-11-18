// Run: node src/lib/calc.check.ts
import assert from "node:assert/strict";
import { addDays, bestStreak, currentStreak, nextMonth, range, weekStart } from "./calc.ts";

assert.equal(addDays("2026-02-28", 1), "2026-03-01");
assert.equal(addDays("2026-01-01", -1), "2025-12-31");
assert.deepEqual(range("2026-11-29", "2026-12-01"), ["2026-11-29", "2026-11-30", "2026-12-01"]);
assert.equal(weekStart("2026-11-18"), "2026-11-16"); // Wed -> Mon
assert.equal(weekStart("2026-11-22"), "2026-11-16"); // Sun -> Mon
assert.equal(nextMonth("2026-12"), "2027-01");

const met = new Set(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-15", "2026-11-16", "2026-11-17"]);
assert.equal(currentStreak(met, "2026-11-17"), 3); // today met
assert.equal(currentStreak(met, "2026-11-18"), 3); // today not yet met, streak still alive
assert.equal(currentStreak(met, "2026-11-19"), 0); // missed yesterday
assert.equal(bestStreak(met), 3);
assert.equal(bestStreak(new Set()), 0);
console.log("calc ok");
