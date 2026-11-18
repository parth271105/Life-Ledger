import { toDate } from "./calc";

// ponytail: one currency for everyone; make it a per-user setting if friends abroad need it.
export const CURRENCY = "₹";

export const money = (n: number) =>
  (n < 0 ? "−" : "") + CURRENCY + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const num = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const fmtDay = (ymd: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  toDate(ymd).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });

export const OFFLINE = "Couldn't reach Life Ledger. Check your internet and try again.";
