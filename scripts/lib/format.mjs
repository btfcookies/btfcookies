/** Small formatting helpers shared by the sheets. */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Parse a YYYY-MM-DD calendar date without dragging in a local timezone. */
export function parseDay(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

/** "2026-05-10" -> "10 MAY 2026" */
export function longDate(iso) {
  const { year, month, day } = parseDay(iso);
  return `${day} ${MONTHS[month]} ${year}`;
}

/** "2026-05-10" -> "MAY 2026" */
export function monthYear(iso) {
  const { year, month } = parseDay(iso);
  return `${MONTHS[month]} ${year}`;
}

export function monthLabel(monthIndex) {
  return MONTHS[monthIndex];
}

export function percent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Thousands separators, because these numbers are meant to be read. */
export function group(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
