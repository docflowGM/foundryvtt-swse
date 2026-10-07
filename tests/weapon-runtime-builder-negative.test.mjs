import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRegistry, serialize, P3B, P4H } from '../tools/build-weapon-runtime-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const real = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const withOverride = (file, mutate) => (f) => (f === file ? mutate(real(f)) : real(f));

// byte-stable
assert.equal(serialize(buildRegistry()), serialize(buildRegistry()));
assert.equal(serialize(buildRegistry()), real('data/weapons/canonical-weapon-registry.json'));

// 3B tampered -> the 4H-expected source hash no longer matches
assert.throws(() => buildRegistry(withOverride(P3B, (t) => t.replace('"Large"', '"Huge"'))), /expects Phase 3B sha256/);

// 4H record missing -> count / join failure (hash of 3B still matches, so the 4H count check fires)
assert.throws(() => buildRegistry(withOverride(P4H, (t) => { const j = JSON.parse(t); j.records.pop(); return JSON.stringify(j); })), /Phase 4H has 202/);

// duplicate 4H identity
assert.throws(() => buildRegistry(withOverride(P4H, (t) => { const j = JSON.parse(t); j.records[1] = j.records[0]; return JSON.stringify(j); })), /duplicate 4H identity/);

// 4H record keyed differently from 3B (no name fuzzy matching)
assert.throws(() => buildRegistry(withOverride(P4H, (t) => { const j = JSON.parse(t); j.records[0] = { ...j.records[0], identityKey: `${j.records[0].identityKey}-renamed` }; return JSON.stringify(j); })), /has no 4H record/);

// 4H mechanics hash mismatch
assert.throws(() => buildRegistry(withOverride(P4H, (t) => { const j = JSON.parse(t); j.records[0].phase3B.mechanicsRecordSha256 = '0'.repeat(64); return JSON.stringify(j); })), /mechanicsRecordSha256 mismatch/);

// 5B introduces no consumer wiring: nothing outside the module imports it
import { execFileSync } from 'node:child_process';
const refs = execFileSync('git', ['ls-files', 'scripts', 'index.js', 'system.json'], { cwd: ROOT }).toString().split('\n').filter((f) => f.endsWith('.js') && !f.startsWith('scripts/items/weapon-runtime/'));
for (const f of refs) assert.ok(!/weapon-runtime\//.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} must not import the weapon runtime yet`);
console.log('weapon-runtime-builder-negative: ok');
