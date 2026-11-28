import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-AE.1 baseline/parity: ActorEngine's canonical-shape helpers (characterization of CURRENT behavior, written before the extraction into
// governance/actor-engine/canonical-actor-shapes.js; the ActorEngine methods remain as delegates, so these assertions hold before and after).
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x';
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

test('abilities: a character gets canonical attributes and a compatibility mirror; existing values are not overwritten', () => {
  const actor = { type: 'character', system: { attributes: { str: { base: 14 }, dex: 'bad' }, abilities: { con: { value: 12 } } } };
  ActorEngine._ensureCanonicalAbilityShapes(actor);
  assert.deepEqual(actor.system.attributes.str, { base: 14, racial: 0, enhancement: 0, temp: 0 });
  assert.deepEqual(actor.system.attributes.dex, { base: 10, racial: 0, enhancement: 0, temp: 0 });
  for (const k of KEYS) assert.ok(actor.system.attributes[k]);
  assert.equal(actor.system.abilities.con.base, 12, 'mirror base falls back to legacy value');
  assert.deepEqual(actor.system.abilities.str, { base: 10, racial: 0, temp: 0, total: 10, mod: 0 });
});
test('abilities: a non-character without system.attributes does not gain attributes, only the mirror', () => {
  const actor = { type: 'vehicle', system: {} };
  ActorEngine._ensureCanonicalAbilityShapes(actor);
  assert.equal(actor.system.attributes, undefined);
  assert.equal(Object.keys(actor.system.abilities).length, 6);
});
test('skills: only touched, missing skills are created; existing ones are never backfilled', () => {
  const actor = { system: { skills: { acrobatics: { trained: true } } } };
  ActorEngine._ensureCanonicalSkillShapes(actor, { 'system.skills.acrobatics.miscMod': 2, 'system.skills.stealth.trained': true, 'system.hp.value': 1 });
  assert.deepEqual(actor.system.skills.acrobatics, { trained: true });
  assert.deepEqual(actor.system.skills.stealth, { trained: false, miscMod: 0, focused: false, selectedAbility: '', favorite: false });
  assert.equal(actor.system.skills.survival, undefined);
});
test('defenses: seeds reflex/fortitude/will; droid fortitude uses strength; legacy numeric misc folds into misc.user.extra', () => {
  const droid = { type: 'droid', system: {} };
  ActorEngine._ensureCanonicalDefenseShapes(droid);
  assert.equal(droid.system.defenses.fortitude.ability, 'str');
  assert.equal(droid.system.defenses.reflex.ability, 'dex');
  assert.deepEqual(droid.system.defenses.will.misc, { auto: {}, user: { extra: 0 } });
  const pc = { type: 'character', system: { defenses: { reflex: { class: 3, misc: 2 }, will: { ability: 5, misc: { user: [] } } } } };
  ActorEngine._ensureCanonicalDefenseShapes(pc);
  assert.equal(pc.system.defenses.reflex.classBonus, 3);
  assert.equal(pc.system.defenses.reflex.armor, 0);
  assert.equal(pc.system.defenses.reflex.misc.user.extra, 2);
  assert.equal(pc.system.defenses.will.ability, 'wis');
  assert.equal(pc.system.defenses.fortitude.ability, 'con');
});
test('xp and hp: defaults only where undefined', () => {
  const a = { system: { xp: {}, hp: { value: 0 } } };
  ActorEngine._ensureCanonicalXpShape(a); ActorEngine._ensureCanonicalHpShape(a);
  assert.equal(a.system.xp.total, 0);
  assert.deepEqual(a.system.hp, { value: 0, max: 1 }, 'a zero HP value is preserved; only missing max is defaulted');
  const b = { system: {} };
  ActorEngine._ensureCanonicalXpShape(b); ActorEngine._ensureCanonicalHpShape(b);
  assert.deepEqual(b.system.xp, { total: 0 });
  assert.deepEqual(b.system.hp, { value: 1, max: 1, temp: 0 });
});
test('canonical ability reads: base prefers attributes then abilities; mod prefers derived then computes from parts', () => {
  assert.equal(ActorEngine._getCanonicalAbilityBase({ system: { attributes: { con: { base: 14 } }, abilities: { con: { base: 9 } } } }, 'con'), 14);
  assert.equal(ActorEngine._getCanonicalAbilityBase({ system: { abilities: { con: { base: 9 } } } }, 'con'), 9);
  assert.equal(ActorEngine._getCanonicalAbilityBase({ system: {} }, 'con'), 10);
  assert.equal(ActorEngine._getCanonicalAbilityMod({ system: { derived: { attributes: { con: { mod: 3 } } } } }, 'con'), 3);
  assert.equal(ActorEngine._getCanonicalAbilityMod({ system: { attributes: { con: { base: 14, racial: 2, enhancement: 0, temp: 1 } } } }, 'con'), 3);
  assert.equal(ActorEngine._getCanonicalAbilityMod({ system: {} }, 'con'), 0);
});
