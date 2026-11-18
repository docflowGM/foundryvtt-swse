# Checkpoint 03B — Implementation Report (Force Point authorization and transactions)

**Date:** 2026-11-18
**Policy:** `cross-book-certification-checkpoint-03b-fp-policy.md/.json`
**Status:** NOT merge-ready and NOT Foundry-certified. Offline-tested only.

## Architecture (unchanged principles)
`ForcePointsService.authorizeSpend` is the only policy owner (pure). `ActorEngine.spendForcePoints / rollbackForcePointSpend / finalizeForcePointSpend` are the only mutators and receipt owners. No second wallet, shim or migration.

## Review of the inherited branch (31 commits ahead of 1a61f8f)
Independent review against the policy and full-suite comparison found:

| # | Finding | Severity | Resolution |
|---|---|---|---|
| R1 | About 28 talent/feat/power callers invoked `spendForcePoints(actor, 1)`. The new service refuses unclassified uses, so every Force-Point-costing option threw. | P0 regression | New use kind `ability-option` (identified source required); all callers cut over; static guard test. |
| R2 | Death rescue had a consumer but no producer of the required `forceDeathRescueEvent` receipt; rescue was dead. | P0 regression | The damage owner (`ActorEngine._maybeResolveForcePointRescue`) persists a single-use event receipt, spends typed `avoid-death`, finalizes, then consumes the receipt. |
| R3 | `rollbackForcePointSpend` refused when the normal pool had been refilled, leaving a `committed` receipt that still consumed the round slot for a cancelled use. | P1 | Restores only headroom below max, always closes the receipt. Bonus entries are never converted to normal points or the reverse. |
| R4 | Unverified override flags (`allowOncePerRoundOverride`, `ignoreOnePerTurn`) were passed to a mutator that ignored them. | P1 | Removed; they grant nothing. Exceptions deferred (FP-RD-004). |
| R5 | `ForcePointsUtil.avoidDeath` (no callers, no lethal-event proof) used the unclassified path. | P2 | Deprecated and refuses (category E macro global; deletion awaits owner policy). |
| R6 | Two stale tests encoded the old contract: `roll-expression-transform-authority` (source string), `equipment-e4c1-wp5-c3-trust-boundaries` (mock lacked receipts and exact rollback); plus three tests matching the two-argument call string. | tests | Updated to the new contract; the mock now models receipts and exact-source rollback. |

## Rules deferred (see `docs/audits/swse-rules-decisions-pending.md`, FP-RD-001 to FP-RD-005)
FP-RD-001 restricted JATM Block/Deflect points and round-limit exemptions; FP-RD-002 Guardian Spirit entry; FP-RD-003 per-ability timing for FP options; FP-RD-004 Djem So and Greater Focused Force Talisman exemptions; FP-RD-005 whether the death-avoidance reaction counts toward the round limit (implemented as counted per the 03B policy default).

## Test evidence
Run with `node tests/<file>` (no package.json; one process per file), full `tests/*.test.mjs` sweep, 744 files, before/after on the audit baseline `1a61f8f`:
- Baseline failures: 5 (all Force-power-track, documented as known exclusions in `tools/run-rolling-tests.mjs`).
- Inherited branch: 7 failures (the 5 + the 2 stale tests above).
- This batch: 5 failures (the same 5 baseline failures). `rolling-ci-support-check` hit the 120 s harness timeout once under 8-way parallel load and passes alone.
- New: `tests/force-v2-03b-consumer-cutover.test.mjs` (7 groups, including an end-to-end run of the real rescue method); the existing 13-group 03B behavior suite, transaction-integrity and lifecycle tests pass.
- `validate-partials`, `validate-data`, `system.json` parse: pass.

## Not certified
Foundry v13 runtime; two-client races (the per-actor queue serializes one client only); reaction timing in live combat; Force Readiness feat identity is matched by a hard-coded canonicalId/slug that was not re-verified; the receipt ledger is unbounded (needs a retention rule that preserves replay protection).

## Recommendations for 03C
1. Owner rulings on FP-RD-001..005, then implement the exemptions through typed entitlement receipts.
2. Compensation for `ability-option` callers whose effect can fail after payment (today they spend and apply with no rollback, as before the branch).
3. Bounded ledger retention and a cross-client concurrency design validated in live Foundry.
4. Route `force-point-feat-actions` / `destiny-effects` gain paths through a typed gain receipt if they must interact with the ledger.


## Update 2 — after independent review of PR #1165 (2026-11-18)

Merged `origin/main` (7 commits; only conflict was the append-only decisions ledger, resolved by keeping both sides).

| Item | Result |
| --- | --- |
| FP-RD-005 | Implemented. `avoid-death` bypasses the prior-counted-spend check, remains a counted spend; both orders tested. |
| Rescue ordering (P0) | Fixed. The rescue leaves the receipt `committed`; `applyDamage` finalizes it only after the HP/condition write, compensates on a rejected write, and classifies applied-then-threw by reading actor state (`_settleForcePointRescue`). |
| FP-RD-003 | Implemented as a gate: typed `ABILITY_OPTION_CONTRACTS` (empty) or a live-verified GM. **Behavior change:** until contracts are written, players cannot automate the ~28 ability FP options; GMs can. Caller-supplied adjudication booleans are ignored. |
| FP-RD-004 | Djem So counts against the round cap; GM-adjudicated only (no hit-event proof). Talisman exemption not implemented (no worn-talisman data). |
| FP-RD-001 / 002 | Rulings recorded; not implemented (blocked on a reaction-event producer; a day-boundary authority, FP-RD-006). Restricted entries stay refused. |
| `avoidDeath` | Deleted (no callers in scripts/templates/tests). |
| Receipt retention | Bounded: settled receipts beyond the newest 200 are dropped; committed receipts are never dropped. |

Still not certified: Foundry v13 runtime; cross-client concurrency; Force Readiness feat identity (hard-coded id); per-ability contracts.


## Update 3 — Block/Deflect events and JATM regimen entitlements (2026-11-18)

Implemented (offline-tested only): authoritative attack events from `attacks.js`; verification inside `ReactionEngine` and again inside `ForcePointsService.authorizeSpend`; registry Block/Deflect handlers wired to `promptBlock/promptDeflect`; direct reaction FP debits removed; typed regimen entitlements (Sparring Practice, Training Remote, Vo'ren's Third Cadence DC33) with campaign-time lifecycle, typed temporary points, non-counting and off-turn rules; Core p.41 per-round Block/Deflect cap removed. New suites: `force-v2-03b-block-deflect-events` (8 groups) and `force-v2-03b-regimen-entitlements` (12 groups).

Open: FP-RD-007 (temporary points counting); adjacent-ally paid Block/Deflect (errata p.41) needs a verified adjacency event; player-owned `ability-option` contracts (per-ability batches) not started; Guardian Spirit (FP-RD-002/006) not started; Foundry v13 runtime, permissions and two-client races untested; the event id reaching the real chat card dataset is unconfirmed; `rolling-ci-support-check` takes ~90 s and times out at 120 s under 8-way parallel load.
