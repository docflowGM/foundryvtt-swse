# Phase 9C — Starships of the Galaxy Feat Implementation Accuracy

This phase audits the Starships of the Galaxy feats for implementation accuracy. It does not implement new feat mechanics.

## Accuracy rule

A feat is not implemented correctly merely because it exists, has metadata, or has some automation marker. It is `implemented_correct` only when the implementation shape matches the actual rule behavior.

For Starships of the Galaxy, that distinction matters because the major feat mechanics are starship maneuver progression, starship maneuver recovery, and starship design procedures. None of those should become flat static actor bonuses.

## Findings

### Starship Tactics

Expected implementation home: starship maneuver suite progression.

Current status: `implemented_partial`.

The catalog contains the right metadata shape: a grant rule for Starship Maneuvers with a `max(1, 1 + wisdomModifier)` count formula and static sheet exclusion. That is not enough to mark the feat correct until the actual picker/runtime flow is verified.

Required to become correct:

- Starship maneuver registry exists.
- Progression flow grants the correct number of maneuvers.
- Repeatable selections are stored safely.
- Gunnery Specialist alternate qualification limits choices to Gunner maneuvers when applicable.

### Tactical Genius

Expected implementation home: starship maneuver resource recovery.

Current status: `implemented_partial`.

The catalog correctly describes the natural-20 recovery trigger, but the feat is not proven correct until a runtime hook listens for the correct attack-roll trigger and refreshes spent maneuvers at the correct timing.

### Starship Designer

Expected implementation home: GM/player source reference.

Current status: `metadata_correct`.

This is intentionally not automated. The project policy is that Starship Designer is effectively unimplementable as normal sheet automation and should remain metadata-only with a GM/player instruction to consult Starships of the Galaxy.

## Implementation guidance

Do not implement these feats as static bonuses. Starship Tactics and Tactical Genius should wait for a proper maneuver suite/resource subsystem. Starship Designer should remain manual/source-reference only.
