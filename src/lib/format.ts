/** A date with its time, in the reader's locale, e.g. "Oct 19, 2026, 9:00 AM". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** A date alone, in the reader's locale, e.g. "Oct 19, 2026". */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
