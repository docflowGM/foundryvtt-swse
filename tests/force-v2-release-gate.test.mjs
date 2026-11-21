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
const warnings = [];
globalThis.ui = { notifications: { info() {}, warn: (m) => warnings.push(m) } };

const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { StarshipManeuverSuite } = await import('/systems/foundryvtt-swse/scripts/engine/force/starship-maneuver-suite.js');
const { StarshipManeuverManager } = await import('/systems/foundryvtt-swse/scripts/utils/starship-maneuver-manager.js');
const { ForceEngine } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-engine.js');
const { TemptationOfTheDarkSide } = await import('/systems/foundryvtt-swse/scripts/engine/force/temptation-of-the-dark-side.js');

let n = 0; const check = (m) => console.log(`PASS ${++n}: ${m}`);

// 1. a non-maneuver item id can never be recovered/activated as a maneuver
{
  let spent = 0;
  ActorEngine.spendForcePoints = async () => { spent++; return { spent: true }; };
  const pilot = { id: 'p', items: { get: () => ({ id: 'x', type: 'force-power', system: { discarded: true } }) } };
  assert.equal(await StarshipManeuverSuite.regainOwnedManeuver(pilot, 'x'), false);
  const act = await StarshipManeuverSuite.activateManeuver(pilot, 'x', {});
  assert.equal(act.success, false);
  assert.equal(spent, 0, 'no Force Point debited for a non-maneuver item');
  check('maneuver recover/activate reject non-maneuver items before any debit');
}
// 2. granted maneuvers use canonical state
{
  let created;
  ActorEngine.createEmbeddedDocuments = async (a, t, d) => { created = d; return d.map((x, i) => ({ ...x, id: `m${i}` })); };
  await StarshipManeuverManager.grantManeuvers({ id: 'a' }, [{ name: 'Attack Pattern Delta' }]);
  assert.equal(created[0].system.discarded, false);
  assert.equal('spent' in created[0].system, false, 'no legacy spent key');
  check('grantManeuvers writes canonical system.discarded, not legacy system.spent');
}
// 3. no untyped Force Point balance write
{
  let wrote = false, typed = null;
  ActorEngine.updateActor = async () => { wrote = true; };
  ActorEngine.spendForcePoints = async (a, n, ctx) => { typed = ctx; return { spent: true, receiptId: 'r1', remaining: 1 }; };
  ActorEngine.finalizeForcePointSpend = async () => ({ finalized: true });
  const actor = { id: 'a', system: { forcePoints: { value: 3 } }, flags: {} };
  const refused = await ForceEngine.spendForcePoint(actor);
  assert.equal(refused.success, false); assert.equal(wrote, false); assert.equal(typed, null);
  const ok = await ForceEngine.spendForcePoint(actor, { useKind: 'roll-bonus' });
  assert.equal(ok.success, true); assert.equal(typed.useKind, 'roll-bonus'); assert.equal(wrote, false);
  check('ForceEngine.spendForcePoint refuses untyped spends and never writes the balance itself');
}
// 4. Temptation end-of-encounter fails safe
{
  const tal = (id) => ({ id, type: 'talent', name: id, flags: { swse: { temptation: { kind: 'talent' } } } });
  const actor = { id: 'a', system: { darkSide: { value: 2 } }, flags: {}, items: [tal('t1'), tal('t2')] };
  let failScore = true, failDelete = false;
  ActorEngine.updateActor = async (a, u) => { if (failScore && 'system.darkSide.value' in u) throw new Error('score write failed'); for (const [p, v] of Object.entries(u)) setPath(a, p, v); };
  ActorEngine.deleteEmbeddedDocuments = async (a, t, ids) => { if (failDelete) throw new Error('delete failed'); a.items = a.items.filter(i => !ids.includes(i.id)); };
  await assert.rejects(TemptationOfTheDarkSide.endEncounter(actor), /score write failed/);
  assert.equal(actor.items.length, 2, 'failed score write removes nothing');
  failScore = false; failDelete = true;
  await assert.rejects(TemptationOfTheDarkSide.endEncounter(actor), /delete failed/);
  assert.equal(actor.system.darkSide.value, 4, 'increase is durable even though removal failed');
  failDelete = false;
  const r = await TemptationOfTheDarkSide.endEncounter(actor);
  assert.equal(r.darkSideIncrease, 0, 'retry never double-counts');
  assert.equal(actor.system.darkSide.value, 4); assert.equal(actor.items.length, 0);
  check('Temptation end-of-encounter: no lost or doubled Dark Side increase across failed score write / failed removal / retry');
}
console.log(`ALL ${n} PASSED`);
