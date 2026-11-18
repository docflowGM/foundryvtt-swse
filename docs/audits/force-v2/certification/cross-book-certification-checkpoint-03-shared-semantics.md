# SWSE Force V2 — Checkpoint 03: Shared Semantics Certification

**Date:** 2026-11-18  
**Branch:** `audit/force-v2-seven-book-packages-v2-9-20261117`  
**Source baseline:** commit `2dc255b2799dc7a2cb91b1484d028bc06ff1c341` (Checkpoint 02B)  
**Machine-readable authority:** `cross-book-certification-checkpoint-03-shared-semantics.json`  
**Completion:** RAW semantic contracts drafted and owner boundaries assigned; **not runtime-certified, no production code changed**.

## Summary and source-of-truth

| Metric | Result |
|---|---:|
| Typed semantic event contracts | **17** |
| Source-specific Power maintenance entries | **7** |
| Code findings with direct source locations | **12** |
| Regression scenarios specified (not executed) | **59** |
| Executed Foundry V13 runtime tests in this pass | **0** |
| Original seven-book Power definitions modified | **0 / 212** |
| Original cross-book influence graph edges modified | **0 / 178** |

Rule priority is the **uploaded printed rulebook**, amended by **authenticated official errata** when the printing is superseded. Text corpus is a find tool; implementation code is evidence of runtime behavior, **not** rules authority. Source pages were cross-checked against the uploaded PDFs; the official Core errata was visually inspected at its second PDF page.

Official Core Errata, October 21, 2008: <https://www.swse.xphilesrealm.com/Errata/SWRGP-Errata.pdf>.

### Important RAW corrections to the prior checkpoint

1. **Core p.93:** The printed Force Point paragraph says *swift* for returning a spent Force Power. **Official errata explicitly changes it to a reaction.** Core p.96 already describes reaction recovery. The canonical runtime rule is **reaction**, not swift.
2. **Core p.96:** The printed natural-20 text is broad (*any* Use the Force check). **Official errata narrows it to a Use the Force check made to activate a Force Power.** Unrelated Use the Force skill checks cannot recover the suite. This corrects a material source ambiguity and protects starship/Force cross-domain separation.
3. **Core p.96 descriptor and pp.97–98 maintenance:** Official errata adds the [telekinetic] rules, and replaces Force Grip / Move Object maintenance with **standard-action plus new UTF every round**; DC 15 + damage taken maintains concentration after damage.
4. **Starships p.24:** Pilot natural-20 recovery also only applies to Pilot checks **to activate a starship maneuver**, not every Pilot check. Both domains recover **at the end of the actor's turn**.
5. **Core p.93:** Unless a specific published exception says otherwise, no more than **one Force Point per round**; special source permissions must be scoped by exact rule/event, not permissive generic off-turn toggles.

## Shared V2 semantics — what should be common and what must differ

| Concern | Force Powers | Starship maneuvers | V2 contract |
|---|---|---|---|
| Learned identity | Multiple copies of same definition | Multiple copies of same maneuver | Unique owned instance ID for each copy; immutable definition identity kept separately |
| Entitlement | Each Force Training: 1+Wis mod, min 1 | Each Starship Tactics: 1+Wis mod, min 1 | Each feat and Wisdom increase has one source receipt; count copies, not distinct names |
| Activation | Use the Force; spent even on failure | Pilot activation; spent even on failure | Activate *specific ready instance* then resolve printed rules |
| Natural 20 recovery | Natural20 on UTF **Power activation** | Natural20 on Pilot **maneuver activation** | Delayed end-turn recover-all, event-specific trigger only |
| FP recovery | One spent Power as a reaction | One spent maneuver as a reaction | Typed FP authorization + exactly-one owned instance recovery |
| Combat-end rest | 1 minute after combat with rest opportunity | Same after starship combat | No automatic recovery on deleteCombat; require qualified rest completion |
| Active duration | May outlive when card becomes spent | Attack patterns, etc. can persist | Active effects have identities separate from suite copy readiness |
| Other recovery | Force Focus/Savant etc. per printed talent | Maneuver-specific features per printed talent/feat | Rules-specific exception with source and remaining-use receipt |

Do **not** create a new compendium item for any of these policies, and do not add a compatibility layer over competing runtimes. Reuse ActorEngine for actor mutations; existing Force point service for eligibility; existing Force executor, maneuver view-model and battle/roll authorities. Shared semantics can be factored as a typed event contract without inventing a second mutation engine.

## Findings by severity

| # | Finding | Priority | Evidence |
|---:|---|---|---|
| 1 | `CP03-F01` | P0 | Natural20 on rolled Force Power currently grants FP instead of queued Power suite recovery |
| 2 | `CP03-F02` | P0 | Power deleteCombat hook grants no-rest recovery and uses system.spent while executor writes system.discarded |
| 3 | `CP03-F03` | P0 | Maneuver deleteCombat hook restores spent copies before required one-minute rest |
| 4 | `CP03-F04` | P0 | Recover-all UI invokes generic ForceExecutor.recoverForcePowers(actor) without rest/trigger receipt |
| 5 | `CP03-F05` | P0 | Recover-one spends FP before validating chosen spent Power ID; invalid request can cost FP |
| 6 | `CP03-F06` | P0 | ActorEngine.spendForcePoints lacks visible per-round one-FP accounting and reason/timing validation while used by direct consumers |
| 7 | `CP03-F07` | P0 | Rolled ForceExecutor.executeForcePower path does not explicitly gate FP modification by [dark side] or [light side] descriptors and DSS; DSP update only apparent in alternate activateForce path |
| 8 | `CP03-F08` | P1 | Force recovery removes origin-linked active effects; restoration of readiness should not itself terminate a valid maintained effect |
| 9 | `CP03-F09` | P1 | Modern ForcePowerStep + ForcePlanBuilder allow copies, but legacy ForcePowerEngine and ForceAuthorityEngine reject duplicate selection |
| 10 | `CP03-F10` | P1 | Modern starship maneuver step holds counts, but live starship maneuver createItem hook calls manager whose getAvailableManeuvers excludes already learned names |
| 11 | `CP03-F11` | P1 | ForcePlanBuilder matches by fuzzy name and removes first N owned copies; does not require explicit instance for respec |
| 12 | `CP03-F12` | P1 | KOTOR and Core errata require distinct per-effect maintenance action/check/expiry state; no complete service was certified in inspected ForcePowerEffectsEngine |

### Highest-risk defects

**P0 — Natural 20 currently creates an unauthorized Force Point.** `scripts/engine/force/force-executor.js:309-316` calls `ForceEngine.recordNatural20()`, whose `force-engine.js:22-40` increases current Force Points by one. The official rule is **end-turn recovery of spent Force Power instances**, not +1 FP. It is additionally limited to Power-activation UTF checks by errata. The existing call does not perform that end-turn suite recovery.

**P0 — Force Power recovery can charge for nothing.** `ForceExecutor.recoverForcePowers(actor,[itemId])` (lines 1063–1084) spends the FP **before** selecting and verifying that the item is a spent recoverable Force Power. A missing/ready/invalid ID can consume a point, after which the function fails. Add preflight, transaction and rollback/atomicity. Recover-one must not operate by name.

**P0 — Two active hooks recover too early, and Force flags disagree.** The registered `deleteCombat` hooks in `force-power-hooks.js:114–139` and `starship-maneuver-hooks.js:91–114` immediately restore spent items. Core p.95 and SotG p.24 require an **actual chance to rest for one minute** after the combat. The Force hook writes `system.spent=false`, whereas `ForceExecutor.executeForcePower()` spends `system.discarded=true`. That creates a verified semantic and field mismatch.

**P0 — Force Point policy is not centralized.** `ActorEngine.spendForcePoints():2007+` deducts from bonus/regular pools but does not itself establish action timing, per-round spend limit or source-specific exceptions. `ForcePointsService.validateSpend()` and its runtime patch do check off-turn permission, but generic checks do not encode the **explicit Core/SotG recovery reactions**. Do not simply permit all off-turn spending: check source, action, actor turn, round and already-spent count.

**P0 — Descriptor legality must precede any paid Power roll.** Core p.96 bars use of a FP to **modify the Use the Force check** on a [dark side] Power; a character with DSS 1+ is similarly barred for [light side] checks. Use of [dark side] Power raises DSS by one barring an explicit printed exception. The rolled `executeForcePower` path lacks the visible preflight/settlement that the separate `activateForce` path attempts. Neither duplicate DSP nor missing DSP is acceptable.

**P1 — Recovery must not arbitrarily cancel ongoing effects.** `recoverForcePowers()` calls `ForcePowerEffectsEngine.removePowerEffects()` for the newly readied source Item. That deletes active effects tied to its Item ID. Since KOTOR pp.50–52 allows independently maintained effects, the Power card being ready/spent and the activated effect's lifetime must be different concepts. Source wording supports this separation; precise effect-state binding remains an engineering design decision, not yet runtime-certified.

**P1 — Two acquisition models still disagree.** The modern Force plan builder permits repeated copies with acquisition source and `countIndex`. The old Force authority rejects duplicate IDs and the old application engine filters by already-owned names. The modern maneuver step also counts repeated choices, but `StarshipManeuverManager.getAvailableManeuvers` excludes already learned names and the starship `createItem` hook actively calls it. Prove active paths and converge them to the V2 progression contract.

**P1 — Removal cannot be defined by normalized name.** `ForcePlanBuilder.collectOwnedForcePowerItemIds()` finds same-name copies and selects the first N. If instances differ in acquired source, ready/spent status or effect attachment, arbitrary deletion is not correct. Core p.95 also forbids casual alteration of chosen Power selections without the GM's approval; ordinary convenience reselection is not RAW.

## Maintained effects — separate from suite readiness

| Power | Action each round | Fresh UTF check every round | Concentration if damaged | Multiple ongoing instances |
|---|---|---|---|---|
| Energy Resistance | swift | Not stipulated | 15+damage | not expressly specified |
| Force Whirlwind | move | Yes | 15+damage | Per-effect state |
| Kinetic Combat | swift | Not stipulated | 15+damage | Per-effect state |
| Resist Force | swift | Not stipulated | 15+damage | multiple explicit |
| Valor | swift | Not stipulated | 15+damage | multiple affecting different allies |
| Force Grip | standard | Yes | 15+damage | Per-effect state |
| Move Object | standard | Yes | 15+damage | Per-effect state |

KOTOR printed pp.50–52 and official Core errata pp.97–98 are the authority. The shared duration schema must distinguish: learned definition ID, **owned copy ID**, **active effect instance ID**, beneficiary/target ID, action receipt per round, end condition, and concentration state. A copied Power can remain spent while its activated effect is still ongoing. A maintained effect can terminate without changing the learned definition.

Examples requiring specific exception handling: *Force Whirlwind* needs a **move** action and a new UTF check every round; *Kinetic Combat* costs a **swift** to maintain but directing the weapon requires a separate **standard**; *Resist Force* and *Valor* expressly allow multiple ongoing instances with separate **swift** maintenance actions; *Force Grip* and *Move Object* use the errata's standard action and fresh UTF. *Move Object* stops being maintainable after it deals damage.

## Seventeen formal event contracts

| # | Contract ID | RAW source | Observed code status |
|---:|---|---|---|
| 1 | `suite.power.acquire` | Core Rulebook p.95 | partial with legacy conflict |
| 2 | `suite.maneuver.acquire` | Starships of the Galaxy p.23,24 | partial with active legacy competition |
| 3 | `suite.power.activate` | Core Rulebook p.95 | partial spent field split |
| 4 | `suite.maneuver.activate` | Starships of the Galaxy p.24 | no verified typed activation resolver |
| 5 | `suite.power.natural20` | Core Rulebook p.96 | verified incorrect fp award and missing end turn recovery |
| 6 | `suite.maneuver.natural20` | Starships of the Galaxy p.24 | end turn trigger not verified |
| 7 | `suite.power.forcepoint-recovery` | Core Rulebook p.93,96 | verified spend before eligibility and untyped reaction |
| 8 | `suite.maneuver.forcepoint-recovery` | Starships of the Galaxy p.24 | current ui toggle with no fp |
| 9 | `suite.power.rest-recovery` | Core Rulebook p.95 | active deletecombat premature and wrong flag |
| 10 | `suite.maneuver.rest-recovery` | Starships of the Galaxy p.24 | active deletecombat premature |
| 11 | `resource.forcepoint.spend` | Core Rulebook p.93,96 | per round ledger not evidenced and raw reason gate missing |
| 12 | `resource.forcepoint.descriptor-policy` | Core Rulebook p.96 | execute roll path not evidenced |
| 13 | `effect.force.maintain` | Knights of the Old Republic Campaign Guide p.50,51,52 | unverified generic maintenance not source compliant |
| 14 | `effect.force.end` | Knights of the Old Republic Campaign Guide p.50,51,52 | recovery currently deletes origin effects |
| 15 | `suite.power.copy-removal` | Core Rulebook p.95 | current removal matches name and slices first n |
| 16 | `suite.maneuver.copy-removal` | Starships of the Galaxy p.23,24 | instance removal authority not certified |
| 17 | `effect.force.optional-temptation` | The Force Unleashed Campaign Guide p.85 | historical graph only covers talents |

### Contract specification and proposed test cases

#### `suite.power.acquire` — `progression.finalize`

**Source:** Saga Edition Core Rulebook, p.95 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Force Training creates 1+Wis modifier copies (minimum one) per feat; repeated feat grants repeat; extra per feat when Wisdom modifier increases.
2. Same Power definition may be selected more than once; copies are individually usable.
3. Replacements of chosen Force Powers require GM approval unless separately authorized.

**Transaction / event outcomes**
1. Create distinct owned Force Power instances with unique document IDs and canonical definition provenance per copy.
2. Finalization must be idempotent by source session, selection and per-copy index.

**Existing owner routes:** `scripts/apps/progression-framework/steps/force-power-step.js`; `scripts/apps/progression-framework/shell/mutation/force-plan-builder.js`.

**Observed:** `PARTIAL_WITH_LEGACY_CONFLICT`.

**Proposed acceptance checks (not executed)**
- `suite.power.acquire.T1` — Two copies of one Power are created without collapsing, have independent ready/spent state.
- `suite.power.acquire.T2` — Reapplying same progression session does not create duplicate copies.
- `suite.power.acquire.T3` — Acquiring same definition in a later legitimate training source creates another copy.
- `suite.power.acquire.T4` — A normal non-GM 'change selection' is not treated as a free RAW respec.

#### `suite.maneuver.acquire` — `progression.finalize`

**Source:** Starships of the Galaxy, p.23, 24 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Starship Tactics provides 1+Wisdom modifier maneuvers, at least one, with each feat copy.
2. Maneuver definition may be selected more than once.
3. Wisdom modifier rise grants one extra maneuver per Starship Tactics feat.

**Transaction / event outcomes**
1. Create distinct owned starship maneuver instances, with acquisition session and count index.

**Existing owner routes:** `scripts/apps/progression-framework/steps/starship-maneuver-step.js`; `scripts/utils/starship-maneuver-manager.js`.

**Observed:** `PARTIAL_WITH_ACTIVE_LEGACY_COMPETITION`.

**Proposed acceptance checks (not executed)**
- `suite.maneuver.acquire.T1` — Repeated Corellian Slip creates two usable copies.
- `suite.maneuver.acquire.T2` — Legacy StarshipManeuverManager must not block a repeat authorized by RAW.
- `suite.maneuver.acquire.T3` — A Wisdom modifier rise credits every Starship Tactics feat exactly once.

#### `suite.power.activate` — `force-power.activation.result`

**Source:** Saga Edition Core Rulebook, p.95 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Exactly one eligible ready Power instance identified by owned Item ID.
2. Use the Force roll belongs to that activation; DC/tier/defense resolved by printed Power rule.
3. Attempt must consume Power whether baseline check succeeds or fails.

**Transaction / event outcomes**
1. Mark only chosen copy expended; distinct copies remain ready.
2. Keep activation attempt and resulting effect instance separate for duration/maintenance.

**Existing owner routes:** `scripts/engine/force/force-executor.js`; `scripts/engine/force/force-power-effects-engine.js`.

**Observed:** `PARTIAL_SPENT_FIELD_SPLIT`.

**Proposed acceptance checks (not executed)**
- `suite.power.activate.T1` — Failed activation spends selected instance.
- `suite.power.activate.T2` — Second ready copy remains available after first spent.
- `suite.power.activate.T3` — A duplicate click against one spent instance fails without affecting the other.

#### `suite.maneuver.activate` — `starship-maneuver.activation.result`

**Source:** Starships of the Galaxy, p.24 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Pilot check specifically to activate maneuver (except individual maneuver override; Force maneuver still follows stated published activation).
2. A failed baseline check wastes action and spends copy.

**Transaction / event outcomes**
1. Mark only selected maneuver instance spent; activate effects only when legal.
2. Attack patterns tracked separately from spent/ready state.

**Existing owner routes:** `scripts/engine/StarshipManeuversEngine.js`; `scripts/engine/combat/starship/vehicle-turn-controller.js`.

**Observed:** `NO_VERIFIED_TYPED_ACTIVATION_RESOLVER`.

**Proposed acceptance checks (not executed)**
- `suite.maneuver.activate.T1` — Failed Pilot activation consumes selected copy.
- `suite.maneuver.activate.T2` — Successful activation applies correct tier and source-specific effects.
- `suite.maneuver.activate.T3` — Duplicate maneuver copy remains ready.

#### `suite.power.natural20` — `roll.utf.force-power-activation.natural20`

**Source:** Saga Edition Core Rulebook, p.96 (PRINTED_INSPECTED_OFFICIAL_ERRATA_REQUIRED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Official October 2008 errata replaces broad printed UTF roll wording with natural20 on an actual Use the Force check to activate a Force Power.
2. Recovery occurs at END OF ACTOR TURN; no Force Point awarded by this rule.
3. Do not treat take-10 or unrelated UTF skill check as triggering recovery.

**Transaction / event outcomes**
1. Queue one end-turn recover-all of existing spent Force Power instances, including Power used in triggering activation.
2. No FP mutation. Receipt identifies roll and turn.

**Existing owner routes:** `scripts/engine/force/force-executor.js`; `scripts/engine/force/force-engine.js`.

**Observed:** `VERIFIED_INCORRECT_FP_AWARD_AND_MISSING_END_TURN_RECOVERY`.

**Proposed acceptance checks (not executed)**
- `suite.power.natural20.T1` — Power activation raw d20 20 recovers all only at actor end turn.
- `suite.power.natural20.T2` — Unrelated UTF skill use raw d20 20 does not recover.
- `suite.power.natural20.T3` — Natural 20 never grants 1 FP without a separate printed feat/feature.
- `suite.power.natural20.T4` — The activating instance is included in end-turn recovery.

#### `suite.maneuver.natural20` — `roll.pilot.starship-maneuver-activation.natural20`

**Source:** Starships of the Galaxy, p.24 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Natural20 on Pilot check ACTUALLY used to activate a starship maneuver.
2. Does not apply to other Pilot checks, gunner attack rolls or Target Sense UTF.

**Transaction / event outcomes**
1. Queue end-turn recover-all of spent maneuver instances; no immediate recovery.

**Existing owner routes:** `scripts/engine/StarshipManeuversEngine.js`; `scripts/engine/combat/starship/vehicle-turn-controller.js`.

**Observed:** `END_TURN_TRIGGER_NOT_VERIFIED`.

**Proposed acceptance checks (not executed)**
- `suite.maneuver.natural20.T1` — Pilot activation nat20 recovers at end of turn only.
- `suite.maneuver.natural20.T2` — Other Pilot nat20 does not recover maneuvers.
- `suite.maneuver.natural20.T3` — One target-sense UTF nat20 does not recover maneuvers.

#### `suite.power.forcepoint-recovery` — `action.reaction.force-point.power-recover-one`

**Source:** Saga Edition Core Rulebook, p.93, 96 (PRINTED_AND_OFFICIAL_ERRATA). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Explicit reaction under official p93 errata and Core p96.
2. Exactly one spent owned Power instance selected before FP debit; applicable restrictions and one-FP-per-round rules evaluated.
3. A specific source ability may authorize exceptions; generic Force Readiness is not prerequisite for this printed reaction.

**Transaction / event outcomes**
1. Atomically debit exactly one eligible FP and ready exactly one selected spent Power instance.
2. No refundless FP spend if invalid target or mutation fails.

**Existing owner routes:** `scripts/engine/force/force-points-service.js`; `scripts/governance/actor-engine/actor-engine.js`; `scripts/engine/force/force-executor.js`.

**Observed:** `VERIFIED_SPEND_BEFORE_ELIGIBILITY_AND_UNTYPED_REACTION`.

**Proposed acceptance checks (not executed)**
- `suite.power.forcepoint-recovery.T1` — Invalid/already ready/missing target costs zero FP.
- `suite.power.forcepoint-recovery.T2` — One spent copy returns ready; other same-name copy unchanged.
- `suite.power.forcepoint-recovery.T3` — Actor with no Force Readiness can use explicit printed reaction.
- `suite.power.forcepoint-recovery.T4` — Concurrent duplicate requests cannot debit twice or recover more than paid.

#### `suite.maneuver.forcepoint-recovery` — `action.reaction.force-point.maneuver-recover-one`

**Source:** Starships of the Galaxy, p.24 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Reaction explicitly allowed by Starships p24, even if not a generic off-turn allowance.
2. Exactly one eligible spent maneuver instance selected in advance.
3. Normal FP limit and source-specific exception checks apply.

**Transaction / event outcomes**
1. Debit exactly 1 FP and immediately ready one maneuver instance via ActorEngine.

**Existing owner routes:** `scripts/engine/force/force-points-service.js`; `scripts/governance/actor-engine/actor-engine.js`; `scripts/engine/StarshipManeuversEngine.js`.

**Observed:** `CURRENT_UI_TOGGLE_WITH_NO_FP`.

**Proposed acceptance checks (not executed)**
- `suite.maneuver.forcepoint-recovery.T1` — Single spent instance recovery changes exactly one copy.
- `suite.maneuver.forcepoint-recovery.T2` — No Force Readiness prereq invented for this printed reaction.
- `suite.maneuver.forcepoint-recovery.T3` — No spent item gives no debit; double submission cannot recover twice.

#### `suite.power.rest-recovery` — `encounter.end-and-rest-one-minute`

**Source:** Saga Edition Core Rulebook, p.95 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Actual combat over and meaningful opportunity to rest for 1 minute; deleting Combat document is not proof.
2. Only owned spent Power instances recover, not temporary non-recoverable powers.

**Transaction / event outcomes**
1. Recover all eligible spent Power copies after validated rest receipt.
2. Do not terminate a separately active duration effect solely because the suite copy became ready.

**Existing owner routes:** `scripts/engine/force/force-executor.js`; `scripts/infrastructure/hooks/force-power-hooks.js`.

**Observed:** `ACTIVE_DELETECOMBAT_PREMATURE_AND_WRONG_FLAG`.

**Proposed acceptance checks (not executed)**
- `suite.power.rest-recovery.T1` — deleteCombat alone recovers zero.
- `suite.power.rest-recovery.T2` — Rest completion recovers spent copies in all aliases only after single canonical-state cutover.
- `suite.power.rest-recovery.T3` — Non-recoverable temporary Power remains excluded.

#### `suite.maneuver.rest-recovery` — `encounter.end-and-rest-one-minute`

**Source:** Starships of the Galaxy, p.24 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Starship battle ended AND one-minute rest opportunity occurred.
2. A GM/admin reset may exist but must be distinctly marked and never mislabelled RAW rest.

**Transaction / event outcomes**
1. Recover all spent maneuver instances after evidence of full rest.

**Existing owner routes:** `scripts/engine/StarshipManeuversEngine.js`; `scripts/infrastructure/hooks/starship-maneuver-hooks.js`.

**Observed:** `ACTIVE_DELETECOMBAT_PREMATURE`.

**Proposed acceptance checks (not executed)**
- `suite.maneuver.rest-recovery.T1` — deleteCombat alone recovers zero.
- `suite.maneuver.rest-recovery.T2` — Starship encounter then full rest recovers all copies.
- `suite.maneuver.rest-recovery.T3` — Crew-linked owned instances correctly recover on actual owning actor.

#### `resource.forcepoint.spend` — `force-point.spend.any-reason`

**Source:** Saga Edition Core Rulebook, p.93, 96 (PRINTED_AND_OFFICIAL_ERRATA). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Actor and reason identified; sufficient resource available.
2. Default no more than one FP per round unless printed specific permission says otherwise.
3. Action timing source-specific (roll-mod free on own turn, Power/Maneuver recovery reactions, special activation costs as printed).
4. Power [dark side] and [light side] constraints on FP-modified Use the Force checks are enforced before spending.

**Transaction / event outcomes**
1. Single authorized resource debit receipt carrying source, round, action, amount, relevant exception, paid type and before/after.
2. Bonus FP source restrictions evaluated; actor mutation via ActorEngine only.

**Existing owner routes:** `scripts/engine/force/force-points-service.js`; `scripts/governance/actor-engine/actor-engine.js`; `scripts/engine/feats/force-point-service-runtime-patches.js`.

**Observed:** `PER_ROUND_LEDGER_NOT_EVIDENCED_AND_RAW_REASON_GATE_MISSING`.

**Proposed acceptance checks (not executed)**
- `resource.forcepoint.spend.T1` — Ordinary second FP same round denied absent specific exception.
- `resource.forcepoint.spend.T2` — SotG/Core reaction recovery allowed even without Force Readiness.
- `resource.forcepoint.spend.T3` — An invalid spend cannot mutate bonus or normal FP pool.
- `resource.forcepoint.spend.T4` — Concurrent spends and rollback preserve exact resource accounting.

#### `resource.forcepoint.descriptor-policy` — `force-power.activation.fp-bonus-preflight`

**Source:** Saga Edition Core Rulebook, p.96 (PRINTED_INSPECTED_OFFICIAL_ERRATA_REQUIRED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. [dark side] Power UTF activation check cannot be modified with an FP and using one increases Dark Side Score by one (subject to separately valid published exception).
2. [light side] Power UTF check cannot use FP modification when actor Dark Side Score >=1.
3. No assumption that all Force Point Power-specific benefits are forbidden; restriction is on modifying that Use the Force check.

**Transaction / event outcomes**
1. Reject illegal bonus transaction before rolling; settle dark-side consequences on actual use with traceable event receipt.

**Existing owner routes:** `scripts/engine/force/force-executor.js`; `scripts/engine/force/force-points-service.js`; `scripts/engine/darkside/dsp-engine.js`.

**Observed:** `EXECUTE_ROLL_PATH_NOT_EVIDENCED`.

**Proposed acceptance checks (not executed)**
- `resource.forcepoint.descriptor-policy.T1` — Dark-side power cannot spend FP to boost UTF and increments DSS upon use.
- `resource.forcepoint.descriptor-policy.T2` — Actor with DSS 1+ cannot FP-boost a light-side Power UTF check.
- `resource.forcepoint.descriptor-policy.T3` — Legal unrelated source-specific Force Point option still available when rules permit.
- `resource.forcepoint.descriptor-policy.T4` — No double DSP between activateForce() and executeForcePower().

#### `effect.force.maintain` — `force-power.effect.maintain-per-instance`

**Source:** Knights of the Old Republic Campaign Guide, p.50, 51, 52 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Maintained effect instance exists and has not expired.
2. Action paid EACH round for EACH maintained instance: Energy Resistance swift; Kinetic Combat swift (plus stated standard action to direct weapon); Resist Force swift; Valor swift; Force Whirlwind move and new UTF check.
3. Core errata: Force Grip and Move Object maintenance costs standard action plus new UTF check.
4. On damage taken while maintaining one of these, UTF DC 15+damage taken.
5. Special break clauses: Force Whirlwind ends if caster/ally damages, attacks or moves target down condition track; Move Object cannot be maintained after dealing damage.

**Transaction / event outcomes**
1. Store effect-instance identity distinct from learned copy; pay per-instance actions; register any on-damage check and clear only invalidated effect.

**Existing owner routes:** `scripts/engine/force/force-power-effects-engine.js`; `scripts/governance/actor-engine/actor-engine.js`; `scripts/engine/combat/action/action-economy-hooks.js`.

**Observed:** `UNVERIFIED_GENERIC_MAINTENANCE_NOT_SOURCE_COMPLIANT`.

**Proposed acceptance checks (not executed)**
- `effect.force.maintain.T1` — Two Resist Force effects require two distinct swift actions.
- `effect.force.maintain.T2` — Whirlwind maintenance move action rerolls UTF every round.
- `effect.force.maintain.T3` — Whirlwind ends when printed prohibited interference occurs.
- `effect.force.maintain.T4` — Core Grip and Move Object need separate standard+UTF checks.
- `effect.force.maintain.T5` — Check DC equals 15+actual damage, and failure ends that effect only.

#### `effect.force.end` — `force-power.effect.expire-or-break`

**Source:** Knights of the Old Republic Campaign Guide, p.50, 51, 52 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Expiry determined by per-effect start and source duration, not power card ready/spent bit.
2. Individual maintenance failures, printed break triggers and encounter end can end effects.
3. Recovery of a Power instance does not itself cancel unrelated ongoing duration unless explicit rule says so.

**Transaction / event outcomes**
1. Delete exactly affected effect instance, not every effect sharing Power name.
2. Tie persistent effect to owning actor, activation receipt and source item ID.

**Existing owner routes:** `scripts/engine/force/force-power-effects-engine.js`; `scripts/engine/force/force-executor.js`.

**Observed:** `RECOVERY_CURRENTLY_DELETES_ORIGIN_EFFECTS`.

**Proposed acceptance checks (not executed)**
- `effect.force.end.T1` — Recovering one spent Power leaves valid maintained effects intact.
- `effect.force.end.T2` — Ending one of two Valor instances leaves other active.
- `effect.force.end.T3` — Rest recovery does not silently erase unrelated active effects.

#### `suite.power.copy-removal` — `progression.gm-approved-respec`

**Source:** Saga Edition Core Rulebook, p.95 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Normal Force Power selections cannot be changed without GM approval (Core p95).
2. Authorized removal references explicit owned copy; a definition name alone is insufficient where copies differ.

**Transaction / event outcomes**
1. Delete only authorized owned Item ID(s); preserve other same-definition copies and their original provenance.

**Existing owner routes:** `scripts/apps/progression-framework/shell/mutation/force-plan-builder.js`; `scripts/governance/actor-engine/actor-engine.js`.

**Observed:** `CURRENT_REMOVAL_MATCHES_NAME_AND_SLICES_FIRST_N`.

**Proposed acceptance checks (not executed)**
- `suite.power.copy-removal.T1` — Respec without GM/source entitlement rejected.
- `suite.power.copy-removal.T2` — Removing second of three copies cannot delete first or third.
- `suite.power.copy-removal.T3` — Persistence/source provenance remains stable for untouched copies.

#### `suite.maneuver.copy-removal` — `progression.gm-approved-or-explicit-reselection`

**Source:** Starships of the Galaxy, p.23, 24 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. Do not invent free respec; require GM or a printed separate entitlement.
2. Removal targets one explicitly owned instance, not an abstract definition.

**Transaction / event outcomes**
1. Remove only selected item ID; leave other maneuver copies intact.

**Existing owner routes:** `scripts/apps/progression-framework/steps/starship-maneuver-step.js`; `scripts/governance/actor-engine/actor-engine.js`.

**Observed:** `INSTANCE_REMOVAL_AUTHORITY_NOT_CERTIFIED`.

**Proposed acceptance checks (not executed)**
- `suite.maneuver.copy-removal.T1` — Removing one duplicate leaves other ready/spent copy independent.
- `suite.maneuver.copy-removal.T2` — A generic same-name remove never randomly picks an item.
- `suite.maneuver.copy-removal.T3` — No phantom free swap from RAW-trained maneuver suite.

#### `effect.force.optional-temptation` — `gm-option.temptation.acquire-and-expire`

**Source:** The Force Unleashed Campaign Guide, p.85 (PRINTED_INSPECTED). **Runtime certification:** NO.

**Preconditions / RAW eligibility**
1. GM explicitly enables printed option; not silently mapped to strict/lenient/narrative setting.
2. Power option: FP adds one temporary [dark side] Force Power with special first-use/end-encounter expiration, not normally recoverable.
3. Talent option: separate temporary prerequisite-qualified Dark Side/Devotee/Sith talents, may prerequisite-chain; cleanup and final dark-side tally source-specific.

**Transaction / event outcomes**
1. Temporary entitlements have separate reversible records, acquisition/expiry receipts, FP and DSP ledgers.
2. Do not forge permanent learned Force Power copies.

**Existing owner routes:** `scripts/engine/force/force-points-service.js`; `scripts/engine/force/force-executor.js`; `scripts/engine/darkside/dsp-engine.js`.

**Observed:** `HISTORICAL_GRAPH_ONLY_COVERS_TALENTS`.

**Proposed acceptance checks (not executed)**
- `effect.force.optional-temptation.T1` — GM opt-in false blocks both temporary routes.
- `effect.force.optional-temptation.T2` — Temp Power never recovered through generic power suite recovery.
- `effect.force.optional-temptation.T3` — Valid chained temporary talents expire at encounter end with correct DSS accounting.
- `effect.force.optional-temptation.T4` — No permanent Power Item persists after expiration.

## Recommended implementation order (subsequent checkpoints only)

1. **Checkpoint 03B — Typed Force Point authorization and source-specific spend receipts.** Decide precise round/turn actions before spending; tie bonus-resource restrictions and explicit reaction authorizations into existing `ForcePointsService` and `ActorEngine` without adding a new independent mutant. Gate dark-side FP roll restrictions.
2. **Checkpoint 03C — Typed suite-instance and recovery lifecycle.** Eliminate both premature `deleteCombat` recoveries; implement qualified one-minute-rest trigger; move natural20 to actor end turn and remove the unauthorized FP grant; fix recover-one validation/refund and duplicate-copy targeting. Confirm these flows on the character and vehicle sheets.
3. **Checkpoint 03D — Effect-instance duration and source-specific maintenance.** Separate effect lifetime from owned Power spent/ready state; implement seven printed action/concentration contracts and properly terminate each effect. Cover KOTOR Resist Force's selective defense benefit and multi-instance rules.
4. **Checkpoint 03E — Acquisition convergence and temporary entitlements.** Audit active callbacks and retire obsolete duplicate-blocking validators/manager dialogs only after confirming canonical V2 coverage. Keep FUCG p.85 temporary [dark side] Powers distinct from temporary talents; do not forge permanent Items.
5. **Checkpoint 03F — Integration validation.** Convert all 59 specifications into executable tests, include Checkpoint 02B's 45 per-policy tests and 12 outstanding editorial blockers. Test negative authorization, duplicate copies, real Foundry async turn hooks and resource atomicity, and source metadata integrity.

No build or Foundry runtime test was executed by this checkpoint. The audit branch diverges from `main`; reverify HEAD and compare the current progression finalizer before production work.

**Implementation readiness: NO. Source-rule contract readiness for 03B work: YES, subject to independent review of the preceding discovered discrepancies.**
