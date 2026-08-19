import assert from 'node:assert/strict';
import { getTalentAbilityMod } from '../scripts/engine/talent/talent-ability-helpers.js';
import { isNpcStatblockMode, isNpcProgressionMode } from '../scripts/actors/npc/npc-mode-adapter.js';

// Phase 2B — authority normalization closure pass. Four narrow, evidence-backed
// fixes landed in this pass; this file verifies what is directly testable
// under plain Node. Two of the four (the recomputeHP statblock guard in
// actor-engine.js, and the Will-Defense total fix in PanelContextBuilder.js)
// live inside modules with transitive import chains this repo's Foundry-shim
// harness cannot yet load (actor-engine.js is explicitly faked by
// tests/helpers/foundry-shim/path-loader.mjs for exactly this reason;
// PanelContextBuilder.js pulls in UpgradeService/ActorEffectsAggregator/
// ImplantRules and fails at import with "Cannot read properties of undefined
// (reading 'api')" even under the shim). For those two, this file verifies
// the underlying predicate/formula in isolation and documents, rather than
// papers over, the untested integration surface — see
// docs/audits/v2-phase-2-actor-authority-normalization.md "Live-Foundry
// verification checklist" for the exact runtime check each one still needs.

// ── 1. Talent ability-mod consolidation: the shared helper reproduces the
// exact formula previously duplicated byte-for-byte across 5 talent files
// (Test 1) ───────────────────────────────────────────────────────────────

{
  // derived.attributes wins over abilities and attributes
  const actor = {
    system: {
      derived: { attributes: { wis: { mod: 4 } } },
      abilities: { wis: { mod: 1 } },
      attributes: { wis: { mod: 2 } }
    }
  };
  assert.equal(getTalentAbilityMod(actor, 'wis'), 4);
}
{
  // abilities wins over attributes when derived is absent (matches the
  // original helpers' priority order — NOT SchemaAdapters.getAbilityMod's,
  // which checks attributes before abilities)
  const actor = { system: { abilities: { cha: { mod: 3 } }, attributes: { cha: { mod: 5 } } } };
  assert.equal(getTalentAbilityMod(actor, 'cha'), 3);
}
{
  // attributes is the last fallback
  const actor = { system: { attributes: { con: { mod: -1 } } } };
  assert.equal(getTalentAbilityMod(actor, 'con'), -1);
}
{
  // missing actor/system/key all resolve to 0, never throw
  assert.equal(getTalentAbilityMod(null, 'str'), 0);
  assert.equal(getTalentAbilityMod({}, 'str'), 0);
  assert.equal(getTalentAbilityMod({ system: {} }, 'str'), 0);
}

// ── 2. NPC recomputeHP statblock guard: isNpcStatblockMode() correctly
// distinguishes the NPCs the guard must protect from the ones it must not
// touch (Test 2) ────────────────────────────────────────────────────────

{
  // A statblock-imported NPC (no class Item, sourceAuthority stamped by the
  // importer) — actor-engine.js's recomputeHP() must now return the stored
  // HP max unchanged for this actor instead of collapsing it to 1.
  const statblockNpc = {
    type: 'npc',
    system: { npcProfile: { sourceAuthority: 'statblock' }, hp: { max: 45 } },
    flags: {},
    items: []
  };
  assert.equal(isNpcStatblockMode(statblockNpc), true);
}
{
  // A progression-mode NPC (has class items, normal HP recompute must still
  // apply) must NOT be caught by the guard.
  const progressionNpc = {
    type: 'npc',
    system: { npcProfile: { mode: 'progression' }, hp: { max: 20 } },
    flags: {},
    items: [{ type: 'class', name: 'Soldier' }]
  };
  assert.equal(isNpcStatblockMode(progressionNpc), false);
  assert.equal(isNpcProgressionMode(progressionNpc), true);
}

// ── 3. Direct reproduction of the recomputeHP guard branch added to
// actor-engine.js (scripts/governance/actor-engine/actor-engine.js, inside
// the `if (!classItem)` branch): confirms the guard's own logic — given the
// real isNpcStatblockMode() predicate — returns the stored HP max and never
// reaches the "collapse to 1" write for a statblock NPC, while a non-NPC or
// non-statblock actor with no class item still falls through to the
// original minimum-1 behavior (Test 3) ──────────────────────────────────

function recomputeHPGuardOutcome(actor) {
  // Mirrors actor-engine.js's recomputeHP() exactly for the no-class-item
  // case: returns 'protected:<hp>' if the new guard fires, or
  // 'collapsed:1' if it falls through to the pre-existing minimum-1 branch.
  if (actor.type === 'npc' && isNpcStatblockMode(actor)) {
    return `protected:${actor.system.hp?.max ?? 1}`;
  }
  return 'collapsed:1';
}

{
  const statblockNpc = {
    type: 'npc',
    system: { npcProfile: { sourceAuthority: 'statblock' }, hp: { max: 45 } },
    flags: {},
    items: []
  };
  assert.equal(recomputeHPGuardOutcome(statblockNpc), 'protected:45');
}
{
  // An NPC explicitly flagged useProgression:true but whose class Item
  // hasn't been added yet (a genuine mid-setup gap, not statblock import)
  // must NOT be caught by the guard — inferMode() treats an explicit
  // useProgression:true as decisive over the classless-NPC "play" default,
  // so isNpcStatblockMode() correctly reports false here and the original
  // minimum-1 fallback still applies.
  const midSetupProgressionNpc = {
    type: 'npc',
    system: { useProgression: true, hp: { max: 12 } },
    flags: {},
    items: []
  };
  assert.equal(isNpcStatblockMode(midSetupProgressionNpc), false);
  assert.equal(recomputeHPGuardOutcome(midSetupProgressionNpc), 'collapsed:1');
}
{
  // Note on scope: the classless-NPC mode inference in npc-mode-adapter.js
  // (inferMode()) already defaults to 'play' (statblock-authority) for ANY
  // NPC with no class Items and no explicit progression signal — not only
  // ones stamped by the statblock importer. So this guard also protects a
  // blank, newly-created NPC actor (e.g. kind 'standard', no items, no
  // useProgression flag) from the collapse-to-1 write, which is consistent
  // with — not broader than — the precedent shouldSkipDerivedData() already
  // established (scripts/utils/hardening.js) for gating the async derived
  // pass on the same isNpcStatblockMode() predicate.
  const blankNewNpc = { type: 'npc', system: { hp: { max: 10 } }, flags: {}, items: [] };
  assert.equal(isNpcStatblockMode(blankNewNpc), true);
  assert.equal(recomputeHPGuardOutcome(blankNewNpc), 'protected:10');
}
{
  // A brand-new character actor with no class item yet (mid-creation) is
  // untouched by the guard — only actor.type === 'npc' is ever protected.
  const newCharacter = { type: 'character', system: { hp: { max: 1 } }, flags: {}, items: [] };
  assert.equal(recomputeHPGuardOutcome(newCharacter), 'collapsed:1');
}

// ── 4. PanelContextBuilder Will-Defense total fix: direct reproduction of
// the total-selection logic added to buildDefensePanel() (prefer
// derivedDefense.total when finite, else the manual computedTotal, else the
// old default chain) — confirms the Psychic Citadel case now resolves to
// the higher, authoritative cached total instead of the manual sum that
// silently drops psychicCitadelBonus (Test 4) ────────────────────────────

function resolveDefenseTotal(computedTotal, derivedDefenseTotal, viewModelTotal) {
  const authoritativeTotal = Number(derivedDefenseTotal);
  return Number.isFinite(authoritativeTotal)
    ? authoritativeTotal
    : Number.isFinite(computedTotal)
      ? computedTotal
      : (Number(viewModelTotal ?? 10) || 10);
}

{
  // Psychic Citadel case: DefenseCalculator's cached total (24) includes a
  // +3 psychicCitadelBonus the manual sum (21) can't see. The fix must
  // prefer the cached, correct value.
  const manualSumMissingPsychicCitadel = 21;
  const cachedTotalFromDefenseCalculator = 24;
  assert.equal(
    resolveDefenseTotal(manualSumMissingPsychicCitadel, cachedTotalFromDefenseCalculator, undefined),
    24,
    'must prefer the authoritative cached total over the manual re-sum'
  );
}
{
  // Ordinary case (no Psychic Citadel): manual sum and cached total agree —
  // behavior is unchanged.
  assert.equal(resolveDefenseTotal(18, 18, undefined), 18);
}
{
  // derivedDefense.total absent/NaN: falls back to the manual sum exactly as
  // before this fix.
  assert.equal(resolveDefenseTotal(15, undefined, undefined), 15);
  assert.equal(resolveDefenseTotal(15, NaN, undefined), 15);
}
{
  // both unavailable: falls back to the old default chain.
  assert.equal(resolveDefenseTotal(NaN, undefined, 12), 12);
  assert.equal(resolveDefenseTotal(NaN, undefined, undefined), 10);
}

console.log('phase-2b-closure-fixes.test.mjs: all assertions passed');
