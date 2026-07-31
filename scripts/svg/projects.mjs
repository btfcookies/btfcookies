/**
 * Project index.
 *
 * Set as a catalogue rather than a card grid: names in the mono voice the rest
 * of the sheets use for labels, one hairline per row, and the address in the
 * right margin where a reference would sit. An image cannot carry a link, so
 * each address is printed in full and repeated in the alt text.
 */

import { textPath, face, measure } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, rule } from '../lib/svg.mjs';

const W = 1200;
const MARGIN = 60;
const HEAD = 78;
const ROW_HEIGHT = 46;
const FOOT = 34;

const NAME_X = MARGIN;
const BLURB_X = 268;
const URL_RIGHT = W - MARGIN;
const BLURB_LIMIT = 600;

export function renderProjects({ theme, content, index = 0 }) {
  const mono = face.mono();
  const monoBold = face.monoBold();
  const body = face.body();

  const H = HEAD + content.rows.length * ROW_HEIGHT + FOOT;

  const overlong = content.rows.filter(
    (row) => measure({ font: body, text: row.blurb, size: 15 }) > BLURB_LIMIT
  );
  if (overlong.length > 0) {
    throw new Error(`project blurb too long: ${overlong.map((r) => r.name).join(', ')}`);
  }

  const eyebrow = textPath({
    font: mono,
    text: content.eyebrow,
    size: 12,
    track: 3.4,
    x: MARGIN,
    y: 46,
  });

  const count = textPath({
    font: mono,
    text: `${content.rows.length} ENTRIES`,
    size: 10,
    track: 2,
    x: URL_RIGHT,
    y: 46,
    anchor: 'end',
  });

  const rows = content.rows
    .map((row, i) => {
      const top = HEAD + i * ROW_HEIGHT;
      const baseline = top + 28;

      const name = textPath({
        font: monoBold,
        text: row.name,
        size: 14,
        track: 2.2,
        x: NAME_X,
        y: baseline,
      });
      const blurb = textPath({
        font: body,
        text: row.blurb,
        size: 15,
        x: BLURB_X,
        y: baseline,
      });
      const url = textPath({
        font: mono,
        text: row.url,
        size: 11,
        track: 1.2,
        x: URL_RIGHT,
        y: baseline,
        anchor: 'end',
      });

      const divider = i === 0 ? '' : rule(MARGIN, top, W - MARGIN, theme);
      return `${divider}<path d="${name.d}" fill="${theme.ink}"/><path d="${blurb.d}" fill="${theme.graphite}"/><path d="${url.d}" fill="${theme.ash}"/>`;
    })
    .join('\n  ');

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<rect width="${W}" height="${H}" fill="${theme.paper}"/>
<g mask="url(#print-mask)">
  <path d="${eyebrow.d}" fill="${theme.graphite}"/>
  <path d="${count.d}" fill="${theme.ash}"/>
  ${rows}
</g>
${scanBar(W, theme)}`;

  return doc({
    width: W,
    height: H,
    title: `Selected work: ${content.rows.map((r) => r.name).join(', ')}`,
    desc: content.rows.map((r) => `${r.name} (${r.url}): ${r.blurb}`).join(' '),
    body: svgBody,
    css: revealCss(H, index),
  });
}
