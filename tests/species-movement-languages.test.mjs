import assert from 'node:assert/strict';
import { makeActor, selectSpecies, speciesFootprint } from './helpers/species-actor-sim.mjs';

// Shared movement and language authorities (SPECIES-RD-018 engineering): a species that prints fly/swim/hover and NO land speed
// is neither speed 0 (immobile) nor the generic default of 6; ordinary walking species are unchanged; understood-but-not-spoken
// languages (Celegian Basic, Wookiee Basic, Gamorrean Basic) are first-class data.
const { planSpeciesMovement, describeLandSpeed, formatSpeedLine, primaryMode } = await import('/systems/foundryvtt-swse/scripts/species/species-movement.js');
const { speciesLanguageRestriction, speciesAllowsSpeaking, languageRestrictionsFromAudit } = await import('/systems/foundryvtt-swse/scripts/species/species-languages.js');
const { listMissingSnapshotFields } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };

// ---- Pure movement authority ----
assert.deepEqual(planSpeciesMovement({ walk: 6, swim: 4 }), { landSpeedUnspecified: false, walk: 6, modes: { swim: 4 } });
assert.equal(planSpeciesMovement({ walk: null, fly: 6, swim: 10 }).landSpeedUnspecified, true);
assert.equal(planSpeciesMovement({ walk: 0, fly: 6 }).landSpeedUnspecified, false, 'an explicit 0 is a real speed, not "unspecified"');
assert.equal(planSpeciesMovement({}).landSpeedUnspecified, false, 'nothing printed at all is not a state either');
assert.equal(primaryMode({ swim: 10, fly: 6 }), 'fly');
const unspecified = describeLandSpeed({ speciesLandSpeedUnspecified: true, speciesMovement: { fly: 6, swim: 10, hover: 6 } }, 6);
assert.deepEqual([unspecified.walk, unspecified.total, unspecified.base, unspecified.landSpeedSpecified], [null, null, null, false]);
assert.equal(formatSpeedLine(unspecified), 'Fly 6 sq, Hover 6 sq, Swim 10 sq');
assert.deepEqual(describeLandSpeed({ speed: 6 }, 6), { landSpeedSpecified: true, base: 6, total: 6, walk: 6, modes: {}, mode: 'walk' }, 'ordinary actors are unchanged');
assert.equal(formatSpeedLine({ landSpeedSpecified: true, walk: 8 }), '8 sq');

// ---- Snapshot schema: unspecified is explicit, never an implicit null ----
const base = { id: 'x', sourceProfileId: 'X', size: 'Medium', movement: { swim: 10, fly: 6 }, abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, languages: [], special: [], traits: [], skillBonuses: [], naturalWeapons: [] };
assert.ok(listMissingSnapshotFields({ ...base, speed: null }).includes('speed'), 'null speed without the marker is rejected');
assert.deepEqual(listMissingSnapshotFields({ ...base, speed: null, landSpeedUnspecified: true }), [], 'explicit marker + printed modes is valid');
assert.ok(listMissingSnapshotFields({ ...base, speed: null, landSpeedUnspecified: true, movement: {} }).includes('speed'), 'marker without any printed mode is rejected');
assert.ok(listMissingSnapshotFields({ ...base, speed: 6, landSpeedUnspecified: true }).includes('speed'), 'marker with a speed is contradictory');

// ---- Celegian through the production materializer; replacement; A -> B -> A; idempotence ----
{
  const a = makeActor();
  await quiet(() => selectSpecies(a, 'Celegian', null, { strict: true }));
  assert.equal(a.system.speed, null, 'no land speed recorded (not 0, not 6)');
  assert.equal(a.system.speciesLandSpeedUnspecified, true);
  assert.deepEqual({ ...a.system.speciesMovement, bySize: undefined }, { swim: 10, fly: 6, hover: 6, bySize: undefined });
  assert.equal(a.system.speciesMovement.walk, undefined, 'no walk mode recorded');
  const first = structuredClone(speciesFootprint(a));
  await quiet(() => selectSpecies(a, 'Celegian', null, { strict: true }));
  assert.deepEqual(speciesFootprint(a), first, 'idempotent');
  await quiet(() => selectSpecies(a, 'Human'));
  assert.equal(a.system.speed, 6); assert.equal(a.system.speciesLandSpeedUnspecified, false);
  assert.deepEqual([a.system.speciesMovement.walk, a.system.speciesMovement.fly, a.system.speciesMovement.swim, a.system.speciesMovement.hover], [6, undefined, undefined, undefined], 'printed modes revoked with the species');
  await quiet(() => selectSpecies(a, 'Gungan'));
  assert.equal(a.system.speed, 6); assert.equal(a.system.speciesMovement.swim, 4, 'ordinary walking species with a swim mode: unchanged');
  await quiet(() => selectSpecies(a, 'Celegian', null, { strict: true }));
  assert.deepEqual(speciesFootprint(a), first, 'A -> B -> A restores exactly');
}

// ---- Derived speed + sheet display (the shared code paths) ----
{
  const a = makeActor();
  await quiet(() => selectSpecies(a, 'Celegian', null, { strict: true }));
  const { prepareCharacterDerived } = await import('/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js').catch(() => ({}));
  const derived = describeLandSpeed(a.system, 6);
  assert.deepEqual([derived.walk, derived.mode], [null, 'fly']);
  // The speed-modifier engine must not invent a walk speed from null.
  const { DerivedOverrideEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/passive/derived-override-engine.js');
  const updates = DerivedOverrideEngine.apply(a, [{ target: 'speed.base', operation: 'ADD', value: { type: 'STATIC', amount: 2 }, conditions: [] }], {});
  assert.equal(updates['system.derived.speed.total'], undefined, 'no land speed: a walk-speed modifier has nothing to adjust');
  const walker = makeActor();
  const ok = DerivedOverrideEngine.apply(walker, [{ target: 'speed.base', operation: 'ADD', value: { type: 'STATIC', amount: 2 }, conditions: [] }], {});
  assert.equal(ok['system.derived.speed.total'], 2, 'ordinary actors still receive speed modifiers');
}

// ---- Languages: understand-only ----
assert.deepEqual(languageRestrictionsFromAudit([{ name: 'Basic', spokenRestriction: 'CANNOT_SPEAK' }, { name: 'Wookiee', spokenRestriction: 'NONE_PRINTED' }, { name: 'Ewokese', spokenRestriction: 'SPEAK_ONLY' }]), { Basic: 'understand-only' }, 'only the understand-but-cannot-speak restrictions are modelled');
for (const species of ['Celegian', 'Wookiee', 'Gamorrean']) {
  const a = makeActor();
  await quiet(() => selectSpecies(a, species, null, { strict: true }));
  assert.equal(speciesLanguageRestriction(a, 'Basic'), 'understand-only', `${species}: Basic understood, not spoken`);
  assert.equal(speciesAllowsSpeaking(a, 'Basic'), false);
  assert.equal(speciesAllowsSpeaking(a, 'Huttese'), true, 'other languages are unrestricted');
}
{
  const human = makeActor();
  await quiet(() => selectSpecies(human, 'Human'));
  assert.equal(speciesLanguageRestriction(human, 'Basic'), null);
  const w = makeActor();
  await quiet(() => selectSpecies(w, 'Wookiee', null, { strict: true }));
  await quiet(() => selectSpecies(w, 'Human'));
  assert.deepEqual(w.flags.swse.speciesLanguageRestrictions ?? {}, {}, 'restrictions revoked with the species');
  assert.equal(speciesAllowsSpeaking(w, 'Basic'), true);
}
console.log('PASS: species movement and languages');
