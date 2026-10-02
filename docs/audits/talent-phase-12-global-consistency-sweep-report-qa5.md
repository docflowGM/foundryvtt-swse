# Phase 12 — Global Semantic Consistency Sweep (QA-1 through QA-5)

## Closeout

- Canonical talent corpus: **1,187**
- Certified semantic assignments: **1,185**
- Existing ontology deferrals: **2** (`Quick Study`, `Done It All`)
- Certified records revised by global QA: **24**
- Phase 12-1 revisions: **11**
- Phase 12-2 revisions: **13**
- New tag strings authorized: **0**
- New ontology gaps created: **0**
- Production mutations performed by this sweep: **0**

## Phased QA results

- **QA-1 — Identity / mechanical families:** 6 revisions.
- **QA-2 — Reliability / action / resource / condition semantics:** 10 revisions.
- **QA-3 — Combat family normalization:** 2 revisions.
- **QA-4 — Force / support / targeting implications:** 6 revisions.
- **QA-5 — Full-corpus integrity:** all gates passed after the corrections above.

## Exact revisions

### QA-1

- **CORE-015 — Charm Beast** (`c919d7682bd9df40`, Saga Edition Core Rulebook)
  - Added: `manipulation`, `control`
  - Removed: `nature`
  - Reason: Core and Jedi Academy explicitly identify Charm Beast as the same talent. Normalize to the direct mechanic: Force-based Persuasion substitution against beasts, with social manipulation/control; remove broad `nature` leakage.
- **CORE-023 — Notorious** (`c67cbd59abd1cc53`, Saga Edition Core Rulebook)
  - Removed: `mind-affecting`
  - Reason: The two Core Notorious records have the same intimidation-reroll mechanic. The text does not explicitly make the talent itself a mind-affecting effect, so remove the inconsistent `mind-affecting` tag.
- **CW2-054 — Force Treatment** (`a6ad65c1275faa33`, Clone Wars Campaign Guide)
  - Added: `recovery`
  - Reason: Clone Wars Force Treatment uses Use the Force in place of Treat Injury just like the Core version; add `recovery` to match the healing/recovery capability of the substituted skill.
- **CORE2-164 — Shift Defense I** (`cb981391d4d16c59`, Saga Edition Core Rulebook)
  - Removed: `balance`
  - Reason: Shift Defense I–III are one progression with the same defensive trade mechanic. Normalize to action/defense/setup semantics; remove `balance` leakage.
- **CORE-027 — Shift Defense II** (`c6739fcf6d2107d6`, Saga Edition Core Rulebook)
  - Added: `setup`
  - Removed: `resilience`, `survivability`
  - Reason: Shift Defense I–III are one progression with the same defensive trade mechanic. Normalize to action/defense/setup semantics; generic survivability/resilience overstates the mechanic.
- **CORE-028 — Shift Defense III** (`6996c6ba09d63ab7`, Saga Edition Core Rulebook)
  - Added: `setup`
  - Removed: `resilience`, `survivability`
  - Reason: Shift Defense I–III are one progression with the same defensive trade mechanic. Normalize to action/defense/setup semantics; generic survivability/resilience overstates the mechanic.

### QA-2

- **UR-044 — Turn the Tide** (`4a3fdcd0f32062b2`, Unknown Regions)
  - Added: `reliability`
  - Reason: Turn the Tide explicitly causes Initiative rerolls; under the tightened global rule, every actual reroll mechanic also carries `reliability`.
- **GAW-041 — Stava Expertise** (`41d3f44653a1fe34`, Galaxy at War)
  - Added: `reliability`
  - Reason: Stava Expertise explicitly rerolls grapple checks; add `reliability` to match every other direct reroll mechanic.
- **JATM-027 — Fluidity** (`5567797336fc8571`, Jedi Academy Training Manual)
  - Added: `reliability`
  - Reason: Fluidity carries applicable Acrobatics rerolls to the substituted Use the Force check; add `reliability` for reroll consistency.
- **TFU-007 — Computer Language** (`662eb601a2686349`, Force Unleashed Campaign Guide)
  - Added: `reroll`, `reliability`
  - Reason: Computer Language transfers applicable Use Computer rerolls to Persuasion. It was the only substitution talent with this printed clause missing both `reroll` and `reliability`.
- **KOTOR-017 — Past Visions** (`462df9a631ee50f4`, Knights of the Old Republic Campaign Guide)
  - Removed: `reliability`
  - Reason: Past Visions halves farseeing DCs and removes a Force Point requirement; that is difficulty/resource improvement, not reroll/fixed-result/failure-rescue reliability.
- **REB2-032 — Lose Pursuit** (`b1bfca51996bb303`, Rebellion Era Campaign Guide)
  - Removed: `reliability`
  - Reason: Lose Pursuit grants a +5 Pilot bonus. A plain numerical bonus does not meet the tightened `reliability` standard.
- **SOTG2-013 — Wingman** (`60b02b78caed8e16`, Starships of the Galaxy)
  - Removed: `reliability`
  - Reason: Wingman grants a +5 Pilot bonus to an ally. A plain numerical bonus does not meet the tightened `reliability` standard.
- **REB2-046 — Right Gear for the Job** (`f09f37cda0fc10e1`, Rebellion Era Campaign Guide)
  - Removed: `reliability`
  - Reason: Right Gear for the Job grants +5 and temporary training; it improves capability but does not reroll, take 10/20, fix a result, or rescue a failed roll.
- **CW2-105 — Protective Reaction** (`ad7fd3e1a2b04c32`, Clone Wars Campaign Guide)
  - Removed: `reaction`
  - Reason: Protective Reaction's printed mechanic creates an attack of opportunity; the word 'Reaction' is only in the talent name. Remove the unsupported `reaction` action tag rather than inventing an action-economy cost.
- **SAV2-077 — Improved Manipulating Strike** (`8d14ab116a78dfd6`, Scum and Villainy)
  - Added: `action_economy`
  - Reason: Improved Manipulating Strike explicitly changes which target action is controlled from swift to move action, so it directly changes action economy.

### QA-3

- **CORE-013 — Devastating Attack** (`383915a7d11e1225`, Saga Edition Core Rulebook)
  - Added: `melee`, `ranged`, `targeting`
  - Removed: `precision`
  - Reason: Devastating Attack and Greater Devastating Attack are the same threshold-bypass family at different magnitudes. `precision` is reserved for attack-roll improvement, not threshold reduction.
- **CORE2-120 — Greater Devastating Attack** (`d3b19d5e369f579d`, Saga Edition Core Rulebook)
  - Removed: `offense_melee`, `offense_ranged`
  - Reason: Normalize Greater Devastating Attack to the same semantic family as Devastating Attack: weapon-scoped threshold manipulation, not generic offense tags.

### QA-4

- **KOTOR2-037 — Force Throw** (`86565bbe8b8fd1a2`, Knights of the Old Republic Campaign Guide)
  - Added: `force`
  - Reason: Force Throw directly uses move object/telekinetic Force mechanics. `force_power_synergy` without the base `force` domain was inconsistent.
- **CORE2-154 — Shii-Cho** (`c116f6249f4f47c9`, Saga Edition Core Rulebook)
  - Added: `force`
  - Reason: Shii-Cho explicitly modifies Use the Force checks for Block/Deflect; add the base `force` domain.
- **CORE2-156 — Soresu** (`af8c6f9b6c06b448`, Saga Edition Core Rulebook)
  - Added: `force`
  - Reason: Soresu explicitly rerolls Use the Force checks for Block/Deflect; add the base `force` domain.
- **LEG2-007 — Defensive Acuity** (`0bc102751285d17c`, Legacy Era Campaign Guide)
  - Added: `force`
  - Reason: Defensive Acuity explicitly grants a bonus on Use the Force checks for Block/Deflect; add the base `force` domain.
- **KOTOR-001 — Weak Point** (`18bbce2836989fc5`, Knights of the Old Republic Campaign Guide)
  - Added: `target-designation`
  - Reason: Weak Point explicitly designates one visible target before bypassing that target's DR; add `target-designation`.
- **REB2-039 — Capture Droid** (`9ae263137f27e220`, Rebellion Era Campaign Guide)
  - Removed: `ally_support`
  - Reason: Capture Droid converts an enemy droid into an ally after repair/control, but the talent is not ally-supporting an existing ally. Remove structural `ally_support` leakage.

## QA-5 integrity gates

- 1,185 certified assignments have unique canonical IDs.
- 1,185 certified assignments have unique audit keys.
- Every certified assignment has a nonempty, duplicate-free `finalTags` array.
- Every certified tag is in the surviving 184-tag Phase 11 vocabulary.
- Every `reroll` record also carries `reliability`.
- Every explicit `reaction`, `swift_action`, `move_action`, or `standard_action` record also carries `action_economy`.
- Every `force_point_spend` record also carries `resource_spend`.
- Every `condition_removal` record also carries `recovery`.
- Every `use_the_force` and `force_power_synergy` record also carries the base `force` domain.
- Every `ally_support` record also carries `support`.
- Identical-mechanic `Charm Beast`, `Notorious`, `Force Treatment`, and duplicate Multiattack families converge by semantic tag set.
- Shift Defense I–III converge to one mechanical tag profile.
- Devastating Attack / Greater Devastating Attack converge to one mechanical tag profile.

## Execution note

Claude may already be applying the earlier Phase 12-1 QA3 authority. Do **not** interrupt or reinterpret that execution. When it finishes, use the global-QA Phase 12-1 delta as a deterministic reconciliation pass. Phase 12-2 production execution should use the GLOBAL_QA authority, not the earlier 12-2 COMPLETE file.

## Remaining ontology deferrals

- `fd37b68c6fb620f6` — **Quick Study** — `TEMPORARY_TALENT_ACCESS`
- `d376f165f1a47281` — **Done It All** — `TEMPORARY_TALENT_ACCESS`
