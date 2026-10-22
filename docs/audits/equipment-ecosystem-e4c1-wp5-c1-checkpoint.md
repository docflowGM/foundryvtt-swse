# Equipment Ecosystem — E4-C1 WP5-C1 Checkpoint: Attack-Execution Gate and FireStateStore Synchronization (NOT CONVERGED)

**Phase:** WP5-C1 only (a focused correction of WP5). WP6–WP9, WP3-B, the droid refactor, mounted/worn certification, schema redesign and the PR merge were not started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `c144fd6feaaf8a88981131950c2548331e9f5b32` (CI run 39249115760 passed). **Final HEAD:** see the PR (recorded in the final report).
**Statuses:** `IMPLEMENTED` + `OFFLINE_TESTED`; `RUNTIME_UNVERIFIED`; nothing `FOUNDRY_TESTED`. **NOT CONVERGED.**
**EQ-001:** unchanged, `DEFERRED_RULES_REVIEW`. **EQ-002 / EQ-003:** published mechanics `SOURCE_VERIFIED` (append-only addenda in the register); model and implementation unresolved; temporary fail-closed handling remains.

## 1. Verified source reconciliation (from the supplied sourcebook text extractions, not rendered PDF pages)
| Rule | Book, printed page | Established behavior |
|---|---|---|
| Darkstick | *Galaxy at War* p. 36 | Proficient user may hold several in one hand; the group is one weapon, 2d8 instead of 1d6; more than two add nothing |
| Combat Gloves | *Saga Edition Core Rulebook* p. 121 | Worn; +1 damage on successful unarmed attacks; cannot be disarmed or dropped |
| Stunning Gauntlet | *KotOR Campaign Guide* p. 202 | Worn; unarmed melee becomes stun damage, +1 stun; cannot be disarmed or dropped |
| Tactical Tractor Beam | *Galaxy at War* p. 42 | Vehicle/large-droid mount or tripod (one size smaller; Medium operates it with two hands); needs a generator; crew regulation or -2 |

The earlier "no printed page located" wording in EQ-002/EQ-003 is superseded by the appended addenda. The required future model properties are documented there (not an approved schema). Future positive acceptance tests are tracked in `data/audits/equipment-acceptance-debt.json` (pending, never falsely passing).

**Correction to the WP5 checkpoint:** the WP5 document said the Tactical Tractor Beam is never READIED. That was tested only off a tripod. In its **tripod configuration** (owned `mounted` state, two hands) the existing grip resolver verifies it READIED for a Medium wielder, exactly as published, and the tractor-maintenance behavior test passes unchanged. Host-mounted (vehicle/droid) operation, the generator and crew regulation remain uncertified.

## 2. Fix A — attack-execution readiness gate
**Root cause:** `rollAttack()` validated canonical runtime and temporal readiness but never asked the readiness authority, so any direct caller bypassed the selection-level checks. `rollAttackAndDamageWithNarration()`, `SWSERoll.rollAttack/rollAutofire` and `SWSERoll.rollFullAttack` overrides had the same hole.
**Change:** new `scripts/combat/rolls/attack-readiness-gate.js` (a thin consumer of `combat-readiness.js`; no second posture predicate). It runs first in every entry point, before selection, option/temporal/ammunition spends, dice, fire-state mutation, effects or chat:
* router-verified vehicle/starship installation (a real vehicle-type actor that owns this very Item, via `resolveAttackDomain`) keeps its existing certified crew path — hand occupancy does not apply; **no** option flag, `isVehicleAttack`, or unowned vehicle weapon is exempt;
* the genuine virtual unarmed source passes through `isVirtualUnarmedAttack` (an Item with look-alike markers does not);
* every other weapon must be the very owned document (not a look-alike sharing an id; uuid-equal accepted) and `isCombatSourceReady`.
Entry points audited: `rollAttack`, `rollAttackAndDamageWithNarration`, `SWSERoll.rollAttack` (also before its dialog), `SWSERoll.rollAutofire`, `SWSERoll.rollFullAttack` overrides; `rollFullAttack`, grappling, combat-executor, CombatEngine and starship paths reach `rollAttack`.

## 3. Fix B — FireStateStore synchronization
**Root cause:** persistence was field-scoped but `commitFired`, `clearReload`, `primePreparedAttack` and `persistOwned` then assigned the whole in-memory `fireState` built from a pre-await snapshot, restoring a stale coordinator-owned `wielded` (and any other concurrent change).
**Change:** one helper `commitState(actor, weapon, base, next)`: delta against the record the operation **read** (`fireStateDeltaFor`), persist only that delta (never `wielded`, never `v` unless initializing), and after the await **apply the same delta to the latest** in-memory record. In-memory state is changed only if the write succeeded (a failed best-effort write no longer leaves the Item claiming success; strict operations still throw/report `persist-failed`). Established best-effort vs strict tolerances are unchanged and tested.

## 4. Tests (Node 22)
* New `tests/equipment-e4c1-wp5-c1-attack-gate-and-firestate.test.mjs` — **18 checks**: gate positive/negative for both entry points (READIED, EQUIPPED, STOWED, invalid declared READIED, no grip, legacy flag only, natural identity, missing species evidence, unresolved/unreadable journal, virtual unarmed, look-alike/foreign/fabricated weapons, no vehicle bypass) asserting zero ammo/roll/chat/action/write; `SWSERoll` entry points; deterministic deferred-barrier interleavings for `persistOwned`, `clearReload`, `commitFired`, `primePreparedAttack` in both an auto-refreshing and a non-refreshing persistence model (**fail-before verified** against the old FireStateStore: the grip was reverted to `one-handed`); failed-write tests; delta semantics; debt-manifest traceability.
* **Migrated, not weakened** (fixtures own and READY the attacking weapon through the real resolvers — `ownAndReady`, which never fakes success): attack-bonus-math-integrity, grapple-state-attack-penalty, 5D-B/C/D/E/F/G/H, 5D-I-A/B/C-A/C-B/C-C/D-B1/D-B2/D-F, weapon-production-mixed-resource-ammunition, plus the regenerated 5D-H census.
* Assertions that depended on attack-time prompts for facts that are now readiness preconditions (hands, tripod) were rewritten to the owned-state model; assertions that need an attack with a worn, host-mounted, size-less or homebrew weapon became refusal assertions with the live positives suspended in the debt manifest (`EQ-003/worn-weapon-attack-execution`, `DATA-GAP/retrosaber-canonical-size`, `DOMAIN/homebrew-weapon-certification`).
* Validation results: see the final report (full offline sweep compared by exact test identity against the five known force-power failures).

## 5. Unresolved domain-design / data issues exposed by the gate (reported, no bypass added)
1. **Homebrew / legacy weapons** without a certified canonical identity can never be READIED and are now refused at attack execution. A certification route is an open design question.
2. **Worn weapons** (Combat Gloves, Shockboxing Gloves, Stunning Gauntlet, Wrist Blaster, Wrist Rocket Launcher, Concealed Dart Launcher, Sith Lanvarok) cannot attack until worn-equipment certification (EQ-003). Disarm/drop protection of gloves and gauntlets is likewise withheld.
3. **Host-mounted equipment** (e.g. a micro-grenade launcher mounted on a rifle) is indeterminate and refused.
4. **Retrosaber** has no canonical size in the registry (`baseSize: null`) so it can never be READIED — a data gap, not a printed-rule question.
5. **Heavy Blaster Cannon** has no READIED configuration for a Medium wielder (tripod or not).
6. Census over the 203 canonical identities for a Medium Human: 192 READIED-capable, 2 only in a tripod configuration, 9 not at all (Retrosaber, 3 worn gloves/gauntlet, 3 wrist/dart, Sith Lanvarok, Heavy Blaster Cannon).
7. NPC statblock flat-attack weapons are subject to the same gate; droids have no verifiable READIED weapon until the droid refactor.

## 6. Not started / not changed
WP3-B, WP6–WP9, droid refactor, mounted/worn certification, the group/worn/mount models, any EQ-001 action-cost rule, automatic hand selection, schema changes, PR merge.
