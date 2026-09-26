import type { Line } from "./model";

export function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) || dateValue(date) !== value
    ? undefined
    : date;
}
export function dateValue(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function eventDays(start: string, end?: string) {
  if (!parseDate(start) || (end && !parseDate(end)) || (end && end < start))
    return null;
  // Count calendar dates inclusively, independently of DST and browser timezone.
  return (
    Math.round(
      (Date.parse(`${end || start}T00:00:00Z`) -
        Date.parse(`${start}T00:00:00Z`)) /
        86_400_000,
    ) + 1
  );
}
export function eventDateLabel(start: string, end?: string) {
  if (!start) return "Dates to be confirmed";
  return end && end !== start ? `${start} – ${end}` : start;
}
export function applyEventDuration(lines: Line[], days: number): Line[] {
  if (!Number.isSafeInteger(days) || days < 1)
    throw new Error("Choose a valid event date range first.");
  return lines.map((line) => ({
    ...line,
    duration:
      line.sellingBasis === "DAILY" ||
      (line.type === "ITEM" && line.cost.basis === "DAILY")
        ? String(days)
        : line.duration,
    components: line.components.map((part) => ({
      ...part,
      duration: part.cost.basis === "DAILY" ? String(days) : part.duration,
    })),
  }));
}
