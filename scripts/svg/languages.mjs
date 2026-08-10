/**
 * Language distribution.
 *
 * Five accents from the terminal palette carry the top languages; anything
 * past that collapses into OTHER and reads in a flat neutral tone, since it
 * isn't one language so much as the absence of the ones already named. Order
 * running loudest to quietest keeps the ranking legible even at a glance.
 */

import { textPath, face, num } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, windowChrome, SHEET } from '../lib/svg.mjs';
import { percent } from '../lib/format.mjs';

const W = SHEET.width;
const H = 194;
const MARGIN = SHEET.margin;
const BAR = { y: 62, height: 48, gap: 2 };
const LEGEND = { top: 148, rowHeight: 28, columns: 3, swatch: 13 };

const MAX_SEGMENTS = 6;
const MIN_SHARE = 0.01;
const SEGMENT_ACCENTS = ['green', 'cyan', 'amber', 'magenta', 'red'];

function segmentsFrom(languages) {
  const major = languages.filter((l) => l.share >= MIN_SHARE).slice(0, MAX_SEGMENTS - 1);
  const covered = major.reduce((sum, l) => sum + l.share, 0);
  const rest = 1 - covered;
  const segments = major.map((l) => ({ name: l.name.toUpperCase(), share: l.share, other: false }));
  if (rest > 0.0005) segments.push({ name: 'OTHER', share: rest, other: true });
  return segments;
}

function fillFor(theme, segment, i) {
  return segment.other ? theme.faint : theme[SEGMENT_ACCENTS[i % SEGMENT_ACCENTS.length]];
}

export function renderLanguages({ theme, repos, index = 0 }) {
  const mono = face.mono();
  const monoBold = face.monoBold();
  const segments = segmentsFrom(repos.languages);

  const barWidth = W - MARGIN * 2;
  let cursor = MARGIN;
  const bars = segments
    .map((segment, i) => {
      const raw = segment.share * barWidth;
      const isLast = i === segments.length - 1;
      const width = Math.max(3, raw - (isLast ? 0 : BAR.gap));
      const rect = `<rect x="${num(cursor)}" y="${BAR.y}" width="${num(width)}" height="${BAR.height}" fill="${fillFor(theme, segment, i)}" opacity="${segment.other ? 0.55 : 1}"/>`;
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

      const swatch = `<rect x="${x}" y="${y - LEGEND.swatch + 2}" width="${LEGEND.swatch}" height="${LEGEND.swatch}" rx="2" fill="${fillFor(theme, segment, i)}" opacity="${segment.other ? 0.55 : 1}"/>`;
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
      return `${swatch}<path d="${name.d}" fill="${theme.ink}"/><path d="${share.d}" fill="${theme.muted}"/>`;
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
    text: 'RANKED, LOUDEST FIRST',
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

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<g mask="url(#print-mask)">
  <path d="${eyebrow.d}" fill="${theme.muted}"/>
  <path d="${caption.d}" fill="${theme.faint}"/>
  ${bars}
  ${legend}
</g>
${scanBar(W, theme)}`;

  const { height, markup } = windowChrome({
    width: W,
    contentHeight: H,
    theme,
    titleLabel: 'guest@btfcookies:~$ cat languages.json | sort -rn',
    body: svgBody,
  });

  return doc({
    width: W,
    height,
    title: `Language distribution across ${repos.repoCount} repositories`,
    desc: segments.map((s) => `${s.name} ${percent(s.share, 1)}`).join(', '),
    body: markup,
    css: revealCss(H, index),
  });
}
