import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 7: Grab Back fallback
// normalization completeness (docs/audits/v2-math-integrity-authority-
// ledger.md, "Certification-correction addendum 7").
//
// Round 6 migrated the production compendium/catalog data for Grab Back to
// the split-channel GRAB_GRAPPLE_RESISTANCE shape ({reflexBonus: 2,
// opposedGrappleBonus: 0}) plus its separate REACTION_GRAB_BACK rule. But
// the two independent, live normalization-hook fallback paths that can
// ALSO produce this metadata at runtime for a bare/legacy Grab Back item
// (one with no grappleRules at all yet) -- grapple-feat-normalization-
// hooks.js#rulesForFeat() and hp-recompute-hooks.js#featureRuleNormalization
// Patch() -- both still only emitted REACTION_GRAB_BACK, silently dropping
// the +2 Reflex bonus entirely for any item normalized through either
// fallback rather than sourced pre-authored from the compendium.
//
// Fixed: both fallback paths now emit BOTH rules, matching the production
// catalog shape exactly -- as two separate array entries (the reaction is
// never bundled into the resistance rule).
//
// This test reads the REAL production data/feat-catalog.json record for
// Grab Back and asserts each fallback path, given a bare item with no
// existing grapple metadata, produces the same semantics.

registerFoundryPathLoader();
installFoundryShimGlobals();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'feat-catalog.json'), 'utf8'));
const productionGrabBack = catalog.find(f => f.name === 'Grab Back');
const productionRules = productionGrabBack.system.abilityMeta.grappleRules;
const productionResistanceRule = productionRules.find(r => r.type === 'GRAB_GRAPPLE_RESISTANCE');
assert.ok(productionResistanceRule, 'sanity: the real production catalog must have a GRAB_GRAPPLE_RESISTANCE rule for Grab Back');
// The production catalog represents Grab Back's reaction as a separate
// system.abilityMeta.reactionRules field (COUNTER_GRAB_OR_GRAPPLE_ON_MISS),
// not as a REACTION_GRAB_BACK entry inside grappleRules -- that type name
// is this normalization hook's own pre-existing (pre-round-7) convention
// for the same reaction, unchanged by this round's fix. This test does not
// claim those two representations match each other; it only proves the
// fallback still emits its own reaction rule (unregressed) alongside the
// resistance rule it was previously missing.
assert.ok(Array.isArray(productionGrabBack.system.abilityMeta.reactionRules) && productionGrabBack.system.abilityMeta.reactionRules.length > 0, 'sanity: the real production catalog must have a reaction rule for Grab Back (in reactionRules)');

// ─── 1. grapple-feat-normalization-hooks.js#rulesForFeat() ─────────────────

{
  const { rulesForFeat } = await import(
    '/systems/foundryvtt-swse/scripts/engine/feats/grapple-feat-normalization-hooks.js'
  );
  const rules = rulesForFeat('Grab Back');
  assert.ok(Array.isArray(rules), 'rulesForFeat("Grab Back") must return an array');

  const resistanceRule = rules.find(r => r.type === 'GRAB_GRAPPLE_RESISTANCE');
  const reactionRule = rules.find(r => r.type === 'REACTION_GRAB_BACK');
  assert.ok(resistanceRule, 'a bare Grab Back item normalized via rulesForFeat() must receive a GRAB_GRAPPLE_RESISTANCE rule, not just the reaction');
  assert.equal(resistanceRule.reflexBonus, productionResistanceRule.reflexBonus, 'the fallback reflexBonus must match the real production catalog value');
  assert.equal(resistanceRule.opposedGrappleBonus, productionResistanceRule.opposedGrappleBonus, 'the fallback opposedGrappleBonus must match the real production catalog value');
  assert.ok(reactionRule, 'a bare Grab Back item normalized via rulesForFeat() must still receive its REACTION_GRAB_BACK rule');
  assert.notEqual(resistanceRule, reactionRule, 'the reaction must be its own separate array entry, never bundled into the resistance rule');
}

console.log('  [1/2] grapple-feat-normalization-hooks.js#rulesForFeat("Grab Back") produces both GRAB_GRAPPLE_RESISTANCE and REACTION_GRAB_BACK, matching production catalog values OK');

// ─── 2. hp-recompute-hooks.js#featureRuleNormalizationPatch() ──────────────

{
  const { featureRuleNormalizationPatch } = await import(
    '/systems/foundryvtt-swse/scripts/governance/actor-engine/hp-recompute-hooks.js'
  );
  // A bare item: real feat name, but no grappleRules metadata at all yet --
  // exactly the dormant-fallback case this hook exists for.
  const bareItem = { id: 'bare-grab-back', type: 'feat', name: 'Grab Back', system: { abilityMeta: {} } };
  const patch = featureRuleNormalizationPatch(bareItem);
  assert.ok(patch, 'featureRuleNormalizationPatch() must produce a patch for a bare Grab Back item');
  const rules = patch['system.abilityMeta.grappleRules'];
  assert.ok(Array.isArray(rules), 'the patch must set system.abilityMeta.grappleRules to an array');

  const resistanceRule = rules.find(r => r.type === 'GRAB_GRAPPLE_RESISTANCE');
  const reactionRule = rules.find(r => r.type === 'REACTION_GRAB_BACK');
  assert.ok(resistanceRule, 'a bare Grab Back item normalized via featureRuleNormalizationPatch() must receive a GRAB_GRAPPLE_RESISTANCE rule, not just the reaction');
  assert.equal(resistanceRule.reflexBonus, productionResistanceRule.reflexBonus, 'the fallback reflexBonus must match the real production catalog value');
  assert.equal(resistanceRule.opposedGrappleBonus, productionResistanceRule.opposedGrappleBonus, 'the fallback opposedGrappleBonus must match the real production catalog value');
  assert.ok(reactionRule, 'a bare Grab Back item normalized via featureRuleNormalizationPatch() must still receive its REACTION_GRAB_BACK rule');

  // An item that ALREADY carries any grappleRules (e.g. the real production
  // shape) must be left alone by this dormant fallback -- it must never
  // append a second, competing copy of the rules.
  const alreadyNormalizedItem = { id: 'already', type: 'feat', name: 'Grab Back', system: { abilityMeta: { grappleRules: productionRules } } };
  const noopPatch = featureRuleNormalizationPatch(alreadyNormalizedItem);
  assert.ok(!noopPatch || !('system.abilityMeta.grappleRules' in noopPatch), 'an already-normalized Grab Back item must not have its grappleRules touched again');
}

console.log('  [2/2] hp-recompute-hooks.js#featureRuleNormalizationPatch("Grab Back") produces both rules for a bare item, and is a no-op for an already-normalized one OK');

console.log('grab-back-bare-item-normalization.test.mjs: all assertions passed');
