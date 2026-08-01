/**
 * Closing sheet: contact in the left column, colophon in the right.
 *
 * The last sheet on the page, so it carries the notes that explain the
 * encoding used by every sheet above it.
 */

import { textPath, wrap, face } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, rule, SHEET } from '../lib/svg.mjs';

const W = SHEET.width;
const MARGIN = SHEET.margin;
const SPLIT = 330; // vertical rule between the two columns

const LEFT = { x: MARGIN, width: SPLIT - MARGIN - 32 };
const RIGHT = { x: SPLIT + 36, width: W - MARGIN - SPLIT - 36 };

const CONTACT_ROW = 40;
const NOTE_SIZE = 13;
const NOTE_LEADING = 19;
const NOTE_GAP = 11;
const TOP = 82; // first baseline below the header rule

export function renderColophon({ theme, content, index = 0 }) {
  const mono = face.mono();
  const monoBold = face.monoBold();
  const body = face.body();

  const contact = content.contact
    .map((entry, i) => {
      const top = TOP + i * CONTACT_ROW;
      const label = textPath({
        font: mono,
        text: entry.label,
        size: 9.5,
        track: 1.8,
        x: LEFT.x,
        y: top,
      });
      const value = textPath({
        font: monoBold,
        text: entry.value,
        size: 13,
        track: 0.2,
        x: LEFT.x,
        y: top + 19,
      });
      if (value.width > LEFT.width) {
        throw new Error(`contact "${entry.label}" overflows its column: ${value.width.toFixed(0)}px`);
      }
      return `<path d="${label.d}" fill="${theme.ash}"/><path d="${value.d}" fill="${theme.ink}"/>`;
    })
    .join('\n  ');

  // Notes are laid out first so the sheet can size itself to the text.
  let cursor = TOP;
  const notes = content.notes
    .map((note) => {
      const lines = wrap({ font: body, text: note, size: NOTE_SIZE, maxWidth: RIGHT.width });
      const block = lines
        .map((line, i) => {
          const path = textPath({
            font: body,
            text: line,
            size: NOTE_SIZE,
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

  // Last value baseline, not the next row's origin, so the sheet does not carry
  // an empty row's worth of trailing space.
  const contactBottom = TOP + (content.contact.length - 1) * CONTACT_ROW + 19;
  const H = Math.max(cursor - NOTE_GAP, contactBottom) + 28;

  const eyebrowLeft = textPath({
    font: mono,
    text: content.contactEyebrow,
    size: 11,
    track: 2.4,
    x: LEFT.x,
    y: 40,
  });
  const eyebrowRight = textPath({
    font: mono,
    text: content.colophonEyebrow,
    size: 11,
    track: 2.4,
    x: RIGHT.x,
    y: 40,
  });

  const svgBody = `<defs>${revealDefs(W, H)}</defs>
<g mask="url(#print-mask)">
  <path d="${eyebrowLeft.d}" fill="${theme.graphite}"/>
  <path d="${eyebrowRight.d}" fill="${theme.graphite}"/>
  ${rule(MARGIN, 54, W - MARGIN, theme)}
  <rect x="${SPLIT}" y="54" width="1" height="${H - 84}" fill="${theme.rule}"/>
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
