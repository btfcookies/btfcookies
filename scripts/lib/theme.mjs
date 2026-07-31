/**
 * Monochrome token system.
 *
 * The whole sheet is a 1-bit imaging system, so the dark theme is not a
 * re-coloured variant - it is the tonal negative of the light theme. Every
 * token below has exactly one counterpart on the other side.
 */

export const THEMES = {
  light: {
    name: 'light',
    paper: '#F2F2F0', // sheet
    ink: '#101012', // toner
    graphite: '#5B5B60', // secondary text
    ash: '#A9A9AE', // tertiary marks, empty cells
    rule: '#D6D6D2', // hairlines
  },
  dark: {
    name: 'dark',
    paper: '#0C0C0E',
    ink: '#F0F0EC',
    graphite: '#9A9A9F',
    ash: '#55555A',
    rule: '#26262A',
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
