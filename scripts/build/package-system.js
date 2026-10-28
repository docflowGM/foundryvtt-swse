#!/usr/bin/env node
/**
 * Package SWSE System for Distribution
 *
 * Stages the release in build/release/<id>/ and zips it with the system files at the archive root (no wrapper folder):
 *   1. copies the shipped tree (tools/release/pack-sources.mjs PACKAGE_INCLUDE, minus PACKAGE_EXCLUDE_DIRS -- the audit evidence
 *      under data/ never ships, nor do docs/ or tools/);
 *   2. compiles every compendium declared in system.json from its committed legacy source (packs/<name>.db) into the V13 LevelDB
 *      directory the manifest names (tools/release/build-packs.mjs, which verifies every pack by reading it back);
 *   3. checks that the staged package satisfies the manifest (every esmodule, style, language file and pack store is present);
 *   4. zips the staged directory.
 * Requires the pinned release tooling: `npm ci --prefix tools/release`.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..', '..');
const systemJson = JSON.parse(fs.readFileSync(path.join(root, 'system.json'), 'utf8'));
const version = systemJson.version;
const systemId = systemJson.id;
const outputFileName = path.join(root, `${systemId}-${version}.zip`);
const stage = path.join(root, 'build', 'release', systemId);

(async () => {
  const sources = await import(pathToFileURL(path.join(root, 'tools/release/pack-sources.mjs')).href);
  const { buildPacks } = await import(pathToFileURL(path.join(root, 'tools/release/build-packs.mjs')).href);
  const excluded = new Set(sources.PACKAGE_EXCLUDE_DIRS.map((p) => path.join(root, p)));

  console.log(`📦 Packaging ${systemId} v${version}...`);
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });
  for (const entry of sources.PACKAGE_INCLUDE) {
    const from = path.join(root, entry);
    if (!fs.existsSync(from)) throw new Error(`missing package entry: ${entry}`);
    fs.cpSync(from, path.join(stage, entry), {
      recursive: true,
      filter: (src) => !excluded.has(src) && !/(\.bak|\.DS_Store)$/.test(src) && !src.split(path.sep).includes('__MACOSX'),
    });
  }

  console.log('  Compiling compendium packs (LevelDB) ...');
  const report = await buildPacks({ out: stage, log: null });
  console.log(`  ${report.length} packs, ${report.reduce((s, p) => s + p.documents, 0)} documents verified`);

  const view = {
    isFile: (p) => { try { return fs.statSync(path.join(stage, p)).isFile(); } catch { return false; } },
    isDir: (p) => { try { return fs.statSync(path.join(stage, p)).isDirectory(); } catch { return false; } },
    read: (p) => fs.readFileSync(path.join(stage, p), 'utf8'),
  };
  const problems = sources.manifestCoverage(systemJson, view);
  if (problems.length) throw new Error(`the staged package does not satisfy system.json:\n  ${problems.join('\n  ')}`);

  // system.json declares a license, but the repository has no LICENSE file to ship; the copyright holder and the licensing scope (software
  // only -- never the third-party Star Wars / SWSE sourcebook content) need the owner's confirmation, so nothing is generated here
  if (systemJson.license && !fs.existsSync(path.join(root, 'LICENSE'))) {
    console.warn(`  ⚠️  system.json declares license "${systemJson.license}" but the repository has no LICENSE file; the package ships without one until the owner confirms the copyright holder and scope.`);
  }

  if (fs.existsSync(outputFileName)) fs.unlinkSync(outputFileName);
  execSync(`zip -q -r -X "${outputFileName}" .`, { cwd: stage, stdio: 'inherit' });
  const sizeKB = (fs.statSync(outputFileName).size / 1024).toFixed(2);
  console.log(`\n✅ Package created: ${path.basename(outputFileName)} (${sizeKB} KB)`);
})().catch((err) => {
  console.error('❌ Error creating package:', err.message);
  console.error('\n⚠️  Requires `npm ci --prefix tools/release` and the "zip" command.');
  process.exit(1);
});
