/**
 * Streak and volume readout.
 *
 * Four figures, each with the context needed to read it honestly - a streak of
 * zero says when the last active day was rather than hiding behind the number.
 * Each cell gets its own accent from the terminal's four-colour rotation, the
 * way a status line assigns a colour per field rather than printing everything
 * in one tone.
 */

import { textPath, face } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, windowChrome, SHEET } from '../lib/svg.mjs';
import { accent } from '../lib/theme.mjs';
import { longDate, monthYear, group, percent } from '../lib/format.mjs';

const W = SHEET.width;
const H = 186;
const MARGIN = SHEET.margin;
const CELLS = 4;

const BASELINE = { label: 42, value: 100, note: 122, footer: 168 };
const DIVIDER = { top: 26, bottom: 134 };
const VALUE_SIZE = 46;

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
            ? `DAYS · LAST ${longDate(lastActive)}`
            : 'DAYS',
    },
    {
      label: 'LONGEST STREAK',
      value: group(streaks.longest),
      note: `DAYS · TO ${longDate(streaks.longestEnd)}`,
    },
    {
      label: 'CONTRIBUTIONS',
      value: group(streaks.total),
      note: 'LAST 12 MONTHS',
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

  const cellWidth = (W - MARGIN * 2) / CELLS;
  const body = cells
    .map((cell, i) => {
      const label = textPath({
        font: mono,
        text: cell.label,
        size: 10.5,
        track: 2,
        x: cell.x,
        y: BASELINE.label,
      });
      const value = textPath({
        font: display,
        text: cell.value,
        size: VALUE_SIZE,
        track: -0.5,
        x: cell.x,
        y: BASELINE.value,
      });
      const note = textPath({
        font: mono,
        text: cell.note,
        size: 9.5,
        track: 0.9,
        x: cell.x,
        y: BASELINE.note,
      });
      // The cells are a fixed four-up grid, so anything wider than its column
      // collides with the divider rather than reflowing.
      const widest = Math.max(label.width, value.width, note.width);
      if (widest > cellWidth - 24) {
        throw new Error(`stats cell "${cell.label}" overflows: ${widest.toFixed(0)}px of ${cellWidth - 24}px`);
      }
      return `<path d="${label.d}" fill="${theme.muted}"/><path d="${value.d}" fill="${accent(theme, i)}"/><path d="${note.d}" fill="${theme.faint}"/>`;
    })
    .join('\n  ');

  const dividers = cells
    .slice(1)
    .map(
      (cell) =>
        `<rect x="${cell.x - 16}" y="${DIVIDER.top}" width="1" height="${DIVIDER.bottom - DIVIDER.top}" fill="${theme.border}"/>`
    )
    .join('');

  const footerText = [
    `${repos.repoCount} PUBLIC REPOSITORIES`,
    `${profile.followers} FOLLOWERS`,
    `SINCE ${monthYear(profile.createdAt)}`,
  ].join('   ·   ');
  const footer = textPath({
    font: mono,
    text: footerText,
    size: 10.5,
    track: 1.8,
    x: MARGIN,
    y: BASELINE.footer,
  });

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<g mask="url(#print-mask)">
  ${body}
  ${dividers}
  <rect x="${MARGIN}" y="148" width="${W - MARGIN * 2}" height="1" fill="${theme.border}"/>
  <path d="${footer.d}" fill="${theme.muted}"/>
</g>
${scanBar(W, theme)}`;

  const { height, markup } = windowChrome({
    width: W,
    contentHeight: H,
    theme,
    titleLabel: 'guest@btfcookies:~$ neofetch --stats',
    body: svgBody,
  });

  return doc({
    width: W,
    height,
    title: `Streaks and totals: ${streaks.current} day current streak, ${streaks.longest} day longest streak, ${streaks.total} contributions`,
    desc: `${cells.map((c) => `${c.label}: ${c.value} (${c.note})`).join('. ')}. ${footerText.replace(/\s+·\s+/g, ', ')}.`,
    body: markup,
    css: revealCss(H, index),
  });
}
