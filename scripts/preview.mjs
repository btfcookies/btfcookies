/**
 * Dev harness: render the generated sheets at README column width.
 * Pass "light" or "dark" to review one theme on its own.
 */
import { readdirSync, writeFileSync } from 'node:fs';

const order = ['header', 'contributions', 'stats', 'languages'];
const files = readdirSync('assets').filter((f) => f.endsWith('.svg'));
const only = process.argv[2];
const themes = ['light', 'dark'].filter((t) => !only || t === only);

function sheetsFor(theme) {
  return order
    .map((name) => files.find((f) => f === `${name}-${theme}.svg`))
    .filter(Boolean)
    .map((f) => `<img src="../assets/${f}" alt="${f}">`)
    .join('\n');
}

const html = `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;font:13px ui-monospace,monospace}
  .pane{padding:32px 24px}
  .light{background:#ffffff;color:#1f2328}
  .dark{background:#0d1117;color:#e6edf3}
  .col{max-width:830px;margin:0 auto}
  img{display:block;width:100%;height:auto;margin-bottom:16px}
  h2{font:600 12px ui-monospace,monospace;letter-spacing:.14em;opacity:.5;margin:0 0 16px}
</style>
${themes
  .map(
    (theme) =>
      `<div class="pane ${theme}"><div class="col"><h2>GITHUB ${theme.toUpperCase()} — 830px column</h2>${sheetsFor(theme)}</div></div>`
  )
  .join('\n')}`;

writeFileSync('scripts/preview.html', html);
console.log(`preview: ${themes.join(', ')}`);
