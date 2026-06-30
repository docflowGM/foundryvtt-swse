# Phase 9M — The Unknown Regions Feat Implementation Accuracy

This phase audits The Unknown Regions feats for implementation accuracy, not simple metadata presence.

Unknown Regions feats are mostly contextual action, reaction, skill-use, mounted/vehicle, and resource-spend feats. That means descriptive `abilityMeta` is useful, but it is not the same as a correct runtime implementation.

## Accuracy standard

A feat is `implemented_correct` only when the observed repository baseline contains a runtime hook or resolver that matches the actual rule shape closely enough for current system scope.

Examples:

- `Instinctive Attack` is correct because `attackRerolls` are consumed by `meta-resource-feat-resolver`.
- `Instinctive Defense` is correct because `SPEND_FOR_TEMP_DEFENSE` resource rules have an actual resolver path.
- `Combat Trickery`, `Intimidator`, and `Improved Sleight of Hand` remain partial because `skillUseRules` metadata exists but no consumer was found.
- Mounted, vehicle, and movement-path feats remain partial until those subsystems can consume their action metadata.

## Results

- 20 feats audited
- 2 implemented_correct
- 18 implemented_partial
- 0 implemented_incorrect
- 0 not_implemented
- 0 metadata_correct
- 0 source_review_required

## High-priority implementation targets

1. Skill-use workflow consumers for `skillUseRules`.
2. Reaction prompts for incoming missed attacks and movement reactions.
3. Mounted charge/path-targeting support for Trample and similar feats.
4. Vehicle damage/defense timing hooks for Hold Together and Heavy Hitter.
5. Daily/encounter usage tracking for utility feats.
