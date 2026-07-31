/**
 * Closing sheet: contact in the left column, colophon in the right.
 *
 * The last sheet on the page, so it carries the notes that explain the
 * encoding used by every sheet above it.
 */

import { textPath, wrap, face } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, rule } from '../lib/svg.mjs';

const W = 1200;
const MARGIN = 60;
const SPLIT = 470; // vertical rule between the two columns

const LEFT = { x: MARGIN, width: SPLIT - MARGIN - 40 };
const RIGHT = { x: SPLIT + 46, width: W - MARGIN - SPLIT - 46 };

const CONTACT_ROW = 42;
const NOTE_LEADING = 20;
const NOTE_GAP = 12;

export function renderColophon({ theme, content, index = 0 }) {
  const mono = face.mono();
  const monoBold = face.monoBold();
  const body = face.body();

  const contact = content.contact
    .map((entry, i) => {
      const top = 90 + i * CONTACT_ROW;
      const label = textPath({
        font: mono,
        text: entry.label,
        size: 10,
        track: 2.2,
        x: LEFT.x,
        y: top,
      });
      const value = textPath({
        font: monoBold,
        text: entry.value,
        size: 14,
        track: 0.6,
        x: LEFT.x,
        y: top + 20,
      });
      return `<path d="${label.d}" fill="${theme.ash}"/><path d="${value.d}" fill="${theme.ink}"/>`;
    })
    .join('\n  ');

  // Notes are laid out first so the sheet can size itself to the text.
  let cursor = 90;
  const notes = content.notes
    .map((note) => {
      const lines = wrap({ font: body, text: note, size: 13.5, maxWidth: RIGHT.width });
      const block = lines
        .map((line, i) => {
          const path = textPath({
            font: body,
            text: line,
            size: 13.5,
            x: RIGHT.x,
            y: cursor + i * NOTE_LEADING,
          });
          return `<path d="${path.d}" fill="${theme.graphite}"/>`;
        })
        .join('');
      cursor += lines.length * NOTE_LEADING + NOTE_GAP;
      return block;
    })
    .join('\n  ');

  const contactBottom = 90 + content.contact.length * CONTACT_ROW;
  const H = Math.max(cursor - NOTE_GAP, contactBottom) + 40;

  const eyebrowLeft = textPath({
    font: mono,
    text: content.contactEyebrow,
    size: 12,
    track: 3.4,
    x: LEFT.x,
    y: 46,
  });
  const eyebrowRight = textPath({
    font: mono,
    text: content.colophonEyebrow,
    size: 12,
    track: 3.4,
    x: RIGHT.x,
    y: 46,
  });

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<rect width="${W}" height="${H}" fill="${theme.paper}"/>
<g mask="url(#print-mask)">
  <path d="${eyebrowLeft.d}" fill="${theme.graphite}"/>
  <path d="${eyebrowRight.d}" fill="${theme.graphite}"/>
  ${rule(MARGIN, 62, W - MARGIN, theme)}
  <rect x="${SPLIT}" y="62" width="1" height="${H - 96}" fill="${theme.rule}"/>
  ${contact}
  ${notes}
</g>
${scanBar(W, theme)}`;

  return doc({
    width: W,
    height: H,
    title: 'Contact and colophon',
    desc: `${content.contact.map((c) => `${c.label}: ${c.value}`).join('. ')}. ${content.notes.join(' ')}`,
    body: svgBody,
    css: revealCss(H, index),
  });
}
