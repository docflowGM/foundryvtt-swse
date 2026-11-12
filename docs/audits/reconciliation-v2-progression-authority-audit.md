# Reconciliation V2 — Progression Authority Audit (addendum)

Question: why does reconciliation independently reconstruct and match entitlements instead of trusting verified progression-finalization evidence, and how should it consume that evidence? Evidence tags: **[S]** static, **[T]** executed test. Date 2026-11-12.

## 1. What the finalizer already records (audited)

| Authority | Where | What it provides | Limitation found |
|---|---|---|---|
| `buildLevelUpEntitlementManifest()` | `engine/progression/utils/levelup-entitlement-manifest.js:358` | What THIS level-up is entitled to grant (class, class level, character level, choices) | Per transaction; stored only as `flags.swse.levelUpEntitlementManifest` (overwritten each level) [S] |
| `buildLevelUpFinalizationReceipt()` | `levelup-finalization-audit.js:289` | Required choices and selections for the level-up | (a) latest level only — one flag, replaced by the next level-up; (b) `selections.*` are **names**, not item-instance identities; (c) written inside the mutation plan (`progression-finalizer.js:1824`) **before** the post-apply audit runs, so its existence does not prove the audit passed; (d) none for chargen; (e) not produced for recovery (reconcile) sessions [S] |
| `auditLevelUpActorAfterFinalization()` | same file, `:~299` | Verifies class level materialized and every selected item exists | Runs only for level-up, not chargen or reconcile sessions (`progression-finalizer.js:447`); its result is returned to the caller but **never persisted** [S] |
| `FeatTalentPlanBuilder` | `shell/mutation/feat-talent-plan-builder.js:159-205` | Stamps each created item with `sourceSession`, `selectionKey`, `selectionId`, `selectionInstanceKey`, `slotType`, `slotKey`, `stepId`, `classId`, `className`, `classLevel`, `characterLevel` | The class/level/character-level fields come from the selection entry; ordinary (non-recovery) steps do not set them — only reconciliation-context descriptors do (`feat-step.js:1119-1128`, `talent-step.js:1796-1802`; no class/level on the ordinary descriptors in `active-step-computer.js`) [S] |
| `system.progression.classLevelHistory` | `progression-finalizer.js:1315` | Class advancement history | Class-level only; no item linkage [S] |

Consequence: the evidence that *does* persist durably per item (`sourceSession`, `slotType`) is enough to know an item came from progression, but often not **which class slot** it filled. The old matcher therefore could not attach a legitimately selected class talent to its slot on a multiclass actor and, before Reconciliation V2, labelled it "extra" (Phase 0 case C7 [T]; the same mechanism the owner described). Phase 2 already demoted such items to non-alerting `unverifiable`; this addendum removes the root cause for **future** transactions.

## 2. Contract added (thin, read-only, no new rules engine)

`scripts/engine/progression/utils/progression-evidence.js`

* **Write side (finalizer, one place):** `ProgressionFinalizer._certifyProgressionSession()` runs **after** `applyMutationPlan` and **after** the level-up post-apply audit. It builds `swse-progression-certification` via `buildProgressionCertification()` from (a) the existing manifest (class, class level, character level) and (b) the items actually created for this `sessionId` (item-instance ids). It persists through the actor mutation authority (`flags.swse.progressionCertifications`, append-only per session, bounded to 64). Outcomes: `certified` (audit ok) or `audit-failed`. It is best-effort: a write failure is logged and never fails or rolls back the committed transaction.
* **Read side:** `getVerifiedHistory(actor)` → `{trusted, untrusted}` (only `outcome:'certified'` **and** `audit.ok === true` is trusted); `getAcquisitionEvidence(actor, item)` → `certified | stamped | none` with the entitlement context; `checkCertificationConsistency(actor, classLevels)` → `certified-item-removed`, `certified-class-level-lost`, `certified-character-level-lost`; `buildEvidenceIndex(actor)` for the reconciler.
* Entitlement *rules* stay where they are: `ClassModel` (what a class grants), the manifest (what a transaction owed), the reconciler (current slots). No second entitlement calculator was added.

## 3. How reconciliation uses it (`progression-reconciler.js`)

1. A **certified** item is placed in the pool its certification names and matched on the certified (class, class level) or character level — exactly, before any heuristic; certified grants are processed first so they cannot be displaced by uncertified items.
2. A certified grant that fits no current slot is **never** "overfilled/extra". It is recorded as `certifiedUnmatched` and surfaces only as a GM diagnostic (`certified-grant-unmatched`).
3. Consistency: an awarded item that was **deleted** leaves its slot **open** (a real missing choice) even where a cadence ruling is pending (RECON-001…003), because the certified manifest proves the entitlement existed; a lost class/character level is a GM diagnostic (`certified-class-level-lost`), not a player accusation.
4. `audit-failed`, malformed, or forged (`outcome:'certified'` without `audit.ok`) records are **untrusted**: their items fall back to "stamped" (an evidence gap), and a GM diagnostic `progression-record-untrusted` is raised.
5. Items with no certification (everything created before this change, manual/GM adds, imports) are **evidence gaps**: counted, listed informationally in the overlay, never a violation. No migration, no retroactive certification.

## 4. Distinctions now made

| Situation | Result |
|---|---|
| Certified item, entitlement matched | satisfied (`evidence: certified`) |
| Certified item, no current matching slot | legal; GM diagnostic only |
| Certified item removed afterwards | missing (player-actionable) + note |
| Class/character level lost after certification | GM diagnostic |
| Stamped but uncertified / manual / pre-feature | evidence gap (unverifiable), never extra |
| Explicit-provenance item beyond entitlements | informational `extra` count, never alerts |
| Failed/indeterminate transaction | untrusted record + GM diagnostic |

## 5. Tests (executed)

`tests/progression-evidence-reconciliation.test.mjs` (12 checks): certification binds item instances to manifest context; **regression — a legitimately generated and leveled Soldier 2 / Scout 1 character yields zero false extra feats/talents and every grant satisfied, including after reopening (new reconciler and memoized path)**; same actor without certifications → gap not accusation; audit-failed and forged records untrusted; deleted certified item → missing; class-level loss → GM-only; hand-added feat → unattributed; append idempotent and bounded; finalizer ordering (certify after apply and after audit) and containment of write failure, including an end-to-end call of the real `_certifyProgressionSession` with a stub engine.

## 6. Residuals / not done

* `finalizeSingleStep` (single-step domains such as Store droid construction) does not certify; it does not grant class feats/talents.
* Certification covers feats and talents only. Force powers/secrets/techniques, medical secrets, maneuvers, and Officer Share Talent keep type-count matching.
* The existing receipt is unchanged (kept for current consumers such as `force-knowledge.js`); it is no longer relied on by reconciliation.
* In-Foundry verification [F]: the certification write path through the real `ActorEngine.updateActor` (guard keys, hooks), and that ordinary level-ups actually produce the item flags assumed above.
* Items certified at chargen use the actor's `system.class` identity for class grants (classLevel 1); a chargen class not yet stored there yields no class context and falls back to heuristics.
