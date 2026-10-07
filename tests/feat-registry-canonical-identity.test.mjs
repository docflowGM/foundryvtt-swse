// Phase 5C identity closeout: FeatRegistry is canonical-id authoritative; names are a secondary multimap that fails closed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} } };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll() {}, on() {} };

const { FeatRegistry, AmbiguousCanonicalFeatNameError } = await import('/systems/foundryvtt-swse/scripts/registries/feat-registry.js');
const docs = readFileSync(new URL('../packs/feats.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
FeatRegistry._resetIndexes();
FeatRegistry._indexDocuments(docs);

const GAW = '192923f60db38831', SV = 'c9c4130a55761330';
assert.equal(FeatRegistry.getById(GAW).system.source, 'Galaxy at War');
assert.equal(FeatRegistry.getById(GAW).system.page, 26);
assert.equal(FeatRegistry.getById(SV).system.source, 'Scum and Villainy');
assert.equal(FeatRegistry.getById(SV).system.page, 24);
assert.deepEqual(FeatRegistry.findByName('Staggering Attack').map((e) => e.id).sort(), [GAW, SV].sort());
assert.deepEqual(FeatRegistry.findByName('staggering attack').length, 2, 'name index is case-insensitive');
assert.equal(FeatRegistry.hasName('Staggering Attack'), true);
for (const fn of ['getUniqueByName', 'getByName']) {
  assert.throws(() => FeatRegistry[fn]('Staggering Attack'), (e) => e instanceof AmbiguousCanonicalFeatNameError && e.code === 'AMBIGUOUS_CANONICAL_FEAT_NAME' && e.candidates.length === 2, `${fn} must fail closed`);
}
assert.throws(() => FeatRegistry.resolveEntry('Staggering Attack'), (e) => e.code === 'AMBIGUOUS_CANONICAL_FEAT_NAME');
assert.equal(FeatRegistry.resolveEntry(GAW).id, GAW, 'id resolution is unaffected');
assert.equal(FeatRegistry.getBySlug('staggering-attack').id, GAW);
assert.equal(FeatRegistry.getBySlug('staggering-attack-scum-and-villainy').id, SV);
assert.equal(FeatRegistry.getByCanonicalUuid('swse.feat.staggering-attack-scum-and-villainy').id, SV);
assert.equal(FeatRegistry.getAll().length, 353, 'both Staggering Attack identities are live');

// ordinary unique names still resolve normally; every other name is unique
const names = new Map();
for (const e of FeatRegistry.getAll()) names.set(e.name.toLowerCase(), (names.get(e.name.toLowerCase()) ?? 0) + 1);
assert.deepEqual([...names].filter(([, n]) => n > 1).map(([k]) => k), ['staggering attack']);
assert.equal(FeatRegistry.getUniqueByName('Power Attack').name, 'Power Attack');
assert.equal(FeatRegistry.getByName('Recall').id, 'c352f81dde5c9dff');
assert.equal(FeatRegistry.getUniqueByName('No Such Feat'), null);
assert.deepEqual(FeatRegistry.findByName('No Such Feat'), []);

// the production slug set is collision-free
const slugs = docs.map((d) => d.system.slug);
assert.equal(new Set(slugs).size, slugs.length);
console.log('feat-registry-canonical-identity: ok');
