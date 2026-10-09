import { format, isToday, isYesterday } from "date-fns";

/** Safely turn a stored timestamp (ms, ISO string, Date, Firestore Timestamp) into a Date. */
export function toDate(value: unknown): Date | null {
  if (value == null) return null;
  let d: Date;
  if (value instanceof Date) d = value;
  else if (typeof value === "number" || typeof value === "string") d = new Date(value);
  else if (typeof (value as { toDate?: unknown }).toDate === "function")
    d = (value as { toDate: () => Date }).toDate();
  else if (typeof (value as { seconds?: unknown }).seconds === "number")
    d = new Date((value as { seconds: number }).seconds * 1000);
  else return null;
  return isNaN(d.getTime()) ? null : d;
}

/** "October 7, 2026 · 8:42 PM" in the device's local timezone. */
export function formatSentAt(value: unknown): string {
  const d = toDate(value);
  return d ? `${format(d, "MMMM d, yyyy")} · ${format(d, "p")}` : "Date unknown";
}

/** Day-group key in local time. */
export function dayKey(value: unknown): string {
  const d = toDate(value);
  return d ? format(d, "yyyy-MM-dd") : "unknown";
}

/** Group header — always includes the real date, even with Today/Yesterday. */
export function dayLabel(value: unknown): string {
  const d = toDate(value);
  if (!d) return "Date unknown";
  const full = format(d, "MMMM d, yyyy");
  if (isToday(d)) return `Today · ${full}`;
  if (isYesterday(d)) return `Yesterday · ${full}`;
  return full;
}
