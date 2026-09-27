# PHASE 2 - Legacy Era Campaign Guide Checkpoint

**Status:** IN PROGRESS  
**Checkpoint date:** 2026-09-27  
**Branch:** `audit/talent-phase-1-tree-census`

This checkpoint preserves the verified Legacy Era work completed so far. It is **not** the final book certification.

## Verified scope

Current source population:

| Measure | Count |
|---|---:|
| Legacy-origin trees | **16** |
| Origin talents | **88** |
| Expansion targets | **7** |
| Expansion talents | **13** |
| Total preliminary identities | **101** |
| Correct-tree repo records mapped | **91** |
| Missing correct-tree records | **10** |

The hierarchy pass has not found any false nested-action talent identities so far, so the current total remains **101**.

> Earlier conversational status stated 15 origin trees. The registry count is 16; this checkpoint records the corrected count.

## Missing correct-tree item records

All 10 currently missing identities are concentrated in two Force-tradition trees.

### Disciple Of Twilight

- Cloak of Shadow
- Phantasm
- Revelation
- Shadow Armor
- Shadow Vision

### Ember Of Vahl

- Initiate of Vahl
- Reading the Flame
- Sword of Vahl
- Vahl's Brand
- Vahl's Flame

## Same-name identity hazards

Correct-tree Legacy records exist, but these names also exist in other trees and must remain protected by canonical tree identity:

- **Carbineer -> Multiattack Proficiency (rifles)** vs Weapon Master
- **Knight's Armor -> Armor Mastery** vs Armor Specialist
- **Provocateur -> Seize the Moment** vs Outlaw

## Confirmed content contamination

### Provocateur -> Seize the Moment

The correct Provocateur record has a benefit field describing the Legacy Era mechanic:

- when an enemy is reduced to 0 hit points or moved down the condition track, an ally can immediately take a second wind and regain additional hit points.

Its current description field instead contains the **Outlaw** Seize the Moment mechanic about taking a swift action after an ally damages an opponent.

This is confirmed same-name text contamination and must be repaired without touching the distinct Outlaw identity.

## Implant source handling

The Implant tree contains a shared rules paragraph that applies to all five implant talents. During final normalization, that shared aftereffect must be carried into the individual implant talent rules as appropriate. It is not a standalone talent.

## Remaining work before final Legacy certification

- lock printed page attribution for all 101 identities;
- finish full canonical rule-text transcription/normalization;
- finish printed prerequisite capture;
- classify the remaining mapped-record discrepancies;
- publish the final content certification JSON;
- publish the final discrepancy manifest;
- publish the final Legacy Era closeout;
- push the completed book before moving to the next sourcebook.

## Production state

No production talent records or runtime code have been modified.

# Checkpoint verdict

**Legacy Era Phase 2 is partially certified and safely checkpointed.**

The next commit for this book should be the final Legacy Era certification after the remaining page/text pass is complete.
