export function generateCalendar(
  events: {
    id: string;
    title: string;
    start: Date;
    end: Date;
  }[]
): string {
  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const vevents = events.map(e =>
    [
      "BEGIN:VEVENT",
      `UID:${e.id}`,
      `DTSTAMP:${format(new Date())}`,
      `DTSTART:${format(e.start)}`,
      `DTEND:${format(e.end)}`,
      `SUMMARY:${e.title}`,
      "END:VEVENT"
    ].join("\n")
  ).join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kuhari//EN",
    vevents,
    "END:VCALENDAR"
  ].join("\n");
}