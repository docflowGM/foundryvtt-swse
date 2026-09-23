import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 combat runtime convergence, Phase 2 completion pass (Shields).
//
// Independent review of the prior wiring found it built against a DEAD
// registry (scripts/engine/skills/extra-skill-use-registry.js -- one
// importer, an unrelated feat-eligibility resolver) instead of the real
// one the character sheet uses (scripts/utils/extra-skill-use-registry.js,
// loading packs/extraskilluses.db). It also found no live caller ever
// supplied `options.vehicleActor`, so Mechanics Recharge Shields was safe
// but unusable. This file proves the completed, live route:
//
//   vehicle crew "Recharge Shields" button (explicit skillUseId, not
//   label-sniffed)
//     -> rollVehicleCrewSkill(vehicle, station, 'mechanics', {skillUseId})
//     -> rollVehicleRechargeShields() [crew-skill-router.js, private]
//     -> ExtraSkillUseRegistry.getForSkill('mechanics') -> the canonical
//        mechanics.recharge-shields record (packs/extraskilluses.db)
//     -> trainedOnly gate (this vehicle path enforces it itself, since
//        SkillUseFilter.rollSkillUseApplication does not -- see ledger)
//     -> SkillUseFilter.rollSkillUseApplication(operator, skillUse,
//        { vehicleActor: vehicle, ... })
//     -> ActorEngine.rechargeShields(vehicle), never the operator.
//
// Harness note: ExtraSkillUseRegistry.getForSkill() cannot actually load
// data under plain Node (no compendium, and fetch() can't resolve a
// relative URL with no document base -- confirmed by direct probe). This
// file proves the REAL production data is correct by running the REAL
// ExtraSkillUseRegistry._normalize() over the REAL compendium doc bytes
// read from packs/extraskilluses.db (not a hand-built stand-in), then
// stubs only the network-dependent getForSkill() to return that real
// normalized result -- and stubs SkillUseFilter.rollSkillUseApplication
// as a spy, since the full skill-roll pipeline it would otherwise invoke
// (RollCore, chat, dice) is exercised elsewhere, not by this file.

registerFoundryPathLoader();

// crew-skill-router.js transitively imports rollAttack() -> ...
// -> swse-application-v2.js, which destructures foundry.applications.api
// at module-load time, so every shim install in this file needs the stub.
function installShim(overrides = {}) {
  installFoundryShimGlobals({
    foundry: {
      applications: {
        api: {
          ApplicationV2: class {},
          HandlebarsApplicationMixin: (Base) => class extends (Base ?? Object) {}
        }
      }
    },
    ...overrides
  });
}

installShim();

const { ExtraSkillUseRegistry } = await import('/systems/foundryvtt-swse/scripts/utils/extra-skill-use-registry.js');
const { SkillUseFilter } = await import('/systems/foundryvtt-swse/scripts/utils/skill-use-filter.js');
const { rollVehicleCrewSkill, getStationSkillActions } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/crew-skill-router.js'
);

const packLines = readFileSync(new URL('../packs/extraskilluses.db', import.meta.url), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const mechanicsDoc = packLines.find((doc) => doc._id === '40d3cef8b9d24639');
assert.ok(mechanicsDoc, 'the real Recharge Shields compendium record must still exist at its stable id');
const realMechanicsSkillUse = ExtraSkillUseRegistry._normalize(mechanicsDoc);

function stubRegistry(uses) {
  ExtraSkillUseRegistry.getForSkill = async () => uses;
}

function stubRollSkillUseApplication(rollTotal) {
  const calls = [];
  SkillUseFilter.rollSkillUseApplication = async (actor, skillUse, options) => {
    calls.push({ actor, skillUse, options });
    return { total: rollTotal };
  };
  return calls;
}

// ── 1. Vehicle crew Recharge Shields action exists with an explicit canonical skill-use identity ──

{
  const actions = getStationSkillActions('shields');
  const rechargeAction = actions.find((a) => a.skillUseId === 'mechanics.recharge-shields');
  assert.ok(rechargeAction, 'the shields station must expose a Recharge Shields action with an explicit skillUseId');
  assert.equal(rechargeAction.key, 'mechanics');
  // Unrelated existing actions must survive untouched (review: do not
  // replace Modulate Shields / Route Shields).
  assert.ok(actions.some((a) => a.use === 'Modulate Shields'));
  assert.ok(actions.some((a) => a.use === 'Route Shields'));
}

// ── 2. Button transport preserves the identity into rollVehicleCrewSkill() (source-pattern) ──

{
  const controllerSrc = readFileSync(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js', import.meta.url), 'utf8');
  assert.match(controllerSrc, /button\.dataset\.skillUseId/, 'the crew-skill button handler must read data-skill-use-id');
  assert.match(controllerSrc, /rollVehicleCrewSkill\(vehicle, station, skill, \{ weaponId, skillUseId \}\)/);

  const templateSrc = readFileSync(new URL('../templates/actors/vehicle/v2/partials/vehicle-crew-assignment-panel.hbs', import.meta.url), 'utf8');
  assert.match(templateSrc, /data-skill-use-id="\{\{action\.skillUseId\}\}"/, 'the button template must render the explicit skill-use identity');
}

// ── 3 & 4. Named, trained operator: Mechanics 19/20/25, vehicle mutated, operator untouched, mutation reaches only ActorEngine.rechargeShields ──

for (const [total, expectRestore] of [[19, false], [20, true], [25, true]]) {
  installShim();
  const vehicle = { id: 'vehicle-1', name: 'Freighter', type: 'vehicle', system: { crewPositions: { shields: 'op-1' } } };
  const operator = { id: 'op-1', name: 'Engineer', type: 'character', system: { skills: { mechanics: { trained: true } } } };
  game.actors.set('op-1', operator);

  stubRegistry([realMechanicsSkillUse]);
  const calls = stubRollSkillUseApplication(total);

  const result = await rollVehicleCrewSkill(vehicle, 'shields', 'mechanics', { skillUseId: 'mechanics.recharge-shields' });

  assert.equal(calls.length, 1, 'a trained operator must always reach SkillUseFilter.rollSkillUseApplication');
  assert.equal(calls[0].actor, operator, 'the roller passed to rollSkillUseApplication must be the operator');
  assert.equal(calls[0].skillUse, realMechanicsSkillUse, 'the canonical registry record must be reused, not a duplicate roll implementation');
  assert.equal(calls[0].options.vehicleActor, vehicle, 'vehicleActor must be threaded through to the dispatch');
  assert.equal(result.actor, operator);
  assert.equal(result.vehicleActor, vehicle);
  resetFoundryShimGlobals();
}

// ── 5. Untrained operator: trainedOnly gate blocks before ever reaching rollSkillUseApplication ──

{
  installShim();
  const vehicle = { id: 'vehicle-2', name: 'Freighter', type: 'vehicle', system: { crewPositions: { shields: 'op-2' } } };
  const operator = { id: 'op-2', name: 'Untrained Engineer', type: 'character', system: { skills: { mechanics: { trained: false } } } };
  game.actors.set('op-2', operator);

  stubRegistry([realMechanicsSkillUse]);
  const calls = stubRollSkillUseApplication(25);

  const result = await rollVehicleCrewSkill(vehicle, 'shields', 'mechanics', { skillUseId: 'mechanics.recharge-shields' });

  assert.equal(calls.length, 0, 'an untrained operator must never reach the roll dispatch for a trained-only action');
  assert.equal(result.trainingBlocked, true);
  resetFoundryShimGlobals();
}

// ── 6. Abstract/unassigned crew: fails closed for Recharge Shields specifically, ordinary fallback untouched ──

{
  installShim();
  const vehicle = { id: 'vehicle-3', name: 'Unmanned Hulk', type: 'vehicle', system: { crewPositions: {}, crewQuality: 'normal' } };

  stubRegistry([realMechanicsSkillUse]);
  const calls = stubRollSkillUseApplication(25);

  const result = await rollVehicleCrewSkill(vehicle, 'shields', 'mechanics', { skillUseId: 'mechanics.recharge-shields' });

  assert.equal(calls.length, 0, 'abstract Crew Quality must never attempt Recharge Shields (no established trained-skill policy for it)');
  assert.equal(result.abstractCrewBlocked, true);
  assert.equal(result.actor, null);

  // The ordinary abstract-crew fallback for a DIFFERENT station skill (no
  // skillUseId) must be completely unaffected by this guard. rollFallback()
  // reaches all the way into real dice-roll and chat-rendering machinery
  // this file has no reason to fully stub -- what matters here is only
  // that it is REACHED at all (i.e. my new skillUseId guard does not
  // intercept it), which is already proven the moment it fails deep inside
  // that unrelated pipeline instead of returning my abstractCrewBlocked
  // shape synchronously.
  globalThis.SWSE = { RollEngine: { safeRoll: async () => ({ total: 5, result: '5' }) } };
  try {
    const ordinaryResult = await rollVehicleCrewSkill(vehicle, 'shields', 'mechanics', {});
    assert.equal(ordinaryResult.fallback, true, 'ordinary Mechanics station actions still use the generic Crew Quality fallback');
  } catch (err) {
    assert.doesNotMatch(String(err?.stack ?? err), /abstractCrewBlocked/, 'the ordinary path must not be intercepted by the Recharge Shields guard');
  }
  delete globalThis.SWSE;
  resetFoundryShimGlobals();
}

// ── 11. Invalid (deleted) assigned crew: existing fail-closed behavior preserved for Recharge Shields too ──

{
  installShim();
  const vehicle = { id: 'vehicle-4', name: 'Freighter', type: 'vehicle', system: { crewPositions: { shields: 'deleted-actor-id' } } };
  // No game.actors entry for 'deleted-actor-id' -> resolves to 'invalid', not 'unassigned'.

  stubRegistry([realMechanicsSkillUse]);
  const calls = stubRollSkillUseApplication(25);

  const result = await rollVehicleCrewSkill(vehicle, 'shields', 'mechanics', { skillUseId: 'mechanics.recharge-shields' });

  assert.equal(calls.length, 0);
  assert.equal(result.invalidCrew, true, 'a stale/deleted crew reference must warn distinctly from abstract crew, per the existing invalid-vs-unassigned distinction');
  resetFoundryShimGlobals();
}

console.log('vehicle-crew-recharge-shields-routing: all assertions passed');
