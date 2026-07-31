/** Shared SVG document scaffolding and the top-down print reveal. */

import { xml } from './type.mjs';

/**
 * The whole sheet reveals under one descending edge. `steps()` is doing real
 * work here: a continuous wipe reads as a fade, whereas discrete advances read
 * as a print head, which is the point of the design.
 */
export const PRINT = {
  rate: 227, // px/sec - fixed, so every sheet prints at the same speed
  stepPx: 8.6, // px per discrete advance of the head
  stagger: 0.22, // sec between sheets, short enough that none sits blank
  overshoot: 60, // px the edge travels past the bottom so nothing ends mid-fade
  softness: 12, // px of gradient at the leading edge
  bleed: 240, // px of extra mask height above the canvas
};

/**
 * Sheets are separate images, so they cannot share one animation. Deriving
 * duration from height at a fixed rate makes the edges move at matching
 * speeds, which is what sells them as one pass of one machine.
 */
export function printTiming(height, index = 0) {
  const travel = height + PRINT.overshoot;
  return {
    travel,
    duration: travel / PRINT.rate,
    steps: Math.max(8, Math.round(travel / PRINT.stepPx)),
    delay: index * PRINT.stagger,
  };
}

export function revealDefs(width, height, id = 'print') {
  const maskH = height + PRINT.bleed;
  const solidStop = (1 - PRINT.softness / maskH) * 100;
  return `<linearGradient id="${id}-edge" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#fff"/><stop offset="${solidStop.toFixed(3)}%" stop-color="#fff"/><stop offset="100%" stop-color="#000"/>
</linearGradient>
<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
<rect class="wipe" x="0" y="${-maskH}" width="${width}" height="${maskH}" fill="url(#${id}-edge)"/>
</mask>`;
}

/**
 * FREEZE=0..1 pauses every sheet at that point in the print for review
 * screenshots. It is a development affordance only and is never set in CI.
 */
const FREEZE = process.env.FREEZE ? Number(process.env.FREEZE) : null;

function freezeCss(duration) {
  if (FREEZE === null || Number.isNaN(FREEZE)) return '';
  const delay = (-duration * FREEZE).toFixed(3);
  return `.wipe,.scan{animation-delay:${delay}s;animation-play-state:paused;animation-fill-mode:both}`;
}

/**
 * The resting state is fully printed, and the animation runs from blank back
 * to it. If animation never runs - reduced motion, an old renderer, a static
 * screenshot - the sheet is simply complete rather than empty.
 */
export function revealCss(height, index = 0, id = 'print') {
  const { travel, duration, steps, delay } = printTiming(height, index);
  const d = duration.toFixed(3);
  return `
.wipe{transform:translateY(${travel}px);animation:${id}-wipe ${d}s steps(${steps},end) ${delay}s 1 backwards}
.scan{transform:translateY(${travel}px);animation:${id}-wipe ${d}s steps(${steps},end) ${delay}s 1 backwards,${id}-lift ${d}s linear ${delay}s 1 backwards}
${freezeCss(duration)}
@keyframes ${id}-wipe{from{transform:translateY(0)}to{transform:translateY(${travel}px)}}
@keyframes ${id}-lift{0%,92%{opacity:1}100%{opacity:0}}
@media(prefers-reduced-motion:reduce){.wipe,.scan{animation:none}.scan{opacity:0}}`;
}

/** The bar that rides the leading edge of the reveal. */
export function scanBar(width, theme) {
  return `<g class="scan" opacity="0"><rect x="0" y="-2" width="${width}" height="2" fill="${theme.ink}"/><rect x="0" y="0" width="${width}" height="10" fill="${theme.ink}" opacity="0.06"/></g>`;
}

export function doc({ width, height, title, desc, body, css = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="sheet-title sheet-desc" preserveAspectRatio="xMidYMid meet">
<title id="sheet-title">${xml(title)}</title>
<desc id="sheet-desc">${xml(desc)}</desc>
<style>${css}</style>
${body}
</svg>
`;
}

/** Hairline rule. */
export function rule(x1, y, x2, theme, opacity = 1) {
  return `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="1" fill="${theme.rule}" opacity="${opacity}"/>`;
}
