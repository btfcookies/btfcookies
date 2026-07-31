/**
 * Generate every sheet in assets/, once per theme.
 *
 * Run with no network access and the build still succeeds against the last
 * committed data snapshot, so a rate-limited CI run cannot blank the profile.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { THEMES } from './lib/theme.mjs';
import { rasterize, cropToInk } from './lib/dither.mjs';
import {
  fetchCalendar,
  computeStreaks,
  fetchProfile,
  fetchRepoStats,
  refreshAvatar,
} from './lib/data.mjs';
import { renderHeader } from './svg/header.mjs';
import { renderContributions } from './svg/contributions.mjs';
import { renderStats } from './svg/stats.mjs';
import { renderLanguages } from './svg/languages.mjs';
import { renderProjects } from './svg/projects.mjs';
import { renderColophon } from './svg/colophon.mjs';
import { USER, HEADER, RASTER_SETTINGS, PROJECTS, COLOPHON } from './content.mjs';

const OUT = 'assets';
const SNAPSHOT = 'data/snapshot.json';
const AVATAR = 'avatar.png';

async function collect() {
  const [days, profile, repos] = await Promise.all([
    fetchCalendar(USER),
    fetchProfile(USER),
    fetchRepoStats(USER),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    days,
    streaks: computeStreaks(days),
    profile: {
      followers: profile.followers,
      following: profile.following,
      createdAt: profile.created_at,
      publicRepos: profile.public_repos,
    },
    repos,
  };
}

async function loadData() {
  try {
    const fresh = await collect();
    mkdirSync('data', { recursive: true });
    writeFileSync(SNAPSHOT, `${JSON.stringify(fresh, null, 2)}\n`);
    console.log(`fetched live data (${fresh.days.length} days, ${fresh.streaks.total} contributions)`);
    return fresh;
  } catch (error) {
    if (!existsSync(SNAPSHOT)) throw error;
    console.warn(`live fetch failed (${error.message}); falling back to snapshot`);
    return JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  }
}

function write(name, theme, svg) {
  const file = `${OUT}/${name}-${theme}.svg`;
  writeFileSync(file, svg);
  console.log(`  ${file}  ${(svg.length / 1024).toFixed(1)} kB`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  try {
    const bytes = await refreshAvatar(USER, AVATAR);
    console.log(`avatar refreshed (${bytes} bytes)`);
  } catch (error) {
    console.warn(`avatar refresh skipped (${error.message}); using committed copy`);
  }

  const data = await loadData();
  const raster = cropToInk(rasterize(AVATAR, RASTER_SETTINGS));
  console.log(`raster: ${raster.size}x${raster.size} cells after crop`);

  const { days, streaks, profile, repos } = data;

  // Order matters: `index` staggers each sheet's print so the page reads as a
  // single pass down the README rather than four independent animations.
  const sheets = [
    ['header', (theme, index) => renderHeader({ theme, raster, content: HEADER, index })],
    ['contributions', (theme, index) => renderContributions({ theme, days, streaks, index })],
    ['stats', (theme, index) => renderStats({ theme, days, streaks, profile, repos, index })],
    ['languages', (theme, index) => renderLanguages({ theme, repos, index })],
    ['projects', (theme, index) => renderProjects({ theme, content: PROJECTS, index })],
    ['colophon', (theme, index) => renderColophon({ theme, content: COLOPHON, index })],
  ];

  for (const theme of Object.values(THEMES)) {
    sheets.forEach(([name, render], index) => write(name, theme.name, render(theme, index)));
  }

  console.log('done');
  return data;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
