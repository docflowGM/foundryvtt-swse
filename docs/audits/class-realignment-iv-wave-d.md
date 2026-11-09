# Class Realignment IV — Wave D (Master of Movement, Executive Leadership, Unexpected Results)

**Stacked on:** Wave C (PR #1135) -> Wave B (PR #1121). Force-class work (PR #1134) untouched.
**Source:** Knights of the Old Republic Campaign Guide (Master of Movement; Executive Leadership), Force Unleashed Campaign Guide (Unexpected Results), read from the repository OCR where legible. Printed pages not re-read from the PDFs. FOUNDRY_TESTED: NOT_RUN for all three.

## Master of Movement (Melee Duelist) — IMPLEMENTED, OFFLINE_TESTED
- One per-encounter pool, floor(Melee Duelist level / 2); each use is exactly one option:
  - **Reroll** a single Jump or Acrobatics check, keeping the better (`2d20kh1`, the same primitive as Master Saboteur / Score). The use is written through ActorEngine **before** the roll and refunded if the roll fails or throws. Only a rolled check qualifies, not Take 10/20.
  - **Movement**: spends a use and returns a receipt/notification. The terrain judgement and the move stay with the GM and Foundry's movement tools; no pathfinding or terrain engine.
- Key `meleeDuelist.masterOfMovement` on the existing scaling grants (values 1..5 already encoded the uses).
- Opt-in checkbox in the roll dialog for Jump/Acrobatics while a use remains; API `game.swse.classFeatures.masterOfMovement(actor)` for the movement option.

## Executive Leadership (Corporate Agent) — DEFERRED_RULES_REVIEW (CF-RD-008)
Printed text (OCR): swift action, a number of times per encounter equal to half the Corporate Agent level, an ally within line of sight gains **until the end of their turn** one of: +2 squares base speed, +2 morale attack, or +2 morale to all defenses.
- Blocked on a rules question, not engineering: it is not stated *which* turn of the ally (their next one, or the current round's if they already acted) the benefit covers. Guessing would invent a duration.
- Seam when ruled: `EffectIntentEngine` managed effects already support `until-end-next-turn` / `until-start-next-turn` expiry; the recipient identity must be an explicit, GM-confirmed actor (no line-of-sight engine), the swift action goes through `ActionEconomyConsumption`, uses are an encounter ledger like Master of Movement.

## Unexpected Results (Saboteur) — BLOCKED (architecture)
Printed text (OCR): when an enemy's attack roll against the Saboteur is a natural 1 with an advanced melee weapon, lightsaber, pistol, rifle or heavy weapon, that weapon is disabled until repaired (Mechanics repair object).
- No existing authority for a *disabled weapon Item*: the only "disabled" states are droid anatomy/appendage functional states; no attack-readiness gate reads a weapon-disabled marker; and Mechanics `repair()` targets a typed object/droid, not an owned weapon Item.
- Shipping the trigger without a repair consumer would permanently disable a weapon, so nothing was built. Minimal seam proposed (not built, needs owner review): an ActorEngine-written `flags.swse.weaponDisabled` marker on the owned weapon Item (provenance: source Saboteur, encounter, attacker roll id), a readiness-gate check in `attack-readiness-gate.js`, and a clearing hook in the Mechanics repair path. The natural-1 trigger would be read from `AttackOutcomeResolver` in `rollAttack` when `target` owns the keyed feature (weapon-type classification is available from existing weapon groups; ambiguous types go to GM approval).
- Existing precedent to review first: Store V2 ownership of NPC weapons (unlinked token actors).

## Certification
| | Master of Movement | Executive Leadership | Unexpected Results |
|---|---|---|---|
| IMPLEMENTED | yes | no | no |
| OFFLINE_TESTED | yes | n/a | n/a |
| DEFERRED_RULES_REVIEW | no | yes (CF-RD-008) | no (architecture blocker) |
| FOUNDRY_TESTED | NOT_RUN | NOT_RUN | NOT_RUN |
