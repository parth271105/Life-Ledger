export * from "./calc";

export const ymdIn = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export const todayIn = (tz: string) => ymdIn(new Date(), tz);

export function safeTz(tz: unknown) {
  try {
    if (typeof tz === "string" && tz) {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return tz;
    }
  } catch {}
  return "UTC";
}
