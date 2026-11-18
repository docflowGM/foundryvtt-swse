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

const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { AbilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js');
const { TemptationOfTheDarkSide, isTemptationInstance } = await import('/systems/foundryvtt-swse/scripts/engine/force/temptation-of-the-dark-side.js');
const { StarshipManeuverManager } = await import('/systems/foundryvtt-swse/scripts/utils/starship-maneuver-manager.js');
const { ProgressionFinalizer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js');

let n = 0; const check = (m) => console.log(`PASS ${++n}: ${m}`);
let seq = 0;
const fsFeat = { id: 'f1', type: 'feat', name: 'Force Sensitivity', system: {}, flags: {} };
const mkActor = (items = [], dss = 0) => {
  const a = { id: 'a1', name: 'a1', system: { darkSide: { value: dss } }, flags: {}, items: [...items] };
  return a;
};
const ledger = { spent: 0, finalized: 0, rolledBack: 0 };
let failCreate = false, refuseFp = false;
ActorEngine.spendForcePoints = async () => refuseFp ? { spent: false } : (ledger.spent++, { spent: true, id: `r${ledger.spent}` });
ActorEngine.finalizeForcePointSpend = async () => { ledger.finalized++; return { finalized: true }; };
ActorEngine.rollbackForcePointSpend = async () => { ledger.rolledBack++; return { rolledBack: true }; };
ActorEngine.createEmbeddedDocuments = async (actor, t, data) => { if (failCreate) throw new Error('boom'); return data.map(d => { const it = { ...d, id: `i${++seq}` }; actor.items.push(it); return it; }); };
ActorEngine.deleteEmbeddedDocuments = async (actor, t, ids) => { actor.items = actor.items.filter(i => !ids.includes(i.id)); };
ActorEngine.updateActor = async (actor, u) => { for (const [p, v] of Object.entries(u)) setPath(actor, p, v); };

const darkPower = { type: 'force-power', name: 'Force Lightning', system: { descriptors: ['Dark Side'], discarded: true }, flags: {} };
const lightPower = { type: 'force-power', name: 'Valor', system: { descriptors: ['Light Side'] }, flags: {} };

// --- per-copy identity: legacy name filters no longer drop a known maneuver
{
  StarshipManeuverManager._getAllManeuverDefinitions = () => [{ name: 'Attack Pattern Delta' }];
  StarshipManeuverManager._checkManeuverPrerequisites = async () => ({ valid: true });
  const a = mkActor([{ id: 'm1', type: 'maneuver', name: 'Attack Pattern Delta', system: {} }]);
  const avail = await StarshipManeuverManager.getAvailableManeuvers(a);
  assert.equal(avail.length, 1, 'Starships of the Galaxy: "You can add the same maneuver more than once"');
  check('an already-owned maneuver stays selectable (duplicate copies allowed)');
}
// --- exact-copy removal and marker-based suite sync
{
  const a = mkActor([
    { id: 'p1', type: 'force-power', name: 'Surge', system: {} }, { id: 'p2', type: 'force-power', name: 'Surge', system: {} }
  ]);
  assert.deepEqual(ProgressionFinalizer._collectOwnedForcePowerItemIds(a, { name: 'Surge', itemId: 'p2' }, 1), ['p2']);
  assert.deepEqual(ProgressionFinalizer._collectOwnedForcePowerItemIds(a, { name: 'Surge', itemId: 'nope' }, 1), []);
  assert.equal(ProgressionFinalizer._collectOwnedForcePowerItemIds(a, { name: 'Surge' }, 1).length, 1);
  check('naming the exact owned copy removes exactly that copy (name match is only the fallback)');
}
{
  const mk = (id, idx, session) => ({ id, type: 'maneuver', name: 'Attack Pattern Delta', system: {}, flags: { swse: { progression: { sourceSession: session, selectionId: 'apd', countIndex: idx } } } });
  const a = mkActor([mk('old', 0, 'S0'), mk('new0', 0, 'S1'), mk('new1', 1, 'S1')]);
  a.system.starshipManeuverSuite = { maneuvers: [], max: 0 };
  let written = null;
  ProgressionFinalizer._resolveActorEngine = () => ({ updateActor: async (_a, u) => { written = u; } });
  await ProgressionFinalizer._syncPostApplyState(a, { metadata: { postApply: {
    starshipManeuverNames: ['Attack Pattern Delta', 'Attack Pattern Delta'], starshipManeuverRemoveItemIds: [],
    starshipManeuverMarkers: [{ sessionId: 'S1', selectionId: 'apd', countIndex: 0 }, { sessionId: 'S1', selectionId: 'apd', countIndex: 1 }] } } });
  assert.deepEqual(written['system.starshipManeuverSuite.maneuvers'].sort(), ['new0', 'new1'], 'only the copies THIS session created; the older same-name copy is untouched');
  check('suite sync adds exactly the copies a session created, not every same-name maneuver');
}
// --- Temptation: refused outside a started combat (no encounter end => it would become a free permanent item)
{
  globalThis.game.combat = null;
  const a = mkActor([fsFeat]);
  assert.equal((await TemptationOfTheDarkSide.acquirePower(a, darkPower)).reason, 'no-active-encounter');
  assert.equal((await TemptationOfTheDarkSide.acquireTalent(a, { type: 'talent', name: 'X', system: { tree: 'Sith' }, flags: {} })).reason, 'no-active-encounter');
  assert.equal(ledger.spent, 0, 'nothing charged');
  globalThis.game.combat = { started: true, id: 'c1' };
  console.log('PASS 3b: Temptation is refused (and not charged) outside a started combat');
}
// --- Temptation: power pathway
{
  const a = mkActor([fsFeat]);
  const r = await TemptationOfTheDarkSide.acquirePower(a, darkPower, { gmAdjudication: { reason: 'GM enabled optional rule' } });
  assert.equal(r.ok, true);
  const added = a.items.find(i => i.name === 'Force Lightning');
  assert.equal(added.system.discarded, false); assert.equal(isTemptationInstance(added), true);
  assert.equal(ledger.finalized, 1);
  assert.equal(await TemptationOfTheDarkSide.consumeAfterUse(a, added), true);
  assert.equal(a.items.some(i => i.name === 'Force Lightning'), false, 'goes away entirely when used');
  assert.equal(a.system.darkSide.value, 0, 'no Dark Side Score change is printed for the power pathway');
  check('power pathway: dark-side power added to suite for 1 Force Point, removed when used, no DSS change');
}
{
  const a = mkActor([fsFeat]);
  assert.equal((await TemptationOfTheDarkSide.acquirePower(a, lightPower)).reason, 'not-a-dark-side-power');
  assert.equal((await TemptationOfTheDarkSide.acquirePower(mkActor([]), darkPower)).reason, 'force-sensitivity-required');
  const before = ledger.spent; failCreate = true;
  assert.equal((await TemptationOfTheDarkSide.acquirePower(a, darkPower)).reason, 'create-failed');
  failCreate = false;
  assert.equal(ledger.rolledBack, 1, 'a failed add gives the exact Force Point back');
  refuseFp = true;
  assert.equal((await TemptationOfTheDarkSide.acquirePower(a, darkPower)).reason, 'force-point-refused');
  refuseFp = false;
  assert.equal(a.items.length, 1);
  check('power pathway gates: Force Sensitivity, [dark side] descriptor, Force Point refusal, rollback on failure');
}
// --- Temptation: talent pathway
{
  const a = mkActor([fsFeat], 3);
  const talent = (name, tree) => ({ type: 'talent', name, system: { tree }, flags: {} });
  let evaluated = [];
  AbilityEngine.evaluateAcquisition = (actor, cand, pending) => { evaluated.push(pending.selectedTalents.map(t => t.name)); return { legal: cand.name !== 'Blocked' }; };
  assert.equal((await TemptationOfTheDarkSide.acquireTalent(a, talent('Power of the Dark Side', 'Dark Side'))).ok, true);
  assert.equal((await TemptationOfTheDarkSide.acquireTalent(a, talent('Swift Power', 'Sith'))).ok, true);
  assert.deepEqual(evaluated[1], ['Power of the Dark Side'], 'a temporary talent counts toward the next prerequisite');
  assert.equal((await TemptationOfTheDarkSide.acquireTalent(a, talent('Blocked', 'Dark Side'))).reason, 'prerequisites-not-met');
  assert.equal((await TemptationOfTheDarkSide.acquireTalent(a, talent('Jedi Thing', 'Jedi Consular'))).reason, 'tree-not-allowed');
  assert.equal((await TemptationOfTheDarkSide.acquireTalent(a, talent('Dev Talent', 'Dark Side Devotee'))).ok, true);
  assert.deepEqual(await TemptationOfTheDarkSide.endEncounter(a, { combatId: 'other-combat' }), { removed: 0, darkSideIncrease: 0 }, 'another combat ending leaves these');
  const end = await TemptationOfTheDarkSide.endEncounter(a, { combatId: 'c1' });
  assert.deepEqual(end, { removed: 3, darkSideIncrease: 3 });
  assert.equal(a.system.darkSide.value, 6); assert.equal(a.items.length, 1);
  assert.deepEqual(await TemptationOfTheDarkSide.endEncounter(a), { removed: 0, darkSideIncrease: 0 });
  assert.equal(a.system.darkSide.value, 6, 'idempotent: a second end never double-counts');
  check('talent pathway: tree + prerequisite gates, temp talents count, end of encounter removes them and raises DSS by Force Points spent');
}
console.log(`ALL ${n} PASSED`);
