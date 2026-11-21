# TI-4 Decision Register

**Scope:** transaction-integrity (TI-4) policy decisions. **Append-only:** the original question and the reviewer recommendation are preserved; the approval is recorded beside them. Decision authority: project owner.
**Status vocabulary:** `OWNER_APPROVED` (explicit owner ruling, recorded below), `OWNER_DECISION_REQUIRED`, `DESIGN_OPEN` (approved direction, unresolved design question; no ruling invented).
**What an approval does not do:** none of these decisions authorizes a code change, TI4-A implementation, G06 implementation, D-005 activation, branch integration or a merge. TI4-A requires its own bounded authorization after the contract is certified.

Approval date: 2026-10-20 (owner directive "TI-4 — All six owner decisions approved").

| ID | Domain | Status |
|---|---|---|
| OD-1 | Recovery prerequisites | `OWNER_APPROVED` |
| OD-2 | Outcome vocabulary | `OWNER_APPROVED` |
| OD-3 | Durable receipts | `OWNER_APPROVED` |
| OD-4 | GM reconciliation | `OWNER_APPROVED` (design only) |
| OD-5 | Lightsaber construction | `OWNER_APPROVED` (rules policy, source-supplied by the owner) + `DESIGN_OPEN` (component ownership modelling) |
| Q2 | Sith Alchemy routing | `OWNER_APPROVED` (eventual; verify rules/macros first) |

---

## OD-1 — Recovery prerequisites — `OWNER_APPROVED`

- **Original question (TI-4 Phase 0, contract §10):** extend D1 (refuse without verifiable recovery) to credit adjustments, sales and rollback corrections (gap G07)?
- **Reviewer recommendation (preserved):** risk-based; fail closed for purchases, sales, asset approvals and other multi-resource operations; do not automatically block simple GM credit adjustments or emergency corrections solely for a missing snapshot.
- **Approved policy:** *Risk-based recovery prerequisites.* High-risk, multi-resource transactions must fail closed without adequate recovery. Simple GM credit adjustments may remain available with verified outcomes and explicit uncertainty reporting. **The exception is not extended to any operation that can silently duplicate or lose resources.**
- **Implementation consequences (documentation only; nothing implemented):**
  - G07 is re-scoped: the recovery-required precondition (TI-2 `#establishRecovery`) applies to sales, asset approvals and other multi-resource operations; a simple single-resource GM adjustment may proceed without a snapshot **only** with post-write verification (G08) and an explicit `INDETERMINATE` report on uncertainty.
  - The exact boundary between "simple GM credit adjustment" and "multi-resource/duplicable operation" must be written down as a risk matrix before implementation (this is the earlier Q1 matrix); this register does not draw it. `DESIGN_OPEN` until the matrix is reviewed.
- **Blocked until separately authorized:** every change to `TransactionEngine`.

## OD-2 — Outcome vocabulary — `OWNER_APPROVED`

- **Original question:** adopt the four-state outcome vocabulary as the single reporting standard?
- **Reviewer recommendation (preserved):** four primary states with mandatory qualifiers for incomplete post-commit mechanical work and failed compensation.
- **Approved policy:** adopt the four-state **Mechanical Transaction Contract v1** vocabulary — `REFUSED`, `COMMITTED`, `FAILED_COMPENSATED`, `INDETERMINATE` — with the previously accepted qualifiers: whole-scope compensation (`FAILED_COMPENSATED` only after verified restoration of the entire affected scope; otherwise `INDETERMINATE` with `compensation:'PARTIAL'`) and the mechanically-incomplete post-apply obligation (`postCommit.postApplyIncomplete`, idempotent repair; distinct from presentation `warnings`).
- **Consequence:** contract §4 is the approved vocabulary. Q-033 names (`PRECONDITION_SNAPSHOT_UNAVAILABLE`, `RECOVERY_INCOMPLETE`) map per contract §4.2.

## OD-3 — Durable receipts — `OWNER_APPROVED`

- **Original question:** where may durable replay receipts live?
- **Reviewer recommendation (preserved):** existing domain-owned records that survive compensation; no universal ledger; separate receipt-storage certification before replay enforcement.
- **Approved policy:** use **existing domain-owned receipt storage, not a new universal ledger.** Each storage implementation requires certification against compensation (survives the operation's own restore), reload (crash/reload), and retention before any durable-replay or L3 claim (contract §5.7 a–c).
- **Consequence:** the Q3 stable client-generated operation id design checkpoint remains a separate checkpoint; its receipt location is constrained by this decision. No receipt store is certified today.

## OD-4 — GM reconciliation — `OWNER_APPROVED` (design only)

- **Original question:** is a GM-only reconcile *operation* (no UI) in scope?
- **Reviewer recommendation (preserved):** authorize designing it; implementation needs its own bounded checkpoint and negative tests.
- **Approved policy:** **authorize design** of GM-only reconciliation operations **without UI.** Production implementation requires a separate bounded authorization and negative tests.
- **Consequence:** `ti4-replay-and-recovery-design.md` §4 is an approved *design direction*, not an implementation authorization. No automatic retry of an indeterminate transaction remains a standing constraint.

## OD-5 — Lightsaber construction — `OWNER_APPROVED` rules policy; component-ownership modelling `DESIGN_OPEN`

- **Original question (G15):** the roll-before-write ordering of `LightsaberConstructionEngine.attemptConstruction` (`lightsaber-construction-engine.js:510-677`): Use-the-Force roll consumed before the combined credit/Item write; component cost deducted only after a successful roll. `OWNER_DECISION_REQUIRED` (rules-adjacent).
- **Reviewer recommendation (preserved):** defer mechanical changes until source rules and roll-before-write behaviour are independently verified.
- **Sources (supplied by the project owner/reviewer; the implementer does not hold the books and has not independently re-read them):**
  - Star Wars Saga Edition Core Rulebook, printed p. 40, "Building a Lightsaber".
  - Jedi Academy Training Manual, printed p. 54, "Advanced Lightsaber Construction", including Table 3-2.
- **Established by those sources (as relayed in the owner directive):**
  1. Eligibility: at least 7 heroic levels, Force Sensitivity, Weapon Proficiency (lightsabers).
  2. Components are acquired **before** construction (1,500 credits standard; 3,000 double-bladed; published modifications may affect it).
  3. 24 uninterrupted hours of construction, undertaken before the skill check.
  4. Use the Force check: standard DC 20; **taking 20 is prohibited**; the Jedi Academy Training Manual gives alternate base DCs and modifiers for specialised sabers, crystals and accessories.
  5. Success completes the lightsaber. Failure requires another 24 hours dismantling and rebuilding the flawed weapon before another check.
  6. Attunement is separate: after construction, the creator may spend a Force Point and a full-round action; normal benefit +1 attack for the creator, subject to published crystal rules.
- **Approved policy (OWNER_APPROVED):** preserve the printed sequence: establish eligibility and obtain components; 24 hours of construction; resolve the Use the Force check with the applicable DC and modifiers; failed check ⇒ the published additional 24-hour rebuild before another check; success ⇒ complete the lightsaber; Force Point attunement separately afterwards. Preserve the prohibition on taking 20. The check occurs after the construction effort and before the completed lightsaber is granted.
- **Engineering policy (stated by the owner as software policy, not a printed rule):** a database/persistence failure is **not** a failed construction check.
  - A successful construction check belongs to one logical construction attempt and **must not be rerolled** because a write failed.
  - A verified failed Item commit permits recovery using the **original successful roll**, with no duplicate charge or grant.
  - An uncertain commit is `INDETERMINATE`; the original roll and transaction evidence are preserved until reconciled.
  - Never silently reroll, recharge, duplicate or grant a weapon after an uncertain commit.
  - Attunement and its Force Point expenditure happen only after successful construction.
- **`DESIGN_OPEN` — source discrepancy requiring future design (no ruling made here):** the present `LightsaberConstructionEngine.attemptConstruction()` rolls first and deducts the component cost only when the roll succeeds, while the Core Rulebook places component acquisition **before** construction. How to model component ownership/expenditure so that it does not charge twice, does not improperly refund purchased materials, and does not alter the published failure consequences is **unresolved**. Options are not enumerated here because no source-supported option set was provided; recommended ruling: none.
- **Implementation impact:** the lightsaber construction path (P38; gaps G15 and the roll-ordering part of the Q-033-style analysis) is blocked from any mechanical change until a rules-preserving design is reviewed. **This decision authorizes the rules policy, not a code change.**
- **Cross-register note:** the project-wide `docs/audits/swse-rules-decisions-pending.md` already carries a lightsaber entry (D-011, accessory allowance and crystal pools), which is a different question. This TI-4 directive limited updates to the TI-4 documents, so **no entry was appended to the project-wide register**; if the owner wants OD-5 mirrored there (CLAUDE.md §5), it is a one-entry append.

## Q2 — Sith Alchemy routing — `OWNER_APPROVED` (eventual)

- **Original question:** route the Sith-Alchemy credit-and-Item mutations (Dark-Side `DarkSidePowers.js:1600-1602,1964-1971`; `force-alchemy-mechanics-service.js:393-446`) through an authoritative transaction boundary?
- **Reviewer recommendation (preserved):** eventually route reachable credit-plus-Item mutations through an authoritative boundary, preserve macro compatibility, verify printed costs before modifying them.
- **Approved policy:** eventually route reachable Sith Alchemy credit-and-Item changes through the appropriate authoritative transaction boundary; **verify published rules and maintain legacy macro compatibility before implementation.**
- **Consequence:** inventory P33 and gap G03 note the direct debits; no costs or rules are modified. Reachability of the Dark-Side enhance path remains `RUNTIME_UNVERIFIED`.

---

## Open items created or retained by these decisions

| ID | Item | Status |
|---|---|---|
| DI-1 | Component ownership/expenditure model for lightsaber construction (OD-5) | `DESIGN_OPEN` — rules-preserving design needed; no change authorized |
| DI-2 | Risk matrix separating simple GM credit adjustments from multi-resource/duplicable operations (OD-1) | `DESIGN_OPEN` |
| DI-3 | Per-domain receipt-storage certifications (OD-3) | not started; none certified |
| DI-4 | GM reconcile operation negative-test design (OD-4) | design authorized; implementation not authorized |
| Q3 | Stable client-generated operation id contract (separate design checkpoint) | pending, constrained by OD-3 |

## Authorization state after this register

All six owner policy decisions are resolved. This clears the owner-decision dependency for TI4-A but **does not authorize it.** Next steps (by the owner/reviewer): certify the updated contract, then issue the bounded TI4-A authorization. G06 remains the recommended first production correction after the contract phase. Not authorized: G06, TI4-A implementation, D-005 activation, branch integration, merges.
