import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 8 (feat source/prerequisite integrity task): behavioral coverage of
// the PUBLIC acquisition-legality entry point, AbilityEngine.evaluateAcquisition.
//
// Before this test file, zero tests in this repo exercised AbilityEngine or
// evaluateAcquisition (confirmed by a repo-wide grep). This is a first pass
// at real, representative acquisition scenarios, run against the REAL
// production AbilityEngine -> PrerequisiteChecker chain (loaded for real
// under Node via tests/helpers/foundry-shim), not a reimplementation.
//
// Deliberately calls only the public API (AbilityEngine.evaluateAcquisition)
// per the task brief — it does not reach into PrerequisiteChecker internals.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { AbilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js');

// prerequisite-checker.js's legacy-string feat-name recognition
// (resolveCanonicalFeatName, via CanonicalFeatRegistry.getByName) depends on
// FeatRegistry being populated — exactly as it is at real Foundry startup
// (FeatRegistry.initialize() indexes the feats compendium). Without this,
// e.g. a bare "Power Attack" clause inside "Strength 13, Power Attack"
// falls through to an advisory/no-op branch instead of a hard feat check,
// which is a test-harness gap, not production behavior — populate the
// registry from the real canonical catalog so this test exercises the same
// conditions a live world does.
{
  const { FeatRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/feat-registry.js');
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'feat-catalog.json'), 'utf8'));
  FeatRegistry._resetIndexes();
  FeatRegistry._indexDocuments(catalog);
  FeatRegistry._initialized = true;
  assert.ok(FeatRegistry.getAll().length > 300, 'FeatRegistry must be populated from the real catalog before running acquisition scenarios');
}

function makeActor(overrides = {}) {
  return {
    id: overrides.id ?? 'test-actor',
    name: overrides.name ?? 'Test Actor',
    type: overrides.type ?? 'character',
    system: {
      abilities: overrides.abilities ?? {},
      bab: overrides.bab !== undefined ? { total: overrides.bab } : undefined,
      skills: overrides.skills ?? {},
      progression: overrides.progression ?? {},
      species: overrides.species,
      ...overrides.system,
    },
    items: overrides.items ?? [],
    flags: overrides.flags ?? {},
  };
}

function ability(value) {
  return { total: value, value };
}

function featItem(name) {
  return { type: 'feat', name, system: {} };
}

// Each AbilityEngine.evaluateAcquisition call is deterministic per
// (actor, candidate, pending), and the engine memoizes by a cache key built
// from actor/candidate identity. Give every actor a distinct id/name so
// scenarios in this file never collide on that cache.
let actorCounter = 0;
function nextId() {
  actorCounter += 1;
  return `test-actor-${actorCounter}`;
}

// ---------------------------------------------------------------------
// 1. Ability-score prerequisite: Power Attack requires Strength 13.
// ---------------------------------------------------------------------
{
  const below = makeActor({ id: nextId(), abilities: { str: ability(12) } });
  const at = makeActor({ id: nextId(), abilities: { str: ability(13) } });
  const candidate = { name: 'Power Attack', type: 'feat', system: {} };

  const belowResult = AbilityEngine.evaluateAcquisition(below, candidate);
  assert.equal(belowResult.legal, false, 'Str 12 must fail Power Attack (requires Str 13)');

  const atResult = AbilityEngine.evaluateAcquisition(at, candidate);
  assert.equal(atResult.legal, true, 'Str 13 must pass Power Attack');
}

// ---------------------------------------------------------------------
// 2. BAB prerequisite: Charging Fire requires Base Attack Bonus +4.
// ---------------------------------------------------------------------
{
  const below = makeActor({ id: nextId(), bab: 3 });
  const at = makeActor({ id: nextId(), bab: 4 });
  const candidate = { name: 'Charging Fire', type: 'feat', system: {} };

  assert.equal(AbilityEngine.evaluateAcquisition(below, candidate).legal, false, 'BAB +3 must fail Charging Fire (requires +4)');
  assert.equal(AbilityEngine.evaluateAcquisition(at, candidate).legal, true, 'BAB +4 must pass Charging Fire');
}

// ---------------------------------------------------------------------
// 3. Trained-skill prerequisite: Acrobatic Strike requires Trained in
// Acrobatics.
// ---------------------------------------------------------------------
{
  const untrained = makeActor({ id: nextId(), skills: { acrobatics: { trained: false } } });
  const trained = makeActor({ id: nextId(), skills: { acrobatics: { trained: true } } });
  const candidate = { name: 'Acrobatic Strike', type: 'feat', system: {} };

  assert.equal(AbilityEngine.evaluateAcquisition(untrained, candidate).legal, false, 'Untrained Acrobatics must fail Acrobatic Strike');
  assert.equal(AbilityEngine.evaluateAcquisition(trained, candidate).legal, true, 'Trained Acrobatics must pass Acrobatic Strike');
}

// ---------------------------------------------------------------------
// 4. Chained feats: Cleave requires Strength 13 AND Power Attack.
// Covers both an OWNED item and a PENDING (same-progression-sequence,
// not-yet-finalized) feat selection being visible to a later prerequisite
// check. The legacy-string feat check (_checkFeatLegacy ->
// _actorHasNamedItem) reads pending.selectedFeats — NOT
// actor.system.progression.feats (that field only feeds the separate
// structured-condition path via getActorFeats/checkFeats) — so
// pending.selectedFeats is what a real chargen/level-up wizard must pass
// for an earlier-in-sequence feat choice to satisfy a later prerequisite.
// ---------------------------------------------------------------------
{
  const noPowerAttack = makeActor({ id: nextId(), abilities: { str: ability(13) } });
  const withOwnedPowerAttack = makeActor({
    id: nextId(),
    abilities: { str: ability(13) },
    items: [featItem('Power Attack')],
  });
  const pendingSelectionActor = makeActor({ id: nextId(), abilities: { str: ability(13) } });
  const candidate = { name: 'Cleave', type: 'feat', system: {} };

  assert.equal(AbilityEngine.evaluateAcquisition(noPowerAttack, candidate).legal, false, 'Str 13 alone must fail Cleave (also requires Power Attack)');
  assert.equal(AbilityEngine.evaluateAcquisition(withOwnedPowerAttack, candidate).legal, true, 'Owned Power Attack + Str 13 must pass Cleave');
  assert.equal(
    AbilityEngine.evaluateAcquisition(pendingSelectionActor, candidate, { selectedFeats: [{ name: 'Power Attack' }] }).legal,
    true,
    'Power Attack selected earlier in the same progression sequence (pending.selectedFeats) must satisfy Cleave\'s prerequisite'
  );
}

// ---------------------------------------------------------------------
// 5. Force: Force Sensitivity is permanently blocked for droids; Force
// Training requires Force Sensitivity and is not satisfied by merely
// having a feat literally named "Force Training".
// ---------------------------------------------------------------------
{
  const droid = makeActor({ id: nextId(), type: 'droid' });
  const forceSensitivityCandidate = { name: 'Force Sensitivity', type: 'feat', system: {} };
  const droidResult = AbilityEngine.evaluateAcquisition(droid, forceSensitivityCandidate);
  assert.equal(droidResult.legal, false, 'Droids must not be able to acquire Force Sensitivity');
  assert.equal(droidResult.permanentlyBlocked, true, 'Force Sensitivity for a droid must be permanentlyBlocked, not just missing a prereq');

  const noForceSensitivity = makeActor({ id: nextId() });
  const forceTrainingCandidate = { name: 'Force Training', type: 'feat', system: {} };
  assert.equal(
    AbilityEngine.evaluateAcquisition(noForceSensitivity, forceTrainingCandidate).legal,
    false,
    'Force Training must fail without Force Sensitivity'
  );

  // Force Training itself must not be treated as equivalent to Force
  // Sensitivity: an actor whose only Force-flavored feat is "Force
  // Training" (not "Force Sensitivity") must still fail Force Training's
  // own Force-Sensitivity prerequisite.
  const onlyForceTraining = makeActor({ id: nextId(), items: [featItem('Force Training')] });
  assert.equal(
    AbilityEngine.evaluateAcquisition(onlyForceTraining, forceTrainingCandidate).legal,
    false,
    'Having "Force Training" itself must not satisfy Force Training\'s "requires Force Sensitivity" prerequisite'
  );

  const withForceSensitivity = makeActor({ id: nextId(), items: [featItem('Force Sensitivity')] });
  assert.equal(
    AbilityEngine.evaluateAcquisition(withForceSensitivity, forceTrainingCandidate).legal,
    true,
    'Owning Force Sensitivity must pass Force Training\'s prerequisite'
  );
}

// ---------------------------------------------------------------------
// 6. Scoped choice: Weapon Focus requires proficiency with the SPECIFIC
// chosen weapon group, passed via pending.selectedChoice (this is how the
// real feat-choice UI communicates "which group did the user pick" during
// legality checks — see FeatChoiceResolver/_getPrereqWeaponTarget). An
// actor proficient with Pistols choosing "Weapon Focus (Rifles)" must
// fail; choosing "Weapon Focus (Pistols)" must pass.
// ---------------------------------------------------------------------
{
  const pistolProficient = makeActor({ id: nextId(), items: [featItem('Weapon Proficiency (Pistols)')] });
  const candidate = { name: 'Weapon Focus', type: 'feat', system: {} };

  assert.equal(
    AbilityEngine.evaluateAcquisition(pistolProficient, candidate, { selectedChoice: 'Rifles' }).legal,
    false,
    'Weapon Focus (Rifles) must fail for an actor only proficient with Pistols'
  );
  assert.equal(
    AbilityEngine.evaluateAcquisition(pistolProficient, candidate, { selectedChoice: 'Pistols' }).legal,
    true,
    'Weapon Focus (Pistols) must pass for an actor proficient with Pistols'
  );
}

console.log('OK: AbilityEngine.evaluateAcquisition — ability, BAB, trained-skill, chained/pending-feat, Force-Sensitivity/Force-Training, and scoped-weapon-choice scenarios all resolved as expected through the real production PrerequisiteChecker.');
