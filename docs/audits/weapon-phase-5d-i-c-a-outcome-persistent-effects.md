# Phase 5D-I-C-A — Apply Damage / threshold / status / persistent-effect convergence

Branch `audit/weapon-phase-5d-i-c-a-outcome-persistent-effects`, created from merged `main`. One draft PR against `main`. 5D-I-C-B (grab / grapple / net / snare / hurled objects) and 5D-I-C-C (Block / Deflect / reactions / defense interactions) are **not** started here.

## 1. #1015 merge and I-C-A baseline
- 5D-I-B (#1015) merged into `main` as `80e136d5e936342cc0f150668deaa28d2d7bd4cc` (normal merge commit, head `671ecf1fa877eadc2750b9d13fda9a0671f195a6`, CI green, no reviews). I-C-A baseline SHA = that commit.
- Rolling suite on the actual merged main: **335 passed / 0 failed / 5 documented exclusions**.
- Remote deletion of merged branches still fails with `remote end hung up unexpectedly` (administrative, non-blocking).

## 2. Input manifest (evidence, not authority)
`tools/census-weapon-phase-5d-i-c-a-inputs.mjs` (`--check`) → `data/audits/weapon-phase-5d-i-c-a-input-manifest.json`; ledger `tools/lib/weapon-phase-5d-i-c-a-ledger.mjs` (data only; no runtime module imports either). Rows are residual operation keys of the four closure-census families that own an Apply Damage seam and every structured special mechanic the 5D-E census classifies in the outcome families. An IMPLEMENTED special-mechanic row must be classified AUTO / PROMPT by the live census **and** name a consumer probe in executable code; a DUPLICATE row proves its structured carrier on every identity that carries the key.

| counter | value |
|---|---|
| I_C_A_INPUT_MECHANICS | 49 (28 operation keys, 21 special mechanics) |
| I_C_A_IMPLEMENTED | 23 |
| I_C_A_DUPLICATES | 7 |
| I_C_A_DATA_DEFECT | 0 |
| I_C_A_DATA_COMPLETENESS | 3 open |
| I_C_A_DEFERRED_I_C_B | 6 |
| I_C_A_DEFERRED_I_C_C | 1 |
| I_C_A_DEFERRED_I_D | 8 |
| I_C_A_BLOCKED | 1 |
| **I_C_A_UNCLASSIFIED** | **0** |

The 14-key condition / persistent-effect family was classified key by key (not assumed): `conditionTrackOnHit`, `conditionTrackWithEvasion`, `persistentUntilCured`, `secondaryPoisonAttackBaseBonus`, `secondaryPoisonDefense`, `treatInjuryCureDC`, `venomSpit` are DUPLICATES of structured carriers; `conditionTrackRider`, `fortitudeRider`, `poisonDeliveryRequiresDamage` (+ `ammunitionMayCarryContactPoison`) are IMPLEMENTED; `grievousWound` is DATA_COMPLETENESS; `ongoingEffect` → I-C-B; `survivalBasicForestJungleBonusWhenProficientAndCarried` → I-D (a carried-item skill modifier, not an Apply Damage mechanic — not consumed merely because it shares the family). The five I-A keys assigned to I-C: `damageThresholdAdjustment`, `embeddedShrapnel`, `targetRules` IMPLEMENTED; `blastEffect`, `ongoingStunWhileTrapped` → I-C-B (grapple / trapped state). `attackTreatedAs` → I-C-B, `lightsaberTalentCompatibility` → I-C-C, `lineOfSightOriginHeightSquares` → I-D, as specified.

## 3. Apply Damage architecture (no second engine)
The existing pipeline is unchanged and remains the only damage path:

`attack roll → workflow context (`special`) → DamagePacket (`buildDamagePacket` / `applyTargetDamagePacketRules`, per target) → ActorEngine.applyDamage → DamageResolutionEngine (SR / DR / HP / threshold / Condition Track) → rider stage (`applyCanonicalSpecialEffects`)`.

- **Attack time** (`special-mechanics.js`, pure): the selected form's structured carriers become mechanics (new AUTO families `threshold-adjustment`, `bonus-damage-rider`, `target-class-damage`, `status-effect`, `delayed-damage`, `persistent-poison`, `poison-delivery`, `payload-delegation`) and JSON-safe **records** carrying the attack-time part of the trigger (`fired`), the apply-time condition (`applyCondition`, `requiresDamage`), the structured `payload` and the canonical provenance `{identityKey, profileId, payloadId}`.
- **Packet finalization** (`damage-packet-rules.js`): the per-target facts that change the damage event itself — the attack's threshold adjustment and the EMP target-class multipliers.
- **Rider stage** (`canonical-special-effects.js`): now receives the *resolved damage event* (`resolution`: threshold, Condition Track, dead / destroyed), the amount actually sent after target rules, the weapon and the damage type. Each record kind is delegated to the system that already owns that behaviour:

| record kind | delegated to |
|---|---|
| `ct-rider`, `zero-hp-ct-disable` | CombatTargetEffectAdapter → ActorEngine.setConditionStep (+ droid disabled state) |
| `status-effect` | ActorEngine.createActiveEffects with effect-intent data + EffectIntentEngine lifecycle |
| `bonus-damage` | ActorEngine.applyDamage (a separate damage event, full mitigation, **no riders of its own**) |
| `delayed-damage` | RecurringDamageEngine (one instance, start of the target's next turn) |
| `persistent-poison` | PoisonEngine (instance, recurrence, treatment, termination) |
| `poison-delivery` | PoisonEngine.applyWeaponPoisonFromAttack |

## 4. Effect order (audited, not invented)
1. damage packet built per target (target class, Evasion, miss rule, threshold adjustment);
2. ActorEngine.applyDamage → mitigation (SR / DR) → HP → threshold comparison (using the event's *effective* threshold) → Condition Track movement → dead / destroyed;
3. rider stage, **in record order**, reading that resolution — a rider never recomputes or re-enters damage;
4. persistent effects (poison instance, queued delayed damage, timed ActiveEffects) are *created* in step 3 and *resolve* later on their own turn boundary through their owning engine.
Rules that depend on damage actually dealt use the post-mitigation HP change (`hpBefore - hpAfter`), never the pre-mitigation roll, except where the source explicitly says "pre-halving" (EMP zero-HP rule, which compares the amount sent before ion HP halving, the same quantity the existing overwhelming-stun rule uses).

## 5. Idempotency and provenance
- Idempotency reuses the existing per **message + target** receipt (`specialReceiptKey`), extended to every new kind; status effects additionally refuse a second effect with the same record key (`hasWeaponEffect`), and delayed-damage instances have a stable id from message + record + target. Replaying Apply Damage deals nothing twice (tested for CT, bonus damage, status, poison, delayed damage).
- Provenance: canonical identity / profile / payload ride on the record (serializer whitelist, plain JSON only), the receipt, and the created ActiveEffect (`flags['foundryvtt-swse'].weaponEffect`: record key, source, message, attacker, target, duration, turn owner). Nothing is reconstructed from chat text.

## 6. Threshold adjustment (Disruptor pistol / rifle, Sonic Disruptor)
Source: *"treats every target as though its damage threshold were 5 lower"* (Force Unleashed Campaign Guide). A threshold-stage adjustment of **this damage event only**: `ThresholdEngine.evaluateThreshold` / `getDamageThreshold` take `thresholdAdjustment` (floored at 0); `DamageResolutionEngine` passes `options.thresholdAdjustment`; `applyTargetDamagePacketRules` sets it from the workflow. The actor's stored / derived Damage Threshold is never modified. Tested: same target (DT 25), same damage (22): an ordinary weapon does not exceed the threshold (no CT move); the disruptor does (effective 20, CT +1).

## 7. Embedded shrapnel (Ripper)
Source: *"If its damage exceeds a target's damage threshold and moves that target at least 1 step down the condition track, embedded shrapnel immediately deals an additional 1d4 damage"* (KotOR Campaign Guide). Answers from the text: **after** the triggering damage; **separate** immediate damage event (own mitigation); it can exceed the threshold on its own like any damage event, but it **cannot re-trigger the rider** (it is an ActorEngine.applyDamage call that carries no records, and the rider stage is entered once per Apply Damage). The trigger was prose only; a source-certified amendment added `operation.embeddedShrapnel.structure`.

## 8. EMP Grenade target classes
Source (Clone Wars Campaign Guide): droids, vehicles, electronic devices and cybernetically enhanced creatures take normal ion damage on a hit or half on a miss; if the pre-halving ion damage would reduce such a target to 0 HP it moves −5 steps and is disabled; creatures without cybernetics take half on a hit and none on a miss; Evasion modifies the area attack normally. Class is **structural** (`getDamageTargetCategory`: droid / vehicle / device / object); an *organic* target's "cybernetically enhanced?" fact is not observable, so it is asked once per message + target and stored — **unanswered, the damage is refused (never read as false)**. Composes with the existing area attack / Evasion path (no second area engine). The prose `targetRules` gained a source-certified `structure`.

## 9. Condition-track riders (audited individually)
- Gas Grenade (`conditionTrackOnHit` −2 / `conditionTrackWithEvasion` −1 are duplicates of the structured triggered effect): an area hit moves −2 (−1 with Evasion), a miss has no effect, creatures protected from atmospheric hazards are immune (asked once and stored). Exactly **one** rider executes (no double shift).
- Carbonite Rifle (`conditionTrackRider`): immobilized until the end of **its** next turn, only when the resolved damage event proves the Condition Track moved.
- Aurial Blaster / CryoBan (`fortitudeRider`): when the hit's attack roll **exceeds** Fortitude Defense. The sources say "exceeds" / "beats", which this phase reads as **strict >** (the "equals or exceeds" wording used elsewhere is ≥). Aurial: −5 Perception until the end of the attacker's next turn (`skill.perception` effect intent). CryoBan: speed becomes 2 squares until the end of the target's next turn — a speed penalty equal to the difference with the speed observed when the effect is created (`speed.base` intent), never raising speed; the speed is read from `system.derived.speed.total`.

## 10. Poison / toxin model
Reuses the **PoisonEngine** (poison instances in `flags.swse.activePoisons`, start-of-turn recurrence hook, treatment by skill + DC, termination). Extensions are generic and small:
- an instance carries its own `definition` when the toxin is weapon-defined (the registry does not know it), so it can tick, be treated and end;
- `special.onFailure {continues, attackBonusIncrement, cumulative}` — a failed poison attack keeps the instance and raises the next attack (reset on success);
- `special.endsWhenTargetUnconscious` — the toxin dissipates instead of attacking an unconscious target (CT step 5 on a character / NPC / beast, an Unconscious status, or 0 HP);
- a persistent toxin that keeps attacking after a failure is tracked from the start.
Distinct poisons keep distinct initial / secondary effects, defenses, timings and cure rules: each is a structured definition, never a generic "poisoned" flag.

**Contact poison / delivery requires damage.** `ammunitionMayCarryContactPoison` (Needler) and Darter's `poisonDeliveryRequiresDamage` declare *capability only*: a poison is delivered only when one is **selected on the owned weapon** (PoisonEngine coating) **and** post-mitigation damage was dealt. No poison selected → no poison effect.

## 11. Per-weapon outcomes
- **Tehk'la Blade**: attack roll equals or exceeds **both** Reflex and Fortitude → one additional 1d6 bleeding damage at the start of the target's next turn (RecurringDamageEngine, one trigger). The entry establishes no duration beyond that single instance and no stacking rule, so none is invented: each qualifying hit is an independent instance; termination is the single tick.
- **Neural Inhibitor**: on a hit a 1d20+5 attack vs Fortitude; success −1 persistent CT; failure gives the next poison attack a cumulative +1; attacks again at the beginning of the target's turns until cured (Treat Injury DC 20) and dissipates if the target falls unconscious. The definition is built from the structured effect; `persistentUntilCured`, `secondaryPoisonAttackBaseBonus`, `secondaryPoisonDefense`, `treatInjuryCureDC` are proven duplicates of it.
- **Gas Grenade**: impact outcome executed (above). The lingering 4-square cloud (concealment inside / across the boundary until the end of the attacker's next turn) stays on the canonical triggered effect: **I-C-A's boundary is the impact outcome; I-D places the cloud and consumes it for visibility / Stealth.**
- **Concussion Rifle**: Fortitude attack; a successful attack knocks the target prone (the same Prone ActiveEffect status Force Slam creates; not stacked).
- **Verpine Shattergun**: *"If the weapon takes any damage, it is disabled until repaired"* is damage to the **weapon as an object** (durability), not an outcome on the target, and no weapon-object damage path exists → **BLOCKED_BY_MISSING_SUBSYSTEM (I-D)**; no record is fabricated.
- **Flash Canister** (effect-only): each creature hit gets the *total concealment against the affected creature* effect until the start of the attacker's next turn; blind creatures immune (structural Blinded status, else asked once). Creating the effect is I-C-A; consuming total concealment for visibility is I-D.
- **Wrist Rocket Launcher**: *Flash* — an area hit blinds for 1d4 rounds (rolled; `blinded` status); *Nerve toxin* — a hit is followed by a secondary attack vs Fortitude, success −2 CT. **The corpus prints no secondary attack bonus** (DATA_COMPLETENESS), so the secondary result is asked once and stored, never invented. Flash Canister and Flash Rocket share the effect-only + status-effect machinery but are *different* statuses (concealment vs blinded), so they are not forced into one status family.
- **Amphistaff Venom Spit**: effect-only form; attack roll equals or exceeds **both** Reflex and Fortitude → −1 persistent CT, once per message + target. The standard action and once-per-24-hours usage ledger belong to 5D-I-B and are untouched (tested: a second spit before the window ends is still refused).
- **Micro Grenade Launcher**: the launcher now declares the I-B payload delegation (amendment) with `payloadDamageDiceAdjustment −2`: damage type, area and effects come from the loaded canonical grenade (frag 4d6 → 2d6 on a hit; a miss keeps the grenade's ordinary dice); nothing else of the grenade is copied. This is a small sibling closure because the I-B payload seam already existed.
- **Disintegration** (`disintegratesOnKillOrDestruction`: Disruptor pistol / rifle, Incinerator Rifle, Sonic Disruptor): a Disintegrated status effect only after Apply Damage **proves** the state (`resolution.dead` for a creature, `resolution.destroyed` for an object / droid / vehicle); stun never kills; reduced-to-0-HP-but-not-killed is not disintegrated. **No Actor or Token is deleted.**
- **Power Attack object / vehicle exclusion** (`powerAttackExtraDamageAppliesToObjectsAndVehicles`, Power Hammer): the weapon states an *exception* to a general Power Attack exclusion that the certified feat record does not carry (the corpus Power Attack text has no object / vehicle clause). There is no rule to apply or lift; behaviour is unchanged → **DATA_COMPLETENESS (owner I-D, feat corpus)**.
- **Fira `grievousWound`**: prose trigger / effect and the source does not say whose round "the following round" is → **DATA_COMPLETENESS**; the runtime does not guess a timing.

## 12. Timing vocabulary and turn-owned lifecycle
New timing constants: `after-threshold`, `time-delay`, `until-cured` (beside `on-hit`, `after-damage`, `after-mitigation`, `turn-start`, `turn-end`).

Timed status effects reuse the **EffectIntentEngine** lifecycle. "Until the end of the attacker's next turn" cannot be expressed by a lifecycle that expires on the *bearer's* turns, so the lifecycle gained an optional `turnOwnerActorId` + `phase` (`start` / `end`), evaluated by position (pure): the owner's next turn is the first turn slot of that actor after creation; `end` expires once combat has moved past it (the effect lasts *through* the turn), `start` when it begins; an owner outside the combat never expires it, combat end clears it. `combat-hooks.js` now examines every combatant's effects on each turn change (legacy lifecycles still require their own actor's turn, so nothing changes for them). No timers: combat positions only.

## 13. Effect-only attack forms (Venom Spit, Flash Canister, Flash Rocket)
These forms have no damage roll, so the card's *Roll Damage* action was a dead end (the damage roll refuses a no-damage form). The card action is now labelled **Apply Effects** and applies the outcome records through the same receipts, immunity prompts and engines (`applyEffectOnlyOutcome`); with no HP change only effects that do not require damage can fire.

## 14. Controlled data amendments (all in `postCertificationAmendments`, pre-condition asserted, source recorded)
`5D-I-C-A-outcome-structure-backfill` adds `structure` objects beside the untouched prose: `weapon-carbonite-rifle.conditionTrackRider`, `weapon-aurial-blaster.fortitudeRider`, `weapon-cryoban-grenade.fortitudeRider`, `weapon-ripper.embeddedShrapnel`, `weapon-emp-grenade.targetRules`, the Wrist Rocket `flash` and `hollow-tip-nerve-toxin` payload effects, and the Micro Grenade Launcher payload delegation (`damageTypeAndBurstDeterminedByGrenade`, `payloadDamageDiceAdjustment`, `acceptedPayloadFamily: grenade`). The 5B rule table classifies `payloadDamageDiceAdjustment`; builders, production, registry, 5B / 5B-R and the authority classification were regenerated.

## 15. Findings
- **DATA_DEFECT**: none.
- **DATA_COMPLETENESS (open)**: `grievousWound` (timing rule), `powerAttackExtraDamageAppliesToObjectsAndVehicles` (general exclusion missing from the feat corpus), the Wrist Rocket nerve-toxin secondary attack bonus.
- **CONSUMER_DEFECT (fixed)**: effect-only forms had no apply path (Venom Spit / flash refused at the damage roll); `classifyTriggeredEffect` short-circuited every effect-only form to `special-action`, hiding Venom Spit's structured CT rider; PoisonEngine looked toxins up only in its registry, so a weapon-defined toxin would never tick; the chat Apply Damage handler discarded `DamageSystem`'s result, so riders could not see the resolved threshold / CT facts; the Micro Grenade Launcher accepted a payload family no identity carries.
- **CONSUMER_DEFECT (found, not fixed — outside this seam)**: poison *coatings* (`flags.swse.appliedPoison`) are delivered only by `CombatEngine.resolveAttack`; the chat-card Apply Damage path now delivers a coating for weapons that declare the delivery capability (Darter, Needler) but a coated weapon without the declaration still delivers nothing on that path. A generic hook would change behaviour for every canonical weapon and is left for a decision.
- **BLOCKED_BY_MISSING_SUBSYSTEM**: Verpine Shattergun weapon-object damage (I-D).
- **Deferred with owner**: I-C-B 6 (blastEffect, ongoingStunWhileTrapped, ongoingEffect, hurledObjectDamageRule, attackTreatedAs, Shock Whip trip substitution); I-C-C 1 (lightsaberTalentCompatibility); I-D 8 (gas-cloud visibility, weapon-object DR ×3, remote detonation, line of sight, carried-item skill bonus, Sith Sword empowerment).

## 16. Stale special-mechanic census reconciled
The 5D-E census headline of **42 DEFER** predated later phases. The prepared-attack family (Bryar pistol / rifle, Deck Sweeper prime, Heavy Blaster Cannon brace) is consumed by the owned fire-state (5D-G / 5D-I-A) and is now classified AUTO; the census reports `deferredByOwner` and `deferredWithoutOwner` ([] — none unowned).

| 5D-E census | before | after |
|---|---|---|
| mechanics DEFER | 42 | **25** (I-C-B 15, I-C-C 7, I-D 3) |
| AUTO / PROMPT | 74 / 8 | 99 / 9 |

## 17. Closure census (I-B → I-C-A)
| counter | I-B | I-C-A |
|---|---|---|
| UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER | 126 | **109** |
| RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER | 167 | **144** |
| UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER | 14 | 14 |
| execution field families full / partial / unconsumed | 34 / 15 / 8 | 34 / 15 / 8 |
Counters were not chased to zero; no key was relabelled to make them fall. The execution-family counts are unchanged because the families that gained consumers still carry owned residuals. `CANONICAL_NAME_TEXT_HEURISTIC_USAGE` stays 0: every branch keys on enumerated effect ids / structured fields.

## 18. Earlier-test amendments (superseded expectations, not weakened)
- 5D-E: the nerve-agent payload is now a stored-PROMPT condition-track rider (was payload-effect DEFER); the flash payload is an AUTO status-effect; Venom Spit is an AUTO effect-only condition-track rider (Pin / Trip remain special-action DEFER).
- 5D-I-B: the Micro Grenade Launcher now delegates (amendment) instead of staying deferred; a weapon with no declaration still never delegates.
- Regenerated: 5D-E / 5D-G / 5D-H censuses, 5B / 5B-R / 5C artifacts, the I-A and I-B manifests (their occurrence counts follow the registry).

## 19. Tests
`tests/weapon-phase-5d-i-c-a-outcome-persistent-effects.test.mjs`: 12 grouped checks / 215 assertions (≈80 numbered points) covering threshold adjustment, Ripper, EMP (all classes, Evasion, zero-HP rider, stored answer), CT riders, poison delivery and Neural Inhibitor on the real PoisonEngine functions, Tehk'la, Concussion, Flash / Wrist payloads, Verpine BLOCKED, Venom Spit (+ I-B usage intact), Micro Grenade Launcher, disintegration, the turn-owned lifecycle on the real EffectIntentEngine, effect order, idempotency, provenance, serializer round trip, legacy / flat-NPC contracts, dispositions and manifests.

## 20. Foundry smoke checklist (prepared, NOT claimed passed)
1. Disruptor vs a target whose DT sits between damage and damage+5 (CT moves only for the disruptor); stored DT unchanged on the sheet.
2. Ripper: damage below / above threshold; shrapnel only with the CT move; Apply Damage clicked twice.
3. EMP Grenade: droid, vehicle, organic (answer the cybernetic prompt both ways), a miss, an Evasion target, a droid at low HP (−5 CT and disabled).
4. Concussion Rifle (prone on a Fortitude hit); Gas Grenade (hit, miss, Evasion target, protected target); Flash Canister and Flash Rocket via **Apply Effects**.
5. Wrist Rocket nerve toxin (secondary-result prompt once); Tehk'la bleeding over the target's turn; Neural Inhibitor over several turns, failure bonus, cure at DC 20, unconscious target.
6. Amphistaff Venom Spit via **Apply Effects**, then a second spit within the day (refused).
7. Carbonite Rifle immobilized until the end of the target's next turn; Aurial Perception −5 through the attacker's next turn; CryoBan speed 2.
8. Disruptor / Sonic Disruptor / Incinerator kill and destroy (Disintegrated status, token intact).
9. Micro Grenade Launcher loaded with a frag grenade (2d6 on a hit).

## 21. Validation
Focused I-C-A test; I-B, I-A, 5D-H…A tests; damage / mitigation / condition-track / ActiveEffect / stun-ion / area / payload / serializer / resource / fire-state / grapple / reaction regressions (all in the full rolling suite); I-C-A / I-B / I-A manifests, closure / special-mechanic / fire-state census `--check`; `build-canonical-weapons`, `build-canonical-feats`, `build-feat-production`, `build-weapon-production`, `build-weapon-runtime-registry`, 5B, 5B-R, 5C `--check`; `verify-canonical-production`; `validate-partials`; `validate-data`; `system.json` parse; `run-rolling-syntax-check`; full rolling suite (result in the PR).

## 22. Recommended I-C-B scope
Grab / grapple / restrain / net / snare / Pin / Trip and the grabbed-object model: Lightwhip, Garrote (`ongoingEffect`, `attackTreatedAs`), Shock Whip (grab, trip substitution, weapon lock), Electronet (`ongoingStunWhileTrapped`), Snare Pistol / Rifle (escape options, stun on successful grab), Adhesive Grenade (`blastEffect`), Amphistaff Pin / Trip, and the Tactical Tractor Beam's hurled object (`hurledObjectDamageRule`, move / hurl squares). It should reuse `GrappleStateEngine` / `GrappleLegalityEngine` and the lifecycle / receipt seams added here. I-C-C then owns Block / Deflect / reactions / disarm defense (`lightsaberTalentCompatibility`, the 7 reaction-owned DEFER mechanics); I-D keeps sensing / cloud consumption, weapon-object durability, size-derived wielding, equipment slots and the open DATA_COMPLETENESS items.
