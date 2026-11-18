import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { setPath } from './helpers/real-force-point-engine.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}
};
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ui = globalThis.ui ?? { notifications: { info() {}, warn() {} } };
let rid = 0;
globalThis.foundry.utils.randomID = () => `i${++rid}`;

const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ForcePowerEffectsEngine } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-power-effects-engine.js');
const { installPhase4ForceModifierAutomation } = await import('/systems/foundryvtt-swse/scripts/engine/force/phase4-force-modifier-automation.js');
const { ForcePowerMaintenance, maintenanceContractFor } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-power-maintenance.js');
installPhase4ForceModifierAutomation(ForcePowerEffectsEngine);

let effectSeq = 0;
ActorEngine.updateActor = async (actor, update) => { for (const [p, v] of Object.entries(update)) setPath(actor, p, v); return actor; };
ActorEngine.createActiveEffects = async (actor, data) => data.map(d => { const e = { ...d, id: `e${++effectSeq}`, getFlag(scope, key) { return this.flags?.[scope]?.[key]; } }; actor.effects.push(e); return e; });
ActorEngine.deleteActiveEffects = async (actor, ids) => { actor.effects = actor.effects.filter(e => !ids.includes(e.id)); };

const world = new Map();
globalThis.game = globalThis.game ?? {};
globalThis.game.actors = { get: (id) => world.get(id) };
const mk = (id) => { const a = { id, name: id, flags: {}, effects: [], items: [], system: {} }; world.set(id, a); return a; };
const power = (id, name, dcChart, extra = {}) => ({ id, name, system: { dcChart, duration: 'Until beginning of next turn', ...extra }, img: 'x.png' });
const RESIST = [{ dc: 15, description: 'You gain +1 to one Defense score of your choice against Force Powers.' }, { dc: 20, description: 'You gain +2 to one Defense score of your choice against Force Powers.' }, { dc: 25, description: 'You gain +3 to one Defense score of your choice against Force Powers.' }];
const VALOR = [{ dc: 15, description: 'The target gains a +1 bonus to their Will Defense against Mind-Affecting and Fear effects.' }, { dc: 20, description: 'The target gains a +2 bonus to their Will Defense against Mind-Affecting and Fear effects.' }];
const intents = (a) => a.effects.map(e => e.flags['foundryvtt-swse'].effectIntent);
let passed = 0; const check = (n) => console.log(`PASS ${++passed}: ${n}`);

{
  const a = mk('jedi');
  assert.deepEqual(await ForcePowerEffectsEngine.applyPowerEffect(a, power('p1', 'Resist Force', RESIST), 22), [], 'no defense chosen => nothing applied');
  const r = await ForcePowerMaintenance.begin(a, power('p1', 'Resist Force', RESIST), 22, { resistForceDefenses: ['will'] });
  assert.equal(a.effects.length, 1, 'exactly one defense');
  assert.equal(intents(a)[0].target, 'will');
  assert.equal(intents(a)[0].filterType, 'custom', 'conditional gate, never an unconditional all-defense bonus');
  assert.equal(ForcePowerMaintenance.list(a).length, 1);
  assert.equal(await ForcePowerMaintenance.begin(mk('x'), power('p1', 'Resist Force', RESIST), 22, {}), null, 'no choice => no instance')
  check('Resist Force applies to ONE chosen defense, flagged as against-Force-powers; none chosen applies nothing');
}
{
  const a = mk('jedi2');
  await ForcePowerMaintenance.begin(a, power('p1', 'Resist Force', RESIST), 22, { resistForceDefenses: ['will', 'reflex'] });
  assert.equal(a.effects.length, 0, 'two defenses without a Force Point is rejected');
  await ForcePowerMaintenance.begin(a, power('p1', 'Resist Force', RESIST), 22, { resistForceDefenses: ['will', 'reflex'], forcePointSpent: true });
  assert.deepEqual(intents(a).map(i => i.target).sort(), ['reflex', 'will']);
  check('two defenses only when the Force Point option is paid');
}
{
  const caster = mk('caster'), ally = mk('ally');
  assert.equal(await ForcePowerMaintenance.begin(caster, power('v1', 'Valor', VALOR), 22, {}), null, 'Valor with no ally target does nothing');
  assert.equal(caster.effects.length, 0);
  const rec = await ForcePowerMaintenance.begin(caster, power('v1', 'Valor', VALOR), 22, { target: ally });
  assert.equal(caster.effects.length, 0, 'the caster is not buffed');
  assert.equal(ally.effects.length, 1);
  const i = intents(ally)[0];
  assert.deepEqual([i.category, i.target, i.amount, i.filterValue], ['defense', 'will', 2, 'against-mind-affecting-and-fear']);
  assert.equal(rec.recipientId, 'ally');
  await ForcePowerMaintenance.end(caster, rec.id, 'test');
  assert.equal(ally.effects.length, 0, 'ending removes the effect from the ally');
  check('Valor: Will Defense only, on the ally, no attack bonus, mind-affecting/fear gate; end removes it from the ally');
}
{
  const a = mk('multi');
  const p = power('p1', 'Resist Force', RESIST);
  const r1 = await ForcePowerMaintenance.begin(a, p, 22, { resistForceDefenses: ['will'] });
  const r2 = await ForcePowerMaintenance.begin(a, p, 22, { resistForceDefenses: ['reflex'] });
  assert.notEqual(r1.id, r2.id);
  assert.equal(ForcePowerMaintenance.list(a).length, 2);
  await ForcePowerEffectsEngine.removePowerEffects(a, p);
  assert.equal(a.effects.length, 2, 'power-copy cleanup/recovery never ends a maintained instance');
  await ForcePowerMaintenance.end(a, r1.id, 'dropped');
  assert.equal(a.effects.length, 1);
  assert.equal(intents(a)[0].target, 'reflex', 'only the named instance ended');
  assert.equal(ForcePowerMaintenance.list(a).length, 1);
  check('multiple instances are independent; copy cleanup does not end them; end removes only that instance');
}
{
  const a = mk('conc');
  const r = await ForcePowerMaintenance.begin(a, power('p1', 'Resist Force', RESIST), 22, { resistForceDefenses: ['will'] });
  assert.deepEqual(await ForcePowerMaintenance.resolveConcentration(a, r.id, { damage: 10, total: 25 }), { held: true, dc: 25 });
  assert.equal(ForcePowerMaintenance.get(a, r.id).status, 'active');
  const lost = await ForcePowerMaintenance.resolveConcentration(a, r.id, { damage: 10, total: 24 });
  assert.deepEqual(lost, { held: false, dc: 25 });
  assert.equal(ForcePowerMaintenance.get(a, r.id).endedReason, 'concentration-failed');
  assert.equal(a.effects.length, 0);
  check('concentration after damage: DC 15 + damage taken; failure ends that instance and its effects');
}
{
  const a = mk('whirl'); const t = mk('t');
  const w = power('w1', 'Force Whirlwind', []);
  const r = await ForcePowerMaintenance.begin(a, w, 22, { target: t });
  assert.equal(r.status, 'active', 'a power with no numeric effect is still a maintainable instance');
  assert.equal((await ForcePowerMaintenance.maintain(a, r.id, {})).reason, 'fresh-check-required');
  assert.equal((await ForcePowerMaintenance.maintain(a, r.id, { total: 19 })).maintained, true);
  assert.equal(ForcePowerMaintenance.get(a, r.id).rounds, 2);
  assert.equal((await ForcePowerMaintenance.terminate(a, r.id, 'bogus')).ended, false);
  assert.equal((await ForcePowerMaintenance.terminate(a, r.id, 'target-attacked-damaged-or-moved-down-track-by-caster-or-ally')).ended, true);
  check('Force Whirlwind: fresh Use the Force check each round; printed special termination ends it');
}
{
  const a = mk('grip');
  const g = power('g1', 'Force Grip', []);
  const r = await ForcePowerMaintenance.begin(a, g, 22, {});
  assert.equal((await ForcePowerMaintenance.maintain(a, r.id, { total: 20 })).reason, 'deferred');
  assert.equal((await ForcePowerMaintenance.resolveConcentration(a, r.id, { damage: 3, total: 1 })).held, null);
  assert.equal(ForcePowerMaintenance.get(a, r.id).status, 'active', 'deferred rules never auto-end or auto-maintain');
  assert.equal(maintenanceContractFor('Move Object').maintainAction, 'standard');
  assert.equal(maintenanceContractFor('Force Slam'), null);
  check('Force Grip / Move Object maintenance and concentration stay DEFERRED (no speculative automation)');
}
console.log(`ALL ${passed} PASSED`);
