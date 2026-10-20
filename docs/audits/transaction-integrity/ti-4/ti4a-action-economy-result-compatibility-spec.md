# TI4-A — X1: Action-Economy Result Compatibility Specification

**Status:** `DESIGN_PROPOSAL` specification. **No action-economy or equipment code is changed.** Evidence read from lineage A `abb81d919`. Where a choice would change when a weapon becomes ready in play, it is stated as an open owner decision, not decided here.

## 1. The question

`EquipmentStateCoordinator` pays an action after the Item write and must decide, from `ActionEconomyConsumption.spend`'s result, whether the transaction is finalized, compensated, or indeterminate. `spend` returns several result shapes that **look alike** but mean different things. The coordinator currently accepts a spend only for `committed:true`, or for `noOp:true` with a reason in a fixed policy set (`equipment-state-coordinator.js:155,513-516`); anything else becomes `INDETERMINATE` and withholds readiness (`:516,523-526`). X1 specifies the taxonomy so that this decision is made on a documented, machine-readable class instead of on incidental fields.

## 2. Observed result shapes (SOURCE_VERIFIED, `action-economy-consumption.js`)

| # | Return | Source | Fields |
|---|---|---|---|
| R1 | persisted spend | `:222-224` (standard), `:193-195` (reaction) | `allowed:true, permitted:true, committed:true, rollback(handle)` |
| R2 | policy no-op, free/passive | `:162` via `noOp` | `allowed:true, committed:false, noOp:true, reason:'free'\|'passive'` |
| R3 | policy no-op, out of combat | `:163` | `…noOp:true, reason:'out-of-combat'` |
| R4 | no-op, authority unavailable | `:166` | `…noOp:true, reason:'economy-modules-unavailable'` |
| R5 | refusal | `:161`, `:181-183`, `:188-191`, `:210-212` | `allowed:false, permitted:false, committed:false` |
| R6 | allowed over-spend, not persisted ("loose") | `:227-229` | `allowed:true, permitted:true, committed:false` — **no `noOp`, no `reason`** |
| R7 | reaction allowed, `spendReaction` missing | `:197` | `allowed:true, permitted:true, committed:false` — no `noOp` |
| R8 | thrown error | any await | exception |

The settings that decide whether R6 is reachable (the enforcement mode) have an unverified runtime default (`RUNTIME_UNVERIFIED`; the fallback at `action-economy-consumption.js:69` is loose).

## 3. Taxonomy (the four classes the spec defines)

| Class | Definition | Shapes | Contract outcome of the spend step |
|---|---|---|---|
| **S1 Verified persisted expenditure** | the economy state was written and the spend is identifiable (history entry carrying the spend id / the caller's `requestId`) | R1 | `COMMITTED` (with a history marker as the receipt) |
| **S2 Legitimate no-op (persistence not required)** | the authority's established policy is that nothing is tracked for this action in this situation | R2, R3 | `COMMITTED` with `spend:'not-required'` (no mechanical effect to verify or roll back) |
| **S3 Allowed-but-unpersisted** | the authority *permitted* the action but wrote nothing, for a reason that is **not** one of the S2 policy reasons | R4 (authority unavailable), R6 (loose over-spend), R7 (reaction store missing) | **not classifiable as success**: these are three different situations sharing one shape (see §4) |
| **S4 Indeterminate expenditure** | the call threw, returned an unrecognized shape, or the marker cannot be read | R8, any unrecognized result | `INDETERMINATE` (never retried automatically) |
| (refusal) | the authority refused | R5 | `REFUSED` → the coordinator compensates the Item write → `FAILED_COMPENSATED` |

## 4. Why S3 must be split

R4, R6 and R7 differ in meaning:

| Shape | What actually happened | What is knowable |
|---|---|---|
| R4 `economy-modules-unavailable` | the persistence/engine modules failed to load; **no action was paid and the system does not know why** | an environmental fault: cannot be treated as policy |
| R6 loose over-spend | the engine computed the cost, found it unaffordable, and the *configured mode* permitted it for table flow without persisting | the permission was deliberate **configuration**, not a fault |
| R7 reaction store missing | `Persistence.spendReaction` is not a function: a capability gap | a fault |

Today only R4 has a `reason`; R6 and R7 carry none, so a consumer cannot distinguish a deliberate loose-mode permission from a fault (G36). The coordinator therefore treats all of S3 as ambiguous (`INDETERMINATE`), which is safe but leaves the Items applied, the journal `INDETERMINATE`, and readiness withheld **with no reconcile operation** (OD-4 designs one, no implementation).

## 5. Specification

1. **Every allowed-but-unpersisted result must carry a machine-readable `reason`** drawn from a closed list, and must not be shaped like S1 or S2 unless it is one. Proposed closed list: `free`, `passive`, `out-of-combat` (S2, policy), `over-spend-permitted` (R6), `economy-modules-unavailable` (R4), `reaction-store-unavailable` (R7). *(Interface proposal only; no code is changed in TI4-A.)*
2. **S1** requires a verifiable receipt: a history entry whose `metadata.requestId` equals the caller's id (the coordinator already reads this marker, `:160-166`); a `committed:true` without a readable marker after an exception is S4.
3. **S2 reasons are a closed set owned by the action-economy authority** (today `free`, `passive`, `out-of-combat`). A consumer must not extend the set.
4. **Readiness acceptance (equipment coordinator)** — what may allow `FINALIZED`:

| Spend class | May equipment readiness be finalized? |
|---|---|
| S1 verified persisted | **Yes** |
| S2 policy no-op (`free`, `passive`, `out-of-combat`) | **Yes** (no expenditure is tracked by design) |
| S3 `economy-modules-unavailable` | **No** → `INDETERMINATE` (a fault, nothing was paid) |
| S3 `reaction-store-unavailable` | **No** → `INDETERMINATE` (a fault) |
| S3 `over-spend-permitted` (loose) | **`OWNER_DECISION_REQUIRED`** — see §6 |
| S4 indeterminate | **No** → `INDETERMINATE` |
| refusal | **No** → compensate → `FAILED_COMPENSATED` (or `INDETERMINATE`/`PARTIAL` if whole-scope compensation cannot be verified) |

5. **Today's behavior is the conservative baseline:** the coordinator already accepts exactly S1 and S2 and treats everything else as ambiguous. The spec **preserves** that and only adds the vocabulary to distinguish S3's members.
6. **Compensation scope.** When the spend step is refused, the Item write is compensated field-by-field (conditional) and the outcome is `FAILED_COMPENSATED` only if every owned path is verified restored; a path changed by someone else is left untouched and the outcome is `INDETERMINATE (compensation:'PARTIAL')` (the coordinator already reports `FAILED_PARTIAL`, `:546-547`).
7. **No automatic retry** of S3/S4. A later reconcile operation (OD-4 design) classifies the unresolved journal entry from the recorded `before`/`after` values and the history marker.

## 6. Open owner decision (not decided here)

**OD-X1-a:** In loose enforcement mode an over-spend is *permitted* by configuration. Should an equipment draw/holster that results in `over-spend-permitted` (a) finalize (treat as S2), or (b) stay `INDETERMINATE` until a GM reconciles (today's behavior)?
- This is a **gameplay-adjacent policy** (when a weapon becomes ready under table-flow play), not only an engineering choice, so it is **not decided** here.
- Evidence for the owner: R6 is reachable only under the loose/no-enforcement configuration; the engine reports the over-spend instead of persisting it "so as not to corrupt the stored turn state" (comment at `:227-228`); no code path currently records that the over-spend was permitted, so a finalize-on-permit design would need a persisted marker (otherwise a replay cannot tell permit from fault).
- Until decided: **(b) remains the specified behavior.**

## 7. Conformance checks (for the later implementation checkpoint)

| ID | Check | Offline? |
|---|---|---|
| X1-1 | every R-shape listed in §2 maps to exactly one class S1–S4/refusal | yes |
| X1-2 | an unrecognized result shape yields `INDETERMINATE` | yes (exists: coordinator tests) |
| X1-3 | a `committed:true` result whose marker cannot be read after a throw is S4 | yes |
| X1-4 | each S3 member yields a distinct `reason` | yes (new, after the interface change) |
| X1-5 | the journal records the spend class (`state: committed\|not-required\|unknown`) | yes (exists) |
| X1-6 | whole-scope compensation verified before `FAILED_COMPENSATED` | yes (exists for owned paths) |

No action-economy code changes are made or authorized by this document.
