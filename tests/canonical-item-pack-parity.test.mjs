import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, FAMILIES, buildItemProduction, buildFamily } from '../tools/build-canonical-item-packs.mjs';

const expected = buildItemProduction();
assert.equal(Object.keys(expected).length, 13, '2 aggregates and 11 subtype packs');
for (const [relative, content] of Object.entries(expected)) {
  assert.equal(fs.readFileSync(path.join(ROOT, relative), 'utf8'), content, relative + ' must be a canonical JSON projection');
}
for (const family of Object.keys(FAMILIES)) {
  const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/canonical', family + '.json'), 'utf8'));
  assert.equal(new Set(corpus.records.map(r => r.document._id)).size, corpus.records.length);
  assert.deepEqual(new Set(corpus.records.map(r => r.pack)), new Set(FAMILIES[family]));
  assert.throws(() => buildFamily(family, { ...corpus, records: [...corpus.records, corpus.records[0]] }), /Duplicate/);
  assert.throws(() => buildFamily(family, { ...corpus, records: [{ ...corpus.records[0], pack: 'legacy' }] }), /Unknown/);
  const grouped = corpus.records.filter(r => r.document.system.cost !== undefined);
  assert.ok(grouped.length > 0, family + ' prices must be preserved');
}
// A cache-key bump prevents 24-hour browser inventory caches from showing superseded armor records.
assert.match(fs.readFileSync(path.join(ROOT, 'scripts/engine/store/store-constants.js'), 'utf8'), /CACHE_KEY: 'swse-store-cache-v6'/);
// Weapons already have their own stronger canonical JSON -> pack generator.
execFileSync(process.execPath, ['tools/build-weapon-production.mjs', '--check'], {cwd: ROOT, stdio: 'pipe'});
console.log('canonical-item-pack-parity: 13 generated armor/equipment packs + canonical weapons verified');
