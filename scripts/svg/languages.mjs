/**
 * Language distribution.
 *
 * Charts normally separate categories by hue. With no hue available, the
 * categories are separated by fill pattern, and the patterns are ordered from
 * solid to sparse so density tracks share - the bar can be read at a glance
 * even before the legend.
 */

import { textPath, face, num } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, SHEET } from '../lib/svg.mjs';
import { percent } from '../lib/format.mjs';

const W = SHEET.width;
const H = 194;
const MARGIN = SHEET.margin;
const BAR = { y: 62, height: 48, gap: 2 };
const LEGEND = { top: 148, rowHeight: 28, columns: 3, swatch: 13 };

const MAX_SEGMENTS = 6;
const MIN_SHARE = 0.01;

/**
 * Six fills that stay distinguishable at legend size, ordered from most to
 * least ink so the ranking survives even if the legend is skipped. Tiles are
 * kept small (6px) because the swatch is only 14px across.
 */
const TILE = 6;
const PATTERNS = [
  { id: 'solid', draw: (ink) => `<rect width="6" height="6" fill="${ink}"/>` },
  { id: 'checker', draw: (ink) => `<path d="M0 0h3v3H0zM3 3h3v3H3z" fill="${ink}"/>` },
  {
    id: 'hatch',
    draw: (ink) =>
      `<path d="M-2 2L2-2M0 6L6 0M4 8L8 4" stroke="${ink}" stroke-width="2" fill="none"/>`,
  },
  { id: 'rules', draw: (ink) => `<path d="M0 0h6v2H0z" fill="${ink}"/>` },
  { id: 'columns', draw: (ink) => `<path d="M0 0h2v6H0z" fill="${ink}"/>` },
  { id: 'grain', draw: (ink) => `<path d="M2 2h2v2H2z" fill="${ink}"/>` },
];

function segmentsFrom(languages) {
  const major = languages.filter((l) => l.share >= MIN_SHARE).slice(0, MAX_SEGMENTS - 1);
  const covered = major.reduce((sum, l) => sum + l.share, 0);
  const rest = 1 - covered;
  const segments = major.map((l) => ({ name: l.name.toUpperCase(), share: l.share }));
  if (rest > 0.0005) segments.push({ name: 'OTHER', share: rest });
  return segments;
}

export function renderLanguages({ theme, repos, index = 0 }) {
  const mono = face.mono();
  const monoBold = face.monoBold();
  const segments = segmentsFrom(repos.languages);

  const defs = PATTERNS.map(
    (p) =>
      `<pattern id="lang-${p.id}" width="${TILE}" height="${TILE}" patternUnits="userSpaceOnUse">${p.draw(theme.ink)}</pattern>`
  ).join('');

  const barWidth = W - MARGIN * 2;
  let cursor = MARGIN;
  const bars = segments
    .map((segment, i) => {
      const raw = segment.share * barWidth;
      const isLast = i === segments.length - 1;
      const width = Math.max(3, raw - (isLast ? 0 : BAR.gap));
      const rect = `<rect x="${num(cursor)}" y="${BAR.y}" width="${num(width)}" height="${BAR.height}" fill="url(#lang-${PATTERNS[i % PATTERNS.length].id})"/>`;
      cursor += raw;
      return rect;
    })
    .join('');

  const legend = segments
    .map((segment, i) => {
      const column = i % LEGEND.columns;
      const row = Math.floor(i / LEGEND.columns);
      const x = MARGIN + (column * barWidth) / LEGEND.columns;
      const y = LEGEND.top + row * LEGEND.rowHeight;

      const swatch = `<rect x="${x}" y="${y - LEGEND.swatch + 2}" width="${LEGEND.swatch}" height="${LEGEND.swatch}" fill="url(#lang-${PATTERNS[i % PATTERNS.length].id})"/><rect x="${x}" y="${y - LEGEND.swatch + 2}" width="${LEGEND.swatch}" height="${LEGEND.swatch}" fill="none" stroke="${theme.rule}"/>`;
      const name = textPath({
        font: monoBold,
        text: segment.name,
        size: 12,
        track: 1,
        x: x + LEGEND.swatch + 10,
        y,
      });
      const share = textPath({
        font: mono,
        text: percent(segment.share, 1),
        size: 12,
        track: 1,
        x: x + (barWidth / LEGEND.columns) - 20,
        y,
        anchor: 'end',
      });
      return `${swatch}<path d="${name.d}" fill="${theme.ink}"/><path d="${share.d}" fill="${theme.graphite}"/>`;
    })
    .join('\n  ');

  const eyebrow = textPath({
    font: mono,
    text: `LANGUAGE DISTRIBUTION — ${repos.repoCount} REPOSITORIES BY BYTES`,
    size: 11,
    track: 2.4,
    x: MARGIN,
    y: 40,
  });

  const caption = textPath({
    font: mono,
    text: 'FILL PATTERN REPLACES COLOUR',
    size: 10,
    track: 1.2,
    x: W - MARGIN,
    y: 40,
    anchor: 'end',
  });

  if (eyebrow.width + caption.width + 40 > W - MARGIN * 2) {
    throw new Error(
      `languages header row overflows: ${(eyebrow.width + caption.width).toFixed(0)}px of ${W - MARGIN * 2 - 40}px`
    );
  }

  const svgBody = `<defs>${defs}${revealDefs(W, H)}</defs>
<g mask="url(#print-mask)">
  <path d="${eyebrow.d}" fill="${theme.graphite}"/>
  <path d="${caption.d}" fill="${theme.ash}"/>
  ${bars}
  ${legend}
</g>
${scanBar(W, theme)}`;

  return doc({
    width: W,
    height: H,
    title: `Language distribution across ${repos.repoCount} repositories`,
    desc: segments.map((s) => `${s.name} ${percent(s.share, 1)}`).join(', '),
    body: svgBody,
    css: revealCss(H, index),
  });
}
