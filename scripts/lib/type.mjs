/**
 * Text is baked to outlines at build time.
 *
 * SVGs referenced from a README are rendered through GitHub's image proxy in a
 * restricted context: no web fonts load, and system font stacks would reflow
 * the layout differently on every machine. Outlines keep the composition
 * identical everywhere and scale losslessly. Accessibility is carried by the
 * <title>/<desc> pair in each SVG and the alt text in the README.
 */

import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';
import { FONTS } from './theme.mjs';

const cache = new Map();

function load(file) {
  if (!cache.has(file)) {
    const buffer = readFileSync(file);
    cache.set(
      file,
      opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
    );
  }
  return cache.get(file);
}

export const face = {
  display: () => load(FONTS.display),
  body: () => load(FONTS.body),
  mono: () => load(FONTS.mono),
  monoBold: () => load(FONTS.monoBold),
};

/** Trim a number to `decimals` without leaving trailing zeros or "-0". */
export function num(value, decimals = 2) {
  let s = value.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

const COMMAND_ARGS = {
  M: ['x', 'y'],
  L: ['x', 'y'],
  C: ['x1', 'y1', 'x2', 'y2', 'x', 'y'],
  Q: ['x1', 'y1', 'x', 'y'],
  Z: [],
};

/**
 * Serialise an opentype Path.
 *
 * opentype.js' own toPathData() emits NaN for some quadratic control points
 * even when every command value is a finite number, which silently truncates
 * the rendered glyph run - an SVG path stops drawing at its first parse error.
 * Writing the commands out directly avoids that and keeps the output compact.
 */
function serialize(path, decimals = 1) {
  const out = [];
  for (const cmd of path.commands) {
    const args = COMMAND_ARGS[cmd.type];
    if (!args) throw new Error(`unsupported path command: ${cmd.type}`);
    const values = args.map((key) => {
      const v = cmd[key];
      if (!Number.isFinite(v)) throw new Error(`non-finite ${cmd.type}.${key}`);
      return num(v, decimals);
    });
    out.push(cmd.type + values.join(' '));
  }
  return out.join('').replace(/ -/g, '-');
}

/**
 * Lay out a string as a single path.
 *
 * @param {object} opts
 * @param {import('opentype.js').Font} opts.font
 * @param {string} opts.text
 * @param {number} opts.size    font size in user units
 * @param {number} [opts.x]     origin; meaning depends on `anchor`
 * @param {number} [opts.y]     baseline
 * @param {number} [opts.track] letter-spacing in user units (not em)
 * @param {'start'|'middle'|'end'} [opts.anchor]
 * @returns {{ d: string, width: number, x: number }}
 */
export function textPath({ font, text, size, x = 0, y = 0, track = 0, anchor = 'start' }) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);

  let width = 0;
  glyphs.forEach((glyph, i) => {
    width += glyph.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      width += font.getKerningValue(glyph, glyphs[i + 1]) * scale + track;
    }
  });

  const originX = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;

  let pen = originX;
  const parts = [];
  glyphs.forEach((glyph, i) => {
    const d = serialize(glyph.getPath(pen, y, size));
    if (d) parts.push(d);
    pen += glyph.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      pen += font.getKerningValue(glyph, glyphs[i + 1]) * scale + track;
    }
  });

  return { d: parts.join(''), width, x: originX };
}

/** Convenience: measure without building the path. */
export function measure(opts) {
  return textPath({ ...opts, x: 0, y: 0 }).width;
}

/** Greedy wrap into lines that fit `maxWidth`. */
export function wrap({ font, text, size, track = 0, maxWidth }) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure({ font, text: candidate, size, track }) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Escape text destined for XML character data. */
export function xml(text) {
  return String(text).replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
