/**
 * Streak and volume readout.
 *
 * Four figures, each with the context needed to read it honestly - a streak of
 * zero says when the last active day was rather than hiding behind the number.
 */

import { textPath, face } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, rule } from '../lib/svg.mjs';
import { longDate, monthYear, group, percent } from '../lib/format.mjs';

const W = 1200;
const H = 216;
const MARGIN = 60;
const CELLS = 4;

const BASELINE = { label: 52, value: 116, note: 142, footer: 194 };
const DIVIDER = { top: 34, bottom: 156 };

function lastActiveDate(days) {
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) return days[i].date;
  }
  return null;
}

function buildCells({ days, streaks, profile, repos }) {
  const lastActive = lastActiveDate(days);
  return [
    {
      label: 'CURRENT STREAK',
      value: group(streaks.current),
      note:
        streaks.current > 0
          ? `DAYS · ONGOING`
          : lastActive
            ? `DAYS · LAST ACTIVE ${longDate(lastActive)}`
            : 'DAYS',
    },
    {
      label: 'LONGEST STREAK',
      value: group(streaks.longest),
      note: `DAYS · ENDED ${longDate(streaks.longestEnd)}`,
    },
    {
      label: 'CONTRIBUTIONS',
      value: group(streaks.total),
      note: 'IN THE LAST 12 MONTHS',
    },
    {
      label: 'ACTIVE DAYS',
      value: group(streaks.activeDays),
      note: `OF ${days.length} · ${percent(streaks.activeDays / days.length)}`,
    },
  ].map((cell, i) => ({
    ...cell,
    x: MARGIN + (i * (W - MARGIN * 2)) / CELLS,
  }));
}

export function renderStats({ theme, days, streaks, profile, repos, index = 0 }) {
  const display = face.display();
  const mono = face.mono();
  const cells = buildCells({ days, streaks, profile, repos });

  const body = cells
    .map((cell) => {
      const label = textPath({
        font: mono,
        text: cell.label,
        size: 11,
        track: 3,
        x: cell.x,
        y: BASELINE.label,
      });
      const value = textPath({
        font: display,
        text: cell.value,
        size: 52,
        track: -0.5,
        x: cell.x,
        y: BASELINE.value,
      });
      const note = textPath({
        font: mono,
        text: cell.note,
        size: 10,
        track: 1.4,
        x: cell.x,
        y: BASELINE.note,
      });
      return `<path d="${label.d}" fill="${theme.graphite}"/><path d="${value.d}" fill="${theme.ink}"/><path d="${note.d}" fill="${theme.ash}"/>`;
    })
    .join('\n  ');

  const dividers = cells
    .slice(1)
    .map(
      (cell) =>
        `<rect x="${cell.x - 24}" y="${DIVIDER.top}" width="1" height="${DIVIDER.bottom - DIVIDER.top}" fill="${theme.rule}"/>`
    )
    .join('');

  const footerText = [
    `${repos.repoCount} PUBLIC REPOSITORIES`,
    `${profile.followers} FOLLOWERS`,
    `ON GITHUB SINCE ${monthYear(profile.createdAt)}`,
  ].join('   ·   ');
  const footer = textPath({
    font: mono,
    text: footerText,
    size: 11,
    track: 2.2,
    x: MARGIN,
    y: BASELINE.footer,
  });

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<rect width="${W}" height="${H}" fill="${theme.paper}"/>
<g mask="url(#print-mask)">
  ${body}
  ${dividers}
  ${rule(MARGIN, 170, W - MARGIN, theme)}
  <path d="${footer.d}" fill="${theme.graphite}"/>
</g>
${scanBar(W, theme)}`;

  return doc({
    width: W,
    height: H,
    title: `Streaks and totals: ${streaks.current} day current streak, ${streaks.longest} day longest streak, ${streaks.total} contributions`,
    desc: `${cells.map((c) => `${c.label}: ${c.value} (${c.note})`).join('. ')}. ${footerText.replace(/\s+·\s+/g, ', ')}.`,
    body: svgBody,
    css: revealCss(H, index),
  });
}
