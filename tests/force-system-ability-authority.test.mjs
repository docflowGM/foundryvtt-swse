import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for five Category C sites from
// docs/audits/ability-schema-authority-migration-phase3-ledger.md, all in
// the Force-power/training subsystem, all independently reimplementing the
// same "resolve the configured Force ability (Wis or Cha) modifier"
// pattern with the same bug: the legacy system.abilities mirror checked
// before, or instead of, the canonical system.attributes/
// system.derived.attributes data.
//
// Three files (ForceTrainingEngine.getForceAbilityModifier(),
// ForceProvenanceEngine.getConfiguredAbilityMod(),
// ForcePowerEngine._countFromAbilityMod()) operate only on committed actor
// data and were consolidated onto SchemaAdapters.getAbilityMod() --
// already regression-tested directly against Gar'ee's real data in
// tests/schema-adapters-ability-authority.test.mjs -- removing ~50 lines
// of duplicated, independently-buggy reconstruction logic.
//
// Two files (force-suite-resolution.js, force-training-entitlement-runtime-patches.js)
// must check in-progress chargen/level-up draft/pending selections BEFORE
// committed actor data, so they were not consolidated onto SchemaAdapters
// (which only knows about committed actor state) -- only their
// attributes-vs-abilities fallback order was corrected, preserving all
// draft-state-aware logic unchanged. These two are covered by a source-
// contract check rather than a live call, since force-suite-resolution.js
// and force-training-entitlement-runtime-patches.js are progression-shell-
// entangled and too heavy to exercise meaningfully here without a full
// shell/draft-selection fixture.

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: { settings: { get: (_mod, key) => (key === 'forceTrainingAttribute' ? 'wisdom' : undefined) } }
});

const { ForceTrainingEngine } = await import('/systems/foundryvtt-swse/scripts/engine/force/ForceTrainingEngine.js');
const { ForceProvenanceEngine } = await import('/systems/foundryvtt-swse/scripts/engine/progression/engine/force-provenance-engine.js');
const { ForcePowerEngine } = await import('/systems/foundryvtt-swse/scripts/engine/progression/engine/force-power-engine.js');

function actorWithWisdom(wisBase) {
  return {
    system: {
      attributes: { wis: { base: wisBase, racial: 0, enhancement: 0, temp: 0 } },
      // The legacy stub every actor carries by default -- always mod:0
      // regardless of the real score.
      abilities: { wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 } }
    }
  };
}

// ---------------------------------------------------------------------------
// Wis 16 (+3) must not be masked by the legacy stub's mod:0.
// ---------------------------------------------------------------------------
{
  const actor = actorWithWisdom(16);
  assert.equal(ForceTrainingEngine.getForceAbilityModifier(actor), 3);
  assert.equal(ForceProvenanceEngine.getConfiguredAbilityMod(actor), 3);
  assert.equal(ForcePowerEngine._countFromAbilityMod(actor), 4, '1 + Wis mod (3) = 4 Force powers');
}

// ---------------------------------------------------------------------------
// A legitimate zero modifier (Wis 10) is preserved, not treated specially.
// ---------------------------------------------------------------------------
{
  const actor = actorWithWisdom(10);
  assert.equal(ForceTrainingEngine.getForceAbilityModifier(actor), 0);
  assert.equal(ForceProvenanceEngine.getConfiguredAbilityMod(actor), 0);
  assert.equal(ForcePowerEngine._countFromAbilityMod(actor), 1, 'minimum 1 Force power even at Wis mod 0');
}

// ---------------------------------------------------------------------------
// Live derived data still wins over raw reconstruction.
// ---------------------------------------------------------------------------
{
  const actor = { system: { ...actorWithWisdom(16).system, derived: { attributes: { wis: { mod: 5 } } } } };
  assert.equal(ForceTrainingEngine.getForceAbilityModifier(actor), 5);
}

// ---------------------------------------------------------------------------
// Source-contract check for the two draft-state-aware files: legacy
// system.abilities must no longer be checked before canonical
// system.attributes in their fallback candidate lists.
// ---------------------------------------------------------------------------
{
  const forceSuite = await readFile(
    new URL('../scripts/engine/progression/utils/force-suite-resolution.js', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(
    forceSuite,
    /system\.abilities\?\.\[alias\]\?\.mod, system\.abilities\?\.\[alias\]\?\.modifier, system\.attributes/,
    'force-suite-resolution.js must not check system.abilities before system.attributes'
  );
  assert.match(
    forceSuite,
    /system\.attributes\?\.\[alias\]\?\.mod, system\.attributes\?\.\[alias\]\?\.modifier, system\.abilities/,
    'force-suite-resolution.js must check system.attributes before system.abilities'
  );

  const entitlementPatches = await readFile(
    new URL('../scripts/engine/feats/force-training-entitlement-runtime-patches.js', import.meta.url),
    'utf8'
  );
  assert.match(
    entitlementPatches,
    /system\.attributes\?\.\[alias\] \|\| system\.abilities\?\.\[alias\]/,
    'force-training-entitlement-runtime-patches.js must check system.attributes before system.abilities'
  );
}

console.log('Force-system ability-authority guards passed (ForceTrainingEngine, ForceProvenanceEngine, ForcePowerEngine, force-suite-resolution, force-training-entitlement-runtime-patches).');
