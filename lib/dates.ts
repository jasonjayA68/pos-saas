export const PH_TZ = "Asia/Manila";

const FMT_DATETIME = new Intl.DateTimeFormat("en-PH", {
  timeZone: PH_TZ,
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const FMT_DATE = new Intl.DateTimeFormat("en-PH", {
  timeZone: PH_TZ,
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function formatPHDateTime(d: Date | string): string {
  return FMT_DATETIME.format(typeof d === "string" ? new Date(d) : d);
}

export function formatPHDate(d: Date | string): string {
  return FMT_DATE.format(typeof d === "string" ? new Date(d) : d);
}
