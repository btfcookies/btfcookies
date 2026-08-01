/**
 * Contribution field.
 *
 * GitHub encodes daily volume as colour. A monochrome sheet has no hue to
 * spend, so volume is encoded as dot area instead - the same substitution the
 * avatar plate makes, applied to data rather than an image. Empty days stay on
 * the grid as hairline dots so the shape of the year is still legible.
 */

import { textPath, face, num } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, SHEET } from '../lib/svg.mjs';
import { longDate, monthLabel, parseDay } from '../lib/format.mjs';

const W = SHEET.width;
const H = 218;
const MARGIN = SHEET.margin;
const GRID_X = 78;
const GRID_TOP = 74;
const ROWS = 7;

const DOT = { empty: 1.1, min: 2.2, max: 6.3 };
const WEEKDAY_LABELS = { 1: 'MON', 3: 'WED', 5: 'FRI' };

/**
 * Area proportional to count, with the scale set by the 95th percentile so a
 * single outlier day cannot flatten the rest of the year into specks.
 */
function radiusFor(count, ceiling) {
  if (count <= 0) return DOT.empty;
  const norm = Math.min(1, Math.sqrt(count / ceiling));
  return DOT.min + (DOT.max - DOT.min) * norm;
}

function percentile(values, p) {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 1;
}

const MIN_LABEL_GAP = 34;

/**
 * First column of each month. The window opens mid-month, so the leading label
 * can sit only a column or two from the next one; in that case the partial
 * month is the one dropped, since the full month is the more useful marker.
 */
function monthTicks(days, pitch) {
  const starts = [];
  let lastMonth = -1;
  for (const day of days) {
    const { month } = parseDay(day.date);
    if (month === lastMonth) continue;
    lastMonth = month;
    starts.push({ month, x: GRID_X + day.week * pitch });
  }

  if (starts.length > 1 && starts[1].x - starts[0].x < MIN_LABEL_GAP) starts.shift();

  const ticks = [];
  for (const tick of starts) {
    if (ticks.length && tick.x - ticks[ticks.length - 1].x < MIN_LABEL_GAP) continue;
    ticks.push(tick);
  }
  return ticks;
}

export function renderContributions({ theme, days, streaks, index = 0 }) {
  const mono = face.mono();
  const weeks = Math.max(...days.map((d) => d.week)) + 1;
  const pitch = (W - MARGIN - GRID_X) / weeks;
  const ceiling = percentile(
    days.filter((d) => d.count > 0).map((d) => d.count),
    0.95
  );

  const dots = days
    .map((day) => {
      const cx = GRID_X + day.week * pitch + pitch / 2;
      const cy = GRID_TOP + day.weekday * pitch + pitch / 2;
      const r = radiusFor(day.count, ceiling);
      const fill = day.count > 0 ? theme.ink : theme.ghost;
      return `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" fill="${fill}"/>`;
    })
    .join('');

  const eyebrow = textPath({
    font: mono,
    text: `CONTRIBUTION FIELD — ${longDate(streaks.from)} TO ${longDate(streaks.to)}`,
    size: 11,
    track: 2.4,
    x: MARGIN,
    y: 40,
  });

  const months = monthTicks(days, pitch)
    .map((tick) => {
      const label = textPath({
        font: mono,
        text: monthLabel(tick.month),
        size: 10,
        track: 1.6,
        x: tick.x,
        y: 64,
      });
      return `<path d="${label.d}" fill="${theme.graphite}"/>`;
    })
    .join('');

  const weekdays = Object.entries(WEEKDAY_LABELS)
    .map(([row, label]) => {
      const y = GRID_TOP + Number(row) * pitch + pitch / 2 + 3.4;
      const path = textPath({ font: mono, text: label, size: 10, track: 1.6, x: MARGIN, y });
      return `<path d="${path.d}" fill="${theme.graphite}"/>`;
    })
    .join('');

  // Legend: the same radius ramp the field uses, so it is a key rather than decoration.
  const legendCounts = [0, 1, Math.round(ceiling * 0.25), Math.round(ceiling * 0.55), ceiling];
  const legendRight = W - MARGIN;
  const legendPitch = 17;
  const legendSpan = legendCounts.length * legendPitch;
  const legendStart = legendRight - legendSpan - 42;
  const legendDots = legendCounts
    .map((count, i) => {
      const cx = legendStart + i * legendPitch + legendPitch / 2;
      const r = radiusFor(count, ceiling);
      const fill = count > 0 ? theme.ink : theme.ghost;
      return `<circle cx="${num(cx)}" cy="36" r="${num(r)}" fill="${fill}"/>`;
    })
    .join('');
  const less = textPath({
    font: mono,
    text: 'LESS',
    size: 10,
    track: 1.6,
    x: legendStart - 10,
    y: 40,
    anchor: 'end',
  });
  const more = textPath({
    font: mono,
    text: 'MORE',
    size: 10,
    track: 1.6,
    x: legendRight,
    y: 40,
    anchor: 'end',
  });

  if (eyebrow.width + less.width + legendSpan + more.width + 40 > W - MARGIN * 2) {
    throw new Error(`contributions header row overflows: ${eyebrow.width.toFixed(0)}px eyebrow`);
  }

  const caption = textPath({
    font: mono,
    text: `DOT AREA = CONTRIBUTIONS · BUSIEST ${streaks.busiest.count} ON ${longDate(streaks.busiest.date)}`,
    size: 10,
    track: 1.2,
    x: MARGIN,
    y: 198,
  });

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<g mask="url(#print-mask)">
  <path d="${eyebrow.d}" fill="${theme.graphite}"/>
  <path d="${less.d}" fill="${theme.ash}"/>${legendDots}<path d="${more.d}" fill="${theme.ash}"/>
  ${months}
  ${weekdays}
  ${dots}
  <path d="${caption.d}" fill="${theme.ash}"/>
</g>
${scanBar(W, theme)}`;

  return doc({
    width: W,
    height: H,
    title: `Contribution field: ${streaks.total} contributions from ${longDate(streaks.from)} to ${longDate(streaks.to)}`,
    desc: `A ${weeks}-week grid of daily GitHub contributions where the area of each dot is proportional to that day's contribution count. ${streaks.activeDays} of ${days.length} days were active. The busiest day was ${longDate(streaks.busiest.date)} with ${streaks.busiest.count} contributions.`,
    body: svgBody,
    css: revealCss(H, index),
  });
}
