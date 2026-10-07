import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildRegistry, serialize } from '../tools/build-weapon-runtime-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANON = 'data/canonical/weapons.json';
const real = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mutateCanon = (fn) => (f) => (f === CANON ? (() => { const j = JSON.parse(real(f)); fn(j); return JSON.stringify(j); })() : real(f));

// byte-stable and equal to the committed registry (the registry is generated from the canonical corpus only)
assert.equal(serialize(buildRegistry()), serialize(buildRegistry()));
assert.equal(serialize(buildRegistry()), real('data/weapons/canonical-weapon-registry.json'));

// missing / duplicate / unmapped canonical identities and production-id collisions fail loudly
assert.throws(() => buildRegistry(mutateCanon((j) => { j.identities.pop(); })), /expected 203/);
assert.throws(() => buildRegistry(mutateCanon((j) => { j.identities[1] = j.identities[0]; })), /duplicate canonical identity|assigned to two identities/);
assert.throws(() => buildRegistry(mutateCanon((j) => { j.identities[1].production.id = j.identities[0].production.id; })), /assigned to two identities/);
assert.throws(() => buildRegistry(mutateCanon((j) => { delete j.identities[0].production.id; })), /no production id/);
assert.throws(() => buildRegistry(mutateCanon((j) => { j.identities[0].canonicalStats.attackProfiles = []; })), /no attackProfiles/);
assert.throws(() => buildRegistry(mutateCanon((j) => { j.status = 'AUDIT_EVIDENCE'; })), /not the canonical weapons corpus/);

// 5B introduces no consumer wiring: nothing outside the module imports it
const refs = execFileSync('git', ['ls-files', 'scripts', 'index.js', 'system.json'], { cwd: ROOT }).toString().split('\n').filter((f) => f.endsWith('.js') && !f.startsWith('scripts/items/weapon-runtime/'));
for (const f of refs) assert.ok(!/weapon-runtime\//.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} must not import the weapon runtime yet`);
console.log('weapon-runtime-builder-negative: ok');
