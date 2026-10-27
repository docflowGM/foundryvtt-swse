import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Species overhaul slice 1: a selected published variant is an ATOMIC snapshot.
// Choosing one publication must never inherit traits, natural weapons, languages,
// proficiency rules, or supplementary sidecar traits from the base entry.

registerFoundryPathLoader();
installFoundryShimGlobals();

const {
  applySpeciesVariantProfile, listMissingSnapshotFields, SpeciesVariantSnapshotError,
} = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');

const base = {
  id: 'species-x', uuid: null, name: 'X', type: 'species', category: 'humanoid', tags: ['t'], pack: 'p', canonicalName: 'X',
  source: 'Book A', size: 'Medium', speed: 6, movement: { walk: 6, fly: 8 },
  abilityScores: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: -2 }, abilityChoice: null, rawAbilities: '+2 Str, -2 Cha',
  skillBonuses: ['+2 Stealth'], abilities: ['Darkvision', 'Claws'], canonicalTraits: [{ id: 'darkvision', name: 'Darkvision' }, { id: 'claws', name: 'Claws' }],
  naturalWeapons: [{ name: 'Claws' }], primitive: true, suppressedClassProficiencies: ['pistols'], noConstitution: true, retainsConstitution: false,
  languages: ['Basic', 'Xish'], supplementaryTraits: { sidecar: true }, description: 'base', variants: [],
};
const snapshot = (over = {}) => ({
  id: 'x-b', label: 'Book B', source: 'Book B', completeSnapshot: true, sourceProfileId: 'B-1',
  size: 'Medium', speed: 6, movement: { walk: 6 }, abilities: '+2 Dex', abilityMods: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 }, abilityChoice: null,
  skillBonuses: [], special: [], languages: ['Basic'], naturalWeapons: [], traits: [], description: 'b', ...over,
});

// Complete snapshot inherits nothing rules-bearing.
{
  const e = applySpeciesVariantProfile(base, snapshot());
  assert.deepEqual(e.canonicalTraits, []);
  assert.deepEqual(e.abilities, []);
  assert.deepEqual(e.naturalWeapons, []);
  assert.deepEqual(e.skillBonuses, []);
  assert.deepEqual(e.languages, ['Basic']);
  assert.deepEqual(e.movement, { walk: 6 });
  assert.equal(e.primitive, false);
  assert.equal(e.noConstitution, false);
  assert.deepEqual(e.suppressedClassProficiencies, []);
  assert.equal(e.supplementaryTraits, null);
  assert.deepEqual(e.abilityScores, { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 });
  assert.equal(e.id, 'species-x');
  assert.equal(e.selectedVariant.sourceProfileId, 'B-1');
  assert.equal(e.selectedVariantId, 'x-b');
  assert.equal(base.canonicalTraits.length, 2, 'base entry not mutated');
}

// Snapshot-declared rules do apply.
{
  const e = applySpeciesVariantProfile(base, snapshot({ primitive: true, special: ['Rage'], traits: [{ id: 'rage', name: 'Rage' }], naturalWeapons: [{ name: 'Bite' }] }));
  assert.equal(e.primitive, true);
  assert.deepEqual(e.naturalWeapons, [{ name: 'Bite' }]);
  assert.deepEqual(e.canonicalTraits.map(t => t.id), ['rage']);
}

// Malformed snapshot fails closed (no silent fallback to base).
for (const field of ['size', 'movement', 'abilityMods', 'languages', 'traits', 'special', 'naturalWeapons', 'skillBonuses', 'sourceProfileId']) {
  const v = snapshot(); delete v[field];
  assert.ok(listMissingSnapshotFields(v).includes(field), field);
  assert.throws(() => applySpeciesVariantProfile(base, v), e => e instanceof SpeciesVariantSnapshotError && e.code === 'INCOMPLETE_SNAPSHOT_VARIANT');
}

// Unprinted/invalid values are rejected, never defaulted to zero.
const full = { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 };
for (const bad of [{ dex: 2 }, { ...full, cha: null }, { ...full, wis: NaN }, { ...full, int: '2' }, null]) {
  assert.ok(listMissingSnapshotFields(snapshot({ abilityMods: bad })).includes('abilityMods'), JSON.stringify(bad));
  assert.throws(() => applySpeciesVariantProfile(base, snapshot({ abilityMods: bad })), SpeciesVariantSnapshotError);
}
for (const badSpeed of [null, undefined, '', NaN, '6']) {
  assert.ok(listMissingSnapshotFields(snapshot({ speed: badSpeed })).includes('speed'), String(badSpeed));
}
assert.deepEqual(listMissingSnapshotFields(snapshot({ abilityMods: full, speed: 0 })), [], 'explicit 0 is valid');

// Legacy overlay keeps historical fallback but reports it.
{
  const e = applySpeciesVariantProfile(base, { id: 'legacy', label: 'L', abilityMods: { dex: 2 }, special: [], traits: [], languages: [] });
  assert.deepEqual(e.canonicalTraits, base.canonicalTraits);
  assert.deepEqual(e.languages, base.languages);
  assert.ok(e.variantFallbackFields.includes('traits') && e.variantFallbackFields.includes('languages'));
}

// Registry normalizer must carry the snapshot fields through.
{
  const [v] = SpeciesRegistry._normalizeVariants([snapshot({ naturalWeapons: [{ name: 'Bite' }], primitive: true })]);
  assert.equal(v.completeSnapshot, true);
  assert.equal(v.sourceProfileId, 'B-1');
  assert.deepEqual(v.naturalWeapons, [{ name: 'Bite' }]);
  assert.equal(v.primitive, true);
  assert.equal(SpeciesRegistry._normalizeVariants([{ id: 'l', label: 'L' }])[0].completeSnapshot, undefined);
}

// Shipped pack: every complete snapshot is well-formed and is not a clone of the base.
const recs = readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
let snapshots = 0;
for (const r of recs) for (const v of r.system.variants ?? []) {
  if (v.completeSnapshot !== true) continue;
  snapshots++;
  assert.deepEqual(listMissingSnapshotFields(v), [], `${r._id}:${v.id}`);
}
assert.ok(snapshots >= 1);

// Neimoidian: Core p.285 and Galaxy of Intrigue are different publications.
{
  const rec = recs.find(r => r._id === 'species-neimoidian').system;
  const core = rec.variants.find(v => v.sourceProfileId === 'CORE-2A-20');
  const e = applySpeciesVariantProfile({ ...base, name: 'Neimoidian', canonicalTraits: rec.canonicalTraits, languages: rec.languages }, core);
  assert.deepEqual(e.abilityScores, { str: -2, dex: 0, con: 0, int: 2, wis: 2, cha: 0 });
  assert.deepEqual(e.languages, ['Basic', 'Neimoidian', 'Pak Pak']);
  assert.deepEqual(e.canonicalTraits.map(t => t.name), ['Conditional Bonus Feat', 'Skills']);
  assert.ok(rec.variants.some(v => v.id === 'neimoidian-alternate'), 'existing variant id preserved for actor compatibility');
}

// E2B-I1: optional canonical anatomy follows the same atomic-snapshot rule (schema validation is covered in species-anatomy-schema-v1.test.mjs).
{
  const decl = { schemaVersion: 1, topologyStatus: 'complete', appendages: [{ id: 'arm-1', kind: 'arm', capabilities: { canHold: true, canWield: true, canManipulate: true } }] };
  const baseWithAnatomy = { ...base, anatomy: { schemaVersion: 1, topologyStatus: 'complete', appendages: [] } };
  // a complete snapshot never inherits base anatomy, and a snapshot's own anatomy is carried
  assert.equal('anatomy' in applySpeciesVariantProfile(baseWithAnatomy, snapshot()), false);
  assert.deepEqual(applySpeciesVariantProfile(baseWithAnatomy, snapshot({ anatomy: decl })).anatomy, decl);
  // a legacy overlay no longer carries base anatomy through the ...base spread (all other fallback behaviour is unchanged)
  const overlay = applySpeciesVariantProfile(baseWithAnatomy, { id: 'legacy', label: 'L', abilityMods: { dex: 2 }, special: [], traits: [], languages: [] });
  assert.equal('anatomy' in overlay, false);
  assert.deepEqual(overlay.canonicalTraits, base.canonicalTraits);
  // anatomy is globally optional for snapshots and survives the registry normalizer
  assert.deepEqual(listMissingSnapshotFields(snapshot()), []);
  assert.deepEqual(SpeciesRegistry._normalizeVariants([snapshot({ anatomy: decl })])[0].anatomy, decl);
  assert.equal('anatomy' in SpeciesRegistry._normalizeVariants([snapshot()])[0], false);
}

console.log('PASS: species atomic variant profile');
