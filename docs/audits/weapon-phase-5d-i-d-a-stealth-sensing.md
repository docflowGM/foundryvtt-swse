# Phase 5D-I-D-A — stealth, concealment, sensing, visibility (residual manifest + execution map)

Base: `main` @ `80b13790c4f11ea18d0def666386f4d233856c40` (PR #1019 and PR #1020 merged). Branch `audit/weapon-phase-5d-i-d-residual-convergence`.

## Result

**No I-D-A mechanic is executable inside the existing architecture.** Every input either needs a subsystem that does not exist (and which the I-D handoff forbids inventing), or is a proven duplicate / non-executable fact. This pass therefore ships the full I-D residual manifest (zero unclassified), tripwires that keep the "blocked" claims honest, and **no runtime change**. Consumption claimed: none. The 5D-H closure counters are intentionally untouched (the I-D ledger does not feed them).

Regenerated live census (identical to the post-I-C-C checkpoint, before and after this PR): 75 unique / 95 raw unconsumed operation keys · 37 fully / 12 partial / 8 unconsumed execution field families · 3 special-mechanic DEFER · 4 deferred relations · canonical name/text heuristic usage 0.

I-D manifest (`data/audits/weapon-phase-5d-i-d-input-manifest.json`, `node tools/census-weapon-phase-5d-i-d-inputs.mjs --check`): 82 rows = 75 operation keys + 3 special mechanics + 4 relations → 22 BLOCKED, 1 DUPLICATE, 1 NON_EXECUTABLE, 58 DEFERRED to a named subpass (B 24, C 9, D 1, E 7, F 12 (+ I-D-A none)), 0 IMPLEMENTED, **0 unclassified**.

## Existing authorities traced

| Concern | What exists | What is missing |
|---|---|---|
| Concealment in an attack | `getConcealmentMissChance` / `CombatEngine` apply a miss chance **supplied by the caller** (`options.concealmentMissChance`, `options.concealment`) | any automatic source of concealment |
| Line of sight | combat code reads a caller-supplied boolean (`context.lineOfSight`) | line-of-sight / visibility geometry |
| Effect lifecycle | `outcome-effects.durationPlan` → ActiveEffect with attacker/target-next-turn expiry (Flash Canister's `total-concealment-against-bearer`) | a zone / area owner: the lifecycle hangs a status on an **actor** |
| Skill bonus from carried gear | `EquipmentSkillHookResolver` (+ `conceal-weapon` / `conceal-item-on-self` aliases) | **it has no importer anywhere and reads only `type: "equipment"` items**; no skill roll consumes it |
| Hidden / revealed state, noise, sensor scan, radiation exposure | nothing | all of it |

## Execution map (I-D-A inputs)

| Input (operation key) | Weapons | Canonical owner | Would-be consumer | Feasible without a new authority? | Proving test / tripwire | Disposition |
|---|---|---|---|---|---|---|
| concealmentEquipmentBonus, concealmentStealthBonus, concealmentStealthPenalty, snipingStealthEquipmentBonus (+ qualifiers concealmentSkill/Context/Design, snipingSkill) | Contact Stunner, Hold-out & Snap-shot blaster pistols, Concealed Dart Launcher, Defender Microblaster, Ascension Gun, Magna-Caster, Adjudicator Slugthrower | weapon `operation.*` | EquipmentSkillHookResolver → Extra Skill Use roll | **No** — resolver unwired and equipment-only; wiring is an equipment/skill-use integration | tripwires `skill-hook-unwired`, `skill-hook-equipment-only` | BLOCKED |
| alwaysDetermineNorth, builtInDigitalCompass, survivalBasicForestJungleBonusWhenProficientAndCarried | Survival Knife, Wookiee Ryyk Blade | `operation.*` | same | No | same | BLOCKED |
| providesConcealment, createsSmokeHazard | Smoke Grenade | `operation.*` | persistent area zone + visibility | No | `no-persistent-area-zone`, `no-visibility-geometry` | BLOCKED |
| gasConcealmentDuration + special mechanic `lingering-gas-concealment` | Gas Grenade | `triggeredEffects[lingering-gas-concealment]` (mutual concealment across the blast boundary and inside it) | persistent zone + inside/outside/across-boundary visibility test; attacker-next-turn lifecycle already exists but is actor-bound | No | same | BLOCKED (impact CT outcome already implemented in I-C-A and **not** reapplied) |
| shotVisibility, firingDoesNotRevealShooterPosition | Xerrol Nightstinger | `operation.*` + `concealed-shot-origin` | hidden / revealed state | No | `no-stealth-state` | BLOCKED |
| silentInUse, audibility | Vibrorapier, Sonic Stunner | `operation.*` | noise / hearing model | No | `no-noise-model` | BLOCKED |
| sensorDetection | Wrist Blaster | `operation.*` (Use Computer DC 25) | sensor-scan flow | No | `no-sensor-scan` | BLOCKED |
| radiationExposure | Radiation Grenade | `operation.*` | radiation exposure state + area | No | `no-radiation-exposure`, `no-persistent-area-zone` | BLOCKED |
| lineOfSightOriginHeightSquares | Mortar Launcher | `operation.*` | LOS geometry | No | `no-visibility-geometry` | BLOCKED |
| protectedAtmosphereImmune | Gas Grenade | `condition-track-effect.immunity` | I-C-A ct-rider (already executes it) | n/a | consumer probe + registry verify | **DUPLICATE** |
| targeting.deafTargetsCanBeHarmed | Sonic Stunner | `operation.targeting` | — (removes a restriction nothing imposes) | n/a | `no-deaf-rule` + registry verify | **NON_EXECUTABLE** (display) |

### Tripwires
A BLOCKED row is only as good as its "the subsystem is absent" claim, so each cites tripwires (`tools/lib/weapon-phase-5d-i-d-ledger.mjs`) that scan executable `scripts/**` code and **fail the census** the day the subsystem appears, forcing reclassification. They are verified by `tests/weapon-phase-5d-i-d-a-residual-manifest.test.mjs` (including synthetic failing cases).

## Decisions needed (product / architecture, not guessed)
1. **Equipment skill-hook wiring.** Connecting `EquipmentSkillHookResolver` to skill rolls (and letting it read weapon-derived hooks) would unlock ~11 I-D-A keys without a weapon-specific engine, but it is an equipment/skill-use change outside the weapon runtime. Recommended as its own phase.
2. **Persistent area-effect zone + visibility geometry.** Needed by Smoke Grenade, Gas Grenade's cloud, Radiation Grenade and the Mortar's LOS origin. This *is* a new authority; do not build it inside a weapon phase without approval.
3. **Hidden / revealed state and a noise model.** Needed by Nightstinger, Vibrorapier and Sonic Stunner.
4. **Owner for the 12 reload / ammo-resource keys** (proposed `I-D-F`): the I-D handoff lists no pass for them.

## Source verification
No rule text was implemented, so no PDF page verification was needed or claimed; every classification rests on the certified canonical values already in the registry. Re-verify against the PDFs when a blocked row is implemented.

## Foundry smoke
NOT RUN (nothing executable changed).
