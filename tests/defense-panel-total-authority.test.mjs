import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 4 + Phase 5 fix (combat display parity): PanelContextBuilder.
// buildDefensePanel() used to sum individual defense components into its
// own `computedTotal` and display THAT (falling back to the canonical
// engine total only if the sum was somehow non-finite) — i.e. a second,
// parallel defense calculator living inside the sheet, competing with
// DefenseCalculator's canonical system.derived.defenses.<type>.total. Any
// component DefenseCalculator accounts for but the panel forgot to sum
// (e.g. Psychic Citadel) silently produced a WRONG displayed total instead
// of merely an incomplete breakdown.
//
// This suite proves: (1) the panel's displayed total is now read from the
// canonical engine total, with the component sum demoted to a diagnostic-
// only comparison; (2) Psychic Citadel is included in that diagnostic sum
// and exposed for display, closing the gap identified in the Phase 0 audit.
//
// PanelContextBuilder pulls in a large web of sheet/hydration dependencies
// that cannot be constructed under the Node test harness (matching the
// existing convention in tests/dsp-engine-consolidation.test.mjs), so this
// is a source-text assertion for the wiring, plus a standalone reproduction
// of the arithmetic (copied 1:1 from the fixed source) to prove the totals
// used, matching the pattern in tests/target-defense-authority.test.mjs.

const source = await readFile(new URL('../scripts/sheets/v2/context/PanelContextBuilder.js', import.meta.url), 'utf8');

// The displayed `total` must be assigned from the canonical total, not from
// the panel's own component reconstruction.
{
  assert.match(
    source,
    /const canonicalTotal = Number\(derivedDefense\?\.total \?\? defenseViewModel\?\.total\);/,
    'expected buildDefensePanel to read the canonical engine total as its first authority'
  );
  assert.match(
    source,
    /const total = Number\.isFinite\(canonicalTotal\) \? canonicalTotal : \(Number\.isFinite\(componentSum\) \? componentSum : 10\);/,
    'expected the displayed total to prefer the canonical total, falling back to the component sum only when no canonical total exists'
  );
}

// psychicCitadelBonus must be part of the diagnostic component sum and
// exposed on the returned defense entry for the template to render.
{
  assert.match(source, /\+ psychicCitadelBonus;/, 'psychicCitadelBonus must be included in the diagnostic component sum');
  assert.match(source, /hasPsychicCitadel: psychicCitadelBonus !== 0/, 'psychicCitadelBonus must be exposed to the template');
}

// --- Standalone reproduction of the fixed arithmetic ---
// Mirrors the exact formula in buildDefensePanel() so a change to the total
// authority (canonical-first) is caught even without instantiating the
// class.
function computeDisplayedTotal({ derivedDefense, defenseViewModel = {}, systemKey = 'will' }) {
  const levelContribution = Number(derivedDefense?.levelContribution ?? derivedDefense?.heroicLevel ?? 0) || 0;
  const abilityMod = Number(derivedDefense?.abilityMod) || 0;
  const classDef = Number(derivedDefense?.classBonus ?? 0) || 0;
  const speciesBonus = Number(derivedDefense?.speciesBonus ?? 0) || 0;
  const rulesBonus = (Number(derivedDefense?.stateBonus ?? 0) || 0) + (Number(derivedDefense?.adjustment ?? 0) || 0);
  const sizeModifier = Number(derivedDefense?.sizeModifier ?? 0) || 0;
  const miscMod = Number(derivedDefense?.miscBonus ?? 0) || 0;
  const conditionPenalty = Number(derivedDefense?.conditionPenalty ?? 0) || 0;
  const implantWillPenalty = systemKey === 'will' ? (Number(derivedDefense?.implantWillPenalty ?? 0) || 0) : 0;
  const psychicCitadelBonus = systemKey === 'will' ? (Number(derivedDefense?.psychicCitadelBonus ?? 0) || 0) : 0;
  const armorBonus = Number(derivedDefense?.armorBonus ?? 0) || 0;
  const armorTotalTerm = systemKey === 'reflex' ? 0 : armorBonus;

  const componentSum = 10 + levelContribution + armorTotalTerm + abilityMod + classDef + speciesBonus
    + rulesBonus + sizeModifier + miscMod + conditionPenalty + implantWillPenalty + psychicCitadelBonus;
  const canonicalTotal = Number(derivedDefense?.total ?? defenseViewModel?.total);
  return Number.isFinite(canonicalTotal) ? canonicalTotal : (Number.isFinite(componentSum) ? componentSum : 10);
}

// Case: DefenseCalculator's canonical total already accounts for Psychic
// Citadel; even if a hypothetical future component were missing from the
// panel's own sum, the canonical total (not the sum) must be displayed.
{
  const derivedDefense = {
    total: 22, // canonical: includes psychicCitadelBonus AND some hypothetical unmirrored term
    levelContribution: 5, abilityMod: 2, classBonus: 2, speciesBonus: 0,
    stateBonus: 0, adjustment: 0, sizeModifier: 0, miscBonus: 0, conditionPenalty: 0,
    implantWillPenalty: 0, psychicCitadelBonus: 3, armorBonus: 0
  };
  assert.equal(computeDisplayedTotal({ derivedDefense, systemKey: 'will' }), 22, 'canonical total must win even if it does not exactly equal the panel component sum');
}

// Case: an actor with no Psychic Citadel talent is unaffected (bonus is 0).
{
  const derivedDefense = {
    total: 15, levelContribution: 5, abilityMod: 2, classBonus: 2, psychicCitadelBonus: 0
  };
  assert.equal(computeDisplayedTotal({ derivedDefense, systemKey: 'will' }), 15);
}

// Case: no canonical total available at all (defensive fallback) — the
// component sum, now including psychicCitadelBonus, is used.
{
  const derivedDefense = {
    levelContribution: 5, abilityMod: 2, classBonus: 2, psychicCitadelBonus: 3
  };
  // 10 + 5 + 2 + 2 + 3 = 22
  assert.equal(computeDisplayedTotal({ derivedDefense, systemKey: 'will' }), 22);
}

console.log('defense-panel-total-authority.test.mjs OK');
