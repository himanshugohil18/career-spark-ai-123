/**
 * Format dates for user-facing emails in India Standard Time (IST, UTC+05:30).
 * CareerOS's primary audience is in India, so all timestamps in emails should
 * render as IST rather than UTC/GMT.
 */
export function formatIST(input: Date | string | number = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${parts} IST`;
}
