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
let n = 0; const check = (m) => console.log(`PASS ${++n}: ${m}`);

import { readFileSync } from 'node:fs';
const { installForceDefinitions } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-definition-registry.js');
assert.equal(installForceDefinitions(JSON.parse(readFileSync('data/force-v2/definitions.json', 'utf8'))), true);
const BLAST = [{ dc: 15, description: '2d6' }, { dc: 20, description: '3d6' }];
const mkTarget = (reflex, effects = []) => ({ id: 't', uuid: 'Actor.t', name: 'Droid', type: 'npc', effects, system: { size: 'medium', derived: { defenses: { reflex: { total: reflex } } } } });
async function use(total, target) {
  const power = { id: 'fb', type: 'force-power', name: 'Force Blast', system: { dcChart: BLAST, discarded: false, descriptor: [] } };
  const a = mkActor('caster' + total, [power]);
  globalThis.game.actors = { get: (id) => (id === a.id ? a : null) };
  const saved = RollCore.execute;
  RollCore.execute = async () => ({ success: true, finalTotal: total, roll: { total, dice: [{ faces: 20, results: [{ result: 10, active: true }] }] } });
  ForceExecutor._generateForcePowerRollMessage = async () => {};
  ForceExecutor._getTelepathicIntruderBonus = ForceExecutor._getTelepathicIntruderBonus ?? (() => 0);
  posted.length = 0;
  const r = await ForceExecutor.executeForcePower(a, 'fb', { target });
  RollCore.execute = saved;
  return r;
}
// strictly-greater-than comparator printed for Force Blast: equal misses, +1 hits
let r = await use(21, mkTarget(21));
assert.equal(r.defenseResolution.outcome, 'tier-met-defense-failed'); assert(posted.some((c) => /Missed the defense/.test(c) && /must exceed 21/.test(c)), posted.join('|'));
check('Force Blast equal to Reflex misses (printed strictly-greater comparator)');
r = await use(22, mkTarget(21));
assert.equal(r.defenseResolution.outcome, 'tier-and-defense-met'); assert(posted.some((c) => /Hit/.test(c)));
check('Force Blast one above Reflex hits; resolution is returned and posted');
// a conditional defense bonus the target holds (Resist Force) raises the effective defense
const resist = { disabled: false, label: 'Resist Force', flags: { 'foundryvtt-swse': { effectIntent: { filterType: 'custom', category: 'defense', target: 'reflex', amount: 2, filterValue: 'against-force-powers' } } } };
r = await use(22, mkTarget(21, [resist]));
assert.equal(r.defenseResolution.effectiveDefense, 23); assert.equal(r.defenseResolution.outcome, 'tier-met-defense-failed');
check('Resist Force bonus is applied to the comparison automatically (FP-RD-012)');
// no target defense known: not assumed
r = await use(30, { id: 't2', uuid: 'Actor.t2', name: 'Blank', type: 'npc', effects: [], system: {} });
assert.equal(r.defenseResolution.outcome, 'needs-target-defense'); assert.equal(r.success, true, 'activation itself is unchanged');
check('unknown target defense is reported, never assumed');
// no target: nothing changes
r = await use(22, null); assert.equal(r.defenseResolution, null); assert.equal(r.success, true);
check('no target: activation unchanged');
console.log(`ALL ${n} PASSED`);
