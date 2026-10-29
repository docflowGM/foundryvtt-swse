#!/usr/bin/env node
/**
 * Build the V13 LevelDB packs declared in system.json. Canonical vehicles are generated from the 429-record SSOT; other packs use committed NeDB sources.
 *
 *   npm ci --prefix tools/release          # once: installs the pinned @foundryvtt/foundryvtt-cli (classic-level)
 *   node tools/release/build-packs.mjs --out build/release/foundryvtt-swse [--only <pack-name>]
 *
 * Writes `<out>/<pack.path>` for every declared pack and only reads `packs/`. Each source is replayed with NeDB semantics
 * (tools/release/pack-sources.mjs; NeDB itself is not used: it rewrites a data file on load and rejects field names containing a dot,
 * which a few archived feat fields have), staged as one JSON file per document with Foundry's `_key`, and compiled with Foundry's own
 * CLI (compilePack, LevelDB; embedded documents are stored under their own keys). The result is read back: the key set must match the
 * source exactly and every top-level document must round-trip with the same content. Embedded documents stored without an `_id`
 * (Active Effects on items in the actor packs) receive a deterministic synthesized id in the artifact only. Any mismatch fails the build. Exit code 0 only
 * when every pack verifies.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { planPacks, parseNedb, prepareDocuments, expectedReadBack, EMBEDDED } from './pack-sources.mjs';
import { buildUniversalVehiclePackSources } from '../build-universal-vehicle-pack-sources.mjs';
import { UNIVERSAL_VEHICLE_PACK_NAMES } from '../../scripts/domain/vehicles/universal-vehicle-pack-registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

function args() {
  const a = process.argv.slice(2);
  const get = (flag) => { const i = a.indexOf(flag); return i >= 0 ? a[i + 1] : null; };
  return { out: get('--out'), only: get('--only') };
}

async function loadTools() {
  const require = createRequire(path.join(here, 'package.json'));
  let cliPath; let levelPath;
  try { cliPath = require.resolve('@foundryvtt/foundryvtt-cli'); levelPath = require.resolve('classic-level'); }
  catch { throw new Error('release tooling is not installed: run `npm ci --prefix tools/release` (pinned in tools/release/package-lock.json)'); }
  const cli = await import(cliPath);
  const { ClassicLevel } = await import(levelPath);
  return { compilePack: cli.compilePack, ClassicLevel };
}

/** Rebuild a top-level document from the LevelDB store (embedded ids -> documents), for comparison with the source. */
async function readBack(db, collection, id) {
  const inflate = async (sublevel, idPath) => {
    const doc = await db.get(`!${sublevel}!${idPath}`);
    if (doc === undefined) return undefined;
    const leaf = sublevel.split('.').at(-1);
    for (const child of EMBEDDED[leaf] ?? []) {
      if (!Array.isArray(doc[child])) continue;
      doc[child] = await Promise.all(doc[child].map((cid) => inflate(`${sublevel}.${child}`, `${idPath}.${cid}`)));
    }
    return doc;
  };
  return inflate(collection, id);
}

const canonical = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => (p < q ? -1 : p > q ? 1 : 0))) : x));

export async function buildPacks({ out, only = null, log = console.log } = {}) {
  if (!out) throw new Error('--out <directory> is required');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'system.json'), 'utf8'));
  const { packs, problems } = planPacks(manifest);
  if (problems.length) throw new Error(`manifest: ${problems.join('; ')}`);
  const declaredVehicles=packs.filter(p=>p.type==='Actor'&&p.name.startsWith('vehicles')).map(p=>p.name);
  if(declaredVehicles.length!==UNIVERSAL_VEHICLE_PACK_NAMES.length ||
     declaredVehicles.some(x=>!UNIVERSAL_VEHICLE_PACK_NAMES.includes(x)))
    throw new Error('vehicle manifest does not match 11-pack canonical registry');
  const vehicleSources=buildUniversalVehiclePackSources(root);
  const selected = only ? packs.filter((p) => p.name === only) : packs;
  if (only && !selected.length) throw new Error(`no declared pack named ${only}`);
  const { compilePack, ClassicLevel } = await loadTools();
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-pack-build-'));
  const report = [];
  try {
    for (const pack of selected) {
      // Canonical vehicle Actors are generated from the single 429-record
      // source authority. NEVER read their stale legacy packs/*.db files.
      const vehicleDocs=vehicleSources.output.get(pack.name);
      const sourcePath=vehicleDocs?null:path.join(root,pack.source);
      const sourceBytes=vehicleDocs?null:fs.readFileSync(sourcePath);
      const replay=vehicleDocs?{docs:vehicleDocs,problems:[]}:parseNedb(sourceBytes.toString('utf8'));
      const expected=prepareDocuments(replay.docs,pack.collection);
      if(replay.problems.length||expected.problems.length)
        throw new Error(`${pack.name}: ${[...replay.problems,...expected.problems].slice(0,5).join('; ')}`);

      const json = path.join(work, pack.name);
      fs.mkdirSync(json, { recursive: true });
      for (const doc of expected.docs) fs.writeFileSync(path.join(json, `${doc._id}.json`), JSON.stringify(doc));
      const target = path.join(out, pack.path);
      fs.rmSync(target, { recursive: true, force: true });
      await compilePack(json, target);

      const db = new ClassicLevel(target, { keyEncoding: 'utf8', valueEncoding: 'json', createIfMissing: false });
      await db.open();
      try {
        const built = new Set(await db.keys().all());
        const missing = [...expected.keys].filter((k) => !built.has(k));
        const extra = [...built].filter((k) => !expected.keys.has(k));
        if (missing.length || extra.length) throw new Error(`${pack.name}: key mismatch (missing ${missing.length}: ${missing.slice(0, 3).join(', ')}; extra ${extra.length}: ${extra.slice(0, 3).join(', ')})`);
        for (const doc of expected.docs) {
          const back = await readBack(db, pack.collection, doc._id);
          if (canonical(back) !== canonical(expectedReadBack(doc, pack.collection))) throw new Error(`${pack.name}: document ${doc._id} (${doc.name ?? ''}) does not round-trip`);
        }
      } finally { await db.close(); }
      // LevelDB's informational text logs carry timestamps; they are not data and are dropped so the artifact does not vary between builds
      for (const f of ['LOG', 'LOG.old']) fs.rmSync(path.join(target, f), { force: true });
      if(sourceBytes && (!fs.existsSync(sourcePath)||!fs.readFileSync(sourcePath).equals(sourceBytes)))
        throw new Error(`${pack.name}: the committed source changed during the build`);
      report.push({ name: pack.name, path: pack.path, documents: replay.docs.length, keys: expected.keys.size, synthesizedIds: expected.synthesized });
      log?.(`  ${pack.path}: ${replay.docs.length} documents, ${expected.keys.size} keys${expected.synthesized ? `, ${expected.synthesized} embedded ids synthesized` : ''} -- verified`);
    }
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { out, only } = args();
  buildPacks({ out: out && path.resolve(out), only })
    .then((r) => { console.log(`Built and verified ${r.length} pack(s): ${r.reduce((s, p) => s + p.documents, 0)} documents, ${r.reduce((s, p) => s + p.synthesizedIds, 0)} synthesized embedded ids.`); })
    .catch((err) => { console.error(`FAIL: ${err.message}`); process.exit(1); });
}
