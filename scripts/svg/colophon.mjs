/**
 * Closing sheet: contact in the left column, colophon in the right, and the
 * page's one signature beat at the bottom - a prompt sitting idle with a
 * blinking cursor, as if the terminal just finished printing everything
 * above and is now waiting on the reader.
 */

import { textPath, wrap, face } from '../lib/type.mjs';
import { doc, revealDefs, revealCss, scanBar, windowChrome, SHEET } from '../lib/svg.mjs';

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
const CONTACT_ACCENTS = ['cyan', 'magenta', 'amber'];
const PROMPT_GAP = 40;

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
      const accent = theme[CONTACT_ACCENTS[i % CONTACT_ACCENTS.length]];
      return `<path d="${label.d}" fill="${theme.faint}"/><path d="${value.d}" fill="${accent}"/>`;
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
          return `<path d="${path.d}" fill="${theme.muted}"/>`;
        })
        .join('');
      cursor += lines.length * NOTE_LEADING + NOTE_GAP;
      return block;
    })
    .join('\n  ');

  // Last value baseline, not the next row's origin, so the sheet does not carry
  // an empty row's worth of trailing space.
  const contactBottom = TOP + (content.contact.length - 1) * CONTACT_ROW + 19;
  const contentBottom = Math.max(cursor - NOTE_GAP, contactBottom);

  const promptY = contentBottom + PROMPT_GAP;
  const prompt = textPath({
    font: monoBold,
    text: 'guest@btfcookies:~$',
    size: 13,
    track: 0.4,
    x: LEFT.x,
    y: promptY,
  });
  const cursorX = prompt.x + prompt.width + 11;
  const cursorBlock = `<rect class="cursor" x="${cursorX.toFixed(1)}" y="${(promptY - 12.5).toFixed(1)}" width="9" height="15" fill="${theme.green}"/>`;

  const H = promptY + 26;

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
  <path d="${eyebrowLeft.d}" fill="${theme.muted}"/>
  <path d="${eyebrowRight.d}" fill="${theme.muted}"/>
  <rect x="${MARGIN}" y="54" width="${W - MARGIN * 2}" height="1" fill="${theme.border}"/>
  <rect x="${SPLIT}" y="54" width="1" height="${H - 84}" fill="${theme.border}"/>
  ${contact}
  ${notes}
  <path d="${prompt.d}" fill="${theme.green}"/>${cursorBlock}
</g>
${scanBar(W, theme)}`;

  const { height, markup } = windowChrome({
    width: W,
    contentHeight: H,
    theme,
    titleLabel: 'guest@btfcookies:~$ cat ~/.plan',
    body: svgBody,
  });

  const cursorCss = `
.cursor{animation:cursor-blink 1.05s steps(1,end) infinite}
@keyframes cursor-blink{50%{opacity:0}}
@media(prefers-reduced-motion:reduce){.cursor{animation:none}}`;

  return doc({
    width: W,
    height,
    title: 'Contact and colophon',
    desc: `${content.contact.map((c) => `${c.label}: ${c.value}`).join('. ')}. ${content.notes.join(' ')}`,
    body: markup,
    css: revealCss(H, index) + cursorCss,
  });
}
