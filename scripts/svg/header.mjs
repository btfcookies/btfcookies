/**
 * Header sheet: identity in the left margin, the 1-bit raster as a plate that
 * bleeds off three edges on the right. One print edge travels top to bottom
 * and reveals both halves, so the sheet reads as a single pass of one machine
 * rather than two boxes side by side.
 */

import { textPath, wrap, face, num } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, rule } from '../lib/svg.mjs';

const W = 1200;
const H = 440;
const MARGIN = 60;

const PLATE = { size: H, x: W - H, y: 0 };
const COLUMN = { x: MARGIN, width: PLATE.x - MARGIN - 60 };

const BASELINE = {
  eyebrow: 92,
  name: [190, 272],
  rule: 310,
  handle: 338,
  prose: 376,
};
const NAME_SIZE = 92;
const PROSE_LEADING = 26;

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
    size: 12,
    track: 3.4,
    x: COLUMN.x,
    y: BASELINE.eyebrow,
  });

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
    size: 13,
    track: 1.6,
    x: COLUMN.x,
    y: BASELINE.handle,
  });

  const proseLines = wrap({
    font: body,
    text: content.prose,
    size: 16.5,
    maxWidth: COLUMN.width,
  }).map((line, i) =>
    textPath({
      font: body,
      text: line,
      size: 16.5,
      x: COLUMN.x,
      y: BASELINE.prose + i * PROSE_LEADING,
    })
  );

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<rect width="${W}" height="${H}" fill="${theme.paper}"/>
<g mask="url(#print-mask)">
  <path d="${eyebrow.d}" fill="${theme.graphite}"/>
  ${nameLines.map((l) => `<path d="${l.d}" fill="${theme.ink}"/>`).join('\n  ')}
  ${rule(COLUMN.x, BASELINE.rule, COLUMN.x + COLUMN.width, theme)}
  <path d="${handle.d}" fill="${theme.ink}"/>
  ${proseLines.map((l) => `<path d="${l.d}" fill="${theme.graphite}"/>`).join('\n  ')}
  <g transform="translate(${PLATE.x} ${PLATE.y}) scale(${num(PLATE.size / raster.size, 6)})"><path d="${platePath(raster)}" fill="${theme.ink}" shape-rendering="crispEdges"/></g>
</g>
${scanBar(W, theme)}`;

  return doc({
    width: W,
    height: H,
    title: `${content.name.join(' ')} — ${content.eyebrow}`,
    desc: `${content.prose} Handle: ${content.handle}. Alongside, the profile avatar rendered as a ${raster.size} by ${raster.size} one-bit Atkinson-dithered plate that prints from top to bottom.`,
    body: svgBody,
    css: revealCss(H, index),
  });
}
