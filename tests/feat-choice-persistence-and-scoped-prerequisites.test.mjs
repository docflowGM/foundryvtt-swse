import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Feat Choice Persistence & Scoped-Feat Integrity task.
//
// Phase 6 (embedded feat hydration): a canonical embedded feat must remain
// correctly scoped even when its display name carries no parenthetical —
// i.e. structured system.selectedChoice, not name-parsing, is what
// FeatChoiceResolver and the live legality path actually read.
//
// Phase 7 (scoped prerequisite matching backcheck, through the real
// production PrerequisiteChecker / AbilityEngine — not a reimplementation):
// correct-scope passes, wrong-scope fails, and an UNSCOPED base feat
// (owned, but with no selectedChoice at all) must not incorrectly satisfy a
// prerequisite that requires a specific scope.
//
// Phase 8 (chained choice families): Double Attack -> Triple Attack, which
// FEAT_PREREQUISITE_AUTHORITY records as requiring "Double Attack (Chosen
// Weapon)" — the same weapon scope, not just "has Double Attack".

registerFoundryPathLoader();
installFoundryShimGlobals();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FeatRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/feat-registry.js');
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'feat-catalog.json'), 'utf8'));
FeatRegistry._resetIndexes();
FeatRegistry._indexDocuments(catalog);
FeatRegistry._initialized = true;

const { FeatChoiceResolver } = await import('/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js');
const { PrerequisiteChecker } = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');
const { AbilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js');

function makeActor(items = [], overrides = {}) {
  return {
    id: overrides.id ?? 'test-actor',
    name: overrides.name ?? 'Test Actor',
    type: overrides.type ?? 'character',
    system: { abilities: {}, ...overrides.system },
    items,
    flags: {},
  };
}

// Builds a realistic embedded feat item: catalog system data (including
// choiceMeta, exactly as feat-talent-plan-builder.js clones it onto a real
// embedded item) plus the given system overrides — NOT a hand-rolled stub
// missing choiceMeta, which no real acquisition path would ever produce.
function embeddedFeatItem(name, systemOverrides = {}) {
  const entry = FeatRegistry.getByName(name);
  assert.ok(entry, `fixture setup: "${name}" must exist in the canonical feat catalog`);
  return {
    type: 'feat',
    name,
    system: { ...JSON.parse(JSON.stringify(entry.system || {})), ...systemOverrides },
  };
}

// ---------------------------------------------------------------------
// Phase 6: embedded feat hydration without name parentheses.
// ---------------------------------------------------------------------
{
  // A canonical embedded item: name has NO parenthetical, choice lives only
  // in structured system.selectedChoice — exactly what chargen/level-up and
  // the (now-fixed) NPC importer produce.
  const weaponFocusItem = embeddedFeatItem('Weapon Focus', { selectedChoice: 'Lightsabers', choiceResolved: true });
  const actor = makeActor([weaponFocusItem]);

  const status = FeatChoiceResolver.getChoiceStatusSync(actor, weaponFocusItem);
  assert.ok(status, 'getChoiceStatusSync must recognize Weapon Focus as a choice-bearing feat');
  assert.equal(status.missing, false, 'a populated system.selectedChoice must not be reported as missing');
  assert.equal(status.choiceKind, 'weapon_focus');
  assert.equal(status.selectedChoice, 'Lightsabers');

  const key = FeatChoiceResolver.getSelectedChoiceKey(FeatChoiceResolver.getStoredChoice(actor, weaponFocusItem));
  assert.equal(key, FeatChoiceResolver.getSelectedChoiceKey('Lightsabers'), 'the resolved choice key must match regardless of the item having no parenthetical name');

  // A missing-choice case: same feat, no selectedChoice at all — must be
  // detected, not silently treated as scoped to nothing/everything.
  const unresolvedItem = embeddedFeatItem('Weapon Focus');
  const unresolvedActor = makeActor([unresolvedItem]);
  const missingStatus = FeatChoiceResolver.getChoiceStatusSync(unresolvedActor, unresolvedItem);
  assert.equal(missingStatus.missing, true, 'an owned scoped feat with no selectedChoice must be reported as missing a choice');
}

// ---------------------------------------------------------------------
// Alias/normalization: the same underlying choice expressed as different
// strings must normalize to the same key (Phase 3 — centralized through
// FeatChoiceResolver, not ad hoc per-caller string munging).
// ---------------------------------------------------------------------
{
  const a = FeatChoiceResolver.getSelectedChoiceKey('Heavy Weapons');
  const b = FeatChoiceResolver.getSelectedChoiceKey('heavy weapons');
  const c = FeatChoiceResolver.getSelectedChoiceKey('Heavy Weapon');
  assert.equal(a, b, 'case must not affect the normalized choice key');
  assert.ok(a && c, 'both singular and plural forms must normalize to a non-empty key');
}

// ---------------------------------------------------------------------
// Phase 7: scoped prerequisite matching backcheck via the real
// PrerequisiteChecker (Heavy Hitter requires "Weapon Focus (Heavy
// Weapons)" specifically — a fixed, non-"chosen weapon" scope).
// ---------------------------------------------------------------------
{
  const heavyHitter = { name: 'Heavy Hitter', type: 'feat', system: {} };

  const rightScope = makeActor([{ type: 'feat', name: 'Weapon Focus', system: { selectedChoice: 'Heavy Weapons' } }]);
  assert.equal(PrerequisiteChecker.checkFeatPrerequisites(rightScope, heavyHitter, {}).met, true, 'Weapon Focus (Heavy Weapons) must satisfy Heavy Hitter');

  const wrongScope = makeActor([{ type: 'feat', name: 'Weapon Focus', system: { selectedChoice: 'Pistols' } }]);
  assert.equal(PrerequisiteChecker.checkFeatPrerequisites(wrongScope, heavyHitter, {}).met, false, 'Weapon Focus (Pistols) must NOT satisfy a Heavy Weapons requirement');

  const unscoped = makeActor([{ type: 'feat', name: 'Weapon Focus', system: {} }]);
  assert.equal(PrerequisiteChecker.checkFeatPrerequisites(unscoped, heavyHitter, {}).met, false, 'an unscoped/unresolved Weapon Focus must NOT incorrectly satisfy a scoped requirement');

  const none = makeActor([]);
  assert.equal(PrerequisiteChecker.checkFeatPrerequisites(none, heavyHitter, {}).met, false, 'no Weapon Focus at all must fail');

  // Same three scenarios through the public AbilityEngine.evaluateAcquisition
  // door (PR #941's contract), not just the internal checker.
  assert.equal(AbilityEngine.evaluateAcquisition(rightScope, heavyHitter).legal, true);
  assert.equal(AbilityEngine.evaluateAcquisition(wrongScope, heavyHitter).legal, false);
  assert.equal(AbilityEngine.evaluateAcquisition(unscoped, heavyHitter).legal, false);
}

// Skill Focus scoped prerequisite (Acrobatic Dodge requires "Skill Focus
// (Acrobatics)" specifically).
{
  const acrobaticDodge = { name: 'Acrobatic Dodge', type: 'feat', system: {} };
  function actorWithSkillFocus(skill) {
    return makeActor([
      { type: 'feat', name: 'Mobility', system: {} },
      { type: 'feat', name: 'Skill Focus', system: skill ? { selectedChoice: skill } : {} },
    ], { system: { abilities: { dex: { total: 13, value: 13 } } } });
  }

  assert.equal(PrerequisiteChecker.checkFeatPrerequisites(actorWithSkillFocus('Acrobatics'), acrobaticDodge, {}).met, true, 'Skill Focus (Acrobatics) must satisfy Acrobatic Dodge');
  assert.equal(PrerequisiteChecker.checkFeatPrerequisites(actorWithSkillFocus('Mechanics'), acrobaticDodge, {}).met, false, 'Skill Focus (Mechanics) must NOT satisfy an Acrobatics requirement');
  assert.equal(PrerequisiteChecker.checkFeatPrerequisites(actorWithSkillFocus(null), acrobaticDodge, {}).met, false, 'an unresolved Skill Focus must NOT incorrectly satisfy a scoped requirement');
}

// ---------------------------------------------------------------------
// Phase 8: chained choice family — Double Attack -> Triple Attack must
// require the SAME weapon scope, per FEAT_PREREQUISITE_AUTHORITY's
// "Double Attack (Chosen Weapon)" text.
// ---------------------------------------------------------------------
{
  const tripleAttack = { name: 'Triple Attack', type: 'feat', system: {} };
  function actorWithDoubleAttack(scope) {
    return makeActor([
      { type: 'feat', name: 'Weapon Proficiency (Pistols)', system: {} },
      { type: 'feat', name: 'Double Attack', system: { selectedChoice: scope } },
    ], { system: { bab: { total: 15 }, abilities: {} } });
  }

  const matching = PrerequisiteChecker.checkFeatPrerequisites(actorWithDoubleAttack('Pistols'), tripleAttack, { selectedChoice: 'Pistols' });
  assert.equal(matching.met, true, 'Triple Attack (Pistols) must be legal when the actor has Double Attack (Pistols)');

  const mismatched = PrerequisiteChecker.checkFeatPrerequisites(actorWithDoubleAttack('Pistols'), tripleAttack, { selectedChoice: 'Rifles' });
  assert.equal(mismatched.met, false, 'Triple Attack (Rifles) must be illegal when the actor only has Double Attack (Pistols)');
}

console.log('OK: embedded-feat choice hydration (no name parsing needed), choice-key alias normalization, and scoped prerequisite matching (Weapon Focus/Skill Focus/chained Double->Triple Attack: right-scope pass, wrong-scope fail, unscoped-does-not-satisfy) all verified through the real production FeatChoiceResolver/PrerequisiteChecker/AbilityEngine.');
