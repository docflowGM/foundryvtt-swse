# SWSE Force V2 — Book 7: Legacy Era Campaign Guide

**Editorial / source-verified design review v0.1 — 2026-11-17**

**Status:** 18 new canonical definitions (9 Force Powers, 9 Force Techniques); the Legacy p54 publication of **Force Shield** is a reprint of the FUCG definition and does not consume a new identity. The typed data is structurally valid; Foundry v13 mechanics have not been executed or certified.

## 1. Source authority and scope

- Primary source: user-supplied *Star Wars Saga Edition — Legacy Era Campaign Guide* PDF; printed pages **53–56**, physically rendered PDF pages **54–57**. The book is scanned; searchable DJVU text is a lookup aid, not the final authority.
- Secondary source: `Legacy Era Campaign Guide_djvu.txt`, inspected against corresponding printed PDF pages.
- Repository comparison: `docflowGM/foundryvtt-swse`, main, source pack identities were read-only; the old `dcChart` entries are **not** accepted as canonical.
- Official Legacy-specific errata: **not independently authenticated** during this pass. Do not assert that none exists; apply independently authenticated official errata in a subsequent pass if found.
- Original new claims: 9 Force Powers + 9 Techniques = **18**. The printed guide lists 10 Power entries because Force Shield is an identical cross-book reprint of FUCG p86.

## 2. Canonical source index and DC model

| Printed p. | Definition | Roll / gate | Published DCs |
|---:|---|---|---|
| 53 | Ballistakinesis | Use the Force vs Reflex | No fixed DC ladder |
| 53 | Combustion | Use the Force vs Fortitude | No fixed DC ladder |
| 53 | Dark Transfer | Use the Force fixed DC | 15/20/25/30 |
| 53 | Detonate | Use the Force fixed DC | 20/25/30/35 |
| 54 | Enlighten | Use the Force, substitution | No fixed DC ladder |
| 54 | Lightning Burst | Use the Force vs Reflex | No fixed DC ladder |
| 54 | Obscure | Use the Force vs Will | No fixed DC ladder |
| 54 | Prescience | Use the Force fixed DC | 15/20/25 |
| 54 | Stagger | Use the Force vs Fortitude | No fixed DC ladder |
| 55 | Detoxify Poison | Technique: modifies base Power | No fixed DC ladder |
| 55 | Improved Ballistakinesis | Technique: modifies base Power | No fixed DC ladder |
| 55 | Improved Dark Transfer | Technique: modifies base Power | No fixed DC ladder |
| 56 | Improved Detonate | Technique: modifies base Power | No fixed DC ladder |
| 56 | Improved Enlighten | Technique: modifies base Power | No fixed DC ladder |
| 56 | Improved Lightning Burst | Technique: modifies base Power | No fixed DC ladder |
| 56 | Improved Obscure | Technique: modifies base Power | No fixed DC ladder |
| 56 | Improved Force Shield | Technique: modifies base Power | No fixed DC ladder |
| 56 | Improved Stagger | Technique: modifies base Power | No fixed DC ladder |

Only **Dark Transfer, Detonate, and Prescience** have fixed DC ladders. Their 4 + 4 + 3 = **11 DC rows** must not be mistaken for the defense comparisons used by the other six powers. An equal-to-defense result is a hit under each published `equals or exceeds` comparator.

## 3. Force Power mechanical definitions — exact behavioral synopsis

### Ballistakinesis — p. 53

2x2 area within 12; UTF >= each target Reflex: 3d8 chosen physical type and attack -2 until next turn; FP gives half damage on misses.

- **Resolution gate:** defense-per-target against reflex. No invented DC table.
- **Force-Point option:** On a Reflex miss, target takes half of the rolled 3d8 without the attack penalty.

### Combustion — p. 53

2x2 area; UTF vs each Fortitude: hit 4d6 fire and ignite, miss half damage without ignition; ignite uses UTF total as ongoing fire attack bonus.

- **Resolution gate:** defense-per-target against fortitude. No invented DC table.
- **Force-Point option:** Move one target hit by Combustion down one CT step.

### Dark Transfer — p. 53

Touch a living other creature, heal character level x1/x2/x3/x4 at DC 15/20/25/30; each use costs -1 persistent CT and +1 Dark Side Point.

- **DC 15:** Heal 1 x caster character level HP
- **DC 20:** Heal 2 x caster character level HP
- **DC 25:** Heal 3 x caster character level HP
- **DC 30:** Heal 4 x caster character level HP
- **Force-Point option:** Avoid the persistent -1 condition step, but still gain 1 Dark Side Point.

### Detonate — p. 53

One unattended object within 12/LOS takes 4d6/6d6/8d6/10d6 at DC 20/25/30/35; FP adds 2d6.

- **DC 20:** 4d6 damage to selected unattended object
- **DC 25:** 6d6 damage to selected unattended object
- **DC 30:** 8d6 damage to selected unattended object
- **DC 35:** 10d6 damage to selected unattended object
- **Force-Point option:** Add +2d6 damage to the object.

### Enlighten — p. 54

Swift action or reaction, ally within 12/LOS substitutes caster UTF total for ONE attack/skill/opposed roll or selected defense before start of caster next turn.

- **Resolution gate:** attack-substitution against no fixed target defense. No invented DC table.
- **Force-Point option:** Extend substitution availability until the end of your next turn.

### Lightning Burst — p. 54

All adjacent enemies, UTF vs each Reflex; hit 3d6 Force and -1 CT, miss half Force damage without CT; maintained as standard if unmoved.

- **Resolution gate:** defense-per-target against reflex. No invented DC table.
- **Force-Point option:** Increase base Lightning Burst damage by +2d6; miss still takes half adjusted damage.
- **Maintenance:** standard action; new check = True; specific end triggers = caster-has-moved-since-activation.

### Obscure — p. 54

Reaction to a just-rolled enemy attack within 12/LOS; UTF >= attacker Will applies -5 to the attack; if it misses, optional reroll against another creature adjacent to attacker at -5.

- **Resolution gate:** defense against will. No invented DC table.
- **Force-Point option:** Apply -5 to all of that enemy’s attacks until start of its next turn.
- **Interpretation flagged:** The phrase “another creature adjacent to it” refers to the original attacker (the power’s defined target), not the creature originally attacked.

### Prescience — p. 54

Against one enemy LOS, DC 15/20/25 grants +1/+2/+3 insight to attacks against that enemy and Defenses vs its attacks/effects through end of caster next turn.

- **DC 15:** +1 insight to attacks vs selected foe and defenses vs its effects
- **DC 20:** +2 insight to attacks vs selected foe and defenses vs its effects
- **DC 25:** +3 insight to attacks vs selected foe and defenses vs its effects
- **Force-Point option:** Affect one additional enemy within line of sight using the same tier.

### Stagger — p. 54

Swift, one adjacent enemy: UTF >= Fortitude deals 2d6 Force damage and pushes 1 square without AoO; FP targets all adjacent enemies.

- **Resolution gate:** defense against fortitude. No invented DC table.
- **Force-Point option:** Compare UTF against all adjacent enemies’ Fortitude Defenses and apply base hit effects individually.

## 4. Force Techniques — exact source mapping

The following relationships modify the usage of an identified power. **A related power identifier does not itself add a prerequisite to acquire the technique**; acquisition is governed by printed progression entitlements and any actual explicit prerequisites.

- **Detoxify Poison** (p. 55) → `core/force-power/vital-transfer`: Replace Vital Transfer healing with UTF vs active poison DC, detoxifying as Treat Injury on success; no ordinary healing.
- **Improved Ballistakinesis** (p. 55) → `legacy/force-power/ballistakinesis`: Spend FP on Ballistakinesis to increase 2x2 area to 3x3.
- **Improved Dark Transfer** (p. 55) → `legacy/force-power/dark-transfer`: Spend FP, DC 25 UTF, revive creature deceased since end of last turn: target becomes unconscious, not dead, and gets no HP healing.
- **Improved Detonate** (p. 56) → `legacy/force-power/detonate`: On Detonate, enemies within 2 squares of the object suffer HALF damage actually sustained by object if UTF >= each Reflex; area attack.
- **Improved Enlighten** (p. 56) → `legacy/force-power/enlighten`: Spend FP during Enlighten to include one additional ally.
- **Improved Lightning Burst** (p. 56) → `legacy/force-power/lightning-burst`: On Lightning Burst, compare UTF to each target’s Reflex AND Fortitude; if both met, also push 1 square and prone.
- **Improved Obscure** (p. 56) → `legacy/force-power/obscure`: Spend FP during Obscure to gain +5 Force bonus on its Use the Force check.
- **Improved Force Shield** (p. 56) → `fucg/force-power/force-shield`: When using Force Shield, spend FP to include adjacent allies; alternatively spend DP to shield occupied vehicle of any size; non-stacking SR.
- **Improved Stagger** (p. 56) → `legacy/force-power/stagger`: Spend FP to push a successful Stagger target 2 squares instead of 1.

## 5. Cross-domain interactions and event authority

The influence graph has 16 source-backed relationships: 9 techniques, 3 new Legacy talents, and 4 Death Sticks equipment/status effects. Core Telekinetic Power and Telekinetic Savant already have global descriptor-driven relationships; they are **not duplicated**.

- **Move Massive Object (Legacy p55):** requires Telekinetic Power and Move Object. Spend Force Point while moving Large+ object; the area becomes 2×2/3×3/4×4/6×6 by object size. Use the existing Move Object damage, compare individual Reflex; hit = full, miss = half.
- **Telekinetic Stability (p55):** applies to any involuntary movement event, not only the Stagger power. Optional FP cancels displacement. Do not suppress damage/condition effects not covered by printed wording.
- **Dark Preservation (p55):** applies to any incoming condition-track decrease. Spend one FP and gain one Dark Side Point to negate that decrease; does not imply removing other effects.
- **Death Sticks (p56):** while euphoria persists, actual Use the Force checks have −10, actor attack rolls and personal defenses gain **+1 morale**, and **no Force Points may be spent**. This includes qualifying uses of the Force subsystem and Target Sense; an ordinary Pilot roll is not an Use the Force check merely because Force Pilot changes its ability modifier.
- **Force Shield (FUCG p86, Legacy reprint p54):** its improvement technique belongs to Legacy p56 and refers back to the FUCG definition, protecting adjacent allies by FP or occupied vehicles by DP with nonstacking SR. No new Force Shield actor/pack definition is created.

## 6. Schema changes: v2.8 → v2.9

- **14 new typed operations**, for a total of **159**. Add fire ignition linked to a recorded UTF total, explicit half damage on a failed defense check, persistent on-attempt costs, poison detoxification, extra defense comparisons, conditional attack redirection, temporary insight-roll substitution, damage-sharing from a target object, and vehicle-wide shields.
- **`resolution.onAttempt`** is now a separate typed lifecycle phase. Dark Transfer uses it so the 8-hour persistent condition and Dark Side Point cannot be silently skipped on a failed healing check. FP prevention of the condition does not prevent the Dark Side Point.
- **`activation.alternateActions`** supports Enlighten’s printed Swift-or-Reaction options without inventing a hybrid action.
- **`powerRules`** supports per-target area defense, shared damage roll and half-on-miss, independent fire attack modifier, finite roll substitution, and condition-based costs.
- **Cross-domain influence selectors** allow broad event triggers, such as involuntary movement, condition-track reduction, actual Use the Force check, or Force Point spend, rather than enumerating only named powers.
- The JATM RAW rider correction is retained: **matching Form talent ownership** grants its Form Power rider; no active form stance gate. An activated lightsaber remains required to use Form Powers.

## 7. Verification and acceptance

- 18 new definitions and 16 new influence edges pass Draft 2020-12 schema validation.
- **212 / 212** total canonical definition IDs across the seven source packages, with no collisions; **178** unique influence edges.
- All six earlier book packages pass v2.9 revalidation. Back-compatible copies are included in the ZIP; source packages remain unchanged.
- Tests are **specified, not run**: 166 new Book 7 scenarios. They include all DC boundaries (below and exactly at printed DC), defense equality, FP alternatives, reprint identity, fire, persistent costs, global effects and technique interactions.
- Offline validation is not a live Foundry v13 roll, action-economy, resource mutation, active effect, vehicle or UI test. No production files or GitHub branches have been altered.

## 8. Design blockers requiring review (Claude must not infer)

- **LEG-001 — blocks-full-automation**: Potential FP stacking: base Ballistakinesis half-on-miss versus Improved Ballistakinesis area-expansion. No text authorizes both from one FP; encode distinct choices until adjudicated.
- **LEG-002 — blocks-full-automation**: Competing base/technique FP modes for Obscure, Stagger, and Force Shield. Do not silently combine, double-charge, or treat a single point as paying multiple enhancements.
- **LEG-003 — review**: Combustion ongoing fire uses initial UTF check TOTAL as fire attack bonus; confirm how fire attacks are scheduled/resolved by shared Core fire service without a duplicate fire subsystem.
- **LEG-004 — review**: Dark Transfer persistent condition cost applies to each use, including a failed healing check. Treatment alongside revival variant and Dark Preservation must respect explicit source costs and resource expenditure timing.
- **LEG-005 — review**: Legacy uses `equal or exceeds` for ability hit checks, and Ballistakinesis FP says targets you `fail to exceed`: treat equality as hit based on complete rule, not as half-damage miss.
- **LEG-006 — review**: Detonate printed damage type unspecified. Improved Detonate gives nearby targets slashing damage based on actual object damage; object hardness/DR and half rounding owned by shared DamageSystem.
- **LEG-007 — review**: Force Shield is a Legacy reprint of FUCG original, not a second learnable definition; repeated text read matches known origin, but verify formal published errata.
- **LEG-008 — review**: Official Legacy Era-specific errata was not independently authenticated in this pass. Printed pages 53–56 remain authority pending an official source.
- **LEG-009 — review**: Enlighten defense substitution scope: one chosen defense until next turn versus consumed one roll. Store source-specific distinction and do not invent repeated or unrestricted substitution.
- **LEG-010 — review**: Original Obscure “another creature adjacent to it” uses “target” for attacking enemy. Explicitly resolve adjacent-to-attacker for implementation; retain review if contradictory official clarification found.

## 9. Files

- `SWSE_Force_V2_Legacy_Era_Book_7_Canonical_Definitions_and_DC_Tables_v0.1.json` — 18 mechanically typed records.
- `SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.9.json` — strict new book schema.
- `SWSE_Force_V2_Legacy_Era_Book_7_Cross_Domain_Influence_Graph_v0.1.json` — cross-source effects.
- `SWSE_Force_V2_Cross_Domain_Influence_Graph_Schema_v2.9.json` — strict influence contract.
- `SWSE_Force_V2_Legacy_Era_Book_7_Acceptance_Cases_v0.1.json` — 166 test proposals, all NOT RUN.
- `SWSE_Force_V2_Legacy_Era_Book_7_Validation_Ledger_v0.1.json` — counts, source mapping, prior-book validation, open questions.

## 10. What the 212 / 212 checkpoint does and does not mean

**Complete:** all source definition identities in the current 212-entry inventory are now represented in the seven bookwise packages (28 + 27 + 20 + 31 + 19 + 69 + 18).

**Not complete:** source-wide audit of other books for missing definitions, final atomic ActorEngine operation plans for every compound power, resolution of all editorial blockers, actual executable regression tests, performance, UI, and Foundry v13 end-to-end verification. The 212 count is the *planned source inventory*, not proof that no missing rule elsewhere exists. Before Claude implementation, run a cross-book completeness and semantics certification pass and close blockers.
