const CONFIG_FILE = './src/config.ts';

/** Supply-chain guard: ignore releases younger than this — gives a compromised/malicious publish time to be caught and unpublished before we pick it up. */
const MIN_AGE_HOURS = 48;

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Newest version in `time` (an npm registry `time` map) that is stable (no prerelease tag) and was published at least `minAgeHours` before `now`. */
export function pickEligibleVersion(time: Record<string, string>, minAgeHours: number, now: number): string {
  const cutoff = now - minAgeHours * 60 * 60 * 1000;

  const eligible = Object.entries(time)
    .filter(([version]) => version !== 'created' && version !== 'modified' && !version.includes('-'))
    .filter(([, published]) => new Date(published).getTime() <= cutoff)
    .map(([version]) => version)
    .sort(compareVersions);

  if (eligible.length === 0) throw new Error(`No version older than ${minAgeHours}h found`);
  return eligible[eligible.length - 1];
}

/** Latest version of `pkg` that is stable and has been published for at least `minAgeHours`. */
async function getEligibleVersion(pkg: string, minAgeHours: number): Promise<string> {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const doc = await res.json();
  return pickEligibleVersion(doc.time as Record<string, string>, minAgeHours, Date.now());
}

if (import.meta.main) {
  const content = await Deno.readTextFile(CONFIG_FILE);

  const versionRegex = /const ALPINE_VERSION = '([^']+)';/;
  const match = content.match(versionRegex);
  if (!match) throw new Error(`ALPINE_VERSION constant not found in ${CONFIG_FILE}`);
  const current = match[1];

  const latest = await getEligibleVersion('alpinejs', MIN_AGE_HOURS);

  if (latest === current) {
    console.log(`alpinejs: already up to date (${current}, respecting ${MIN_AGE_HOURS}h release delay)`);
  } else if (compareVersions(latest, current) < 0) {
    console.log(`alpinejs: ${current} is newer than the oldest-eligible ${latest} — leaving untouched`);
  } else {
    const updated = content.replace(versionRegex, `const ALPINE_VERSION = '${latest}';`);
    await Deno.writeTextFile(CONFIG_FILE, updated);
    console.log(`alpinejs: ${current} → ${latest} (published ≥${MIN_AGE_HOURS}h ago)`);
    console.log(`Updated ${CONFIG_FILE}`);
  }
}
