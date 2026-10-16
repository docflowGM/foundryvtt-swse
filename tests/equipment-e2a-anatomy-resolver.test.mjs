import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E2A -- read-only anatomy resolution. Exercises the REAL public exports of scripts/engine/equipment/anatomy-resolver.js
// (and the real species-variant-profile for snapshot isolation); nothing here substitutes a fake resolver.
registerFoundryPathLoader();
installFoundryShimGlobals();

const { resolveEffectiveAnatomy, AnatomyInputError, ANATOMY_STATUS, ANATOMY_SOURCE, TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS } =
  await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const codes = (r) => r.issues.map((i) => i.code);
const caps = (a) => a.capabilities;

// 1. normal biological actor -> the universal two-arm default, recorded as a default
{
  const r = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { name: 'Human' } });
  assert.equal(r.status, ANATOMY_STATUS.RESOLVED);
  assert.equal(r.source, ANATOMY_SOURCE.DEFAULT);
  assert.equal(r.defaultApplied, true);
  assert.equal(r.anatomyKind, 'biological');
  assert.deepEqual(r.appendages.map((a) => a.id), ['natural-arm-1', 'natural-arm-2']);
  for (const a of r.appendages) {
    assert.deepEqual(caps(a), { canHold: true, canWield: true, canManipulate: true });
    assert.equal(a.functionalState, 'functional');
    assert.equal(a.source, 'default');
  }
  assert.deepEqual(r.issues, []);
  ok('ordinary biological actor: two default arms (natural-arm-1/2), default recorded, resolved');
}

// 2. a different ordinary species with no exception -> identical default; no per-species arm count is stored
{
  const human = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { name: 'Human', canonicalTraits: [{ id: 'bonus-feat' }] } });
  const other = resolveEffectiveAnatomy({ actorType: 'npc', speciesProfile: { name: 'Zabrak', size: 'Medium', canonicalTraits: [{ id: 'heightened-awareness', description: 'has four arms of experience' }] } });
  assert.deepEqual(other.appendages, human.appendages);
  assert.equal(other.defaultApplied, true);
  ok('a different species without an exception receives the same default (trait prose is never parsed)');
}

// 2b. no species profile at all -> default with an informational note (not silently complete knowledge of exceptions)
{
  const r = resolveEffectiveAnatomy({ actorType: 'character' });
  assert.equal(r.status, ANATOMY_STATUS.PARTIAL, 'whether a species exception exists cannot be established');
  assert.equal(r.defaultApplied, true);
  assert.deepEqual(r.appendages.map((a) => a.id), ['natural-arm-1', 'natural-arm-2'], 'the provisional default is still supplied');
  assert.deepEqual(codes(r), ['species-profile-not-provided']);
  assert.equal(r.issues[0].severity, 'warning');
  const withProfile = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: {} });
  assert.equal(withProfile.status, ANATOMY_STATUS.RESOLVED, 'a known profile without an exception is still resolved');
  ok('missing species profile: provisional two-arm default but status partial with a warning; a present profile stays resolved');
}

// 3. explicit synthetic four-arm anatomy -> four individually identified manipulators, no default
{
  const mk = (id) => ({ id, kind: 'arm', capabilities: { canHold: true, canWield: true, canManipulate: true } });
  const profile = { name: 'SyntheticQuad', anatomy: { appendages: ['upper-left', 'upper-right', 'lower-left', 'lower-right'].map(mk) } };
  const r = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: profile });
  assert.equal(r.status, ANATOMY_STATUS.RESOLVED);
  assert.equal(r.source, ANATOMY_SOURCE.SPECIES_ANATOMY);
  assert.equal(r.defaultApplied, false);
  assert.deepEqual(r.appendages.map((a) => a.id), ['upper-left', 'upper-right', 'lower-left', 'lower-right']);
  assert.equal(new Set(r.appendages.map((a) => a.id)).size, 4);
  assert.ok(!('attacks' in r) && !r.appendages.some((a) => 'attackCount' in a), 'anatomy never produces attack data');
  ok('synthetic four-arm anatomy: four independently identified manipulators, no extra-attack data');
}

// 4. restricted appendage: holds but cannot wield (declared); unknown capability stays unknown and makes the anatomy partial
{
  const profile = { anatomy: { appendages: [
    { id: 'arm-a', kind: 'arm', capabilities: { canHold: true, canWield: true, canManipulate: true } },
    { id: 'tail', kind: 'tail', capabilities: { canHold: true, canWield: false, canManipulate: true }, restrictions: ['declared-by-fixture'] },
  ] } };
  const r = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: profile });
  const tail = r.appendages.find((a) => a.id === 'tail');
  assert.deepEqual(caps(tail), { canHold: true, canWield: false, canManipulate: true });
  assert.deepEqual(tail.restrictions, ['declared-by-fixture']);
  assert.equal(r.status, ANATOMY_STATUS.RESOLVED);

  const partial = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { anatomy: { appendages: [{ id: 'x', kind: 'arm', capabilities: { canHold: true } }] } } });
  assert.deepEqual(caps(partial.appendages[0]), { canHold: true, canWield: null, canManipulate: null });
  assert.equal(partial.status, ANATOMY_STATUS.PARTIAL);
  assert.ok(codes(partial).includes('capability-unknown'));
  ok('restricted appendage keeps hold-but-not-wield; undeclared capabilities remain null (unknown) and yield partial');
}

// 5. publication snapshot isolation: a COMPLETE snapshot without anatomy does not inherit base anatomy
const variantBase = {
  id: 'v-quad', sourceProfileId: 'p-1', label: 'Snapshot', source: 'Test', completeSnapshot: true, size: 'Medium', speed: 6, movement: {},
  abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, languages: [], special: [], traits: [], skillBonuses: [], naturalWeapons: [],
};
const baseEntry = (extra = {}) => ({ id: 'base', name: 'Base', type: 'species', category: 'species', tags: [], pack: 'x', canonicalName: 'Base', variants: [], speed: 6, size: 'Medium',
  abilityScores: {}, skillBonuses: [], abilities: [], canonicalTraits: [], languages: [], naturalWeapons: [],
  anatomy: { appendages: ['b1', 'b2', 'b3', 'b4'].map((id) => ({ id, kind: 'arm', capabilities: { canHold: true, canWield: true, canManipulate: true } })) }, ...extra });
{
  const base = baseEntry();
  const snapshot = applySpeciesVariantProfile(base, variantBase);
  assert.equal(snapshot.anatomy, undefined, 'the snapshot projection drops unlisted base fields');
  const r = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: snapshot });
  assert.equal(r.defaultApplied, true);
  assert.deepEqual(r.appendages.map((a) => a.id), ['natural-arm-1', 'natural-arm-2']);
  ok('complete snapshot without anatomy: base anatomy is NOT inherited (real applySpeciesVariantProfile)');

  // documented observation (not changed in E2A): a LEGACY overlay variant spreads the base entry, so base anatomy would flow through
  const legacy = applySpeciesVariantProfile(base, { id: 'legacy', label: 'Legacy', abilityMods: {} });
  const r2 = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: legacy });
  assert.equal(r2.source, ANATOMY_SOURCE.SPECIES_ANATOMY);
  ok('observation recorded for E2B: legacy overlay variants inherit base fields wholesale, including a future base anatomy');
}

// 6/7. known unresolved exception guards -- REAL pack data through the REAL snapshot projection
function packVariantProfile(speciesName, variantId) {
  const line = fs.readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((d) => d.name === speciesName);
  assert.ok(line, `${speciesName} exists in packs/species.db`);
  const s = line.system;
  const base = { id: line._id, name: line.name, type: 'species', category: 'species', tags: s.tags, pack: 'species', canonicalName: s.canonicalName, variants: s.variants, speed: s.speed, size: s.size, abilityScores: {}, skillBonuses: [], abilities: [], canonicalTraits: s.canonicalTraits, languages: [], naturalWeapons: [] };
  const variant = s.variants.find((v) => v.id === variantId);
  assert.ok(variant?.completeSnapshot === true, `${variantId} is a complete snapshot`);
  return applySpeciesVariantProfile(base, variant);
}
{
  const codru = packVariantProfile('Codru-Ji', 'codru-ji-leg-2c-03');
  assert.ok(codru.canonicalTraits.some((t) => t.id === 'extra-arms'), 'the guard identity exists in the real snapshot');
  const r = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: codru });
  assert.equal(r.status, ANATOMY_STATUS.UNRESOLVED);
  assert.equal(r.defaultApplied, false);
  assert.deepEqual(r.appendages, [], 'no fabricated arm count (neither two nor four)');
  const iss = r.issues.find((i) => i.code === 'anatomy-exception-unresolved');
  assert.equal(iss.details.traitId, 'extra-arms');
  assert.equal(iss.details.temporary, true);
  ok('real Codru-Ji snapshot (extra-arms): incomplete anatomy reported, no count fabricated, no default applied');

  const ryn = packVariantProfile('Ryn', 'ryn-sv-2f-06');
  assert.ok(ryn.canonicalTraits.some((t) => t.id === 'prehensile-tail'));
  const r2 = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: ryn });
  assert.equal(r2.status, ANATOMY_STATUS.UNRESOLVED);
  assert.ok(!r2.appendages.some((a) => /tail/.test(a.kind) || /tail/.test(a.id)), 'no tail hand is invented');
  assert.equal(r2.issues.find((i) => i.code === 'anatomy-exception-unresolved').details.traitId, 'prehensile-tail');
  ok('real Ryn snapshot (prehensile-tail): no tail-hand capability invented, anatomy unresolved');
}

// 6b. guards: exact trait id only, dormant once structured anatomy exists, constant documented
{
  assert.deepEqual([...TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS], ['extra-arms', 'prehensile-tail']);
  const lookalike = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { canonicalTraits: [{ id: 'extra-arms-lookalike', description: 'four arms' }, { id: 'tail-whip', description: 'prehensile tail' }] } });
  assert.equal(lookalike.defaultApplied, true, 'no prose or partial-id matching');
  const withData = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { canonicalTraits: [{ id: 'extra-arms' }], anatomy: { appendages: [{ id: 'a', kind: 'arm', capabilities: { canHold: true, canWield: true, canManipulate: true } }] } } });
  assert.equal(withData.status, ANATOMY_STATUS.RESOLVED);
  assert.equal(withData.source, ANATOMY_SOURCE.SPECIES_ANATOMY);
  ok('temporary guards match exact trait ids only and stand down when structured anatomy is supplied');
}

// 8. explicit functional overrides (OA-4)
{
  const r = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: {}, functionalOverrides: { 'natural-arm-2': 'disabled' } });
  const [a1, a2] = r.appendages;
  assert.equal(a1.functionalState, 'functional');
  assert.equal(a2.functionalState, 'disabled');
  assert.equal(a2.functionalStateSource, 'override');
  assert.equal(a2.id, 'natural-arm-2', 'identity unchanged');
  assert.equal(r.status, ANATOMY_STATUS.RESOLVED, 'a known disabled state is established knowledge, not uncertainty');

  const missing = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: {}, functionalOverrides: { 'natural-arm-1': { state: 'missing' }, nope: 'disabled' } });
  assert.equal(missing.appendages[0].functionalState, 'missing');
  assert.ok(codes(missing).includes('override-unknown-appendage'));

  const unresolved = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: {}, functionalOverrides: { 'natural-arm-1': 'unresolved' } });
  assert.equal(unresolved.status, ANATOMY_STATUS.PARTIAL);
  assert.ok(codes(unresolved).includes('functional-state-unresolved'));

  const species = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { anatomy: { appendages: [{ id: 'q', kind: 'arm', functionalState: 'disabled', capabilities: { canHold: true, canWield: true, canManipulate: true } }] } }, functionalOverrides: { q: 'functional' } });
  assert.equal(species.appendages[0].functionalState, 'disabled', 'an override cannot loosen recorded evidence');
  assert.ok(codes(species).includes('override-less-restrictive-than-evidence'));
  ok('functional overrides restrict identified appendages (disabled/missing/unresolved); unknown ids and loosening are reported, not applied');
}

// 9. actor classes outside the biological/droid cases
{
  const noType = resolveEffectiveAnatomy({ speciesProfile: {} });
  assert.equal(noType.status, ANATOMY_STATUS.UNRESOLVED);
  assert.deepEqual(codes(noType), ['actor-type-unknown']);
  const vehicle = resolveEffectiveAnatomy({ actorType: 'vehicle' });
  assert.equal(vehicle.status, ANATOMY_STATUS.UNRESOLVED);
  assert.deepEqual(codes(vehicle), ['actor-type-unsupported']);
  const droidNoComponents = resolveEffectiveAnatomy({ actorType: 'droid', speciesProfile: { anatomy: { appendages: [{ id: 'bio', kind: 'arm' }] } } });
  assert.equal(droidNoComponents.status, ANATOMY_STATUS.UNRESOLVED);
  assert.deepEqual(droidNoComponents.appendages, [], 'a droid never receives biological or species arms');
  assert.deepEqual(codes(droidNoComponents), ['installed-components-not-provided']);
  const actsAsDroid = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { speciesActsAsDroid: true }, installedComponents: { components: [] } });
  assert.equal(actsAsDroid.anatomyKind, 'installed-component');
  assert.deepEqual(actsAsDroid.appendages, []);
  assert.ok(codes(actsAsDroid).includes('no-appendage-evidence'));
  ok('unknown/unsupported actor classes and droids without evidence resolve to unresolved with structured issues; no fabricated arms');
}

// 10. determinism and non-mutation
{
  const input = deepFreeze({
    actorType: 'character',
    speciesProfile: { name: 'Frozen', canonicalTraits: [{ id: 'x' }], anatomy: { appendages: [{ id: 'a', kind: 'arm', capabilities: { canHold: true, canWield: null, canManipulate: true }, restrictions: ['r'] }] } },
    functionalOverrides: { a: 'disabled' },
  });
  const snapshotJson = JSON.stringify(input);
  const r1 = resolveEffectiveAnatomy(input);
  const r2 = resolveEffectiveAnatomy(input);
  assert.deepEqual(r1, r2);
  assert.equal(JSON.stringify(r1), JSON.stringify(r2));
  assert.equal(JSON.stringify(input), snapshotJson, 'inputs unchanged');
  assert.ok(Object.isFrozen(r1) && Object.isFrozen(r1.appendages) && Object.isFrozen(r1.appendages[0].capabilities), 'outputs are frozen');
  assert.notEqual(r1.appendages[0].restrictions, input.speciesProfile.anatomy.appendages[0].restrictions, 'restrictions are copied, not aliased');
  const d1 = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: {} });
  const d2 = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: {} });
  assert.deepEqual(d1, d2);
  ok('repeated calls are deterministic; frozen inputs are accepted and untouched; outputs are frozen copies');
}

// 11. malformed input -> documented AnatomyInputError codes
{
  const bad = (input, code) => assert.throws(() => resolveEffectiveAnatomy(input), (e) => e instanceof AnatomyInputError && e.code === code, `${code}`);
  bad(undefined, 'INVALID_INPUT');
  bad([], 'INVALID_INPUT');
  bad({ actorType: 7 }, 'INVALID_ACTOR_TYPE');
  bad({ actorType: 'character', speciesProfile: 'Human' }, 'INVALID_SPECIES_PROFILE');
  bad({ actorType: 'droid', installedComponents: { components: 'no' } }, 'INVALID_INSTALLED_COMPONENTS');
  bad({ actorType: 'character', functionalOverrides: [] }, 'INVALID_FUNCTIONAL_OVERRIDES');
  bad({ actorType: 'character', functionalOverrides: { a: 'broken' } }, 'INVALID_FUNCTIONAL_OVERRIDES');
  bad({ actorType: 'character', speciesProfile: { anatomy: [] } }, 'INVALID_ANATOMY');
  bad({ actorType: 'character', speciesProfile: { anatomy: { appendages: [{ id: '', kind: 'arm' }] } } }, 'INVALID_ANATOMY');
  bad({ actorType: 'character', speciesProfile: { anatomy: { appendages: [{ id: 'a', kind: 'arm' }, { id: 'a', kind: 'arm' }] } } }, 'INVALID_ANATOMY');
  bad({ actorType: 'character', speciesProfile: { anatomy: { appendages: [{ id: 'a', kind: 'arm', functionalState: 'severed' }] } } }, 'INVALID_ANATOMY');
  bad({ actorType: 'character', speciesProfile: { anatomy: { appendages: [{ id: 'a', kind: 'arm', capabilities: { canWield: 'yes' } }] } } }, 'INVALID_CAPABILITY');
  ok('malformed API input raises AnatomyInputError with a documented code; ordinary missing evidence never throws');
}

// 12. no persistence / no document API reachable from the module (static guard on the module source)
{
  const src = fs.readFileSync(new URL('../scripts/engine/equipment/anatomy-resolver.js', import.meta.url), 'utf8')
    + fs.readFileSync(new URL('../scripts/engine/equipment/droid-appendage-projection.js', import.meta.url), 'utf8');
  for (const forbidden of [/ActorEngine/, /\.update\(/, /\.setFlag\(/, /\.unsetFlag\(/, /updateOwnedItems/, /ActionEconomyConsumption/, /InventoryEngine/, /FireStateStore/, /Hooks\./, /\bui\./, /game\./]) {
    assert.ok(!forbidden.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), `forbidden dependency ${forbidden}`);
  }
  ok('static guard: the resolver modules reference no mutation, action-economy, inventory, fire-state or UI API');
}

console.log(`equipment-e2a-anatomy-resolver: ${n} checks passed`);
