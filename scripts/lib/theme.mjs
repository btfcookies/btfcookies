/**
 * Monochrome token system.
 *
 * The whole sheet is a 1-bit imaging system, so the dark theme is not a
 * re-coloured variant - it is the tonal negative of the light theme. Every
 * token below has exactly one counterpart on the other side.
 *
 * There is deliberately no `paper` token: the sheets paint no background, so
 * they sit directly on GitHub's own canvas in whichever theme the reader has
 * chosen. A painted background can only ever match one of GitHub's four
 * themes, and mismatches read as a hard rectangle around each image.
 *
 * Every value below is therefore chosen against GitHub's two extremes -
 * #ffffff and #0d1117 - and clears 4.5:1 for text at the sizes used here.
 */

export const THEMES = {
  light: {
    name: 'light',
    ink: '#101012', // toner
    graphite: '#494950', // secondary text
    ash: '#71717A', // tertiary text
    ghost: '#C8C8CC', // empty grid cells - a mark, not a word, so it may sit below text contrast
    rule: '#D0D0CC', // hairlines
  },
  dark: {
    name: 'dark',
    ink: '#F0F0EC',
    graphite: '#B4B4BA',
    ash: '#8A8A92',
    ghost: '#3A3A42',
    rule: '#2E2E34',
  },
};

/** Type roles. Display is used with restraint; mono carries all data. */
export const FONTS = {
  display: 'fonts/ArchivoBlack-Regular.ttf',
  body: 'fonts/IBMPlexSans-Variable.ttf',
  mono: 'fonts/IBMPlexMono-Regular.ttf',
  monoBold: 'fonts/IBMPlexMono-SemiBold.ttf',
};

export const THEME_NAMES = Object.keys(THEMES);
