import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for four more Category C sites from
// docs/audits/ability-schema-authority-migration-phase3-ledger.md (talent/
// feats subsystem): another independently-duplicated "actorAbilityMod"
// helper present in THREE more files beyond the Force-system cluster fixed
// in the previous commit (lightsaber-form-engine.js,
// skill-feat-runtime-patches.js, and combat-option-resolver.js, the last of
// which already called SchemaAdapters.getAbilityMod() first but kept a
// dead, wrongly-ordered fallback tail after it), plus
// feat-grant-entitlement-resolver.js's draft-aware getAbilityModifier(),
// whose score-reconstruction fallback was doubly broken: wrong order
// (abilities before attributes) AND relied on system.attributes.total/
// .value fields that don't exist in the real schema, so it silently
// returned 0 whenever no .mod field was present anywhere. And
// skill-feat-resolver.js's 'abilityModifier'/'abilityDelta' skill-feat-rule
// formulas (e.g. ability-substitution feats) had the ledger's canonical
// wrong order: abilities before attributes before derived.
//
// These are source-contract checks (matching the pattern already used for
// scripts/skills/skill-uses.js in tests/skill-uses-ability-authority.test.mjs):
// the actual ability-lookup behavior these five call sites now delegate to
// is SchemaAdapters.getAbilityMod(), already exhaustively regression-tested
// against Gar'ee's real data in tests/schema-adapters-ability-authority.test.mjs.
// What matters here is confirming each site was actually rewired to call it
// (or, for the two draft-aware files, correctly reordered) rather than
// re-deriving that coverage through each file's private closures, most of
// which sit behind heavier public APIs (SWSEDialogV2/ActorEngine chat
// posting, encounter-use tracking) not needed to exercise this fix.

const files = {
  lightsaberFormEngine: '../scripts/engine/talent/lightsaber-form-engine.js',
  skillFeatRuntimePatches: '../scripts/engine/feats/skill-feat-runtime-patches.js',
  combatOptionResolver: '../scripts/engine/combat/combat-option-resolver.js',
  featGrantEntitlementResolver: '../scripts/engine/progression/feats/feat-grant-entitlement-resolver.js',
  skillFeatResolver: '../scripts/engine/skills/skill-feat-resolver.js'
};
const source = {};
for (const [key, rel] of Object.entries(files)) {
  source[key] = await readFile(new URL(rel, import.meta.url), 'utf8');
}

// lightsaber-form-engine.js and skill-feat-runtime-patches.js: their
// actorAbilityMod() helpers now delegate entirely to SchemaAdapters.
for (const key of ['lightsaberFormEngine', 'skillFeatRuntimePatches']) {
  assert.match(source[key], /SchemaAdapters\.getAbilityMod\(actor, key\)/, `${key}: actorAbilityMod() must delegate to SchemaAdapters.getAbilityMod()`);
  assert.doesNotMatch(source[key], /system\.abilities\?\.\[key\]\?\.mod/, `${key}: must not read system.abilities directly for the ability-mod lookup`);
}

// combat-option-resolver.js: dead wrongly-ordered fallback tail removed.
assert.doesNotMatch(
  source.combatOptionResolver,
  /actor\?\.system\?\.abilities\?\.\[key\]\?\.mod \?\? actor\?\.system\?\.attributes\?\.\[key\]\?\.mod/,
  'combat-option-resolver.js must not retain the dead abilities-before-attributes fallback tail'
);
assert.match(source.combatOptionResolver, /SchemaAdapters\.getAbilityMod\?\.\(actor, key\)/, 'combat-option-resolver.js must still call SchemaAdapters.getAbilityMod() first');

// feat-grant-entitlement-resolver.js: derived tier added, order corrected,
// and the broken .total/.value-only reconstruction replaced with a real
// base+racial+enhancement+temp fallback.
assert.match(
  source.featGrantEntitlementResolver,
  /system\.derived\?\.attributes\?\.\[key\]\?\.mod,\s*\n\s*system\.derived\?\.attributes\?\.\[key\]\?\.modifier,\s*\n\s*system\.attributes\?\.\[key\]\?\.mod,/,
  'feat-grant-entitlement-resolver.js must check derived, then attributes, before abilities'
);
assert.match(
  source.featGrantEntitlementResolver,
  /const base = Number\(block\.base \?\? 10\);/,
  'feat-grant-entitlement-resolver.js must reconstruct the score from base/racial/enhancement/temp, not rely on nonexistent .total/.value fields'
);

// skill-feat-resolver.js: both rule formulas now delegate to SchemaAdapters.
assert.match(source.skillFeatResolver, /return clamp\(SchemaAdapters\.getAbilityMod\(actor, ability\)\);/, "skill-feat-resolver.js: 'abilityModifier' formula must delegate to SchemaAdapters.getAbilityMod()");
assert.match(source.skillFeatResolver, /const fromValue = SchemaAdapters\.getAbilityMod\(actor, from\);/, "skill-feat-resolver.js: 'abilityDelta' formula must delegate to SchemaAdapters.getAbilityMod()");
assert.doesNotMatch(source.skillFeatResolver, /getPropertySafe\(actor, `system\.abilities\./, 'skill-feat-resolver.js must not read system.abilities via getPropertySafe for ability formulas');

// Every fixed file must still import (and therefore still syntactically
// load) after the change -- a real, not merely textual, regression guard.
registerFoundryPathLoader();
installFoundryShimGlobals({
  foundry: {
    applications: {
      api: {
        ApplicationV2: class {},
        HandlebarsApplicationMixin: (Base) => class extends (Base ?? Object) {}
      }
    }
  }
});
const imports = await Promise.all([
  import('/systems/foundryvtt-swse/scripts/engine/talent/lightsaber-form-engine.js'),
  import('/systems/foundryvtt-swse/scripts/engine/feats/skill-feat-runtime-patches.js'),
  import('/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js'),
  import('/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-resolver.js')
]);
assert.ok(imports.every(m => m && typeof m === 'object'), 'all four fixed modules must still import cleanly');

console.log('Talent/feats ability-authority guards passed (lightsaber-form-engine, skill-feat-runtime-patches, combat-option-resolver, feat-grant-entitlement-resolver, skill-feat-resolver).');
