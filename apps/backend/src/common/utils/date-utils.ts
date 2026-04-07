/** Get current month key in YYYY-MM format. */
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Get the start (inclusive) and end (exclusive) Date boundaries for a YYYY-MM month key. */
export function monthRange(monthKey: string): { start: Date; end: Date } {
  const [y, m] = monthKey.split('-').map(Number);
  return {
    start: new Date(`${monthKey}-01T00:00:00.000Z`),
    end: new Date(Date.UTC(y, m, 1)),
  };
}
