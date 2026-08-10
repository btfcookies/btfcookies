/** All copy for the sheet lives here so the generators stay layout-only. */

export const USER = 'btfcookies';

export const HEADER = {
  eyebrow: 'HEAD DEVELOPER — EIGHTBIT LABS',
  name: ['LAWRENCE', 'TONG'],
  handle: '@btfcookies · cookiemonster',
  prose: 'Developer tools and Discord bots. Occasionally a PDF API or a cryptocurrency.',
  caption: '1-BIT RASTER · 128×128 · ATKINSON',
};

export const RASTER_SETTINGS = { size: 128, gamma: 2.5, gain: 1.0 };

export const PROJECTS = {
  eyebrow: 'SELECTED WORK',
  rows: [
    {
      name: 'REAMUS',
      blurb: 'HTML to PDF, as an API.',
      url: 'reamus.app',
    },
    {
      name: 'ORBIS',
      blurb: 'Discord bots for developer workflows.',
      url: 'orbis-dev.netlify.app',
    },
    {
      name: 'TAD COIN',
      blurb: 'A coin named after Terry A. Davis.',
      url: 'tad-coin.netlify.app',
    },
    {
      name: 'QB READER',
      blurb: 'Quiz bowl practice. I do the web client.',
      url: 'github.com/qbreader/website',
    },
    {
      name: 'ZEP',
      blurb: 'A general-purpose Discord bot.',
      url: 'github.com/wbrous/zep',
    },
    {
      name: 'CORTIS',
      blurb: 'A messaging app for developers.',
      url: 'NOT RELEASED',
    },
  ],
};

export const COLOPHON = {
  contactEyebrow: 'ELSEWHERE',
  contact: [
    { label: 'EMAIL', value: 'lawrence@reamus.app' },
    { label: 'DISCORD', value: 'btf_cookies' },
    { label: 'EIGHTBIT LABS', value: 'eightbitlabs.netlify.app' },
  ],
  colophonEyebrow: 'COLOPHON',
  notes: [
    'Generated from live GitHub data and refreshed daily.',
    'Six terminal panes, one palette: volume is still dot area and glow, category is colour now instead of pattern.',
    'Archivo Black and IBM Plex, baked to outlines; the avatar dithered to one bit and lit phosphor green.',
  ],
};
