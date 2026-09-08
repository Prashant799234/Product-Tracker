// Calendar-quarter helpers: Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec.
// Quarter labels are stored/passed around as `YYYY-Q#`, e.g. "2026-Q3".

export interface QuarterRange {
  start: Date;
  end: Date;
}

/** Returns the `YYYY-Q#` label for the quarter containing `date`. */
export function getQuarterLabel(date: Date): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

/** Returns the `YYYY-Q#` label for the current quarter. */
export function getCurrentQuarter(): string {
  return getQuarterLabel(new Date());
}

/** Parses a `YYYY-Q#` label into a { year, quarter } pair. Throws on bad input. */
export function parseQuarterLabel(label: string): { year: number; quarter: number } {
  const match = /^(\d{4})-Q([1-4])$/.exec(label);
  if (!match) {
    throw new Error(`Invalid quarter label: ${label}`);
  }
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

/** Returns the inclusive start/end dates covered by a `YYYY-Q#` label. */
export function parseQuarter(label: string): QuarterRange {
  const { year, quarter } = parseQuarterLabel(label);
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0); // last day of the quarter
  return { start, end };
}

/** Shifts a `YYYY-Q#` label forward/backward by `delta` quarters. */
export function shiftQuarter(label: string, delta: number): string {
  const { year, quarter } = parseQuarterLabel(label);
  const zeroBased = (quarter - 1) + delta;
  const yearOffset = Math.floor(zeroBased / 4);
  const newQuarter = ((zeroBased % 4) + 4) % 4;
  return `${year + yearOffset}-Q${newQuarter + 1}`;
}

/** Human label, e.g. "2026-Q3" -> "Q3 2026". */
export function formatQuarterDisplay(label: string): string {
  const { year, quarter } = parseQuarterLabel(label);
  return `Q${quarter} ${year}`;
}

export function isOverdue(dueDate: string | Date | null, status: string): boolean {
  if (!dueDate || status === "Done") return false;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}
