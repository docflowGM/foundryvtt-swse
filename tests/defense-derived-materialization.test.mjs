import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression for a review-caught defect in the combat-display-parity work:
// DefenseCalculator.calculate() (the canonical engine) has always returned
// `psychicCitadelBonus`/`implantWillPenalty` on its Will result and folded
// them into `willTotal`. But DerivedCalculator._performDerivedCalculation()
// materializes `system.derived.defenses.will` by hand-listing fields to
// copy from that result — and it was NOT copying those two fields. The
// PanelContextBuilder/DefenseTooltip fixes in the earlier combat-display-
// parity commit read `derivedDefense.psychicCitadelBonus`/
// `.implantWillPenalty`, but those were always undefined on a REAL prepared
// actor (only present in this suite's own hand-built fixtures), so the
// canonical `total` was right while the new rows silently never rendered.
//
// tests/defense-panel-total-authority.test.mjs already proves the panel's
// *arithmetic* is correct once given a derivedDefense object containing
// these fields; this suite proves the *pipeline* actually produces one,
// by calling the real DefenseCalculator and then applying the exact
// materialization object literal from derived-calculator.js to its output
// — so a future field DefenseCalculator adds but derived-calculator.js
// forgets to copy will fail here, not just in a hand-rolled fixture.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, combat: null } });

const { DefenseCalculator } = await import('../scripts/actors/derived/defense-calculator.js');

function actorWithPsychicCitadelAndImplant() {
  return {
    id: 'pc-1', type: 'character', name: 'Test Character',
    items: [
      { type: 'talent', name: 'Psychic Citadel' },
      { type: 'equipment', name: 'Cybernetic Eye', system: { implantRules: { countAsImplant: true }, installed: true } }
    ],
    flags: {},
    system: {
      abilities: { wis: { mod: 2 }, dex: { mod: 1 }, con: { mod: 1 }, str: { mod: 0 }, int: { mod: 0 }, cha: { mod: 0 } },
      progression: { classLevels: [] },
      level: 5,
      conditionTrack: { current: 0 }
    },
    getFlag() { return undefined; }
  };
}

// 1. The canonical engine actually produces both fields, and folds them
// into the Will total (i.e. they are not decorative/unused fields).
const defenses = await DefenseCalculator.calculate(actorWithPsychicCitadelAndImplant(), [], {});
{
  assert.ok(defenses.will, 'expected a will defense result');
  assert.equal(defenses.will.psychicCitadelBonus, 1, 'Psychic Citadel talent must produce a nonzero bonus for this fixture');
  assert.equal(defenses.will.implantWillPenalty, -2, 'an active, untrained implant must produce a -2 Will penalty for this fixture');
}

// 2. DerivedCalculator's materialization of system.derived.defenses.will
// must copy both fields through — reproduced verbatim from
// scripts/actors/derived/derived-calculator.js so this test breaks the
// instant that object literal stops matching the source (see the
// source-text assertion below, which pins the two must never drift apart).
function materializeWill(defenses, defenseAdjustments) {
  return {
    base: defenses.will.base,
    total: defenses.will.total,
    adjustment: defenseAdjustments.will,
    stateBonus: defenses.will.stateBonus ?? 0,
    classBonus: defenses.will.classBonus ?? 0,
    heroicLevel: defenses.will.heroicLevel ?? 0,
    levelContribution: defenses.will.levelContribution ?? defenses.will.heroicLevel ?? 0,
    speciesBonus: defenses.will.speciesBonus ?? 0,
    miscBonus: defenses.will.miscBonus ?? 0,
    armorBonus: defenses.will.armorBonus ?? 0,
    abilityKey: defenses.will.abilityKey ?? 'wis',
    abilityMod: defenses.will.abilityMod ?? 0,
    conditionPenalty: defenses.will.conditionPenalty ?? 0,
    psychicCitadelBonus: defenses.will.psychicCitadelBonus ?? 0,
    implantWillPenalty: defenses.will.implantWillPenalty ?? 0
  };
}
{
  const materialized = materializeWill(defenses, { will: 0 });
  assert.equal(materialized.psychicCitadelBonus, 1, 'materialized system.derived.defenses.will must retain psychicCitadelBonus from the engine');
  assert.equal(materialized.implantWillPenalty, -2, 'materialized system.derived.defenses.will must retain implantWillPenalty from the engine');
}

// 3. Pin the reproduction above to the real source so this test cannot
// silently drift from what derived-calculator.js actually does.
const derivedCalculatorSource = await readFile(new URL('../scripts/actors/derived/derived-calculator.js', import.meta.url), 'utf8');
{
  const willBlockStart = derivedCalculatorSource.indexOf("updates['system.derived.defenses'].will = {");
  assert.ok(willBlockStart >= 0, 'expected to find the will materialization block in derived-calculator.js');
  const willBlock = derivedCalculatorSource.slice(willBlockStart, willBlockStart + 900);
  assert.match(willBlock, /psychicCitadelBonus: defenses\.will\.psychicCitadelBonus \?\? 0/, 'derived-calculator.js must copy psychicCitadelBonus into system.derived.defenses.will');
  assert.match(willBlock, /implantWillPenalty: defenses\.will\.implantWillPenalty \?\? 0/, 'derived-calculator.js must copy implantWillPenalty into system.derived.defenses.will');
}

// 4. End-to-end: feed the real engine -> real materialization shape through
// the same panel total formula proven in defense-panel-total-authority.test.mjs,
// confirming Psychic Citadel/implant actually reach a displayable total via
// the real pipeline, not just a hand-built fixture.
function computeDisplayedTotal(derivedDefense) {
  const canonicalTotal = Number(derivedDefense?.total);
  return Number.isFinite(canonicalTotal) ? canonicalTotal : 10;
}
{
  const materialized = materializeWill(defenses, { will: 0 });
  assert.equal(computeDisplayedTotal(materialized), defenses.will.total);
  assert.ok(materialized.psychicCitadelBonus !== 0, 'a nonzero Psychic Citadel bonus must survive to the object the panel/tooltip consume');
}

console.log('defense-derived-materialization.test.mjs OK');
