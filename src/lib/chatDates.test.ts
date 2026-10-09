import { describe, it, expect } from "vitest";
import { formatSentAt, dayKey, dayLabel } from "./chatDates";
describe("chat dates", () => {
  it("shows full date and time", () => {
    expect(formatSentAt(new Date(2026, 9, 7, 20, 42).getTime())).toBe("October 7, 2026 · 8:42 PM");
  });
  it("groups different days separately", () => {
    expect(dayKey(new Date(2026, 9, 7, 23, 59))).not.toBe(dayKey(new Date(2026, 9, 8, 0, 1)));
  });
  it("handles missing timestamps", () => {
    expect(formatSentAt(undefined)).toBe("Date unknown");
    expect(dayLabel("garbage")).toBe("Date unknown");
  });
  it("reads Firestore-style timestamps", () => {
    expect(formatSentAt({ seconds: new Date(2026, 9, 8, 9, 15).getTime() / 1000 })).toBe("October 8, 2026 · 9:15 AM");
  });
});
