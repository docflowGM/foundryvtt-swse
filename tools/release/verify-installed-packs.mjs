#!/usr/bin/env node
/**
 * Verify that an INSTALLED system folder contains every compendium store its system.json declares.
 *
 *   node tools/release/verify-installed-packs.mjs <path-to-installed-system-folder>
 *
 * system.json declares V13 LevelDB directories (packs/<name>). A plain `git checkout` only contains the NeDB sources
 * (packs/<name>.db), so Foundry reports missing packs ("foundryvtt-swse.feats" absent from game.packs) and progression runs
 * degraded. Exit code 0 only when every declared pack directory is a LevelDB store (has CURRENT + a MANIFEST file).
 */
import fs from 'node:fs';
import path from 'node:path';

export function verifyInstalledPacks(systemDir) {
  const manifestPath = path.join(systemDir, 'system.json');
  if (!fs.existsSync(manifestPath)) return { ok: false, error: `no system.json in ${systemDir}`, missing: [], total: 0 };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const missing = [];
  for (const pack of manifest.packs ?? []) {
    const dir = path.join(systemDir, pack.path);
    const isStore = fs.existsSync(dir) && fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'CURRENT'))
      && fs.readdirSync(dir).some((f) => f.startsWith('MANIFEST-'));
    if (!isStore) missing.push({ name: pack.name, path: pack.path, hasSource: fs.existsSync(`${dir}.db`) });
  }
  return { ok: missing.length === 0, missing, total: (manifest.packs ?? []).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = path.resolve(process.argv[2] ?? '.');
  const result = verifyInstalledPacks(dir);
  if (result.error) { console.error(result.error); process.exit(2); }
  if (result.ok) { console.log(`OK: all ${result.total} declared compendium stores are present in ${dir}`); process.exit(0); }
  console.error(`MISSING ${result.missing.length} of ${result.total} compendium stores in ${dir}:`);
  for (const m of result.missing) console.error(`  - ${m.name} (${m.path})${m.hasSource ? ' [source present: needs a build]' : ' [no source]'}`);
  console.error('\nFix: from the system folder run\n  npm ci --prefix tools/release\n  node tools/release/build-packs.mjs --out .\nwith Foundry closed, or install the packaged release zip.');
  process.exit(1);
}
