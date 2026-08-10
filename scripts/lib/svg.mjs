/** Shared SVG document scaffolding, terminal window chrome, and the boot-scan reveal. */

import { xml, textPath, face } from './type.mjs';

/**
 * Sheet geometry.
 *
 * GitHub renders a profile README in a column that is roughly 830px at desktop
 * width, and an <img> at width="100%" scales the sheet down to fit it. The
 * canvas is therefore sized to that column rather than to a print page: at
 * 880px the sheets land at ~0.94x, so a 12px label reads as 12px. The previous
 * 1200px canvas was scaled to 0.69x, which is what made every label too small
 * to read. Type sizes below are effectively rendered sizes now, not design
 * sizes, and should be judged that way.
 */
export const SHEET = { width: 880, margin: 40 };

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
</mask>
<filter id="${id}-glow" x="-20%" y="-200%" width="140%" height="500%">
<feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur"/>
<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>`;
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

/** The phosphor bar that rides the leading edge of the reveal, like a CRT scanning in. */
export function scanBar(width, theme, id = 'print') {
  return `<g class="scan" opacity="0" filter="url(#${id}-glow)"><rect x="0" y="-1.5" width="${width}" height="1.5" fill="${theme.green}"/><rect x="0" y="0" width="${width}" height="14" fill="${theme.green}" opacity="0.08"/></g>`;
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
  return `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="1" fill="${theme.border}" opacity="${opacity}"/>`;
}

/**
 * Terminal window chrome.
 *
 * Every sheet is a self-contained widget now, not a bare print on the page,
 * so it needs to look like a real window: a rounded card, a title bar with
 * the three stoplight dots, and a label that names the command whose output
 * the pane is showing rather than a generic caption. The clip path is what
 * keeps the title bar's square top corners from poking out past the card's
 * rounded ones - drawn separately they'd fight; clipped together they read
 * as one shape.
 */
export const CHROME = { radius: 14, titleBar: 38, padBottom: 24 };

function trafficLights(theme, chromeH) {
  const cy = chromeH / 2;
  return [
    { x: 22, fill: theme.red },
    { x: 40, fill: theme.amber },
    { x: 58, fill: theme.green },
  ]
    .map((d) => `<circle cx="${d.x}" cy="${cy}" r="5" fill="${d.fill}"/>`)
    .join('');
}

/**
 * Wrap a sheet's already-composed body in a terminal window.
 *
 * @param {number} contentHeight  the height the generator laid its own body
 *   out against - untouched, so none of its internal baselines need to change
 * @param {string} titleLabel     the "command" printed in the title bar
 */
export function windowChrome({ width, contentHeight, theme, titleLabel, body, id = 'win' }) {
  const chromeH = CHROME.titleBar;
  const height = chromeH + contentHeight + CHROME.padBottom;
  const r = CHROME.radius;

  const label = textPath({
    font: face.mono(),
    text: titleLabel,
    size: 11.5,
    track: 0.8,
    x: width / 2,
    y: chromeH / 2 + 4,
    anchor: 'middle',
  });

  const markup = `<defs>
<clipPath id="${id}-clip"><rect x="0" y="0" width="${width}" height="${height}" rx="${r}" ry="${r}"/></clipPath>
<filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="${theme.shadow}"/></filter>
</defs>
<g filter="url(#${id}-shadow)">
<g clip-path="url(#${id}-clip)">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${theme.bg}"/>
  <rect x="0" y="0" width="${width}" height="${chromeH}" fill="${theme.panel}"/>
  <rect x="0" y="${chromeH - 1}" width="${width}" height="1" fill="${theme.border}"/>
  ${trafficLights(theme, chromeH)}
  <path d="${label.d}" fill="${theme.muted}"/>
  <g transform="translate(0 ${chromeH})">${body}</g>
</g>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${r}" ry="${r}" fill="none" stroke="${theme.border}"/>
</g>`;

  return { height, markup };
}
