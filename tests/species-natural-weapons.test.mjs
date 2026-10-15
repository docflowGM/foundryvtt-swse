import assert from 'node:assert/strict';
import { makeActor, selectSpecies } from './helpers/species-actor-sim.mjs';

// Natural attacks are granted through the existing species natural-weapon item contract only, per publication.
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };
const pick = (name, variantId) => quiet(() => selectSpecies(actorRef, name, variantId, { strict: true }));
const naturals = a => a.items.filter(i => i.type === 'weapon' && i.flags?.swse?.isNaturalWeapon).map(i => `${i.name}:${i.system.damage.formula}:${i.system.damage.type}`).sort();
let actorRef;

const SV = ['Claws:1d6:slashing', 'Tail:1d6:bludgeoning', 'Teeth:1d6:piercing'];
const GAW = ['Bite:1d6:piercing', 'Claws:1d6:slashing', 'Tail:1d6:bludgeoning'];

actorRef = makeActor();
await pick('Barabel', 'barabel-sv-2f-10');
assert.deepEqual(naturals(actorRef), SV, 'Scum and Villainy attacks');
const item = actorRef.items.find(i => i.name === 'Claws');
assert.equal(item.system.source, 'species-natural-weapon');
assert.equal(item.flags.swse.alwaysArmed, true);
assert.equal(item.system.attackAbility, 'str');
assert.equal(item.system.category, 'melee');

// An independently owned weapon with the same name (no species stamp) is never touched.
actorRef.items.push({ id: 'own1', type: 'weapon', name: 'Claws', system: { damage: { formula: '1d3', type: 'slashing' } }, flags: { swse: {} } });

// Idempotent reapply: no duplicates.
await pick('Barabel', 'barabel-sv-2f-10');
assert.deepEqual(naturals(actorRef), SV);
assert.equal(actorRef.items.filter(i => i.name === 'Claws').length, 2, 'granted Claws + the independently owned Claws');

// Publication switch: SV-only Teeth is revoked, GAW Bite granted, shared names are not duplicated.
await pick('Barabel', 'barabel-gaw-2i-01');
assert.deepEqual(naturals(actorRef), GAW, 'Galaxy at War attacks replace the Scum and Villainy set');
assert.ok(actorRef.items.some(i => i.id === 'own1'), 'independent weapon survives');

// A -> B -> A.
await pick('Barabel', 'barabel-sv-2f-10');
assert.deepEqual(naturals(actorRef), SV);

// Revocation on replacement by a species without natural attacks, then by one with a different attack.
await quiet(() => selectSpecies(actorRef, 'Human'));
assert.deepEqual(naturals(actorRef), [], 'Human has no natural attacks');
assert.ok(actorRef.items.some(i => i.id === 'own1'));
await pick('Yuzzem');
assert.deepEqual(naturals(actorRef), ['Bite:1d8:piercing', 'Claws:1d8:slashing'], 'Yuzzem 1d8 attacks (Galaxy at War)');
await pick('Cathar');
assert.deepEqual(naturals(actorRef), ['Cathar Claws:1d6:slashing'], 'Cathar: Galaxy at War Yuzzem attacks revoked; printed 1d6 (not the legacy 1d4)');
await pick('Cathar');
assert.deepEqual(naturals(actorRef), ['Cathar Claws:1d6:slashing'], 'idempotent');
console.log('PASS: species natural weapons');
