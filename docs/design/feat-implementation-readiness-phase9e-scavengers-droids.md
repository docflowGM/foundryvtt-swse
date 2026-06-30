# Phase 9E Design — Droid Feat Implementation Readiness

## Scope

This phase covers only feat implementation accuracy for *Scavenger's Guide to Droids*.

It does not implement new mechanics. It creates the backlog needed to implement them correctly.

## Implementation homes

| Home | Feats |
| --- | --- |
| Damage resolution / condition-track workflow | Ion Shielding, Damage Conversion |
| Attack option / action timing | Aiming Accuracy, Multi-Targeting, Pinpoint Accuracy |
| Droid special action cards | Distracting Droid, Slammer, Tool Frenzy |
| Grapple workflow | Pincer |
| Shield/SR workflow | Droid Shield Mastery, Shield Surge |
| Progression/choice derived logic | Logic Upgrade: Skill Swap, Droid Focus |
| Movement/reaction workflow | Erratic Target, Turn and Burn |
| Sensor/Aid Another metadata | Sensor Link |

## Recommended implementation sequence

1. Preserve correct implementations with regression tests: Ion Shielding, Logic Upgrade: Skill Swap.
2. Implement/verify droid action cards: Distracting Droid, Slammer, Tool Frenzy.
3. Implement shield/SR actions: Droid Shield Mastery, Shield Surge.
4. Add aim-state tracking for Aiming Accuracy, Multi-Targeting, Pinpoint Accuracy.
5. Add droid contextual choice resolver for Droid Focus.
6. Add movement/reaction prompts for Erratic Target and Turn and Burn.
7. Add grapple workflow hooks before Pincer.

## Accuracy rule

Do not mark a feat as implemented just because it has `abilityMeta`. The runtime surface must match the actual feat behavior.
