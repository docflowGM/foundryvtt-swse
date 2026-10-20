# TI4-C0 / G11 — Follower rollback verification (checkpoint)

Base: PR #1065 (`audit/ti4c0-g06s1-exact-snapshot`) at the certified head `59fca3035ef7eacbf1795ef269a4faaa298365cc`. Stacked draft PR; earlier branches unmodified.
Evidence level: **L1** (offline, single client, real modules over the Foundry shim). No L2 (cross-client coordination) or L3 (durable recovery/reload) claim. No rules decision was needed.

## 1. Defect (verified on the base head)

`FollowerCreator.updateFollowerFromMutation()` catch block: (a) snapshotted with `follower.toObject(true)` (a legacy snapshot — `SnapshotService` can never report it exact); (b) called `ActorEngine.restoreFromSnapshot()` and **discarded its structured result**; (c) made a **separate** flag write from `buildFlagRestorationPatch(preUpdateFlags, follower.flags)`; (d) logged "Rolled back follower…" whenever neither call threw; (e) returned a bare `false`. A `{success:false}`, inexact, or malformed restore was therefore logged as a rollback, and a partially committed update was indistinguishable from an unchanged follower.

## 2. Source preflight findings

| Question | Finding |
|---|---|
| Snapshot representation | Legacy `toObject(true)`. The certified authority is `SnapshotService.captureExactSnapshot` (schema-v2, in memory, G06-S1). |
| Does `SnapshotService` restore follower flags? | **Yes** — full-actor scope restores flags deletion-aware, excluding only its protected paths (`foundryvtt-swse.snapshots`, `swse.snapshots`, the target-conversion reservation flag). The comment in `FollowerCreator` saying it "does not restore flags" was stale. |
| Separate flag write | **Redundant** for every covered path, and **conflicting** for the protected paths: `buildFlagRestorationPatch` has no knowledge of them and re-writes *every* start-time flag leaf, so it can overwrite a protected flag changed by its own authority (`ally-assignment-service.js` already works around the same helper for the conversion reservation). Removed; flags are restored and verified by the single authority. |
| Scope of `_applyFollowerProgressionMaterial` | Writes only the follower Actor: `_addFeatByName` / `_upsertFixedProfileNaturalWeapons` (follower Items), `_trainSkill` and the language/material `updateActor` calls (follower system/flags). The owner is only read (ids/names for grant metadata). Guarded structurally by a test. World-level side effects of hooks fired by those writes are not observable offline. |
| Post-commit step | The species-materialization hotfix wrapper runs `materializeFollowerSpecies` **after** a successful update, outside this method's try/catch and rollback. Not changed; a failure there is not rolled back (limitation, below). |
| Callers | `FollowerShell._applyFollowerMutation` (`if (!updated)` → generic failure), `updateFollowerForOwnerLevel` (`updated !== true` → `false`; consumed by `updateFollowersForLevelUp`, `AlliesSurfaceController` (ignores result), `ally-assignment-service.applyDefaultFollowerDerivation` (treats `false` as a failed derivation and rolls back its own target transaction)), `follower-orphan-transfer-hotfix.js` and `follower-species-repair-hook.js` (both **ignore** the result), and the hotfix wrapper (forwards `success`). No caller retries the same follower. |

## 3. Change

- **Return contract unchanged** (`true` / `false`). No incompatible migration was needed. Evidence travels in an optional third argument: `updateFollowerFromMutation(follower, mutation, { report })` populates `report.outcome` (`COMMITTED` | `REFUSED` | `FAILED_COMPENSATED` | `INDETERMINATE`), `report.error` (the original error object), `report.rollback` (`{level:'L1', target}`) and `report.partialMutationPossible`.
- `FollowerCreator`: captures with `ActorEngine.captureRecoverySnapshot` (schema-v2 + completeness check; failure ⇒ `REFUSED` before any write); on failure calls `ActorEngine.restoreSnapshotVerified` and reports `FAILED_COMPENSATED` only for verdict `EXACT`, else `INDETERMINATE` (error-level log, no rollback claim). The separate flag write and the now-unused import are removed.
- `ActorEngine`: two small public methods extracted from the certified G06/G06-S1 code — `captureRecoverySnapshot(actor)` (capture + `_validateRecoverySnapshot`, throws if unusable) and `restoreSnapshotVerified(actor, snapshot, source)` (the target leg of `_rollbackTransactionalPlan`, unchanged logic). `_rollbackTransactionalPlan` and `applyMutationPlan` now call them; behaviour is unchanged (G06 40/40, G06-S1 50/50). `SnapshotService` is untouched.
- `FollowerShell._applyFollowerMutation`: passes a report; an `INDETERMINATE` update returns `{success:false, indeterminate:true, partialMutationPossible:true, rollbackOutcome, rollback, error:'… rollback could not be verified … do not apply this update again until the follower has been checked'}`; a compensated/refused failure keeps `error:'Failed to update follower'` plus `rollbackOutcome`.
- `updateFollowerForOwnerLevel(owner, follower, options)` forwards `options`; the hotfix wrapper `patchedUpdateFollowerFromMutation(follower, mutation, ...rest)` forwards the extra argument (without it the report would be dropped).
- Not changed: follower progression rules, owner/follower relationship, the orphan-transfer and repair-hook callers that ignore the result (see limitations), any retry behaviour.

## 4. Tests — `tests/ti4c0-g11-follower-rollback.test.mjs` (21 checks)

Production `updateFollowerFromMutation` / `FollowerShell._applyFollowerMutation` / `updateFollowerForOwnerLevel`; only the materialization stage is injected; real certification and real `SnapshotService`; fake document mutators on a plain-object follower.

**Fail-before** (on the base head): 3 passed, 18 failed. Most fail because `report` does not exist; the behavioural defects shown directly are: the "rolled back" claim is logged when the restore returns `{success:false}` or inexact, and a second flag write exists (`no second flag write` fails). **After:** 21/21.

Coverage: restore `{success:false}`; `{success:true,exact:false}`; restore throws; malformed (×5); `exact:true` without positive verification (the "unverified leg"); genuine exact restore including a flag key the failed update introduced and an added Item; single flag authority and protected flag path left alone; failure before the first mutation; capture refusal with zero writes; original error object preserved (including a first-write failure); unchanged success; unchanged boolean contract with no report argument; no retry (one materialization, one core write, one restore); `FollowerShell` indeterminate vs compensated; `updateFollowerForOwnerLevel` never returns `true` on an indeterminate update; hotfix wrapper forwards the argument; scope guard (materialization never writes the owner or world documents).

Mutation matrix (each applied alone, then reverted; all detected):

| # | Mutation | Result |
|---|---|---|
| 1 | `FollowerCreator` ignores the structured restore result (`verified := true`) | G11: 10 tests fail |
| 2 | `exact:false` accepted as compensation (verdict `EXACT` whenever `success`) | G11: 1 fails; G06: 8 fail |
| 3 | secondary restore error suppressed (`restoreError` not recorded) | G11: 1 fails |
| 4 | an owner write added to `_applyFollowerProgressionMaterial` (unresolved external effect) | G11: 1 fails (scope guard) |
| 5 | `INDETERMINATE` evidence dropped at the `FollowerShell` boundary | G11: 1 fails |
| 6 | hotfix wrapper stops forwarding the report argument | G11: 1 fails |
| 7 | capture refusal bypassed (fall back to `toObject(true)`) | G11: 1 fails |

Mutation 3 stands in for "suppressing a flag-restoration error": there is no separate flag restoration any more, so the secondary error that can now be lost is the restore's own. Mutation 4 is detected by a structural guard on the source, not by a runtime scenario: offline there is no honest way to run a real external effect, so the claim "the follower Actor is the whole scope" rests on that guard plus the source inspection in §2.

"Flag restoration fails after target restore" no longer exists as a case: there is no second write. The single authority's failure modes are covered by the restore-failure cases above.

## 5. Verification

G11 21/21; G06 40/40; G06-S1 50/50; existing follower tests (`follower-mutation-transaction`, `follower-mutation-planning`, `follower-hooks-governed-cleanup`, `follower-deletion-failure-propagation`, `gm-existing-npc-allies-assignment`, `gm-manual-follower-slot`) pass. Rolling suite `Result: 386 passed, 0 failed (of 386 run; 5 excluded as documented pre-existing failures)`; guards 26 of 27 pass locally; `validate-partials`, `system.json` parse and the rolling syntax check (2879 files) pass; `git diff --check` clean. The guard `node tools/migrate-phase-5c-weapon-references.mjs --check` crashes only in a local git worktree (`ENOTDIR … .git/index`) and is verified in exact-head CI, not reported as locally passing.

## 6. Remaining limitations (not certified)

- **L1 only.** Same-client; no CAS. Another client or hook changing the follower between failure and restore is not detected. No cross-client (L2) or durable-recovery (L3) claim; the snapshot is in memory and nothing survives a reload or lost acknowledgement.
- Live Foundry document-model behaviour (prepared vs source `system`, `_stats`, `keepId` for every embedded type, hook side effects of the writes) is not established by the shim.
- `materializeFollowerSpecies` (hotfix wrapper) and any other post-commit step run **outside** this rollback; a failure there is not compensated.
- `follower-orphan-transfer-hotfix.js` and `follower-species-repair-hook.js` ignore the boolean (the orphan transfer proceeds to link the follower to the new owner even after a failed update). Pre-existing; changing them is outside this checkpoint.
- A `REFUSED` or `INDETERMINATE` result is surfaced by `FollowerShell` only; other callers still see a plain `false` (contract preserved). `ally-assignment-service` rolls back its own target on `false`, with its own snapshot, independently of this report.
- G16, other C0 defects, TI4-B/C, receipts and reconciliation are untouched.
