/**
 * Header sheet: a terminal window whose title bar is the command that
 * produced everything below it. Identity sits in the left column, the
 * dithered avatar bleeds off the plate on the right as a phosphor-green
 * raster instead of a print plate - same bitmap, now lit like a CRT instead
 * of inked on paper.
 */

import { textPath, wrap, face, num } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, rule, windowChrome, SHEET } from '../lib/svg.mjs';

const W = SHEET.width;
const H = 316;
const MARGIN = SHEET.margin;

const PLATE = { size: H, x: W - H, y: 0 };
const COLUMN = { x: MARGIN, width: PLATE.x - MARGIN - 36 };

const BASELINE = {
  eyebrow: 60,
  name: [130, 194],
  rule: 222,
  handle: 246,
  prose: 274,
};
const NAME_SIZE = 72;
const PROSE_SIZE = 14.5;
const PROSE_LEADING = 21;
const PROSE_MAX_LINES = 2;

/**
 * Run-length rows -> one path in grid units, scaled by the group transform.
 * Keeping the coordinates as small integers makes the cells tile exactly and
 * cuts the emitted path to a fraction of the size of pixel-space decimals.
 */
function platePath(raster) {
  let d = '';
  raster.rows.forEach((runs, y) => {
    for (const [x, len] of runs) {
      d += `M${x} ${y}h${len}v1h-${len}z`;
    }
  });
  return d;
}

export function renderHeader({ theme, raster, content, index = 0 }) {
  const display = face.display();
  const mono = face.mono();
  const body = face.body();

  const eyebrow = textPath({
    font: mono,
    text: content.eyebrow,
    size: 11,
    track: 2.4,
    x: COLUMN.x,
    y: BASELINE.eyebrow,
  });

  const nameFills = [theme.ink, theme.green];
  const nameLines = content.name.map((line, i) =>
    textPath({
      font: display,
      text: line,
      size: NAME_SIZE,
      track: -1.5,
      x: COLUMN.x,
      y: BASELINE.name[i],
    })
  );

  const widest = Math.max(...nameLines.map((l) => l.width));
  if (widest > COLUMN.width) {
    throw new Error(`name overflows column: ${widest.toFixed(1)} > ${COLUMN.width}`);
  }

  const handle = textPath({
    font: mono,
    text: content.handle,
    size: 12.5,
    track: 1.2,
    x: COLUMN.x,
    y: BASELINE.handle,
  });

  const wrapped = wrap({
    font: body,
    text: content.prose,
    size: PROSE_SIZE,
    maxWidth: COLUMN.width,
  });
  // The plate is square and pinned to the sheet height, so prose that runs long
  // would push the layout rather than simply reflow. Fail the build instead.
  if (wrapped.length > PROSE_MAX_LINES) {
    throw new Error(`header prose wraps to ${wrapped.length} lines, max ${PROSE_MAX_LINES}`);
  }
  const proseLines = wrapped.map((line, i) =>
    textPath({
      font: body,
      text: line,
      size: PROSE_SIZE,
      x: COLUMN.x,
      y: BASELINE.prose + i * PROSE_LEADING,
    })
  );

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<g mask="url(#print-mask)">
  <path d="${eyebrow.d}" fill="${theme.muted}"/>
  ${nameLines.map((l, i) => `<path d="${l.d}" fill="${nameFills[i]}"/>`).join('\n  ')}
  ${rule(COLUMN.x, BASELINE.rule, COLUMN.x + COLUMN.width, theme)}
  <path d="${handle.d}" fill="${theme.cyan}"/>
  ${proseLines.map((l) => `<path d="${l.d}" fill="${theme.muted}"/>`).join('\n  ')}
  <g transform="translate(${PLATE.x} ${PLATE.y}) scale(${num(PLATE.size / raster.size, 6)})" filter="url(#print-glow)"><path d="${platePath(raster)}" fill="${theme.green}" shape-rendering="crispEdges"/></g>
</g>
${scanBar(W, theme)}`;

  const { height, markup } = windowChrome({
    width: W,
    contentHeight: H,
    theme,
    titleLabel: 'guest@btfcookies:~$ whoami',
    body: svgBody,
  });

  return doc({
    width: W,
    height,
    title: `${content.name.join(' ')} — ${content.eyebrow}`,
    desc: `${content.prose} Handle: ${content.handle}. Alongside, the profile avatar rendered as a ${raster.size} by ${raster.size} one-bit Atkinson-dithered plate, lit phosphor green and printed from top to bottom.`,
    body: markup,
    css: revealCss(H, index),
  });
}
