/**
 * Builds an .ics calendar file for a confirmed date ("Add to calendar", team decision 2026-11-25).
 * Uses floating local time, so it lands at the same clock time on the user's calendar.
 */
export interface CalendarEvent {
  uid: string;
  title: string;
  location: string;
  description: string;
  /** yyyy-mm-dd */
  date: string;
  /** hh:mm, 24h */
  time: string;
  durationMin: number;
}

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function stamp(date: string, time: string, addMin = 0): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const dt = new Date(y, mo - 1, d, h, mi + addMin);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

export function buildIcs(e: CalendarEvent, now: Date = new Date()): string {
  const utc = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Echo//Prototype//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}@echo.prototype`,
    `DTSTAMP:${utc}`,
    `DTSTART:${stamp(e.date, e.time)}`,
    `DTEND:${stamp(e.date, e.time, e.durationMin)}`,
    `SUMMARY:${escape(e.title)}`,
    `LOCATION:${escape(e.location)}`,
    `DESCRIPTION:${escape(e.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs(e: CalendarEvent): void {
  const blob = new Blob([buildIcs(e)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
