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
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
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

// ---- the stance costs its action, once ---------------------------------------------------------------------------------------------------------------
const withEconomy = async (mode, fn, spendResult = { allowed: true, permitted: true, committed: true, rollback: async () => true }) => {
  const spends = []; const applies = [];
  const realSpend = ActionEconomyConsumption.spend; const realApply = SWSEActiveEffectsManager.applyCombatActionEffect;
  const priorGame = globalThis.game;
  globalThis.game = { ...(priorGame ?? {}), settings: { get: (_s, k) => (k === 'fightDefensivelyActionMode' ? mode : undefined) } };
  ActionEconomyConsumption.spend = async (actor, type, meta) => { spends.push([type, meta.actionId]); return spendResult; };
  SWSEActiveEffectsManager.applyCombatActionEffect = async (actor, key) => { applies.push(key); return {}; };
  try { await fn({ spends, applies }); } finally { ActionEconomyConsumption.spend = realSpend; SWSEActiveEffectsManager.applyCombatActionEffect = realApply; globalThis.game = priorGame; }
};

test('S1 the stance cost is the existing house-rule cost: Fight Defensively standard / swift / none (rai), Total Defense standard', () => {
  assert.equal(svc.stanceActionCost('fight-defensively', 'default'), 'standard');
  assert.equal(svc.stanceActionCost('fight-defensively', 'swift'), 'swift');
  assert.equal(svc.stanceActionCost('fight-defensively', 'rai'), null);
  assert.equal(svc.stanceActionCost('total-defense', 'swift'), 'standard');
  assert.equal(svc.stanceActionCost('rage', 'default'), null);
});

test('S2 activating from the Combat Features panel pays the stance action exactly once, then applies the effect', async () => {
  await withEconomy('default', async ({ spends, applies }) => {
    const a = actorOf();
    assert.equal((await svc.activateCombatFeatureState(a, 'fight-defensively')).success, true);
    assert.deepEqual(spends, [['standard', 'fight-defensively']]);
    assert.deepEqual(applies, ['fighting-defensively']);
  });
  await withEconomy('swift', async ({ spends }) => { await svc.activateCombatFeatureState(actorOf(), 'fight-defensively'); assert.deepEqual(spends, [['swift', 'fight-defensively']]); });
  await withEconomy('rai', async ({ spends, applies }) => { await svc.activateCombatFeatureState(actorOf(), 'fight-defensively'); assert.deepEqual(spends, []); assert.deepEqual(applies, ['fighting-defensively']); });
  await withEconomy('default', async ({ spends }) => { await svc.activateCombatFeatureState(actorOf(), 'total-defense'); assert.deepEqual(spends, [['standard', 'total-defense']]); });
});

test('S3 a refused spend applies nothing; an already-active stance is neither re-applied nor re-charged', async () => {
  await withEconomy('default', async ({ spends, applies }) => {
    const r = await svc.activateCombatFeatureState(actorOf(), 'total-defense');
    assert.equal(r.success, false); assert.equal(r.reason, 'action-unavailable'); assert.deepEqual(applies, []);
  }, { allowed: false, permitted: false, committed: false, rollback: async () => false });
  await withEconomy('default', async ({ spends, applies }) => {
    const r = await svc.activateCombatFeatureState(actorOf([effect('fighting-defensively')]), 'fight-defensively');
    assert.equal(r.reason, 'already-active'); assert.deepEqual(spends, []); assert.deepEqual(applies, []);
  });
});

test('S4 a failed effect application gives the spent action back', async () => {
  let rolledBack = 0;
  await withEconomy('default', async () => {
    SWSEActiveEffectsManager.applyCombatActionEffect = async () => { throw new Error('boom'); };
    await assert.rejects(() => svc.activateCombatFeatureState(actorOf(), 'fight-defensively'), /boom/);
    assert.equal(rolledBack, 1);
  }, { allowed: true, permitted: true, committed: true, rollback: async () => { rolledBack += 1; return true; } });
});

test('S5 the combat action bar uses the same cost rule (no second copy)', async () => {
  const bar = (await import('node:fs')).readFileSync('scripts/components/combat-action-bar.js', 'utf8');
  assert.match(bar, /stanceActionCost\('fight-defensively'/);
});
