# Phase 5D-I-D-A — stealth, concealment, sensing, visibility (residual manifest + execution map)

Base: `main` @ `80b13790c4f11ea18d0def666386f4d233856c40` (PR #1019 and PR #1020 merged). Branch `audit/weapon-phase-5d-i-d-residual-convergence`.
Policy: [`docs/architecture/swse-automation-authority.md`](../architecture/swse-automation-authority.md) — *automate the rules, not the fictional world*.

## Result

**Update (I-D-A1 PR): the eight skill-bonus rows are now IMPLEMENTED** through the existing `EquipmentSkillHookResolver` -> `rollSkill` path (see `tests/weapon-phase-5d-i-d-a1-equipment-skill-hooks.test.mjs` and `tests/equipment-skill-hook-roll-regression.test.mjs`); the 5D-H closure counters moved 75 -> 67 unique / 95 -> 84 raw unconsumed keys because a production consumer is now demonstrated (everything else below is the original census).

**The census itself changed no runtime code.** Under the Automation Authority policy a rule is **not** blocked because Foundry cannot observe the world. The question per row is: *can the rule execute once the GM or player supplies the missing circumstance?* Every I-D-A row therefore carries an **automation level** (`AUTO` / `CONTEXTUAL` / `GM_ADJUDICATED`) and the **smallest outstanding support gap**. `BLOCKED` is reserved for a missing mechanical *consumer*: exactly **one** row (`radiationExposure`).

The 5D-H closure counters keep their historical meaning and are untouched (the I-D ledger does not feed them). Live census, identical before / after this PR: 75 unique / 95 raw unconsumed operation keys · 37 / 12 / 8 execution field families · 3 special-mechanic DEFER · 4 deferred relations · canonical name/text heuristic usage 0.

I-D manifest (`data/audits/weapon-phase-5d-i-d-input-manifest.json`, `node tools/census-weapon-phase-5d-i-d-inputs.mjs --check`): 82 rows = 75 operation keys + 3 special mechanics + 4 relations, **0 unclassified**. By subpass: I-D-A 3 · I-D-A1 8 · I-D-A2 5 · I-D-A3 8 · I-D-B 31 · I-D-C 7 · I-D-D 1 · I-D-E 7 · I-D-F 12. By disposition: 1 DUPLICATE · 1 NON_EXECUTABLE · 1 DATA_COMPLETENESS · 1 BLOCKED · 78 DEFERRED (with a named owner) · 0 IMPLEMENTED. Automation level of the 24 I-D-A rows: CONTEXTUAL 15 (incl. the 8 skill-bonus rows) · GM_ADJUDICATED 7 · AUTO 2 (the proven duplicate and non-executable); the 58 later-subpass rows are not yet assessed.

## Three-bucket coverage matrix (all 82 rows)

Full per-row matrix (bucket, support, what Foundry knows, what must be supplied, smallest implementation, source ambiguity, acceptance criterion): [`weapon-phase-5d-i-d-coverage-matrix.md`](weapon-phase-5d-i-d-coverage-matrix.md) (generated; `--check` guarded).

| Bucket (who establishes the circumstance) | Rows | Share |
|---|---:|---:|
| AUTO | 39 | 47.6% |
| CONTEXTUAL | 31 | 37.8% |
| GM_ADJUDICATED | 12 | 14.6% |

| Support state (is it actually supported?) | Rows |
|---|---:|
| DUPLICATE_OR_NON_EXECUTABLE (11 mechanically verified, 4 asserted) | 15 |
| SMALL_CONSUMER_NEEDED | 33 |
| GM_FACING_SUPPORT_NEEDED | 18 |
| IMPLEMENTED (I-D-A1 skill bonuses) | 8 |
| SOURCE_CLARIFICATION_NEEDED | 5 |
| MISSING_SUBSYSTEM (weapon-object damage event: Electrostaff DR, Verpine Shattergun) | 2 |
| DATA_COMPLETENESS | 1 |

Findings that changed earlier claims (all in the generated matrix):
* **11 rows are proven duplicates** of structured fields that production code already consumes (e.g. `capacityGrenades` / `oneShotCapacity` = `ammo.capacityShots`; `singleShot` = `reloadRequiredAfterEachShot`; `specialRateOfFire` = `firesOnAlternatingRounds`; `powerLevelSwitchAction` = `modeProfiles[].switchAction`; `collapsedForm` = `configurationStates`; the three Wookiee / species proficiency echoes = `speciesOverrides`). They need no code; closure-ledger acceptance is a separate, later step.
* **The Zeison Sha talents exist in the canonical talent corpus** (Discblade Arc, Distant Discblade Throw, Recall Discblade). Earlier text claiming they have no canonical identity was wrong: the relation names them by display string, so the missing piece is the relation -> canonical identity link.
* **Two rows need a weapon-object damage event that does not exist** (Electrostaff / Shockstaff DR, Verpine Shattergun disable-on-damage). Damage dealt TO a weapon is not target damage; nothing is fabricated.
* **5 rows carry a source ambiguity** that must be settled before coding (e.g. Fira's "on the following round" timing, the mortar's `canSingleLoadShell`, the shockstaff's missing DR value).
* The matrix is a proposed classification: its counts differ from the preliminary 46 / 25 / 9 estimate because each row was checked against registry data and existing consumers.

## Existing authorities traced

| Concern | What exists | Reading under the policy |
|---|---|---|
| Concealment in an attack | the attack dialog already offers **None / Concealment 20% / Total 50%** (`roll-config.js`) and `CombatEngine` rolls the miss chance | **CONTEXTUAL is already implemented**: the GM supplies the level, Foundry does the math. No geometry needed. |
| Line of sight | a caller-supplied fact (`context.lineOfSight`) | stays a supplied fact; GM_ADJUDICATED presentation |
| Effect lifecycle | `outcome-effects.durationPlan` (attacker / target next turn, N rounds) on ActiveEffects | the existing timing authority for cloud duration |
| Skill bonus from carried gear | `EquipmentSkillHookResolver` (conceal-weapon / snipe / basic-survival aliases) | an **existing authority awaiting integration** (no caller, equipment-only) → I-D-A1 |
| Radiation exposure | damage type list only | no exposure-level consumer → the one genuine gap |

## Execution map (I-D-A rows)

| Input | Weapons | Level | Smallest outstanding gap | Existing consumer | Owner / test |
|---|---|---|---|---|---|
| concealmentEquipmentBonus / concealmentStealthBonus / concealmentStealthPenalty / snipingStealthEquipmentBonus (+ qualifiers concealmentSkill, concealmentContext, snipingSkill) | Contact Stunner, Hold-out & Snap-shot pistols, Concealed Dart Launcher, Defender Microblaster, Ascension Gun, Magna-Caster | CONTEXTUAL (player names the object concealed / weapon used) | INTEGRATION_PENDING | skill-roll pipeline + `EquipmentSkillHookResolver` | **I-D-A1** (separate PR; production-path test through `rollSkill`) |
| survivalBasicForestJungleBonusWhenProficientAndCarried | Wookiee Ryyk Blade | AUTO (carried, proficient) + CONTEXTUAL (terrain stated) | INTEGRATION_PENDING | same | I-D-A1 |
| concealmentDesign | Adjudicator Slugthrower | CONTEXTUAL | — | — | **DATA_COMPLETENESS**: source states no bonus for the label; none is inferred |
| providesConcealment, createsSmokeHazard | Smoke Grenade | CONTEXTUAL (GM says who is concealed) | CONTEXT_SURFACE_PENDING: surface the declared smoke, its 10-round duration and rule into the attack workflow | attack-dialog concealment + effect timing | I-D-A2 |
| gasConcealmentDuration + `lingering-gas-concealment` | Gas Grenade | CONTEXTUAL | CONTEXT_SURFACE_PENDING (attacker-next-turn duration exists; impact CT outcome from I-C-A is **not** reapplied) | same | I-D-A2 |
| radiationExposure | Radiation Grenade | CONTEXTUAL (who is exposed) | **MISSING_CONSUMER** (exposure level → damage / Treat Injury) | none | I-D-A2 · BLOCKED |
| lineOfSightOriginHeightSquares | Mortar Launcher | GM_ADJUDICATED | PRESENTATION_PENDING | supplied LOS fact | I-D-A3 |
| shotVisibility, firingDoesNotRevealShooterPosition | Xerrol Nightstinger | GM_ADJUDICATED (shooter is **not** auto-hidden) | PRESENTATION_PENDING | — | I-D-A3 |
| silentInUse, audibility | Vibrorapier, Sonic Stunner | GM_ADJUDICATED (no hearing simulation) | PRESENTATION_PENDING | — | I-D-A3 |
| sensorDetection | Wrist Blaster | CONTEXTUAL (scan explicitly initiated) | CONTEXT_SURFACE_PENDING: surface DC 25 Use Computer | existing Use Computer workflow | I-D-A3 |
| alwaysDetermineNorth, builtInDigitalCompass | Survival Knife | GM_ADJUDICATED (no check, no number) | PRESENTATION_PENDING | — | I-D-A3 |
| protectedAtmosphereImmune | Gas Grenade | AUTO | — | I-C-A ct-rider immunity | **DUPLICATE** (probe + registry verify) |
| targeting.deafTargetsCanBeHarmed | Sonic Stunner | AUTO | — | — | **NON_EXECUTABLE** (removes a restriction nothing imposes) |

### Tripwires
Rows cite tripwires (`tools/lib/weapon-phase-5d-i-d-ledger.mjs`): declared-absence scans of executable `scripts/**` that **fail the census when a capability appears** (e.g. the day `EquipmentSkillHookResolver` gains a caller, which I-D-A1 does, forcing those rows to flip to `IMPLEMENTED` with a consumer probe). They record what does not exist today; they no longer imply that a missing capability must be built.

## Source verification
No rule was implemented in this PR. Classifications rest on the certified registry values and their recorded `canonicalPlayerText` / book page (e.g. Ascension Gun, Galaxy at War p.37: "its bulk imposes -5 on Stealth checks made to conceal it"). PDF page verification is not possible in this checkout (no PDFs); re-verify against the PDFs when a row is implemented.

## Foundry smoke
NOT RUN (nothing executable changed).
