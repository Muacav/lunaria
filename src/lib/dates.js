// Dates are kept as ISO "YYYY-MM-DD" strings and converted to whole day
// numbers (days since 1970-01-01, UTC) for arithmetic, so daylight-saving
// changes never shift a day.

const MS = 86400000;

export function toDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS);
}

export function fromDay(n) {
  return new Date(n * MS).toISOString().slice(0, 10);
}

export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso, n) {
  return fromDay(toDay(iso) + n);
}

export function diffDays(a, b) {
  return toDay(a) - toDay(b);
}

// Day of week for an ISO date, 0 = Monday … 6 = Sunday.
export function weekday(iso) {
  return (toDay(iso) + 3) % 7; // 1970-01-01 was a Thursday
}

export function startOfMonth(iso) {
  return iso.slice(0, 8) + '01';
}

export function addMonths(iso, n) {
  const [y, m] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return t.toISOString().slice(0, 10);
}

export function daysInMonth(iso) {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// Locale-aware formatting. The ISO date is read as UTC so the label always
// matches the stored day.
export function fmt(iso, locale, opts) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}
