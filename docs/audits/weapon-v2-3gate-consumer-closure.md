# Weapon V2 three-gate closure report

Branch `claude/clever-fermat-khhs6f` on `main` @ `91ad4ac` (PRs #1137 and #1139 are already merged). Draft PR #1140, **not for merge**.
Source audit: `SWSE_Weapon_Three_Gate_Audit_2026-11-09.md`. Machine ledger: `data/audits/weapon-v2-3gate-field-consumers.json`.
Generator: `tools/audit-weapon-v2-3gate-field-consumers.mjs` (invariants: `tests/weapon-3gate-ledger.test.mjs`).

**Live Foundry V13 testing: NOT done. No gate below is a live certification.**

## Certification matrix (each gate separate)

| Gate | Status | What is proven | What is not |
|---|---|---|---|
| **A: schema and data completeness** | **Partially closed: 5 fields crosswalked, others not** | 5B census current (203 identities, 2,309 paths; 0 unclassified / unmapped). **Registry → production-Item crosswalk** (`data/audits/weapon-v2-3gate-gate-a-crosswalk.json`): 207 production documents; all 203 identities bind one-to-one to a production Item; the 4 unbound documents are lightsaber upgrade parts, not weapons. Melee/ranged category matches on all 203; weight matches on 199 (4 source-silent); damage dice match on 177, 1 documented convention, 25 not comparable (the canonical side states no ordinary dice); damage type: 75 match, 115 documented conventions, 13 source-silent. **No unexplained differences** in those fields. | **Not crosswalked:** proficiency, range band tables, ammunition, size, and the runtime-only schema. `tools/verify-item-weapons-authority.mjs` does not run in this environment (identical on `main`). Source-silent and unmapped:: records are unchanged. |
| **B: consumer completeness** | **Not closed** (every residual now has a stated reason; one genuine gap) | Per-field ledger for all 2,309 paths. All 8 historical deferred families re-verified from code (7 by explicit probe and test, `utility-and-movement` through its keys). Of the 41 historical operation keys: 14 GM-adjudicated, 6 blocked by a missing subsystem, 11 consumed duplicates, 5 source-unresolved, 4 descriptive, **1 genuine missing consumer** (`darkSideEmpowerment`). 0 orphaned census fields. | Most `DIRECT_CONSUMER` rows carry `STATIC_ONLY` or `HISTORICAL_MANIFEST` evidence, not per-field behavioral proof. The one genuine gap is unimplemented by decision. |
| **C: mathematical and rules fidelity** | **Matrix complete: 19 proven, 1 partial** | All 20 audit cases are anchored to an executing test (`data/audits/weapon-v2-3gate-math-matrix.json`, guarded by a test that fails if an anchor rots). Three production defects found and fixed by this pass: damage-Strength branch, legacy two-handed Strength, and **Evasion never reaching canonical area attacks**. | One partial case: M-12 cover negation (WPN-M12-001, a rules question). Live Foundry V13 not run. |

## Before and after: confirmed discrepancies

| ID | Before (reproduced) | After | Test |
|---|---|---|---|
| C-DMG-01 | A confirmed hit with total ≤ 0 gave packet amount 0 (4 of 7 reproduction tests failed) | Effective amount 1 before mitigation; raw total in `flags.rolledTotal`; misses, no-damage, half-damage and hit-less rolls untouched | `weapon-3gate-w1-minimum-hit-damage` |
| C-RNG-01 | A band label (`pointBlank`) plus distance 999 was accepted | Refused before any cost. A contradictory band and distance is refused (`range-band-distance-mismatch`). Band-only, distance-only and unknown still work. | `weapon-3gate-w2-range-authority`; `5d-i-d-f` §H updated |
| C-RNG-02 | A bare `rangePenalty: 0` replaced Medium (−5) | The canonical table wins for banded forms. Only a reasoned `rangeAdjudication` honoured for a GM (`game.user.isGM`) overrides. Legacy forms unchanged. | w2 (6 tests); `5d-d:124` updated |
| C-RNG-03 | A distance-only attack serialized `rangeBand: null`. Pulse-wave got +0 instead of +4 and CR-1 lost its damage penalty. | One effective band is written into the attack options at the same preflight that validates range | `weapon-3gate-w3-range-continuity` (4 of 4 fail without the fix) |
| C-RNG-04 | Defender Microblaster (hard max 3 inside a Point Blank band of 0–20) accepted 4–20 squares | `bandForDistance` honours `hardMaxSquares` | w2 |
| C-RNG-05 | The CR-1 dialog chips showed `(-2)` as if it were an attack penalty | Chips show `(damage -2)`. The only change is the label; there is no second numeric authority. | w3 |
| W7 | `window.SWSECombat.rollAttack/rollDamage` and `CombatUIAdapter.rollDamageUI` built damage from `system.damage` / `combat.damage.dice`, with a `1d6` fallback | Canonical-hinted weapons (including unresolvable hints) redirect to `SWSERoll`, the sheet's own path | `weapon-3gate-w7-legacy-entrypoints` (3 of 4 fail without the fix) |
| Damage-Strength branch | A canonical pistol with no `weaponCategory` (or a schema-defaulted `meleeOrRanged: "melee"`) got **+STR on ranged damage** (`3d6 + 5`), and a melee weapon carrying ranged metadata **lost** its Strength. Same for Siang Lance / Electropole profiles. | `getDamageAbilityContribution` reads the SELECTED canonical profile's branch and descriptor (ranged / thrown / melee), not the Item projection. The attack-side ability choice was already profile-driven (locked by a test). | `weapon-3gate-damage-branch-authority` (4 of 5 failed before) |
| Legacy two-handed Strength | `floor(STR x 1.5)` for a legacy item flagged `twoHanded` (not the printed rule) | Double a positive Strength bonus for a non-light melee weapon; a penalty is not doubled; light weapons do not double | same file |
| Evasion on canonical area attacks | A canonical area weapon's attack set `areaAttack` + `halfDamageOnMiss` but never `evasionApplies`, so a missed grenade dealt **half to a target with Evasion instead of none**, and Improved Evasion never halved a hit (verified on the real `rollAttack` workflow, renamed and real-named grenade) | The canonical area workflow carries `evasionApplies`, applying the project's existing rule (an area attack that is not burst fire is Evasion-eligible) | `weapon-3gate-evasion-area-path` (6 of 7 failed before) |

### The checks requested on the previous run
- **Distance and band, with and without token geometry.** Production has no token measurement: the roll dialog never supplies `distanceSquares`, which comes only from programmatic callers. Theater-of-mind play (band only, or neither) is unchanged and tested. Where a distance exists, it is now authoritative.
- **GM override authorization.** The override is checked at the penalty authority (`game.user.isGM`), requires a non-empty reason, and a non-GM attempt is ignored (tested). The dialog's `Custom / GM` band is deliberately **unchanged** (see WPN-W2-001 below).
- **Minimum-1 exceptions.** Tested: miss, unconfirmed hit, `noDamage` form, area-miss half damage, NPC/droid weapon. The ordering against Destructive is deferred (WPN-W1-001).
- **Macro redirects.** `SWSERoll.rollAttack` runs `checkAttackSourceReadiness` and attacks.js (action economy, ammo and Force Point rollback, profile selection); `SWSERoll.rollDamage` calls the canonical `rollDamage`. Tested: the legacy `CombatEngine.resolveAttack` is never reached for a canonical weapon.

## Entry-point trace (audit section 5)

| Path | Class | Reaches canonical authority? |
|---|---|---|
| Sheet attack/damage, chat "Roll Damage" button (`chat-interaction-bridge` → `SWSERoll.rollDamage` → `damage.js`) | LIVE | Yes |
| `SWSERoll.rollAttack/rollDamage` (`enhanced-rolls.js`) | LIVE | Yes (delegates to `attacks.js` / `damage.js`). Its Burst Fire `system.damage` branch is the `else` of `if (isCanonical)`, so legacy-only. |
| `window.SWSECombat.rollAttack/rollDamage` (macros) | DYNAMICALLY REACHABLE | **Now yes** (redirect, W7) |
| `CombatUIAdapter.rollDamageUI` | no callers found | Redirected as above |
| `CombatEngine.resolveAttack` | only via `SWSECombat.rollAttack` | Not reached for canonical weapons |
| `components/combat-action-bar.js` | no importer found (static) | Not removed: no dynamic-reachability proof |
| `engine/rules/modules/core/damage-rule.js` | no importer outside its own tree (static) | Not removed |
| `SWSECombatActionBrowser` | LIVE init | Calls `runCombatAction` only |

A static tripwire in `weapon-3gate-w7-legacy-entrypoints.test.mjs` pins the 5 approved Item-level formula sites. A new one fails the build.

## Gate A: registry to production-Item crosswalk
Generated by `tools/audit-weapon-v2-gate-a-crosswalk.mjs`, guarded by `weapon-3gate-gate-a-crosswalk`. Inputs are fingerprinted (registry and every `packs/weapons*.db`), so a changed pack shows up as a stale crosswalk.

| Field | Result over 203 bound Items |
|---|---|
| Melee / ranged category vs the default profile | **203 match, 0 differences.** Production Items carry the right category, so the pistol-Strength defect was latent in data, but live in code for any Item without it. |
| Damage dice vs the default profile | 177 match; 1 convention (Scatter Gun's Item text is "3d8 or 2d8", the canonical default is 3d8); 25 not comparable (canonical stats no ordinary dice: ammunition, payload, modifier, fixed, special, none) |
| Damage type | 75 match; **115 documented conventions** (Item folds physical subtypes into kinetic or lists a subset of an energy + slashing pair per D-016; Item shows a canonical *qualifier* such as sonic as its type; Item shows stun as its type); 13 source-silent |
| Weight | 199 match; 4 source-silent (canonical has no weight) |
| Multi-profile identities | 34 (the Item projection can show only one profile; the canonical profile list is the authority) |

## Gate B: ledger results

2,309 paths: DIRECT_CONSUMER 690, CONSUMED_VIA_DUPLICATE 166, PARTIAL_CONSUMER 734, DISPLAY_ONLY 442, VALIDATION_ONLY 223, BLOCKED_BY_SUBSYSTEM 53, ORPHANED 1.
Evidence: of the 690 DIRECT_CONSUMER rows, 583 are `STATIC_ONLY` (the consumer probe string is present and a test references the family) and 107 are `HISTORICAL_MANIFEST` (container families inherited from the 5D-H table). **None is yet field-level EXECUTED.** The row dispositions are not a completion percentage.

### The census was stale by declaration
`census-weapon-executable-field-closure.mjs --check` reports "current" because it regenerates from a hand-kept table (`tools/lib/weapon-phase-5d-h-ledgers.mjs`), not from code. Re-verified against code and tests:

| Family (paths) | 5D-H said | Now | Evidence |
|---|---|---|---|
| `3b.defensive` (18) | DEFERRED | **DIRECT_CONSUMER** | `reaction-weapon-context.js` / `reaction-rules.js` feed `LightsaberTalentActions`; test `5d-i-c-c-reaction-defense` |
| `3b.operation.proficiency-routes` (5) | DEFERRED | **CONSUMED_VIA_DUPLICATE** | The 3 operation-key echoes duplicate `selectors.speciesOverrides` (`proficiency-resolver.js:147`); the Arg'garok is `unmapped::` |
| `4h.auth.ruleSelectors.riders` (127) | DEFERRED | **CONSUMED_VIA_DUPLICATE** | Execution reads the relation corpus (`ability-relations.js`) |
| `3b.wielding` (25) | DEFERRED | **PARTIAL** | `wielding-size.js` consumes `may-count-as-size` and `designed-for-two-handed-use`. Residual effects are listed in the ledger. |
| `3b.qualityParameters` (63) | DEFERRED | **PARTIAL** | Only `inaccurate` has a demonstrated numeric consumer (`canonical-range.js`). `accurate` and `arc` are unverified. |
| `3b.durability` (53) | DEFERRED | **BLOCKED_BY_SUBSYSTEM** | No production reference to `objectDurability` or `constructionRules` (grep). Object DR must not reuse creature DR. |
| `3b.operation.utility-and-movement` (5) | DEFERRED | PARTIAL | `ascensionMode` has no consumer (below) |
| `3b.profile.wielding` (1) | DEFERRED | **PARTIAL** | Equivalent to the size rule only for a Medium wielder (tested). Not called a complete duplicate: the Large-wielder case is WPN-B-001. |

Historic 8 deferred, now: 3 closed or consumed through a duplicate (`3b.defensive`, proficiency routes, rule-selector riders), 3 partial (`3b.wielding`, `3b.qualityParameters`, `profile.wielding`), 1 blocked (`3b.durability`), 1 partial operation container (`utility-and-movement`, one GM-adjudicated key).
The 1,206 `NEW_CONSUMER_REQUIRED` paths in the 5B map are **not** 1,206 assignments. They are a 5B-era state, now superseded by the family dispositions above.

### 41 historical operation keys (final classification)
GM_ADJUDICATED 14, CONSUMED_VIA_DUPLICATE 11, BLOCKED_BY_SUBSYSTEM 6, SOURCE_UNRESOLVED 5, DISPLAY_ONLY 4, **ORPHANED 1**. The 28 keys the 5D-I-D manifest deferred to I-D-A2, A3, B, C and D were never built (those subpasses have no code or tests). They were re-read against the manifest's own "what Foundry knows / what must be supplied" evidence and classified. **Nothing was implemented to shrink a counter.**

| Class | Keys | Why |
|---|---|---|
| **Genuine missing consumer (1)** | `darkSideEmpowerment` | The Sith Sword rule is stated (swift action, 1 Force Point, Dark Side Score +1, bonus equal to Dark Side Score on the next damage roll) and no consumer exists. One detail is open (WPN-D-001: is the bonus the score before or after the +1?), so it is not implemented. Existing infrastructure for a later implementation: the stored one-shot damage-bonus pattern (`rapidAlchemy` state, cleared by `damage.js` after the roll), `ActorEngine.spendForcePoints`, `ActionEconomyConsumption.spend` (swift), `DSPEngine`, `resolveCanonicalAttackProficiency`. |
| GM-adjudicated (14) | `remoteDetonationSafetyRule`, `lineOfSightOriginHeightSquares`, `alwaysDetermineNorth`, `builtInDigitalCompass`, `audibility`, `silentInUse`, `shotVisibility`, `firingDoesNotRevealShooterPosition`, `sensorDetection`, `createsSmokeHazard`, `gasConcealmentDuration`, `providesConcealment`, `encumbranceException`, `ascensionMode` | Each needs a fact only the table can supply (distance, perception, visibility, narrative). `encumbranceException` is also bound by the open weight-scope ruling EQ-W-001. |
| Blocked by a missing subsystem (6) | `allyAttackBonus`, `allyEligibleWeapons`, `repeatAttackEachRoundToMaintainDesignation` (targeting laser), plus `radiationExposure`, `weaponDR`, `weaponDRAppliesAgainstLightsabers` | The first three need designation / frequency state that is not modeled; the last three need radiation-exposure and weapon-object damage subsystems. |
| Source-unresolved (5) | `grievousWound`, `powerCordDisconnectRule`, `concealmentDesign`, `weaponDRValue`, `powerAttackExtraDamageAppliesToObjectsAndVehicles` | The printed text is silent or ambiguous. No number is invented. |
| Consumed duplicate (11) | 3 proficiency echoes (`alternateProficiency`, `wookiee*`), `surveillanceTaggerCompatibility`, `capacityGrenades`, `oneShotCapacity`, `powerLevelSwitchAction`, `singleShot`, `specialRateOfFire`, `protectedAtmosphereImmune`, `collapsedForm` | The same fact is consumed through another structured field. |
| Descriptive (4) | `preferredMode`, `targeting`, `redirectionCrystalCompatibility`, `retractableStockOptional` | Non-executable. |

`attackProfiles[].wielding` (Massassi lanvarok, "two-handed") is **partially** consumed: the size authority already forces two hands on a Medium wielder (tested), but that shows equivalence for that configuration only. Whether the field also binds a Large wielder is a rules question, registered as WPN-B-001, not decided, so the field is not classed as a complete duplicate.

## Gate C: 20-case matrix
**19 proven, 1 partial** (`data/audits/weapon-v2-3gate-math-matrix.json`). Every case lists its printed rule, canonical field, production consumer, expected result and the exact anchored test (`weapon-3gate-math-matrix` fails if an anchor disappears). "Existing" cases were located and anchored, not re-audited line by line against the printed page.

| Case | Scenario | Status | Expected result (and gap, if any) |
|---|---|---|---|
| M-01 | One-handed ordinary melee, L5 STR+3 | PROVEN | 2d8 + 5 (Vibrosword) |
| M-02 | Same actor wielding a non-light melee weapon two-handed | PROVEN | 2d8 + 8 |
| M-03 | Two-handed light weapon | PROVEN | 2d4 + 5 for one- and two-handed |
| M-04 | L5 ordinary ranged 3d6 blaster | PROVEN | 3d6 + 2 |
| M-05 | Thrown melee | PROVEN | half level 2 + STR 3 on the thrown profile; attack ability DEX |
| M-06 | Bow / Sling | PROVEN | half level 2 + STR 3 = 5, once |
| M-07 | Negative Strength, two-handed non-light | PROVEN | a penalty is applied once, not doubled |
| M-08 | Chosen alternative attack mode | PROVEN | 3d4 / 3d6 / 3d8 + 2 for Variable Blaster low / medium / high |
| M-09 | +1 weapon and Weapon Specialization | PROVEN | half level 2 + flat +1 + specialization +2 = 5 on a 3d6 pistol; a typed Effect Intent competence bonus resolves highestOnly (not both); Modification V2's certified effects (Durasteel Bonding critical die after the multiplier, Enhanced Energy Projector natural-1 reroll) execute through the real damage and reroll authorities. Modification V2 has no generic +N enhancement: its certified effects are specific. |
| M-10 | Weapon multiplier and critical multiplier | PROVEN | (10 + 2) x 2 = 24, critical 48 |
| M-11 | Stun / ion / alternate damage type | PROVEN | type retained through the packet; stun: a character takes half in HP with the full amount compared to the threshold, a Droid is immune; ion: Droid and vehicle/device take half HP with full-amount threshold and condition-track effects, an ordinary organic is singed with no other effect, a cybernetic creature takes full damage |
| M-12 | Area miss, Evasion, cover | PARTIAL | area miss = half (certified policy), never floored to 1; an area HIT of a weapon still takes the minimum-1; Evasion negates a missed area attack and Improved Evasion halves an area hit, through the REAL canonical attack workflow (this pass fixed a defect: the canonical path never marked the attack Evasion-eligible); single-target attacks ignore Evasion — **gap:** Cover negation of area damage (WPN-M12-001): a real attack's workflow does not carry cover state to the damage stage, so the published area-attack cover damage negation cannot trigger. Which cover degrees qualify is a rules question, left undecided. Pinned by a known-gap test. |
| M-13 | NPC statblock flat attack / damage | PROVEN | published totals preserved, range penalty still applied |
| M-14 | Stock droid imported attack / damage | PROVEN | published formula honoured, no double counting |
| M-15 | Installed vehicle gunner and weapon | PROVEN | vehicle formula (weapon dice x multiplier), certified installation, no personal half level or Strength; the same cannon uses the character range table against a character target and the starship table against a vehicle; an ion/laser hit applies through to HP, threshold and condition track |
| M-16 | Selected critical damage rider | PROVEN | rider rolled separately, critical applied once |
| M-17 | 1d4-5 on a confirmed weapon hit | PROVEN | effective 1 before mitigation; Damage Reduction 5 then takes HP loss to 0; raw total disclosed |
| M-18 | Equipment / grip / readiness changes after the dialog opens | PROVEN | refused before the next expenditure or roll |
| M-19 | Custom / legacy weapon with no canonical identity | PROVEN | refused, nothing spent |
| M-20 | Malformed canonical identity / no-damage form | PROVEN | refusal (throws), no fallback |

**Closed findings:**
- *Pistol / profile-branch Strength damage*: fixed. The correction uses the selected canonical profile; no weapon Item needed editing.
- *Legacy two-handed `floor(STR x 1.5)`*: fixed. It was unreachable for rolling but is now the published calculation.
- *Evasion on canonical area attacks*: fixed (found while closing M-12). A target-side rule existed and was tested, but the production workflow never fed it.

## Pending rulings added
- `WPN-W1-001`: ordering of the minimum-1 floor against Saboteur Destructive.
- `WPN-W1-002`: whether a hit-less (hand-adjudicated) damage roll counts as a hit.
- `WPN-D-001`: whether the Sith Sword's Dark Side Empowerment bonus uses the Dark Side Score before or after its own +1.
- `WPN-M12-001`: which cover degrees negate area damage, and what carries cover to the damage stage.
- `WPN-B-001`: whether the lanvarok's printed "two-handed" binds a Large wielder.
- `WPN-W2-001`: whether the dialog's `Custom / GM` band should require an explicit numeric adjudication or a GM-stamped override. Today it applies no canonical penalty, and the Custom Modifier field carries the adjudication, itemized in the breakdown. This was deliberately left unchanged.

The owner's provisional recommendations for WPN-W1-001, WPN-W1-002 and WPN-W2-001 (2026-11-10) are recorded in the register as recommendations, **not rulings**. The first two already match the implementation; WPN-W2-001 would change the dialog and is not made until ruled.

## Validation
- Baseline (`tools/run-rolling-tests.mjs`, untouched `main`): 648 pass, 0 fail, 5 documented exclusions.
- This branch's full run: see the PR description (updated when the run finishes).
- Targeted: all new `weapon-3gate-*` tests pass. Updated: `5d-d`, `5d-i-d-f` and the Saboteur source guard (variable rename only).
- `tools/check-combat-math-ssot.mjs --strict` and the 5B census checks pass. `verify-item-weapons-authority` fails identically on `main` (pre-existing).

## Remaining work
1. Field-level behavioral proof for the STATIC_ONLY rows (parametrized fixtures per family).
2. The one genuine gap, `darkSideEmpowerment` (stated; one ordering question, WPN-D-001; not implemented), and the 6 subsystem-blocked keys.
3. M-12 cover negation (WPN-M12-001, a rules question).
4. Owner rulings: WPN-W1-001, WPN-W1-002, WPN-W2-001, WPN-B-001, WPN-M12-001, WPN-D-001.
5. Gate A: extend the crosswalk to proficiency, range tables, ammunition and size, and add the runtime-only schema.
6. Live Foundry V13 acceptance.
