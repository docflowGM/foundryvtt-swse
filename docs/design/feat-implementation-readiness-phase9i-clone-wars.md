# Phase 9I: Clone Wars Campaign Guide Feat Implementation Readiness

This phase audits Clone Wars Campaign Guide feats for implementation accuracy. It does not implement mechanics.

## Accuracy standard

A feat is only `implemented_correct` when the observed runtime shape matches the rule behavior and the uploaded repo baseline contains a known consumer for that shape. Metadata that describes the correct rule but lacks a consumer is `implemented_partial`.

## Major findings

The Clone Wars set contains many well-described metadata entries, but only a few have runtime paths that are sufficiently proven in this baseline:

- ATTACK_OPTION rules with numeric attack/damage modifiers are generally consumed by `CombatOptionResolver`.
- `skillCheckBonuses` are consumed by `SkillFeatResolver`.
- `areaBonusSquares`, `autofireAreaSquares`, `aidAnotherRules`, `conditionalDefenseBonuses`, and `skillUseRules` need additional consumers before they are implementation-correct.

## Correct-vs-partial examples

- `Droid Hunter` is implemented correctly because it is a conditional droid-target damage rule with explicit ion/non-ion branches consumed by the combat option path.
- `Artillery Shot` is only partial because the metadata describes the area expansion, but no area-template consumer was found.
- `Jedi Familiarity` is only partial because a temporary Force Point trigger/lifecycle is required.
