/** A date with its time, in the reader's locale, e.g. "Oct 19, 2026, 9:00 AM". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** A date alone, in the reader's locale, e.g. "Oct 19, 2026". */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/**
 * `base`, or `base 2`, `base 3`… whichever isn't in `names`. Code identifiers pass `''` as the
 * separator (`data2`).
 */
export function uniqueName(base: string, names: readonly string[], separator = ' '): string {
  if (!names.includes(base)) return base;
  let n = 2;
  while (names.includes(`${base}${separator}${n}`)) n += 1;
  return `${base}${separator}${n}`;
}
