# Architectural decisions register (append-only)

Records decisions that unblock the realignment program. **Append-only:** never edit or delete an entry; record a superseding entry instead. Rules questions (canonical SWSE mechanics) are **not** decided here; they live in `docs/audits/swse-rules-decisions-pending.md`.

Provenance key: **OD** = owner directive (project owner's implementation directive of 2026-11-25, §3A.3 "Architectural authority reconciliation", and the owner standing instructions in [`docs/governance/owner-standing-instructions.md`](../../governance/owner-standing-instructions.md)). Entries marked **ADOPTED (OD)** are implementation policy the owner directed; they change no published SWSE rule.

| ID | Decision | Status | Resolves | Provenance |
|---|---|---|---|---|
| AD-001 | Canonical mechanics come from published SWSE rules and approved owner decisions. Claude implements; it does not adjudicate. | ADOPTED (OD, CLAUDE.md) | A-11 | CLAUDE.md §1, OD §3A.3 |
| AD-002 | Mechanical **calculations** belong to the designated domain engine for that mechanic (one owner per mechanic). Sheets/templates/UI do not own calculations. | ADOPTED (OD) | CR-03 (direction) | OD §3A.3 |
| AD-003 | `ActorEngine` is the actor and owned-item **mutation gate and transactional orchestrator**. It may coordinate damage, condition and Force Point application but must not independently duplicate a domain engine's formula. | ADOPTED (OD) | CR-04 (direction) | OD §3A.3 |
| AD-004 | `TransactionEngine` governs economic movement (credits, purchases, sales, trades). Progression keeps credit staging in draft state until an authorized commit. Party Fund keeps its functionality; its transaction semantics are to be governed, not left as an uncoordinated parallel ledger. | ADOPTED (OD) as direction; Party Fund semantics: **OWNER_DECISION_REQUIRED** | A-10; F-VEH-006, F-PRG-003 | OD §3A.3, 3C.6 |
| AD-005 | `ProgressionShell`/`ProgressionFinalizer` is the commit point for character creation and advancement. | ADOPTED (OD, existing contract) | A-15 | OD §3A.3 |
| AD-006 | `HouseRuleService` governs house-rule interpretation; `SWSEChat` governs gameplay chat output. | ADOPTED (OD, existing contract) | A-05, A-06 | OD §3A.3 |
| AD-007 | Runtime monkey-patching is eliminated progressively by integrating behavior into the owning module; replacement shims are prohibited. | ADOPTED (OD) | CR-07, A-09 | OD §3A.3, Part XVI |
| AD-008 | Persistent flag scope: one canonical namespace is chosen **after** auditing saved-world data; any change ships with a controlled one-time migration. Until then the compatibility redirect stays and consumers are reconciled individually (3B does not perform a repository-wide flag migration). | ADOPTED (OD) as policy; namespace choice: **OWNER_DECISION_REQUIRED** | F-INF-005, F-PAT-005 | OD §3B |
| AD-009 | Approved but unimplemented features (e.g. the GM Datapad generator under `scripts/generation/**`, the vehicle import wizard) are preserved; unreachable is not a deletion authorization. | ADOPTED (OD) | F-GAL-*, F-VEH-001 | OD §3A.3, 3H.5 |
| AD-010 | Contracts `B-*`, `X-*` and Level A invariants remain **PROPOSED** except where an AD entry above adopts them; promotion of any other contract requires an explicit owner ruling recorded here. | ADOPTED (process) | — | CLAUDE.md §9 |

## Explicitly NOT decided (rules or product questions; behavior preserved)

| Item | Findings | Where recorded |
|---|---|---|
| Force Point **maximum** formula and whether `dailyForcePoints` applies | F-FRC-002 | rules-questions-for-register.md; tracker `DEFERRED_RULES_REVIEW` |
| Damage threshold under enhanced massive damage | F-CMB-003 | same |
| Follower defense formulas (CON vs max(STR,CON)) | F-NPC-003 | same |
| Equipment-removal refund policy, droid vs item | F-CUS-002 | same |
| Party Fund transaction semantics; PvP wager escrow rules | F-VEH-006, F-GAM-* | tracker `OWNER_DECISION_REQUIRED` |

## Changelog

- 2026-11-25: AD-001…AD-010 recorded from the owner's implementation directive.
