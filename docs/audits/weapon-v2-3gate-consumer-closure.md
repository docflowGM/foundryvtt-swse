# Weapon V2 three-gate closure report

Branch `claude/clever-fermat-khhs6f` on `main` @ `91ad4ac` (PRs #1137 and #1139 are already merged). Draft PR #1140, **not for merge**.
Source audit: `SWSE_Weapon_Three_Gate_Audit_2026-11-09.md`. Machine ledger: `data/audits/weapon-v2-3gate-field-consumers.json`.
Generator: `tools/audit-weapon-v2-3gate-field-consumers.mjs` (invariants: `tests/weapon-3gate-ledger.test.mjs`).

**Live Foundry V13 testing: NOT done. No gate below is a live certification.**

## Certification matrix (each gate separate)

| Gate | Status | What is proven | What is not |
|---|---|---|---|
| **A: schema and data completeness** | **Not closed** (infrastructure verified) | 5B census is current: 203 identities, 2,309 paths (1,556 / 662 / 91). The consumption map is current, with 0 unclassified, 0 unmapped, 0 unexplained and 0 adapter gaps. Every census path is joined to a rule family in the new ledger. | The full source, registry, production-Item and runtime crosswalk was **not** regenerated. `tools/verify-item-weapons-authority.mjs` does not run in this environment (missing Foundry-absolute import; identical on `main`). Source-silent and unmapped:: records are unchanged. |
| **B: consumer completeness** | **Not closed** (reconciled, with an itemized queue) | See the Gate B tables. | Only 6 of the 8 historical families were re-verified from code. Most `DIRECT_CONSUMER` rows carry `STATIC_ONLY` or `HISTORICAL_MANIFEST` evidence, not per-field behavioral proof. 20 operation keys have no consumer. |
| **C: mathematical and rules fidelity** | **Core defects fixed; matrix partial** | 5 reproduced defects fixed, with fail-first real-path tests. Golden cases M-01..M-04, M-07, M-17 and M-20 pass. Others are covered by existing suites (below). | Not all 20 cases are re-run end to end by this branch (see the Gate C matrix). The minimum-1 and Destructive ordering is a pending ruling. |

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
| `3b.profile.wielding` (1) | DEFERRED | **ORPHANED** | See the orphan queue |

Historic 8 deferred, now: 3 closed or duplicate, 2 partial, 1 blocked, 1 partial (operation container), 1 orphan.
The 1,206 `NEW_CONSUMER_REQUIRED` paths in the 5B map are **not** 1,206 assignments. They are a 5B-era state, now superseded by the family dispositions above.

### 41 historical operation keys
CONSUMED_VIA_DUPLICATE 11, DISPLAY_ONLY (non-executable) 3, SOURCE_UNRESOLVED 4, BLOCKED_BY_SUBSYSTEM 3, **ORPHANED 20**.
The 28 keys deferred to I-D-A2, A3, B, C and D are mostly still open, because those subpasses have no code or tests: only the A1, B1, B2, B3, B5, E and F tests exist. The ledger does not recount them as work done.

**Orphan queue (owner decision needed, no code written):**
- *Attack modifiers and allies (5):* `allyAttackBonus`, `allyEligibleWeapons`, `repeatAttackEachRoundToMaintainDesignation`, `preferredMode`, `lineOfSightOriginHeightSquares`.
- *Stealth and sensing (11):* `alwaysDetermineNorth`, `audibility`, `builtInDigitalCompass`, `createsSmokeHazard`, `firingDoesNotRevealShooterPosition`, `gasConcealmentDuration`, `providesConcealment`, `sensorDetection`, `shotVisibility`, `silentInUse`, `remoteDetonationSafetyRule`.
- *Other (5):* `darkSideEmpowerment`, `grievousWound`, `encumbranceException`, `ascensionMode`, and the field `attackProfiles[].wielding` (Massassi lanvarok, `"two-handed"`).

**Blocked or source-silent, kept as-is:**
- *Blocked:* `radiationExposure`, `weaponDR`, `weaponDRAppliesAgainstLightsabers`.
- *Source-silent:* `powerCordDisconnectRule`, `concealmentDesign`, `weaponDRValue`, `powerAttackExtraDamageAppliesToObjectsAndVehicles`.

EQ-001/002/003/EQ-W-001 holds and the disabled player-to-GM equipment route are untouched.

## Gate C: 20-case matrix

| Case | Status | Evidence |
|---|---|---|
| M-01..M-04, M-07, M-20 | PASS, new | `weapon-3gate-w4-golden-arithmetic` (e.g. Vibrosword 2d8+5, two-handed 2d8+8, Vibrodagger not doubled, pistol 3d6+2) |
| M-17 | PASS, new | `weapon-3gate-w1-*` (effective 1 before DR) |
| M-10, M-16 (multiplier, crit, rider) | existing | `weapon-phase-5d-e-multiplier-correction` |
| M-09, M-05, M-06, M-08, M-11 | existing | `damage-modifier-ssot`, `5d-c`, `5d-d-thrown-melee`, `5d-i-a` (Bow/Sling STR), `5d-e`, `d016` |
| M-12 | existing | `vehicle-universal-phase4e-p36`, `5d-g` (area miss, no blanket floor; confirmed by the w1 area-miss test) |
| M-13, M-14, M-15 | existing | `5d-a`, `stock-droid-damage-math`, `vehicle-universal-phase4e-p21/p23` |
| M-18, M-19 | existing | `5d-i-d-f` (legacy refused by the gate, nothing spent) |

"Existing" means those suites pass in the baseline and still pass on this branch's targeted runs. They were **not** re-audited line by line against the printed rule.

**Finding, not changed:** `getDamageAbilityContribution` (`combat-stat-rules.js`, final fallback) gives `floor(STR × 1.5)` for a legacy item flagged `twoHanded`. That is not the printed SWSE rule (2× positive STR, non-light, melee). It is legacy-only, and uncertified legacy weapons are refused by the readiness gate, so it is not reachable for rolling. Recorded for the owner.

## Pending rulings added
- `WPN-W1-001`: ordering of the minimum-1 floor against Saboteur Destructive.
- `WPN-W1-002`: whether a hit-less (hand-adjudicated) damage roll counts as a hit.
- `WPN-W2-001` (this report): whether the dialog's `Custom / GM` band should require an explicit numeric adjudication or a GM-stamped override. Today it applies no canonical penalty, and the Custom Modifier field carries the adjudication, itemized in the breakdown. This was deliberately left unchanged.

## Validation
- Baseline (`tools/run-rolling-tests.mjs`, untouched `main`): 648 pass, 0 fail, 5 documented exclusions.
- This branch's full run: see the PR description (updated when the run finishes).
- Targeted: all new `weapon-3gate-*` tests pass. Updated: `5d-d`, `5d-i-d-f` and the Saboteur source guard (variable rename only).
- `tools/check-combat-math-ssot.mjs --strict` and the 5B census checks pass. `verify-item-weapons-authority` fails identically on `main` (pre-existing).

## Remaining work
1. Field-level behavioral proof for the 583 STATIC_ONLY rows (parametrized fixtures per family).
2. Source-backed decisions or subsystems for the 20 orphaned keys and the lanvarok `wielding` field.
3. Gate A crosswalk (source, registry, production Item, runtime) from a fixed SHA.
4. Live Foundry V13 acceptance.
