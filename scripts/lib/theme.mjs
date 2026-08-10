/**
 * Terminal token system.
 *
 * The sheets are no longer sitting bare on GitHub's canvas - each one is a
 * terminal window widget with its own painted chrome, so it needs a real
 * background rather than a tonal negative of the reader's page. The palette
 * is a small, curated set of bright hues rather than one neon accent: it
 * reads as an old 16-colour terminal (CGA/ANSI-bright) tuned for a modern
 * screen, which is the one detail that ties the sheet back to "Eightbit
 * Labs" instead of to hacker-movie matrix green.
 *
 * Light and dark are not literal opposites here (a terminal window doesn't
 * flip white-on-black into black-on-white and call it a day) - both are
 * genuine terminal skins, one a phosphor-dark session and one a sunlit one,
 * built from the same five accent hues at different depths so a widget is
 * recognisably "the same terminal" in either reading mode.
 */

export const THEMES = {
  light: {
    name: 'light',
    bg: '#f7f6f0', // window canvas - warm paper, not clinical white
    panel: '#efede4', // title bar fill
    border: '#dbd6c7', // window frame + hairlines
    ink: '#15161b', // primary text
    muted: '#54555f', // secondary text, comments
    faint: '#6e6f78', // tertiary text - darkened off #7c7d86 to hold 4.5:1 on paper
    dim: '#d9d4c4', // empty grid cells, quiet ornament
    shadow: 'rgba(20, 19, 12, 0.14)',
    // Every accent below is darkened off its dark-theme hue (same H/S, lower L)
    // until it clears 4.5:1 against `bg` - these sit under body-sized text
    // (project names, contact values), not just large display numerals or
    // decorative fills, so AA normal-text contrast is the real requirement.
    green: '#197f4b',
    cyan: '#0d7892',
    magenta: '#c0368d',
    amber: '#996416',
    red: '#cc3930',
  },
  dark: {
    name: 'dark',
    bg: '#0a0e16', // window canvas
    panel: '#0e1220', // title bar fill
    border: '#242b3f', // window frame + hairlines
    ink: '#eef1f8',
    muted: '#9aa3bd',
    faint: '#5b6580',
    dim: '#232a3d',
    shadow: 'rgba(0, 0, 0, 0.45)',
    green: '#35e08a',
    cyan: '#33d2f0',
    magenta: '#f45fc0',
    amber: '#ffcd4a',
    red: '#ff5f57',
  },
};

/** Accent rotation used wherever a series needs distinct hues (languages, stat cells). */
export const ACCENT_ORDER = ['green', 'cyan', 'amber', 'magenta'];

export function accent(theme, i) {
  return theme[ACCENT_ORDER[i % ACCENT_ORDER.length]];
}

/** Type roles. Mono is the primary voice now - a terminal has no other font. */
export const FONTS = {
  display: 'fonts/ArchivoBlack-Regular.ttf',
  body: 'fonts/IBMPlexSans-Variable.ttf',
  mono: 'fonts/IBMPlexMono-Regular.ttf',
  monoBold: 'fonts/IBMPlexMono-SemiBold.ttf',
};

export const THEME_NAMES = Object.keys(THEMES);
