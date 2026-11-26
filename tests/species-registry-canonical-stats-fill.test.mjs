import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// F-PAT-001 (3N): SpeciesRegistry._normalizeEntry was wrapped at runtime by follower-species-materialization-hotfix to fill gaps from
// system.canonicalStats. It is now the registry's own behavior.
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
const { SpeciesRegistry } = await import('../scripts/engine/registries/species-registry.js');
const doc = (system) => ({ id: 'sp1', _id: 'sp1', name: 'Test Species', type: 'species', uuid: 'Compendium.foundryvtt-swse.species.sp1', pack: 'foundryvtt-swse.species', system });

test('canonicalStats fills ability mods, size, languages and movement gaps', () => {
  const e = SpeciesRegistry._normalizeEntry(doc({ canonicalStats: { abilityMods: { str: 2, dex: -2 }, size: 'Small', languages: ['Basic'], movement: { walk: 4 } } }));
  assert.equal(e.abilityMods.str, 2); assert.equal(e.abilityMods.dex, -2); assert.equal(e.size, 'Small');
  assert.deepEqual(e.languages, ['Basic']);
});
test('without canonicalStats the base normalization is returned unchanged', () => {
  const e = SpeciesRegistry._normalizeEntry(doc({}));
  const base = SpeciesRegistry._normalizeEntryBase(doc({}));
  assert.deepEqual(e, base);
});
test('the registry runtime patch is gone', () => {
  assert.ok(!/SpeciesRegistry\._normalizeEntry\s*=/.test(fs.readFileSync('scripts/patches/follower-species-materialization-hotfix.js', 'utf8')));
});
