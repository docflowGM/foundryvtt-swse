# Phase 5D-I-C-C — reaction / defense / disarm / recovery convergence

* #1017 (Phase 5D-I-C-B) merge SHA: `d35fa5637a0e3206aa5268f630774e30b46c0a91`
* I-C-C baseline `main` SHA: `d35fa5637a0e3206aa5268f630774e30b46c0a91` (merged-main full rolling suite: 337 passed / 0 failed / 5 documented exclusions)
* Branch: `audit/weapon-phase-5d-i-c-c-reaction-defense`

Scope: make the **existing** reaction, defense and Disarm workflows consume the currently wielded canonical weapon and its structured defensive rules.
No second reaction engine, no new state store. I-D (stealth, concealment, slots, durability, upgrades, poison coating, falling-object table,
dependent-talent corpus) is untouched.

## 1. Audit of the existing reaction system (before the change)

| Question | Finding |
|---|---|
| Where are Block / Deflect / Redirect Shot actually rolled? | `LightsaberTalentActions.promptBlock / promptDeflect / promptRedirectShot` (`scripts/engine/talent/lightsaber-talent-actions.js`). `ReactionRegistry` block / deflect are metadata with placeholder handlers (a bare `rollSkill` fallback that composes no modifier). |
| Talent eligibility | `hasTalent(actor, 'Block')` matched the **display name** of any `talent` Item. |
| Reaction actor / weapon | The actor is the caller's; **no wielded weapon was resolved at all** — "requires an active lightsaber" was card text only. Profile / configuration were invisible to reaction code. |
| Use the Force composition | `rollSkillCheck(... customModifier)`: dialog modifier + cumulative penalty + Lightsaber Specialist +2. No weapon term existed. |
| Cumulative penalty | actor flag `swse.blockDeflectUseState` (`uses`), priced `-5 x uses`; Improved Redirect / Improved Riposte credit back one use. |
| Multiple reactions per round | same counter (shared by Block and Deflect), keyed by encounter / round / turn. |
| Passive defense | `getTargetDefense` + `targetContext.defenseAdjustment` (an additive, opt-in seam added for grab resistance). |
| Disarm | **There is no Disarm resolver.** It is a GM-managed melee attack option (`combat-actions.json`: −10 attack, `automationBoundary: assist`); the defense it is rolled against is the target's ordinary Reflex Defense. |
| Name-based assumptions found | `hasTalent` / `countTalent` (talent display names), `weaponOptions` / Lightsaber Throw list (`/lightsaber/i` on names). All made identity-first (§4). |
| Unwired finding | `LightsaberFormEngine.getBlockDeflectPenaltyPerPreviousUse` (Shii-Cho: 2 instead of 5) is never called. Left alone (talent-form owner); noted, not changed. |

## 2. One reaction-weapon context

`scripts/engine/combat/reactions/reaction-weapon-context.js` (+ pure `scripts/items/weapon-runtime/reaction-rules.js`). It resolves, from the actor's **owned,
equipped canonical weapons at reaction time** (the persistent setting is the existing `flags.swse.fireState.settingProfile`; nothing new is stored):

* `resolveReactionWeapon(actor, reaction)` → `legacy` (no canonical weapon: the existing path is unchanged), `none` (canonical weapons equipped, none eligible → refused),
  `selected` (exactly one), or `choice` (several **materially different** legal weapons → asked once; never the best of all).
* `selectedReactionModifiers`, `passiveDefenseAdjustment`, `resolveDisarmProtection`.

### Eligibility vs modifier (kept apart)
`reactionEligibility()` answers "can this weapon be the reaction weapon?"; `reactionModifiers()` answers "what changes on the check?". A modifier never grants a
reaction (Crossguard / Guard Shoto numbers do not make a weapon Block-eligible); an eligibility declaration implies no number (Sith Sword / San-Ni inherit none).

### Passive vs active (kept apart)
Active: the Use the Force reaction roll (Crossguard, Guard Shoto, Pike). Passive: the Dual-Phase Reflex penalty, applied in the attack's target-side defense stage
(`resolveTargetSideDefense` → `passiveDefenseAdjustment`), attack-contextual, never written to the actor.

## 3. Per-weapon results

| Weapon | Source (JATM / others) | Result |
|---|---|---|
| Crossguard | "each successive Use the Force check made to block… only a cumulative −2 instead of −5; −2 on all UTF checks made to use Deflect" | Block: the **increment its own weapon contributes** is 2 (0, −2, −4); Deflect: flat −2 and the normal 5 added to the counter. Each use records its own increment (weapon change never re-prices earlier uses). |
| Guard Shoto | +2 equipment bonus on UTF made with Block or Deflect, proficient wielder | applies to Block and Deflect only (never Redirect Shot / a general UTF bonus); equipment bonuses do not stack: only the excess over the best equipment bonus already applying counts. |
| Lightsaber Pike | "−2 penalty on Use the Force checks to use the Block or Deflect talent" | flat −2 per Block / Deflect (not cumulative). `BlockPenalty`, `DeflectPenalty` and `blockDeflectUseTheForcePenalty` are **one rule** stated three ways: per-reaction key wins, combined key serves both, never added. There is no separate Force-Unleashed weapon: the combined key is the Pike's. |
| Dual-Phase | extended blade: −2 Reflex vs adjacent attackers | passive; only while `settingProfile = extended`; adjacency observed (`adjacent` / `distance`) else asked once; unanswered = not applied. |
| Sith Sword | proficient wielder treats it as a lightsaber for Block, Deflect, Redirect Shot | eligibility for those three (requires canonical proficiency); stays a Sith Sword (no lightsaber group, proficiency or Item). "…and talents that use those abilities as prerequisites" has no structured list → recorded `dependentTalentsUnstructured`, **DEFERRED_TO_I_D**. |
| Felucian Skullblade | "when imbued with Force energy it can block lightsaber strikes" | Block eligibility only while imbued. The runtime has no imbued state → stored PROMPT; unanswered = unresolved (never imbued-by-default, never a Force-sensitive guess). **DATA_COMPLETENESS**: no representation of a Force-imbued weapon state (owner: final certification). |
| San-Ni Staff (`mayUseBlockAsLightsaber`, the only carrier) | "can be used with Block as though it were a lightsaber" | Block eligibility only; not Deflect / Redirect Shot, not a lightsaber for any other mechanic. |
| Combat Gloves, Shockboxing Gloves, Stunning Gauntlet, Vibroknucklers | cannot be disarmed or dropped | a disarm attack is refused before any ammunition / action / roll / card. |
| DLT-20A Long Blaster | +1 equipment bonus to Reflex when the target of a disarm attack | applies only to a disarm attack (excess over an existing equipment bonus). |
| Shyarn, Zhaboka | no attack penalty with Rapid Strike | **attack-side**: already consumed by the structured `REMOVE_RAPID_STRIKE_ATTACK_PENALTY` interaction at attack time; the key is a verified DUPLICATE, regression-tested; no Rapid Strike math in the reaction engine. |
| Darkstick | a thrown attack exceeding Reflex by 5 or more returns | weapon-native, **thrown form only**: AUTO recovery record, exactly +5 qualifies, no feat, no reaction, once per card; the owned weapon is neither removed nor unequipped (no item-location model exists). |

### Return distinctions
Darkstick = weapon-native. **Discblade `returnToHand`** states "external-Zeison-Sha-Force-technique-not-base-quality": a certified *negative* statement, classified
NON_EXECUTABLE; Recall Discblade stays with the talent corpus (DEFERRED_TO_I_D; the four talent-corpus relations remain deferred). **Returning Bug** is a separate feat for
razor / thud bugs and is inferred from no weapon flag.

### Disarm / drop
`cannotBeDisarmed` and `cannotBeDropped` are categorical for the **combat-forced** drop (Disarm). Voluntary dropping / unequipping is inventory behavior and is deliberately
untouched (the context module performs no actor / item write). When a disarm does not name the item and the holder carries a protected weapon among others, the aimed-at item
is asked once (or `disarmItemId` names it); an unanswered fact applies no protection and is surfaced.

## 4. Identity-first
`hasTalent` / `countTalent` now use `canonicalFeatSlug` (a canonical talent named "Block" that is not Block no longer counts; the display-name match remains the legacy fallback only).
`weaponOptions` / Lightsaber Throw use the structured weapon group for canonical weapons. Closure ledger rules classify only the remaining legacy fallbacks (IDENTITY_FALLBACK);
`CANONICAL_NAME_TEXT_HEURISTIC_USAGE` stays 0.

## 5. Relation closure
`POSITIVE_WEAPON_MODIFIER` (3) and `NEGATIVE_WEAPON_MODIFIER` (3) are **selectors** naming the reaction an operation number belongs to; the number lives once in the operation field
(no double application). Deferred relation families 6 → 4 (the four talent-corpus relations untouched).

## 6. Counters
Special-mechanic DEFER 10 → 3 (I-C-C 7 → 0; Gas Grenade concealment, Sith Sword empowerment, Verpine durability remain I-D). `defense-and-reaction-interactions` PARTIAL → **CONSUMED**
(12 executable keys: 9 implemented, 1 duplicate, 2 non-executable by their certified value). Unique unconsumed operation keys 88 → 75, raw 115 → 95, operation families without consumer 12 → 11,
fully consumed execution families 36 → 37. I-C-C manifest: 29 inputs (19 operation keys, 6 special mechanics, 2 relations, 2 ability-compatibility) — 23 implemented, 1 duplicate,
2 non-executable, 1 data-completeness, 2 deferred to I-D, `I_C_C_UNCLASSIFIED = 0`.

## 7. Findings
* DATA_DEFECT: none. DATA_COMPLETENESS: Force-imbued weapon state (final certification); dependent-talent list of the Sith Sword (I-D / talent corpus).
* CONSUMER_DEFECT fixed: reaction code never read the wielded weapon; talent / lightsaber checks were name-based; Block / Deflect numbers (`BlockPenalty` … ) were named only in a deferral note.
* BLOCKED: none. Open (not this phase): the unwired Shii-Cho increment helper; the I-C-A poison-coating discrepancy (owner I-D / final certification); the falling-object table (final certification).

## 8. Foundry smoke checklist (prepared — **not** claimed as run)
Normal lightsaber Block sequence (0 / −5 / −10); Crossguard multiple Blocks and Deflect; Guard Shoto Block / Deflect; Pike Block / Deflect; Dual-Phase default / extended vs adjacent / extended
vs ranged; Sith Sword Block / Deflect / Redirect Shot (proficient vs not); Felucian Skullblade imbued / not imbued prompt; Disarm vs Combat Gloves (refused) and vs DLT-20A (+1);
Rapid Strike with a normal weapon vs Zhaboka; throw a Darkstick at margin < 5, = 5, > 5; two eligible weapons (Crossguard + Guard Shoto) → one choice prompt.

## 9. Recommended I-D scope
Stealth / sensing / concealment (Gas Grenade cloud), weapon-object durability (Verpine), Sith Sword dark-side empowerment, slots / upgrades, general poison-coating discrepancy, the certified
falling-object table, Force-imbued weapon state, dependent-talent structure and the four talent-corpus relations (Discblade Arc, Distant Discblade Throw, Recall Discblade, Siang Lance Mastery).
