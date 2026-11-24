import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}
};
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ui = { notifications: { info() {}, warn() {}, error() {} } };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
let rid = 0; globalThis.foundry.utils.randomID = () => `id${++rid}`;
globalThis.game.user = { id: 'gm', isGM: true };

const writer = async (actor, update) => { for (const [p, v] of Object.entries(update)) setPath(actor, p, v); return actor; };
const { fake: ActorEngine } = await graftRealForcePointMethods(writer);
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const posted = []; SWSEChat.postHTML = async ({ content }) => { posted.push(content); return {}; };
const { ForcePowerMaintenance, conditionalDefenseBonuses } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-power-maintenance.js');
const { ForceExecutor } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-executor.js');
const realGenerateMessage = ForceExecutor._generateForcePowerRollMessage;
const { SuiteInstanceRecovery, isSpentInstance } = await import('/systems/foundryvtt-swse/scripts/engine/force/suite-instance-recovery.js');
const { RollCore } = await import('/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js');

let seq = 0;
ActorEngine.createActiveEffects = async (actor, data) => data.map(d => { const e = { ...d, id: `e${++seq}`, getFlag(s, k) { return this.flags?.[s]?.[k]; } }; actor.effects.push(e); return e; });
ActorEngine.deleteActiveEffects = async (actor, ids) => { actor.effects = actor.effects.filter(e => !ids.includes(e.id)); };
ActorEngine.updateEmbeddedDocuments = async (actor, t, updates) => { for (const u of updates) { const it = actor.items.find(i => i.id === u._id); for (const [k, v] of Object.entries(u)) if (k.startsWith('system.')) it.system[k.slice(7)] = v; } return updates; };

const mkActor = (id, items = []) => {
  const a = { id, uuid: `Actor.${id}`, name: id, type: 'character', isOwner: true, effects: [], items,
    system: { forcePoints: { value: 3, max: 3 }, darkSideScore: { value: 0 }, level: { heroic: 4 }, conditionTrack: { current: 0 } },
    flags: {}, getFlag(s, k) { return this.flags?.[s]?.[k]; } };
  a.items.get = (i) => a.items.find(x => x.id === i);
  return a;
};
const RESIST = [{ dc: 15, description: 'You gain +1 to one Defense score of your choice against Force Powers.' }, { dc: 20, description: 'You gain +2 to one Defense score of your choice against Force Powers.' }];
let n = 0; const check = (m) => console.log(`PASS ${++n}: ${m}`);

// 1. turn binding: an instance not started or maintained during the caster's round lapses when that turn ends
{
  const a = mkActor('jedi');
  globalThis.game.combat = { started: true, id: 'c1', round: 1, combatants: [] };
  const r = await ForcePowerMaintenance.begin(a, { id: 'p', name: 'Resist Force', system: { dcChart: RESIST, duration: '' } }, 22, { resistForceDefenses: ['will'] });
  assert.deepEqual(await ForcePowerMaintenance.lapseUnmaintained(a, { round: 1 }), [], 'started this round: still running');
  globalThis.game.combat.round = 2;
  assert.equal((await ForcePowerMaintenance.maintain(a, r.id)).maintained, true, 'swift-action maintenance (no combatant turn state in this shim: no-op debit)');
  assert.equal((await ForcePowerMaintenance.maintain(a, r.id)).reason, 'already-current-this-round', 'once per round');
  assert.deepEqual(await ForcePowerMaintenance.lapseUnmaintained(a, { round: 2 }), []);
  globalThis.game.combat.round = 3;
  assert.deepEqual(await ForcePowerMaintenance.lapseUnmaintained(a, { round: 3 }), [r.id], 'not maintained in round 3: lapses');
  assert.equal(a.effects.length, 0);
  check('maintenance is bound to the caster turn: once per round; unmaintained instances lapse at the end of the caster turn');
}
// 2. damage prompt goes only to concentration-bound instances; chat controls drive maintain/end/concentration
{
  const a = mkActor('jedi2');
  globalThis.game.combat = { started: true, id: 'c2', round: 1, combatants: [] };
  const rf = await ForcePowerMaintenance.begin(a, { id: 'p', name: 'Resist Force', system: { dcChart: RESIST } }, 22, { resistForceDefenses: ['will'] });
  const grip = await ForcePowerMaintenance.begin(a, { id: 'g', name: 'Force Grip', system: {} }, 22, {});
  assert.ok(posted.some(p => p.includes('data-swse-maintained-action="maintain"') && p.includes(rf.id)), 'maintain control posted');
  posted.length = 0;
  assert.deepEqual(await ForcePowerMaintenance.onDamageTaken(a, 0), []);
  assert.deepEqual(await ForcePowerMaintenance.onDamageTaken(a, 7), [rf.id], 'Grip has no printed damage concentration');
  assert.ok(posted[0].includes('DC 22'));
  const savedExec = RollCore.execute;
  RollCore.execute = async ({ domain }) => { assert.notEqual(domain, 'force-power.activation', 'maintenance is not an activation check'); return { success: true, finalTotal: 25 }; };
  ForceExecutor._getUseTheForceTotal = () => 10;
  assert.equal((await ForcePowerMaintenance.handleControl(a, rf.id, 'concentration', { damage: 7 })).held, true);
  globalThis.game.combat.round = 2;
  assert.equal((await ForcePowerMaintenance.handleControl(a, grip.id, 'maintain')).maintained, true, 'Grip: fresh check rolled automatically');
  assert.equal(ForcePowerMaintenance.get(a, grip.id).lastMaintainTotal, 25);
  await ForcePowerMaintenance.handleControl(a, rf.id, 'end');
  assert.equal(ForcePowerMaintenance.get(a, rf.id).status, 'ended');
  RollCore.execute = savedExec;
  check('damage prompts a DC 15 + damage check per concentration-bound instance; chat controls maintain/end/concentrate');
}
// 3. conditional defense bonuses are surfaced against the right incoming powers
{
  const t = mkActor('target');
  const eff = (gate, def, amt) => ({ label: gate, flags: { 'foundryvtt-swse': { effectIntent: { category: 'defense', target: def, amount: amt, filterType: 'custom', filterValue: gate } } } });
  t.effects = [eff('against-force-powers', 'will', 2), eff('against-mind-affecting-and-fear', 'will', 5)];
  assert.deepEqual(conditionalDefenseBonuses(t, { descriptors: ['telekinetic'] }).map(b => b.amount), [2]);
  assert.deepEqual(conditionalDefenseBonuses(t, { descriptors: ['mind-affecting'] }).map(b => b.amount), [2, 5]);
  check('Resist Force applies vs every Force power, Valor only vs mind-affecting/fear (listed on the Force power card)');
}
// 4. Temptation powers are never regained or paid-recovered
{
  const tp = { id: 't1', type: 'force-power', name: 'Force Lightning', system: { discarded: true }, flags: { swse: { temptation: { kind: 'power' } } } };
  const normal = { id: 'n1', type: 'force-power', name: 'Surge', system: { discarded: true }, flags: {} };
  const a = mkActor('jedi3', [tp, normal]);
  assert.equal(isSpentInstance(tp), false);
  const r = await SuiteInstanceRecovery.regainAllSpent(a, 'force-power', { proof: { kind: 'gm', reason: 'test' } });
  assert.equal(r.recovered, 1); assert.equal(tp.system.discarded, true);
  const paid = await ForceExecutor.recoverForcePowers(a, ['t1']);
  assert.equal(paid.success, false); assert.equal(a.system.forcePoints.value, 3, 'no Force Point charged');
  check('a Temptation power can never be regained (rest/natural 20/GM) or bought back with a Force Point');
}
// 5. executor: paid Resist Force option is charged once, finalized only when the instance used it, else returned
{
  globalThis.game.combat = null;
  const power = { id: 'rf', type: 'force-power', name: 'Resist Force', system: { dcChart: RESIST, discarded: false } };
  const a = mkActor('jedi4', [power]);
  globalThis.game.actors = { get: (id) => (id === a.id ? a : null) };
  const savedExec = RollCore.execute;
  RollCore.execute = async () => ({ success: true, finalTotal: 22, roll: { total: 22, dice: [{ faces: 20, results: [{ result: 12, active: true }] }] } });
  ForceExecutor._generateForcePowerRollMessage = async () => {};
  ForceExecutor._getTelepathicIntruderBonus = ForceExecutor._getTelepathicIntruderBonus ?? (() => 0);
  const exec = await ForceExecutor.executeForcePower(a, 'rf', { resistForceDefenses: ['will', 'reflex'], payEnhancementForcePoint: true });
  assert.equal(exec.success, true, exec.error);
  const intents = a.effects.map(e => e.flags['foundryvtt-swse'].effectIntent.target).sort();
  assert.deepEqual(intents, ['reflex', 'will'], 'paid: two defenses');
  assert.equal(a.system.forcePoints.value, 2, 'exactly one Force Point');
  const receipts = a.flags.swse.forcePointLedger.receipts;
  assert.equal(receipts.at(-1).abilitySourceRef, 'forcePower:resistForceTwoDefenses');
  assert.equal(receipts.at(-1).state, 'finalized');
  power.system.discarded = false;
  a.effects = [];
  await ForceExecutor.executeForcePower(a, 'rf', { resistForceDefenses: ['will', 'reflex'], payEnhancementForcePoint: false });
  assert.deepEqual(a.effects.map(e => e.flags['foundryvtt-swse'].effectIntent.target), ['will'], 'unpaid: only the first chosen defense');
  assert.equal(a.system.forcePoints.value, 2, 'nothing charged');
  RollCore.execute = savedExec;
  check('activation flow: paid Special charges exactly one typed Force Point and finalizes it; unpaid applies one defense');
}
// 6. regression: a plain activation completes (the executor used an undefined variable and failed every activation)
{
  const surge = { id: 's1', type: 'force-power', name: 'Surge', system: { dcChart: [{ dc: 10, description: '+10 Jump' }], discarded: false } };
  const a = mkActor('jedi5', [surge]);
  const savedExec = RollCore.execute;
  RollCore.execute = async () => ({ success: true, finalTotal: 18, roll: { total: 18, dice: [{ faces: 20, results: [{ result: 8, active: true }] }] } });
  ForceExecutor._generateForcePowerRollMessage = realGenerateMessage; // the real roll card path too
  const createdCards = []; globalThis.ChatMessage.create = async (d) => { createdCards.push(d); return d; };
  const result = await ForceExecutor.executeForcePower(a, 's1', {});
  RollCore.execute = savedExec;
  assert.equal(result.success, true, result.error);
  assert.equal(surge.system.discarded, true, 'the used copy is spent');
  check('plain Force power activation completes without a runtime error and spends the copy');
}
console.log(`ALL ${n} PASSED`);
