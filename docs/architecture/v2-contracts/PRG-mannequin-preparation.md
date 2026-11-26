# Phase 3G preparation for 3N-PRG — current preview calculations (audit only, no behavior changed)

Scope: inventory of where progression previews compute mechanics themselves, so 3N-PRG can replace them with the canonical pipeline after 3N-DC. Existing previews keep working until replaced. Nothing here is a rules ruling.

## Level-up summary (`scripts/apps/progression-framework/steps/summary-step.js`, `_buildLevelupSummary` region ~L540–620)
| Projected value | Current method | Concern for the mannequin |
|---|---|---|
| Ability scores | `_getProjectedAttributeScores(projection, fallback)` reads the projection | fine as an input; no formula |
| BAB | `_computeProjectedBAB`: deep-clones the actor into a synthetic `{system, items}` object, bumps/adds the selected class level and calls `calculateTotalBAB` from `apps/levelup/levelup-shared.js` | third BAB implementation (F-PRG-008); must become `BABCalculator` on the mannequin |
| Reflex/Fortitude/Will | delta arithmetic on the current total: `before − currentAbilityMod − currentClassBonus + afterAbilityMod + afterClassBonus`, class bonus = max over classes (`_getMaxDefenseBonuses`, `_getProjectedDefenseBonuses`) | ignores every other contribution that changes with level or class (heroic level term, armor/feat/talent/condition effects, species); not `DefenseCalculator` |
| Damage Threshold | `afterDT = afterFort` | mirrors Fortitude only; DT authority is a 3N-DC item (enhanced-formula ambiguity is an owner decision, not decided here) |
| Grapple | `before − beforeBAB − strMod + afterBAB + afterStrMod` | ignores size and other grapple terms; not `computeGrappleBonus` |
| Max HP | `before + hpGainState.gain` | uses the progression HP grant; keep, but obtain through the HP accounting authority (`hp-accounting.js`) |
| Second Wind | inline `5 + floor(level/4)*5`; `beforeSecondWind` falls back to the same formula | second formula outside `SecondWindEngine`; must delegate |
| Credits preview | `_buildLevelupCreditPreview` | transaction/grant concern (3C), not a calculation to move |

Other consumers to migrate in 3N-PRG: `shell/projection-engine.js`, `shell/selected-rail-context.js`, `apps/levelup/levelup-shared.js` (`calculateTotalBAB`, `getClassDefenseBonuses`), `shell/prereq-adapter.js` (projected actor-like object and its own historical-BAB estimate).

## Canonical targets (after 3N-AE/DC/PRQ)
`BABCalculator`, `DefenseCalculator`, `DerivedCalculator.computeAll` via a read-only interface, `computeGrappleBonus`, the DT authority, `hp-accounting`, `SecondWindEngine`, and the prerequisite evaluator on the same mannequin state. `ProgressionFinalizer.dryRun/_compileMutationPlan` supplies the plan the mannequin applies non-persistently.

## Baseline tests (projected-BAB characterization written; defense/grapple/DT projections still deferred)
Written in `tests/summary-step-projection-baseline.test.mjs`: same-class level-up, new-class multiclass, prestige entry, no-class, ability-score/wounded-actor independence, and the name-table estimation fallback (labelled uncertified; 3N-DC replaces it). Still to characterize once the DerivedCalculator contract is final: the defense, grapple and damage-threshold projections.

Original list:
Characterize today's summary output for: same-class level-up, new-class multiclass, prestige entry, ability-score level, wounded actor. They become the parity fixtures required by the PRG addendum §12. They are deliberately deferred: they need the finalized DerivedCalculator contract to decide which differences are corrections rather than regressions.
