/**
 * Live GitHub data.
 *
 * The contribution calendar is read from the public contributions fragment
 * (no auth required); everything else comes from the REST API, which accepts
 * GITHUB_TOKEN when the build runs in Actions.
 */

import { writeFileSync } from 'node:fs';

const UA = 'btfcookies-profile-sheet';

function headers(json = true) {
  const h = { 'User-Agent': UA };
  if (json) h.Accept = 'application/vnd.github+json';
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function getJson(url) {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/** Parse the contributions fragment into a date-ordered list of day records. */
export async function fetchCalendar(user) {
  const res = await fetch(`https://github.com/users/${user}/contributions`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`contributions fragment: ${res.status}`);
  const html = await res.text();

  const counts = new Map();
  const tooltipRe = /<tool-tip[^>]*for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)<\/tool-tip>/g;
  for (const m of html.matchAll(tooltipRe)) {
    const n = /^(\d+)\s+contribution/.exec(m[2].trim());
    counts.set(m[1], n ? Number(n[1]) : 0);
  }

  const cellRe =
    /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="(contribution-day-component-(\d+)-(\d+))"[^>]*data-level="(\d)"/g;
  const days = [];
  for (const m of html.matchAll(cellRe)) {
    days.push({
      date: m[1],
      id: m[2],
      weekday: Number(m[3]),
      week: Number(m[4]),
      level: Number(m[5]),
      count: counts.get(m[2]) ?? 0,
    });
  }
  if (days.length === 0) throw new Error('contributions fragment: no day cells matched');

  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

/** GitHub counts a day as "not yet missed" until it is over, so today may be 0. */
export function computeStreaks(days) {
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  let longest = 0;
  let longestEnd = null;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) {
      longest = run;
      longestEnd = d.date;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue; // today is still in progress
    else break;
  }

  const busiest = days.reduce((best, d) => (d.count > best.count ? d : best), days[0]);

  return {
    total,
    activeDays,
    current,
    longest,
    longestEnd,
    busiest,
    from: days[0].date,
    to: days[days.length - 1].date,
  };
}

export async function fetchProfile(user) {
  return getJson(`https://api.github.com/users/${user}`);
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

/**
 * Pull the current avatar so a change on GitHub reaches the plate. The bytes
 * are checked before they overwrite the committed copy - a truncated or
 * HTML error response must not replace a working source image.
 */
export async function refreshAvatar(user, path, size = 460) {
  const res = await fetch(`https://github.com/${user}.png?size=${size}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`avatar: ${res.status}`);

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 2048) throw new Error(`avatar: only ${bytes.length} bytes`);
  if (!PNG_MAGIC.every((byte, i) => bytes[i] === byte)) throw new Error('avatar: not a PNG');

  writeFileSync(path, bytes);
  return bytes.length;
}

/** Owned, non-fork repos with their stars and language byte counts. */
export async function fetchRepoStats(user) {
  const repos = [];
  for (let page = 1; page <= 4; page++) {
    const batch = await getJson(
      `https://api.github.com/users/${user}/repos?per_page=100&page=${page}&type=owner&sort=pushed`
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  const owned = repos.filter((r) => !r.fork);
  const stars = owned.reduce((sum, r) => sum + r.stargazers_count, 0);

  const bytes = new Map();
  const results = await Promise.all(
    owned.map((r) =>
      getJson(r.languages_url).catch(() => ({}))
    )
  );
  for (const langs of results) {
    for (const [name, n] of Object.entries(langs)) {
      bytes.set(name, (bytes.get(name) ?? 0) + n);
    }
  }

  const totalBytes = [...bytes.values()].reduce((a, b) => a + b, 0);
  const languages = [...bytes.entries()]
    .map(([name, n]) => ({ name, bytes: n, share: totalBytes ? n / totalBytes : 0 }))
    .sort((a, b) => b.bytes - a.bytes);

  return { repoCount: owned.length, stars, languages, totalBytes };
}
