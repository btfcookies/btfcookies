/**
 * Project index, styled like a colourised directory listing: names in the
 * green a shell gives executables, addresses in the cyan it gives links.
 * One hairline per row, and the address in the right margin where a
 * reference would sit. An image cannot carry a link, so each address is
 * printed in full and repeated in the alt text.
 */

import { textPath, face, measure } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, windowChrome, SHEET } from '../lib/svg.mjs';

const W = SHEET.width;
const MARGIN = SHEET.margin;
const HEAD = 64;
const ROW_HEIGHT = 40;
const FOOT = 26;

const NAME_X = MARGIN;
const BLURB_X = 178;
const URL_RIGHT = W - MARGIN;
const BLURB_SIZE = 14;
/** Blurb runs from its column to the widest address, less a gutter. */
const BLURB_LIMIT = 400;

export function renderProjects({ theme, content, index = 0 }) {
  const mono = face.mono();
  const monoBold = face.monoBold();
  const body = face.body();

  const H = HEAD + content.rows.length * ROW_HEIGHT + FOOT;

  const overlong = content.rows.filter(
    (row) => measure({ font: body, text: row.blurb, size: BLURB_SIZE }) > BLURB_LIMIT
  );
  if (overlong.length > 0) {
    throw new Error(`project blurb too long: ${overlong.map((r) => r.name).join(', ')}`);
  }

  const eyebrow = textPath({
    font: mono,
    text: content.eyebrow,
    size: 11,
    track: 2.4,
    x: MARGIN,
    y: 40,
  });

  const count = textPath({
    font: mono,
    text: `${content.rows.length} ENTRIES`,
    size: 10,
    track: 1.6,
    x: URL_RIGHT,
    y: 40,
    anchor: 'end',
  });

  const rows = content.rows
    .map((row, i) => {
      const top = HEAD + i * ROW_HEIGHT;
      const baseline = top + 25;

      const name = textPath({
        font: monoBold,
        text: row.name,
        size: 13,
        track: 1.6,
        x: NAME_X,
        y: baseline,
      });
      const blurb = textPath({
        font: body,
        text: row.blurb,
        size: BLURB_SIZE,
        x: BLURB_X,
        y: baseline,
      });
      const url = textPath({
        font: mono,
        text: row.url,
        size: 10.5,
        track: 0.6,
        x: URL_RIGHT,
        y: baseline,
        anchor: 'end',
      });

      // Blurb and address share the row; a collision would print one over the other.
      if (blurb.x + blurb.width + 24 > url.x) {
        throw new Error(`project row "${row.name}" collides with its address`);
      }

      const divider = i === 0 ? '' : `<rect x="${MARGIN}" y="${top}" width="${W - MARGIN * 2}" height="1" fill="${theme.border}"/>`;
      return `${divider}<path d="${name.d}" fill="${theme.green}"/><path d="${blurb.d}" fill="${theme.muted}"/><path d="${url.d}" fill="${theme.cyan}"/>`;
    })
    .join('\n  ');

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<g mask="url(#print-mask)">
  <path d="${eyebrow.d}" fill="${theme.muted}"/>
  <path d="${count.d}" fill="${theme.faint}"/>
  ${rows}
</g>
${scanBar(W, theme)}`;

  const { height, markup } = windowChrome({
    width: W,
    contentHeight: H,
    theme,
    titleLabel: 'guest@btfcookies:~$ ls -la ~/projects',
    body: svgBody,
  });

  return doc({
    width: W,
    height,
    title: `Selected work: ${content.rows.map((r) => r.name).join(', ')}`,
    desc: content.rows.map((r) => `${r.name} (${r.url}): ${r.blurb}`).join(' '),
    body: markup,
    css: revealCss(H, index),
  });
}
