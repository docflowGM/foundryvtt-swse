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





const writer = async (actor, update) => { for (const [path, value] of Object.entries(update)) setPath(actor, path, value); return actor; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);
const { ForceExecutor } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-executor.js');
const { SuiteInstanceRecovery, suiteKindForActivationDomain, verifyRegainProof } = await import('/systems/foundryvtt-swse/scripts/engine/force/suite-instance-recovery.js');
const { StarshipManeuverSuite } = await import('/systems/foundryvtt-swse/scripts/engine/force/starship-maneuver-suite.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
SWSEChat.postHTML = async () => ({});
let passed = 0;
const check = (name) => { passed += 1; console.log(`PASS ${passed}: ${name}`); };

const inst = (id, type, discarded, extra = {}) => ({ id, name: `${type} ${id}`, type, system: { discarded, ...extra } });
const mkActor = (items, id = 'jedi') => {
  const a = makeActor({ normal: 3, max: 6 });
  a.id = id; a.name = id; a.isOwner = true;
  a.items = items; a.items.get = (i) => items.find(p => p.id === i);
  return a;
};
const embeddedCalls = [];
const savedEmbedded = ActorEngine.updateEmbeddedDocuments; const savedOwned = ActorEngine.updateOwnedItems;
const applyItems = async (actor, updates) => { for (const u of updates) { const it = actor.items.find(i => i.id === u._id); for (const [k, v] of Object.entries(u)) if (k.startsWith('system.')) it.system[k.slice(7)] = v; } return updates; };
ActorEngine.updateEmbeddedDocuments = async (actor, type, updates) => { embeddedCalls.push({ type, updates }); return applyItems(actor, updates); };
ActorEngine.updateOwnedItems = async (actor, updates) => { embeddedCalls.push({ type: 'Item', updates }); return applyItems(actor, updates); };
ActorEngine.updateActor = writer;
const combatWith = (actors, extra = {}) => ({ started: true, id: 'c1', round: 2, turn: 0, combatants: actors.map(a => ({ id: `${a.id}-cb`, actor: a })), get combatant() { return this.combatants[this.turn]; }, ...extra });
const states = (a) => a.items.map(i => i.system.discarded);

try {
  {
    assert.equal(suiteKindForActivationDomain('force-power.activation'), 'force-power');
    assert.equal(suiteKindForActivationDomain('starship-maneuver.activation'), 'maneuver');
    for (const d of ['skill.useTheForce', 'skill.pilot', 'force-talent.target-sense', 'force-regimen.activation', 'attack.melee']) assert.equal(suiteKindForActivationDomain(d), null, d);
    check('only a Force Power activation check or a maneuver Pilot activation check can start a natural-20 regain; unrelated UTF/Pilot/Target Sense checks cannot');
  }
  {
    globalThis.Roll = class { constructor(f) { this.formula = f; this.terms = []; } async evaluate() { this.total = 25; this.dice = [{ faces: 20, results: [{ result: globalThis.__d20, active: true }] }]; return this; } };
    const run = async (domain, d20) => { globalThis.__d20 = d20; const a = mkActor([]); globalThis.game.combat = combatWith([a]); const r = await RollCore.execute({ actor: a, domain, baseBonus: 5, rollOptions: { baseDice: '1d20' }, rollData: {}, context: {} }); return { a, r }; };
    const power20 = await run('force-power.activation', 20);
    assert.equal(power20.r.success, true, JSON.stringify(power20.r));
    assert.deepEqual(Object.keys(power20.a.flags.swse.pendingSuiteRegain), ['force-power']);
    assert.equal(power20.a.system.forcePoints.value, 3, 'no Force Point is awarded');
    assert.deepEqual(Object.keys((await run('starship-maneuver.activation', 20)).a.flags.swse.pendingSuiteRegain), ['maneuver']);
    for (const d of ['skill.useTheForce', 'skill.pilot', 'force-talent.target-sense']) assert.equal((await run(d, 20)).a.flags.swse.pendingSuiteRegain, undefined, `${d}: not an activation check`);
    assert.equal((await run('force-power.activation', 19)).a.flags.swse.pendingSuiteRegain, undefined);
    check('RollCore: natural 20 on a Force Power activation records the Force suite regain; on a maneuver Pilot activation the maneuver suite; nothing else');
  }
  {
    // End of the actor's turn, only for the matching suite, only that combat, replay-safe.
    const jedi = mkActor([inst('p1', 'force-power', true), inst('p1b', 'force-power', true), inst('p2', 'force-power', false), inst('m1', 'maneuver', true), inst('m2', 'maneuver', true)]);
    const other = mkActor([inst('o1', 'force-power', true)], 'other');
    globalThis.game.combat = combatWith([jedi, other]);
    await SuiteInstanceRecovery.recordNatural20(jedi, 'force-power');
    await SuiteInstanceRecovery.recordNatural20(other, 'force-power'); // rolled by 'other' on ITS own combatant
    const combat = { ...globalThis.game.combat, previous: { combatantId: 'jedi-cb' } };
    const done = await SuiteInstanceRecovery.regainAtEndOfTurn(combat);
    assert.deepEqual(done.map(d => [d.kind, d.recovered]), [['force-power', 2]], 'two spent Power copies regained; the maneuver suite had no natural 20');
    assert.deepEqual(jedi.items.map(i => [i.id, i.system.discarded]), [['p1', false], ['p1b', false], ['p2', false], ['m1', true], ['m2', true]]);
    assert.deepEqual(states(other), [true], 'another actor\'s pending regain waits for its own turn');
    assert.deepEqual(await SuiteInstanceRecovery.regainAtEndOfTurn(combat), [], 'replay: the record was consumed');
    assert.deepEqual(await SuiteInstanceRecovery.regainAtEndOfTurn({ ...combat, id: 'c9' }), [], 'a record from another combat is ignored');
    check('end of turn: regains every spent copy of the matching suite for the combatant whose turn ended; consumed once; stale/other-combat records ignored');
  }
  {
    const a = mkActor([inst('p1', 'force-power', true), inst('m1', 'maneuver', true)]);
    const noProof = await SuiteInstanceRecovery.regainAllSpent(a, 'force-power', {});
    assert.equal(noProof.success, false); assert.deepEqual(states(a), [true, true], 'no proof, no regain');
    assert.equal((await ForceExecutor.recoverForcePowers(a, null)).success, false, 'the old unconditional Recover All is gone');
    assert.equal((await SuiteInstanceRecovery.regainAllSpent(a, 'force-power', { proof: { kind: 'natural-20' } })).success, false, 'a claimed natural 20 with no pending record is refused');
    globalThis.game.user = { id: 'player', isGM: false };
    assert.equal((await ForceExecutor.recoverForcePowers(a, null, { proof: { kind: 'gm', reason: 'x' } })).success, false, 'a player cannot self-adjudicate');
    globalThis.game.user = { id: 'gm', isGM: true };
    assert.equal((await ForceExecutor.recoverForcePowers(a, null, { proof: { kind: 'gm', reason: '  ' } })).success, false, 'a reason is mandatory');
    assert.equal((await ForceExecutor.recoverForcePowers(a, null, { proof: { kind: 'gm', reason: 'table ruling' } })).recovered, 1);
    check('Recover All needs a proof; unconditional sheet recovery, forged natural 20 and self-adjudication are refused');
  }
  {
    // Rest: combat over AND a GM-confirmed rest of at least a minute. Deleting the Combat is not a rest.
    const a = mkActor([inst('p1', 'force-power', true), inst('m1', 'maneuver', true)]);
    globalThis.game.actors = { get: (id) => (id === 'jedi' ? a : null) };
    globalThis.game.combat = null;
    const event = { triggeredByGM: true, duration: 60, durationUnit: 'minutes', actorIds: ['jedi'] };
    assert.equal(verifyRegainProof(a, 'force-power', { kind: 'rest', event: { ...event, triggeredByGM: false } }).valid, false);
    assert.equal(verifyRegainProof(a, 'force-power', { kind: 'rest', event: { ...event, duration: 0 } }).valid, false, 'no minute of rest');
    // Units are explicit: 59 seconds is not a minute, 60 seconds is; a bare number with no unit is never guessed.
    assert.equal(verifyRegainProof(a, 'force-power', { kind: 'rest', event: { ...event, duration: 59, durationUnit: 'seconds' } }).valid, false);
    assert.equal(verifyRegainProof(a, 'force-power', { kind: 'rest', event: { ...event, duration: 60, durationUnit: 'seconds' } }).valid, true);
    assert.equal(verifyRegainProof(a, 'force-power', { kind: 'rest', event: { ...event, duration: 0.5 } }).valid, false);
    assert.equal(verifyRegainProof(a, 'force-power', { kind: 'rest', event: { ...event, durationUnit: undefined } }).valid, false, 'no unit stated');
    // A player client forging `triggeredByGM: true` is refused: rests are applied only on a GM client.
    globalThis.game.user = { id: 'player', isGM: false };
    assert.equal(verifyRegainProof(a, 'force-power', { kind: 'rest', event }).valid, false);
    assert.equal((await SuiteInstanceRecovery.regainAllSpent(a, 'force-power', { proof: { kind: 'rest', event } })).success, false);
    globalThis.game.user = { id: 'gm', isGM: true };
    assert.equal(verifyRegainProof(a, 'force-power', { kind: 'rest', event: { ...event, actorIds: ['someone-else'] } }).valid, false);
    globalThis.game.combat = combatWith([a]);
    assert.deepEqual(await SuiteInstanceRecovery.regainAfterRest(event), [], 'combat is not over for this actor');
    assert.deepEqual(states(a), [true, true]);
    globalThis.game.combat = null;
    const done = await SuiteInstanceRecovery.regainAfterRest(event);
    assert.deepEqual(done.map(d => [d.kind, d.recovered]), [['force-power', 1], ['maneuver', 1]]);
    assert.deepEqual(states(a), [false, false]);
    const { readFileSync } = await import('node:fs');
    const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
    assert.ok(!/deleteCombat/.test(read('scripts/infrastructure/hooks/force-power-hooks.js').replace(/\/\/.*$/gm, '').split('Hooks.on(\'deleteCombat\'').slice(1).join('')) || !/Hooks\.on\('deleteCombat'/.test(read('scripts/infrastructure/hooks/force-power-hooks.js')), 'no deleteCombat suite recovery');
    assert.ok(!/Hooks\.on\('deleteCombat'/.test(read('scripts/infrastructure/hooks/starship-maneuver-hooks.js')), 'no deleteCombat maneuver recovery');
    assert.ok(/Hooks\.on\('restCompleted'/.test(read('scripts/infrastructure/hooks/force-power-hooks.js')));
    check('rest recovery: GM-confirmed rest of >= 1 minute naming the actor, combat over; Combat deletion alone recovers nothing');
  }
  {
    // Canonical field + effect independence + multiple copies.
    const a = mkActor([inst('c1', 'force-power', true, { name: 'Move Object' }), inst('c2', 'force-power', true), inst('c3', 'force-power', true)]);
    a.items[0].name = a.items[1].name = a.items[2].name = 'Move Object';
    a.items.push({ id: 'legacy', name: 'Legacy', type: 'force-power', system: { spent: true } });
    embeddedCalls.length = 0;
    await ActorEngine.updateActor(a, { 'flags.swse.pendingSuiteRegain': { 'force-power': { combatId: null } } });
    const r = await SuiteInstanceRecovery.regainAllSpent(a, 'force-power', { proof: { kind: 'natural-20' } });
    assert.equal(r.recovered, 3, 'three separate copies of the same Power are three instances');
    assert.equal(a.items[3].system.spent, true, 'the legacy `spent` field is not a state authority and is not rewritten');
    assert.ok(embeddedCalls.every(c => c.type === 'Item'), 'only owned instances change; maintained effects are untouched');
    assert.equal(a.flags.swse.pendingSuiteRegain, null);
    // Paid recovery: exactly one selected instance, validated before debit.
    const b = mkActor([inst('x1', 'force-power', true), inst('x2', 'force-power', true), inst('x3', 'force-power', false)], 'b');
    const bad = await ForceExecutor.recoverForcePowers(b, ['x3']);
    assert.equal(bad.success, false); assert.equal(b.system.forcePoints.value, 3, 'a ready/invalid instance never costs a Force Point');
    assert.equal((await ForceExecutor.recoverForcePowers(b, ['x1', 'x2'])).success, false, 'one instance per Force Point');
    const ok = await ForceExecutor.recoverForcePowers(b, ['x2']);
    assert.equal(ok.success, true); assert.deepEqual(states(b), [true, false, false], 'only the selected copy is regained');
    assert.equal(b.system.forcePoints.value, 2);
    check('multiple copies are independent instances; legacy spent is no authority; recovery never touches effects; paid recovery = exactly one selected instance, validated before the debit');
  }
  {
    // Maneuver paid recovery: same contract (receipt, rollback, one instance), no Force Readiness requirement.
    const pilot = mkActor([inst('m1', 'maneuver', true), inst('m2', 'maneuver', true), inst('m3', 'maneuver', false)], 'pilot');
    globalThis.game.combat = combatWith([mkActor([], 'foe'), pilot]); globalThis.game.combat.turn = 0; // the pilot is acting off turn: a reaction
    globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
    assert.equal(await StarshipManeuverSuite.regainOwnedManeuver(pilot, 'm3'), false, 'a ready maneuver costs nothing');
    assert.equal(pilot.system.forcePoints.value, 3);
    assert.equal(await StarshipManeuverSuite.regainOwnedManeuver(pilot, 'm1'), true);
    assert.deepEqual(states(pilot), [false, true, false]);
    assert.equal(pilot.system.forcePoints.value, 2);
    assert.equal(pilot.flags.swse.forcePointLedger.receipts[0].state, 'finalized');
    await assert.rejects(() => ActorEngine.spendForcePoints(pilot, 1, { useKind: 'recover-one-maneuver', targetItemInstanceId: 'm1', requestId: pilot.flags.swse.forcePointLedger.receipts[0].requestId }), /already been used|Duplicate|ready|owned spent/i, 'replay of the same request is refused');
    check('maneuver paid recovery: one selected spent instance by FP reaction (off turn, no Force Readiness), invalid selection free, receipt finalized, replay refused');
  }
  {
    const { readFileSync } = await import('node:fs');
    const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
    for (const f of ['scripts/engine/force/force-executor.js', 'scripts/engine/force/starship-maneuver-suite.js', 'scripts/infrastructure/hooks/force-power-hooks.js', 'scripts/sheets/v2/character-like-sheet.js']) {
      assert.ok(!/system\??\.spent\b|'system\.spent'/.test(read(f)), `${f} no longer reads or writes the legacy spent field`);
    }
    assert.ok(!/recordNatural20/.test(read('scripts/engine/force/force-engine.js')), 'the Force Point natural-20 award is gone');
    check('source: legacy `spent` removed from the suite authorities');
  }
} finally {
  ActorEngine.updateEmbeddedDocuments = savedEmbedded; ActorEngine.updateOwnedItems = savedOwned;
  restore();
  delete globalThis.game.combat;
}
console.log(`Force V2 03C suite recovery: ${passed} assertion groups completed.`);
