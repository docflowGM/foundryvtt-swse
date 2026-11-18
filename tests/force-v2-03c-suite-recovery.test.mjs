import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {}, HandlebarsApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.foundry.utils.randomID = (() => { let n = 0; return () => `fp-test-${++n}`; })();

const { ForcePointsService } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js');
const { RollCore } = await import('/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js');
const { ModifierEngine } = await import('/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js');

const makeActor = ({ normal = 2, max = 3, bonus = [], condition = 0 } = {}) => ({
  id: 'actor-fp', name: 'FP test actor', type: 'character',
  system: { forcePoints: { value: normal, max }, conditionTrack: { current: condition },
    darkSideScore: { value: 0 }, level: { heroic: 1 } },
  flags: { swse: { bonusForcePoints: { value: bonus.reduce((n, e) => n + e.value, 0), entries: bonus } } },
  items: [],
  getFlag(scope, name) { return this.flags?.[scope]?.[name]; }
});




const items = [];
const writer = async (actor, update) => { for (const [path, value] of Object.entries(update)) setPath(actor, path, value); return actor; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);
const { ForceExecutor } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-executor.js');
const { ForceEngine } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-engine.js');
const hooks = await import('/systems/foundryvtt-swse/scripts/infrastructure/hooks/force-power-hooks.js');
let passed = 0;
const check = (name) => { passed += 1; console.log(`PASS ${passed}: ${name}`); };

const power = (id, discarded, extra = {}) => ({ id, name: `Power ${id}`, type: 'force-power', system: { discarded, spent: false, ...extra } });
const mkActor = (powers) => {
  const a = makeActor({ normal: 3, max: 6 });
  a.id = 'jedi'; a.name = 'Jedi'; a.isOwner = true; a.setFlag = async () => {};
  a.items = powers; a.items.get = (id) => powers.find(p => p.id === id);
  return a;
};
const embeddedCalls = [];
const savedEmbedded = ActorEngine.updateEmbeddedDocuments;
ActorEngine.updateEmbeddedDocuments = async (actor, type, updates) => {
  embeddedCalls.push({ type, updates });
  for (const u of updates) { const it = actor.items.find(i => i.id === u._id); for (const [k, v] of Object.entries(u)) if (k.startsWith('system.')) it.system[k.slice(7)] = v; }
  return updates;
};
ActorEngine.updateActor = writer;

try {
  {
    assert.equal(RollCore.isUseTheForceDomain('skill.useTheForce'), true);
    assert.equal(RollCore.isUseTheForceDomain('force-power.activation'), true);
    assert.equal(RollCore.isUseTheForceDomain('force-regimen.activation'), true);
    assert.equal(RollCore.isUseTheForceDomain('force-talent.illusion'), true);
    assert.equal(RollCore.isUseTheForceDomain('skill.acrobatics'), false);
    assert.equal(RollCore.isUseTheForceDomain('attack.melee'), false);
    check('every Use the Force domain is recognized; other checks are not');
  }
  {
    globalThis.game.combat = { started: true, id: 'c1', round: 2, turn: 1, combatant: { id: 'foe-combatant', actor: { id: 'foe' } }, combatants: [{ id: 'jedi-combatant', actor: { id: 'jedi' } }, { id: 'foe-combatant', actor: { id: 'foe' } }] };
    const a = mkActor([power('p1', true), power('p2', true), power('p3', false)]);
    const result = await ForceEngine.recordNatural20(a, 'Move Object');
    assert.equal(result.fpRecovered, 0, 'a natural 20 never awards a Force Point');
    assert.equal(a.system.forcePoints.value, 3);
    assert.deepEqual([a.flags.swse.pendingSuiteRegain.combatId, a.flags.swse.pendingSuiteRegain.combatantId], ['c1', 'jedi-combatant'], 'the regain is tied to THIS actor\'s turn, even when rolled off turn');
    assert.equal(a.items[0].system.discarded, true, 'nothing is regained at the moment of the roll');
    check('natural 20: no Force Point; a pending suite regain tied to the actor\'s own turn is recorded; nothing regained yet');
  }
  {
    // Real RollCore path: a natural 20 on skill.useTheForce records the pending regain; other results/domains do not.
    globalThis.Roll = class { constructor(f) { this.formula = f; this.terms = []; } async evaluate() { this.total = 25; this.dice = [{ faces: 20, results: [{ result: globalThis.__d20, active: true }] }]; return this; } };
    const run = async (domain, d20) => { globalThis.__d20 = d20; const a = mkActor([]); const r = await RollCore.execute({ actor: a, domain, baseBonus: 5, rollOptions: { baseDice: '1d20' }, rollData: {}, context: {} }); return { a, r }; };
    const nat20 = await run('skill.useTheForce', 20);
    assert.equal(nat20.r.success, true, JSON.stringify(nat20.r));
    assert.ok(nat20.a.flags.swse.pendingSuiteRegain, 'natural 20 on a Use the Force check records the regain');
    assert.equal(nat20.a.system.forcePoints.value, 3);
    assert.equal((await run('skill.useTheForce', 19)).a.flags.swse.pendingSuiteRegain, undefined);
    assert.equal((await run('skill.acrobatics', 20)).a.flags.swse.pendingSuiteRegain, undefined, 'a natural 20 on another skill is not a suite regain');
    assert.ok((await run('force-power.activation', 20)).a.flags.swse.pendingSuiteRegain, 'power activation checks go through the same single authority');
    check('RollCore is the single natural-20 authority for every Use the Force domain');
  }
  {
    const a = mkActor([power('p1', true), power('p2', true), power('p3', false, { maintained: true })]);
    embeddedCalls.length = 0;
    await ActorEngine.updateActor(a, { 'flags.swse.pendingSuiteRegain': { combatId: 'c1', combatantId: 'jedi-combatant' } });
    const result = await ForceExecutor.regainAllSpentForcePowers(a);
    assert.deepEqual([result.recovered, a.items.map(i => i.system.discarded)], [2, [false, false, false]]);
    assert.ok(embeddedCalls.every(c => c.type === 'Item'), 'only owned Power copies change: maintained effects are untouched');
    assert.equal(a.flags.swse.pendingSuiteRegain, null, 'a regain-all clears the pending record');
    const none = await ForceExecutor.regainAllSpentForcePowers(a);
    assert.equal(none.recovered, 0); // idempotent
    check('regain-all returns every discarded Power copy via the one suite field; effect instances untouched; idempotent');
  }
  {
    const jedi = mkActor([power('p1', true), power('p2', true)]);
    const other = Object.assign(mkActor([power('o1', true)]), { id: 'other' });
    const combat = { id: 'c1', previous: { combatantId: 'jedi-combatant' }, combatants: [{ id: 'jedi-combatant', actor: jedi }, { id: 'other-combatant', actor: other }] };
    await ActorEngine.updateActor(jedi, { 'flags.swse.pendingSuiteRegain': { combatId: 'c1', combatantId: 'jedi-combatant' } });
    await ActorEngine.updateActor(other, { 'flags.swse.pendingSuiteRegain': { combatId: 'c1', combatantId: 'other-combatant' } });
    const done = await hooks.regainSuiteAtEndOfTurn(combat);
    assert.equal(done.recovered, 2, 'at the end of the actor\'s turn, all spent powers return');
    assert.deepEqual(other.items.map(i => i.system.discarded), [true], 'another combatant\'s pending regain waits for its own turn');
    // Wrong combat / no pending: nothing happens.
    assert.equal(await hooks.regainSuiteAtEndOfTurn({ ...combat, id: 'c9', previous: { combatantId: 'other-combatant' } }), null, 'a stale pending record from another combat is ignored');
    assert.equal(await hooks.regainSuiteAtEndOfTurn({ ...combat, previous: { combatantId: 'jedi-combatant' } }), null, 'no pending record, no regain');
    check('end-of-turn hook: regains only for the combatant whose turn ended, only for this combat, only when a natural 20 is pending');
  }
  {
    const a = mkActor([power('p1', true), power('p2', true)]);
    const b = Object.assign(mkActor([power('b1', true), power('b2', false)]), { id: 'b' });
    const results = await hooks.regainSuiteAfterCombat({ combatants: [{ actor: a }, { actor: b }, { actor: null }] });
    assert.deepEqual(results.map(r => r.recovered), [2, 1]);
    assert.deepEqual([...a.items, ...b.items].map(i => i.system.discarded), [false, false, false, false], 'the rest after combat regains powers marked discarded (the previous hook read the legacy spent field and missed them)');
    check('end-of-combat rest regains discarded powers through the same authority (legacy-field bug fixed)');
  }
  {
    const { readFileSync } = await import('node:fs');
    const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
    assert.ok(!/fpRecovered: 1|Auto-recover 1 FP/.test(read('scripts/engine/force/force-engine.js')), 'the invented natural-20 Force Point award is gone');
    assert.ok(/name="system\.discarded"/.test(read('templates/dialogs/entity/parts/body-force-power.hbs')), 'the entity dialog edits the suite authority field');
    assert.ok(!/ForceEngine\.recordNatural20/.test(read('scripts/engine/force/force-executor.js')), 'the executor no longer records natural 20 a second time');
    check('source: no invented FP award; dialog and executor use the single authority');
  }
} finally {
  ActorEngine.updateEmbeddedDocuments = savedEmbedded;
  restore();
  delete globalThis.game.combat;
}
console.log(`Force V2 03C suite recovery: ${passed} assertion groups completed.`);
