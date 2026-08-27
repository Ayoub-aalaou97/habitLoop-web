export const MOODS = [
  { n: 1, label: "Rough" },
  { n: 2, label: "Meh" },
  { n: 3, label: "Okay" },
  { n: 4, label: "Good" },
  { n: 5, label: "Great" },
] as const;

export type CheckInDraft = {
  habitId: number;
  date: string; // YYYY-MM-DD
  mood: number;
  note: string;
};

export type CalendarDayCell = {
  key: string;
  date: string | null; // YYYY-MM-DD when in month
  day: number | null;
  status: "empty" | "logged" | "missed" | "future" | "selected" | "locked";
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function formatCheckInWhen(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  if (target.getTime() === today.getTime()) {
    return `Today · ${time}`;
  }

  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(target);

  return `${label} · backfill`;
}

export function formatSelectedDay(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(parseDateKey(dateKey));
}

export function formatMonthTitle(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

export function formatLogButtonDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(date);
}

export function buildMonthGrid(opts: {
  year: number;
  monthIndex: number;
  selectedKey: string | null;
  loggedKeys: Set<string>;
  /** YYYY-MM-DD — days before this are locked. */
  minDateKey?: string | null;
}): CalendarDayCell[] {
  const { year, monthIndex, selectedKey, loggedKeys, minDateKey } = opts;
  const first = new Date(year, monthIndex, 1);
  const startOffset = first.getDay(); // Sunday-start, matches design
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: CalendarDayCell[] = [];
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({
        key: `e-${i}`,
        date: null,
        day: null,
        status: "empty",
      });
      continue;
    }

    const date = new Date(year, monthIndex, dayNum);
    date.setHours(0, 0, 0, 0);
    const key = toDateKey(date);
    const isFuture = date.getTime() > today.getTime();
    const isLocked = Boolean(minDateKey && key < minDateKey);
    const isSelected = selectedKey === key && !isLocked && !isFuture;

    let status: CalendarDayCell["status"] = "missed";
    if (isLocked) status = "locked";
    else if (isSelected) status = "selected";
    else if (isFuture) status = "future";
    else if (loggedKeys.has(key)) status = "logged";

    cells.push({
      key,
      date: key,
      day: dayNum,
      status,
    });
  }

  return cells;
}
