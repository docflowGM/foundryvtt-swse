# Clone Wars + Galaxy at War Feat Parity Report

Generated: 2026-06-30T14:33:16.852Z

## Summary

- Catalog feats: 401
- Pack feats: 401
- Expected Clone Wars/Galaxy at War feats: 67
- Present expected feats: 67
- Source-matched expected feats: 67
- Clone Wars expected feats matched: 20
- Galaxy at War expected feats matched: 47
- Runtime/context-classified feats: 67
- Combat/attack-option classified feats: 10
- Vehicle/gunnery-context feats: 5
- Skill/healing/repair-context feats: 0
- Not-Force title keyword reviews: 2
- Force-context-only reviews: 2
- Warnings: 0
- Errors: 0

## Findings

No warnings or errors.

## Reviewed Force-word / Force-adjacent cases

- **Jedi Familiarity:** Force-adjacent runtime context, but not a Force feat taxonomy type.
- **Pall of the Dark Side:** Force-adjacent runtime context, but not a Force feat taxonomy type.
- **Destructive Force:** Contains Force in title but is not a Force feat; preserve general taxonomy.
- **Force of Personality:** Contains Force in title but is not a Force feat; preserve general taxonomy.

## Recommended next work

- Run this audit after applying previous parity zips to ensure all Clone Wars and Galaxy at War feats are present and source-attributed.
- Implement clear combat-option/rider feats through attack workflow options rather than passive numeric modifiers.
- Implement vehicle/gunnery feats only after confirming their hooks in the vehicle/starship roll pipeline.
- Keep Force-word title feats classified by mechanics, not title; Destructive Force and Force of Personality remain general feats.
- Move any remaining scaffold modifiers into explicit rules metadata or runtime hooks before broad feat automation.
