/**
 * Colour -> 1-bit raster.
 *
 * The source avatar is saturated pixel art. Standard Rec.709 luma would crush
 * the blues to black and blow the greens to white, destroying the logo's
 * symmetry, so density is a blend of HSV value (which keeps every saturated
 * hue present) and luma (which keeps hues distinguishable from one another).
 * The result: hue is re-encoded as dot area, which is the one channel a
 * monochrome system actually has.
 */

import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const VALUE_MIX = 0.58; // weight of HSV value in the density blend
const LUMA_MIX = 1 - VALUE_MIX;

/** Atkinson's kernel: 1/8 of the error to six neighbours, 2/8 discarded. */
const ATKINSON_KERNEL = [
  [1, 0],
  [2, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [0, 2],
];
const ATKINSON_SHARE = 1 / 8;

function densityFromPixel(r, g, b, a) {
  const alpha = a / 255;
  const value = Math.max(r, g, b) / 255;
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return (VALUE_MIX * value + LUMA_MIX * luma) * alpha;
}

/** Box-average the source down to `size` x `size` density samples in 0..1. */
function downsample(png, size) {
  const field = new Float64Array(size * size);
  const stepX = png.width / size;
  const stepY = png.height / size;

  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      const x0 = Math.floor(gx * stepX);
      const x1 = Math.max(x0 + 1, Math.floor((gx + 1) * stepX));
      const y0 = Math.floor(gy * stepY);
      const y1 = Math.max(y0 + 1, Math.floor((gy + 1) * stepY));

      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1 && y < png.height; y++) {
        for (let x = x0; x < x1 && x < png.width; x++) {
          const i = (png.width * y + x) << 2;
          sum += densityFromPixel(png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]);
          count++;
        }
      }
      field[gy * size + gx] = count > 0 ? sum / count : 0;
    }
  }
  return field;
}

/** Lift midtones so the dither has texture to work with instead of clipping. */
function applyCurve(field, gamma, gain) {
  const out = new Float64Array(field.length);
  for (let i = 0; i < field.length; i++) {
    out[i] = Math.min(1, Math.max(0, Math.pow(field[i], gamma) * gain));
  }
  return out;
}

/** Atkinson error diffusion. Returns a Uint8Array of 0/1, row-major. */
function atkinson(field, size) {
  const buffer = Float64Array.from(field);
  const bits = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const on = buffer[i] >= 0.5 ? 1 : 0;
      bits[i] = on;

      const error = (buffer[i] - on) * ATKINSON_SHARE;
      for (const [dx, dy] of ATKINSON_KERNEL) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= size || ny >= size) continue;
        buffer[ny * size + nx] += error;
      }
    }
  }
  return bits;
}

/** Re-encode a bit matrix into per-row [startX, length] runs. */
function encodeRows(bits, width, height) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const runs = [];
    let start = -1;
    for (let x = 0; x < width; x++) {
      const on = bits[y * width + x] === 1;
      if (on && start === -1) start = x;
      if (!on && start !== -1) {
        runs.push([start, x - start]);
        start = -1;
      }
    }
    if (start !== -1) runs.push([start, width - start]);
    rows.push(runs);
  }
  return rows;
}

/**
 * Trim the dead margin around the artwork so the plate can bleed off the
 * sheet edge. The crop is squared off around the ink so the raster is never
 * stretched, and clamped to the source so nothing is invented at the edges.
 */
export function cropToInk(raster, padding = 2) {
  const { size, bits } = raster;
  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (bits[y * size + x] !== 1) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return raster; // nothing to crop

  const side = Math.min(
    size,
    Math.max(maxX - minX + 1, maxY - minY + 1) + padding * 2
  );
  const centreX = (minX + maxX + 1) / 2;
  const centreY = (minY + maxY + 1) / 2;
  const x0 = Math.max(0, Math.min(size - side, Math.round(centreX - side / 2)));
  const y0 = Math.max(0, Math.min(size - side, Math.round(centreY - side / 2)));

  const out = new Uint8Array(side * side);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      out[y * side + x] = bits[(y0 + y) * size + (x0 + x)];
    }
  }

  return { size: side, bits: out, rows: encodeRows(out, side, side) };
}

/**
 * Read a PNG and return { size, bits, rows } where `rows` is a run-length
 * encoding of each scanline: [[startX, length], ...]. Runs keep the emitted
 * SVG small and give the print animation a natural per-row unit.
 */
export function rasterize(pngPath, { size = 96, gamma = 0.85, gain = 1.04 } = {}) {
  const png = PNG.sync.read(readFileSync(pngPath));
  const field = applyCurve(downsample(png, size), gamma, gain);
  const bits = atkinson(field, size);

  return { size, bits, rows: encodeRows(bits, size, size) };
}
