# Transaction Integrity — TI-2 Checkpoint (Commerce, Upgrades, Inventory)

**Branch:** `audit/ti2-commerce-integrity`, created from `main` `4392c90` (unchanged since the start of the engagement). Not merged; merging requires explicit owner authorization. PR #1056, #1057, #1058 and #1059 histories untouched; no equipment-branch code is used or changed here.
**Level of every guarantee below: L1** (one Foundry client, offline harness). Real `TransactionEngine`, `LedgerService`, `UpgradeService`, `StoreEngine` and the `SnapshotManager` wrapper; the shim's `ActorEngine` is replaced by a small *model* of `applyMutationPlan` (applies a plan in the real bucket order, SET then UPDATE, with injectable failures) and snapshots are an in-memory model. Nothing is `FOUNDRY_TESTED`. No L2/L3 claim.
**Scope kept:** no new transaction engine, ledger or orchestrator; no modification runtime, selectability or V2 installer; no rules change (prices, eligibility, slots, effects untouched); legacy installers left in place (D4); vehicle `UpgradeService` branch unchanged (D3).

## 1. Read-only pass (done first)
### 1.1 TX-02 — which legacy "installed upgrade" writers are reachable (static search: imports, `data-action`/templates, dynamic `obj[name]`, globals/macros exposure)
| Writer | Result |
|---|---|
| `UpgradeService.applyUpgrade/removeUpgrade` (Item path, `system.installedUpgrades`) | **ACTIVE** via `CommandBus APPLY_ITEM_UPGRADE` (3 UI surfaces). `removeUpgrade` is a single Item write (no charge) — unchanged. |
| `ItemCustomizationWorkbench._applyCurrentItem`, `TechSpecialistModificationService` | **ACTIVE**, already commit through `TransactionEngine` (now hardened, §3). |
| `lightsaber-construction-engine` | **ACTIVE**, `applyMutationPlan({transactional:true})` (whole-actor, existing; unchanged). |
| `InstallRemoveEngine.applyInstall/applyRemove` | **INACTIVE**: only caller is `CustomizationWorkflow.applyInstall/applyRemove`, which has **no caller** (searched code, templates, `workflow[...]` dynamic access, globals). Re-confirmed; *not* proof against a user macro in a live world. Not deleted, not activated (D4). |
| `ModificationIntentBuilder` | **INACTIVE**: no importer. |
| **`follower-droid-garage-hotfix.js`** | **ACTIVE and previously unlisted.** Registered at init (`runtime-bugfix-hotfixes-init.js`), it **replaced `TransactionEngine.executeAssetCustomizationTransaction` for follower droids with its own commerce implementation**: asset plan applied first, wallet credits written afterwards as an absolute value, snapshot creation optional, restore result ignored. See TI-N9. |

### 1.2 Failure reproductions (fail-before tests on `4392c90`; see §4)
TX-01 (upgrade installed before payment), TX-08a/b/c (no recovery tolerated; restore `false` ignored; balance read before the slow snapshot), TX-10 stock handling, TI-N9 (follower parallel path) — all reproduced offline; none against Foundry.

## 2. Findings and dispositions
| ID | Finding | Class | Disposition |
|---|---|---|---|
| TX-01 | `UpgradeService.applyUpgrade` wrote the Item, then charged | `CONFIRMED_DEFECT` | **Fixed** (§3.1) |
| TX-08a | Transaction continued when the snapshot could not be created | `CONFIRMED_DEFECT` | **Fixed for purchases and customizations** (D1); *scope question Q1* for the other methods |
| TX-08b | `restoreSnapshot()`'s non-throwing `false` ignored; "Rollback successful" logged | `CONFIRMED_DEFECT` (7 sites) | **Fixed at all seven sites** (§3.2) |
| TX-08c | Balance read before the snapshot; success not verified | `CONFIRMED_DEFECT` (narrowed) + `INTENTIONAL_LIMITATION` | **Narrowed and verified** (§3.2); lost update *inside* the write remains a documented limitation |
| TI-N9 | Follower-droid garage patch = parallel commerce implementation (pay-after-write, no recovery) | `CONFIRMED_DEFECT` (parallel authority) | **Fixed**: now delegates to the one authority (§3.4) |
| TX-10a | `StoreEngine.purchase` returned reserved stock after *any* failure | `CONFIRMED_DEFECT` (new, caused by making outcomes truthful) | **Fixed** (§3.3) |
| TX-10b | `purchase()` docstring claimed "ATOMIC… IDEMPOTENT: session-level duplicate guard" — no such guard exists | overclaim | **Comment corrected**; no operation id (open question Q3) |
| TX-10c | `executeCreditTransfer`: debit → credit → compensating refund → snapshot restore; a best-effort saga by design | `INTENTIONAL_LIMITATION` | Restore outcome made honest (logging); result shape unchanged; remains best-effort, **not** atomic |
| TX-10d | `executeAssetApprovalTransaction` check-then-act; approvals addressed by index | `DESIGN_GAP` | **Not changed** (TI-3: approvals by stable id) |
| TI-N3 | Direct credit writers outside the commerce authority | classified, §5 | **Not changed** (owner scope, Q2) |

## 3. Changes
### 3.1 TX-01 — `UpgradeService.applyUpgrade` (standard embedded Item)
The Item change and the charge are **one** `TransactionEngine.executeMutationTransaction` call (context `owned-customization`, the same one the Workbench uses), so they share the lock, the audit ledger, established recovery and verification. **This is not atomic:** a single plan is applied in bucket order (credit SET, then Item UPDATE); a failure between them is *restored* by the engine and reported, not prevented. After success the Item write is **verified** (the upgrade key must be present) — a charged-but-not-installed outcome is thrown as "could not be verified", never returned as success. The previous unreachable world-Item `else` branch is kept unchanged. Droid and vehicle branches are untouched (D3).
### 3.2 TX-08 — `TransactionEngine`
* `#establishRecovery`: a snapshot counts only if it was created **and** is retrievable from the actor afterwards **and** is a full-actor v2 snapshot (the only kind the exact restore can verify). `executeMutationTransaction` and `executeAssetCustomizationTransaction` (purchases/customizations, **D1**) **refuse with an explicit error and change nothing** otherwise (`refused: 'recovery-unavailable'`).
* `#restoreVerified`: a restore is reported only when `SnapshotManager.restoreSnapshot` returned `true`. All seven restore sites (mutation, credit adjustment, credit transfer, asset customization, asset approval, sale, rollback correction) go through it; `false` or a throw yields `{ success:false, rollbackFailed:true, error:'… rollback failed: …' }` and nothing logs "rollback successful". Whole-actor restore is the **existing** mechanism and is *not extended* (it can revert unrelated concurrent changes — TX-07b); only its outcome is now honest.
* Credits: the balance is re-read **after** the snapshot, immediately before the plan is built, and funds are re-validated (`executeMutationTransaction`, `executeAssetCustomizationTransaction`). After the write, the observed balance must equal the planned one; otherwise the result is `{ success:false, indeterminate:true, evidence }` and **no restore is attempted** (a blind whole-actor restore could revert the other writer). **Stated guarantee:** credits remain read-modify-write with no compare-and-swap; a concurrent writer can still win *inside* the write (`INTENTIONAL_LIMITATION`); what is closed is the window across the snapshot and an unverified charge.
### 3.3 TX-10 — `StoreEngine.purchase`
Reserved stock is returned only when the purchase is known not to exist (refused, verified rollback, or a plain failure such as the commerce lock). For `indeterminate` / `rollbackFailed` outcomes the stock is **held** (the items may have been granted; returning it too could double-count) and the unresolved outcome is passed to the caller with `stockHeld: true`. Without this, TX-08's new truthful outcomes would have caused double stock.
### 3.4 TI-N9 — follower-droid garage patch
The patch now only resolves the owner's wallet and delegates to the original `executeAssetCustomizationTransaction` (`{ ...context, actor: walletActor, assetActor }`), which natively supports wallet ≠ asset. Its private implementation, its local snapshot helpers and the now-unused `ActorEngine` import were removed. Behavior change for follower droids: purchases are refused without recovery, the charge precedes the asset write (the engine's order), restore is verified, and the audit record is the engine's richer one.

## 4. Evidence
`tests/ti2-commerce-integrity.test.mjs` (6 checks at the first submission; 10 after the review corrections, §9): §2.1a refused-without-recovery (create throws / snapshot not retrievable / legacy snapshot / zero-cost); §2.1b restore `true`/`false`/throw for purchase and credit adjustment, no false "rollback successful"; §2.1c concurrent grant during the snapshot survives, unverifiable charge → indeterminate with no restore, insufficient funds after re-read; §2.2 upgrade install (single audited plan, failure between SET and UPDATE recovered, failure after UPDATE recovered, recovery failure surfaced, no-recovery refusal, insufficient funds, silent Item no-op detected, double click refused by the lock); §2.3 stock handling for six outcomes; §2.4 droid/vehicle asset and follower droid (patched path), success / refusal / restore / rollbackFailed / balance re-read. **All six sections fail on `4392c90`** (run one at a time against an unmodified `main` worktree) and pass here.
The TI-0 reproductions `repro-tx01`/`repro-tx08` now print *NOT REPRODUCED* for a different reason than a fix of the underlying race: their bare fixture actors cannot produce a retrievable snapshot, so the engine **refuses** them — that shows the refusal, not a resolved lost update.

## 5. TI-N3 classification — direct credit writers (read-only; not changed)
| Site | Kind | Notes |
|---|---|---|
| `talents/DarkSidePowers.js:1601`, `_spendCredits` `:1969` | **debit by a talent action (commerce-like)** | Debits first, then writes the Item; no recovery, absolute write. Rules/commerce scope → **Q2**. |
| `follower-creator.js`, `progression-finalizer.js`, `progression-economy-plan-builder.js`, `summary-step.js` | starting credits / chargen & level-up economy | Part of progression (ProgressionFinalizer, `transactional:true`); TI-3. |
| `progression-event-processor.js:409`, `equipment-engine.js:68` | grants / helper setters | Grants, not commerce. |
| `character-like-sheet.js:5980`, `actor-sheet-base.js:1948` | manual sheet adjustment / reset | User-driven correction; bypasses the audit ledger by design. |
| `droid-modification-factory.js:333`, `vehicle-modification-factory.js:203` | plan builders (credit SET inside a plan) | Applied through the commerce authority via `DroidCustomizationEngine`; not re-audited for the vehicle factory's caller (D3 area). |

## 6. Existing tests changed (reported)
* `transaction-engine-snapshot-restoration-migration.test.mjs`: it documented as outstanding that the engine's restore call sites "never inspect the boolean result" and asserted `>= 5` direct call sites. That migration is done; it now asserts exactly **one** `restoreSnapshot()` call site, inside `#restoreVerified`, and that the site inspects the boolean. No other assertion changed.

## 7. Open questions for the project owner (policy, not rules)
* **Q1 — D1 scope.** D1 covers purchases and customizations. Should the same *refuse-without-recovery* policy apply to credit adjustments (Holonet/wager/GM), sales, rollback corrections, asset approvals and credit transfers? Today those only get the honest-restore fix (§3.2), because refusing them could block gameplay credit movement. *Recommendation: none requested.*
* **Q2 — direct commerce-like writers** (Sith Alchemy credit debits): route through the commerce authority?
* **Q3 — (open since TI-0)** client-generated operation id for purchase retries (UX/commerce).
* D3 (vehicle upgrade charges nothing) remains deferred and untouched.

## 9. Independent-review corrections (TI2-R1, R2, R3) — reviewed head `2dc60c1`
All reproduced against `2dc60c1` (each new section, and each transfer case, fails there when run alone) and fixed on this branch. L1, offline.
### TI2-R1 — upgrade verification inside the transaction
**Defect:** `UpgradeService` verified the Item *after* `executeMutationTransaction` had returned success, so a plan that resolved without persisting the Item left a committed charge and a bare thrown error.
**Fix:** `executeMutationTransaction` takes an optional `verify(actor) → { ok, reason }` that runs **inside** the transaction, after the plan and the credit check, before success is claimed (a throwing verifier is a failed verification). On failure the engine compensates with **one targeted write** — only if the live balance is still exactly the post-charge value (read-compare-restore) — that puts the credits back and marks the audit record `status: 'Compensated'` in the same write, then re-reads to confirm: `{ success:false, verificationFailed:true, compensated:true }`. If the balance changed, the refund write fails, or the refund cannot be confirmed: `{ success:false, verificationFailed:true, indeterminate:true, evidence }` — never retried, **no whole-actor restore** at any point. `UpgradeService` passes the verifier and throws the engine's error; its own post-commit check was removed.
### TI2-R2 — a committed purchase is never undone by a post-commit failure
**Defect:** `StoreEngine.purchase` ran the completion hook (and logging) inside the transaction `try`; a throwing listener reached the outer `catch`, which released the reserved stock and returned `success:false` for a committed purchase.
**Fix:** the moment the engine reports success, `committed` is recorded; the post-commit work (log, hook, payload building) runs in its own `try`, a failure is returned as `presentationError` on the **successful** result (transaction id preserved, stock kept, nothing retried), and the outer `catch` has a guard that reports any other post-commit throw as committed. Audit of the function: the only post-commit work is the log line, the hook and its payload.
**Same defect class found in the engine itself and fixed:** the completion hooks in `TransactionEngine` (`swseCreditAdjustmentComplete`, `swseStoreAssetAcquired`, `swseStoreSaleComplete`, `swseStoreRollbackCorrectionComplete`) sat inside the method's `try`, so a throwing listener would have triggered the **snapshot restore of a committed change**; `swseCreditTransferComplete` would have thrown out of a committed transfer. These now go through one `#emitCommitted` helper and surface `presentationError`. **One deliberate exception:** `swseAssetCustomizationTransactionComplete` keeps its old behavior, because the existing P1-7 *Correction 8* test (`customization-bay-foundation-contract`, `customization-bay-information-hierarchy`) injects its post-commit failure through exactly that hook and pins *failure + restore of both actors*; changing it would mean rewriting that test, which is not mine to do (see **Q4**). A source test pins that this is the only raw hook call and that the exception is documented at its site.
### TI2-R3 — credit-transfer outcomes
`executeCreditTransfer` now returns one of: success; **`compensated`** (the sender's refund was verified, or — existing last resort, not extended — both pre-transfer snapshots were restored and every restore was observed true, `recovery:'snapshot-restore'`); **`rollbackFailed`** (refund failed and the restore returned false / threw / had no snapshot to use) with the ids of every leg, the legs' outcomes and the restore results as `evidence`; or **`indeterminate`** — when the *recipient leg itself* is unresolved the sender is **not** refunded automatically (the recipient may already hold the credits, so a refund could create credits), and when the *refund* is unresolved no whole-actor restore is attempted over an actor whose state is unknown. A debit-leg failure carries that leg's own `rollbackFailed`/`indeterminate`. Nothing is retried. Cases reproduced: recipient leg fails; refund fails; restore `false`; restore throws; no snapshot; recipient leg unresolved; debit leg unresolved; throwing completion hook.
### Evidence
`ti2-commerce-integrity.test.mjs` now has 10 checks (4 new: §2.5–§2.8). All earlier TI-2 checks are unchanged and green.

## 10. Owner questions — status after review
* **Q1 (D1 scope) — proposal only, nothing changed; approval needed per workflow.** Risk-based matrix (impact × resources touched × recoverability):
| Operation | Resources changed | Risk | Today | Proposal (awaiting approval) |
|---|---|---|---|---|
| Purchase, customization (item / asset) | credits + items/asset | high | **fail-closed (D1, done)** | keep |
| Asset approval (droid/vehicle) | owner credits + asset actor | high | honest restore only | fail closed without recovery for **both** actors |
| Credit transfer (incl. Holonet) | two actors' credits | high | honest outcomes (§9) | fail closed without recovery for both actors |
| Sale | credits + item delete | medium | honest restore only | candidate for fail-closed |
| Rollback correction / reconciliation | credits + item removals | medium | honest restore only | candidate (GM tool; review blast radius first) |
| Wager escrow / payout / refund | one actor's credits (game) | low-medium | honest restore only | no refusal; keep verified outcomes |
| GM credit grant/adjustment | one actor's credits | low | honest restore only | **no** refusal (a single-resource grant must not be blocked by snapshot failure) |
* **Q2 (Sith Alchemy) — no code change, no rules change.** Reachability: `DarkSidePowers.createSithAlchemicalWeapon(actor, weapon)` (20% of weapon cost, minimum 2000 credits: debit first, then Item update, direct `ActorEngine.updateActor`) is reachable **only** through the global macro `game.swse.macros.createSithAlchemicalWeapon` (`dark-side-powers-init.js:554/596`); the newer Sith Alchemy workbench path (`sith-talent-actions.js`) is marked "deferred" (`announceSithAlchemyDeferred`). So the live debit is a **macro-only/global legacy utility** (category E: needs the owner's macro-compatibility call before any routing). The published cost and conditions have **not** been verified here (no source access in this task); routing through the commerce authority is deferred until they are.
* **Q4 (new) — presentation failure after an asset customization.** An existing, owner-approved test pins that a throwing `swseAssetCustomizationTransactionComplete` listener makes the customization **fail and restore both actors**. Every other completion hook now leaves the committed change standing and reports `presentationError`. Should asset customization follow the same rule (which requires changing that test's injection point), or keep its pinned behavior? Left unchanged pending your ruling.
* **Q3 (operation ids) — approved as an architectural requirement; not implemented here.** To be designed and certified as a separate replay contract (stable id + payload fingerprint + durable receipt; `purchase()` currently cannot recognize a retry).

## 11. Limits and residual risk
Single-client, offline; Foundry has no compare-and-swap or multi-document atomicity, so recovery is "established, verified, or reported unresolved", never guaranteed. Whole-actor restore can still revert unrelated concurrent changes in the failure window (TX-07b, existing). `TechSpecialistModificationService` reports `paid: result.success` for a failed-check charge, which reads *unpaid* for an `indeterminate` outcome (cosmetic; TI-3). Follower-droid garage behavior is now identical to droid garage but was **not Foundry-tested**.
