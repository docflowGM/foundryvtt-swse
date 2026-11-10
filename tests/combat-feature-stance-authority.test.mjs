import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Fight Defensively / Total Defense have ONE mechanical authority: the combat-action ActiveEffect (SWSEActiveEffectsManager), which the attack
// composition (getFightingDefensivelyAttackPenalty), the defense math and the roll dialog read. The Combat Features panel's "Activate" used to write
// only a display flag, so a player could see "Fight Defensively active" with no penalty/bonus anywhere. It now routes through the same authority.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
const notes = [];
globalThis.ui = { notifications: { warn: (m) => notes.push(m), info: (m) => notes.push(m), error: (m) => notes.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
globalThis.CONFIG ??= { SWSE: {}, Actor: {}, Item: {}, statusEffects: [] };
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };

const svc = await import('/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-active-state-service.js');
const { SWSEActiveEffectsManager } = await import('/systems/foundryvtt-swse/scripts/combat/active-effects-manager.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');

const effect = (key) => ({ id: `e-${key}`, name: key, flags: { swse: { combatAction: key } } });
const actorOf = (effects = []) => ({ id: 'a1', isOwner: true, flags: {}, effects: Object.assign([...effects], { get: (id) => effects.find((e) => e.id === id) }), system: {} });

test('activating Fight Defensively / Total Defense from the Combat Features service applies the combat-action effect (the authority the attack and defenses read)', async () => {
  const calls = [];
  const real = SWSEActiveEffectsManager.applyCombatActionEffect;
  const writes = []; const realUpdate = ActorEngine.updateActor;
  SWSEActiveEffectsManager.applyCombatActionEffect = async (actor, key) => { calls.push(key); return {}; };
  ActorEngine.updateActor = async (actor, data) => { writes.push(data); return actor; };
  try {
    const a = actorOf();
    assert.equal((await svc.activateCombatFeatureState(a, 'fight-defensively')).success, true);
    assert.equal((await svc.activateCombatFeatureState(a, 'total-defense')).success, true);
    assert.deepEqual(calls, ['fighting-defensively', 'total-defense']);
    assert.equal(writes.length, 0, 'no second display-only record is written for an effect-backed stance');
  } finally { SWSEActiveEffectsManager.applyCombatActionEffect = real; ActorEngine.updateActor = realUpdate; }
});

test('the stance is "active" exactly when the effect exists, and clearing removes the effect', async () => {
  const removed = []; const real = SWSEActiveEffectsManager.removeCombatActionEffects;
  SWSEActiveEffectsManager.removeCombatActionEffects = async (actor, keys) => { removed.push(keys); };
  try {
    assert.equal(svc.getActiveCombatFeatureState(actorOf(), 'fight-defensively'), null);
    assert.ok(svc.getActiveCombatFeatureState(actorOf([effect('fighting-defensively')]), 'fight-defensively'));
    assert.equal(svc.getActiveCombatFeatureState(actorOf([effect('total-defense')]), 'fight-defensively'), null, 'a different stance does not count');
    // a stale display flag alone no longer reads as active
    const stale = actorOf(); stale.flags['foundryvtt-swse'] = { combatFeatures: { activeStates: { 'fight-defensively': { active: true } } } };
    assert.equal(svc.getActiveCombatFeatureState(stale, 'fight-defensively'), null);
    const a = actorOf([effect('total-defense')]);
    assert.equal((await svc.clearCombatFeatureState(a, 'total-defense')).success, true);
    assert.deepEqual(removed, [['total-defense']]);
  } finally { SWSEActiveEffectsManager.removeCombatActionEffects = real; }
});

test('non-stance tracked states (Rage, Braced, ...) keep their display-flag behavior', async () => {
  const writes = []; const real = ActorEngine.updateActor;
  ActorEngine.updateActor = async (actor, data) => { writes.push(data); return actor; };
  try {
    const r = await svc.activateCombatFeatureState(actorOf(), 'rage');
    assert.equal(r.success, true); assert.equal(writes.length, 1);
    assert.ok(Object.keys(writes[0])[0].includes('combatFeatures.activeStates.rage'));
  } finally { ActorEngine.updateActor = real; }
});
