export type Ymd = {
  year: number;
  month: number;
  day: number;
};

export type AgeResult = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthdayDays: number;
  nextBirthdayIso: string;
  isBirthday: boolean;
  dobIso: string;
  asOfIso: string;
};

export type AgeCompute =
  | { ok: true; age: AgeResult }
  | { ok: false; reason: "invalid" | "future" };

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Ymd | null {
  const match = ISO_RE.exec(iso.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCivilDate(year, month, day)) {
    return null;
  }
  return { year, month, day };
}

export function formatIsoDate(ymd: Ymd): string {
  return `${ymd.year}-${String(ymd.month).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidCivilDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

function utcDayNumber(ymd: Ymd): number {
  return Date.UTC(ymd.year, ymd.month - 1, ymd.day) / 86_400_000;
}

function compareYmd(a: Ymd, b: Ymd): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  if (a.month !== b.month) {
    return a.month - b.month;
  }
  return a.day - b.day;
}

function birthdayInYear(dob: Ymd, year: number): Ymd {
  if (dob.month === 2 && dob.day === 29 && !isLeapYear(year)) {
    return { year, month: 2, day: 28 };
  }
  return { year, month: dob.month, day: dob.day };
}

/**
 * Exact civil age from two calendar dates (YYYY-MM-DD), ignoring clock time
 * and time zones. Used for dasha / horoscope intake as well as the public
 * age calculator.
 */
export function computeAge(dobIso: string, asOfIso: string): AgeCompute {
  const dob = parseIsoDate(dobIso);
  const asOf = parseIsoDate(asOfIso);
  if (!dob || !asOf) {
    return { ok: false, reason: "invalid" };
  }
  if (compareYmd(asOf, dob) < 0) {
    return { ok: false, reason: "future" };
  }

  let years = asOf.year - dob.year;
  let months = asOf.month - dob.month;
  let days = asOf.day - dob.day;

  if (days < 0) {
    months -= 1;
    const priorMonth = asOf.month === 1 ? 12 : asOf.month - 1;
    const priorYear = asOf.month === 1 ? asOf.year - 1 : asOf.year;
    days += daysInMonth(priorYear, priorMonth);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = utcDayNumber(asOf) - utcDayNumber(dob);
  const thisBirthday = birthdayInYear(dob, asOf.year);
  const isBirthday = compareYmd(thisBirthday, asOf) === 0;
  const nextBirthday = isBirthday
    ? thisBirthday
    : compareYmd(asOf, thisBirthday) < 0
      ? thisBirthday
      : birthdayInYear(dob, asOf.year + 1);
  const nextBirthdayDays = utcDayNumber(nextBirthday) - utcDayNumber(asOf);

  return {
    ok: true,
    age: {
      years,
      months,
      days,
      totalDays,
      nextBirthdayDays,
      nextBirthdayIso: formatIsoDate(nextBirthday),
      isBirthday,
      dobIso: formatIsoDate(dob),
      asOfIso: formatIsoDate(asOf),
    },
  };
}
