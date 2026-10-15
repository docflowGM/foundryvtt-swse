# SWSE V2 Modification System — Owner Decision Record (2026-10-15)

**Authority:** Explicit Project Owner approval in the SWSE V2 owner-decision conversation, 2026-10-15.
**Classification:** `OWNER_POLICY_APPROVED` for Q-021, Q-022, Q-023, Q-024, Q-026 and Q-029 only.
**Scope:** Documentation/decision authority. **No register entry or blocker is lifted; no registry, ledger, specification, generator, runtime, executor, or gameplay change is authorized.** In particular, D-014 and D-006 remain open until separate, source-aware certification and reviewed changes occur.

## Owner approval

> I approve the six recommended owner policies for Q-021, Q-022, Q-023, Q-024, Q-026 and Q-029. Record these as owner decisions, without lifting blockers or authorizing implementation.

The approval responds to the six recommendations set out in the preceding owner-review response. This record preserves their approved substance; these are owner policies for gaps in the rules, **not assertions that a published book contains them**.

## Approved decisions

| ID | Approved owner policy | Explicit limits |
|---|---|---|
| **Q-021** — Installation attempt / retry pricing | Do **not** invent a universal base monetary cost for installation attempts, retries, or scratch-built attempts. When the published rule leaves the cost basis undefined, require GM adjudication of the relevant price or cost. | The printed multipliers remain source facts; no automatic amount, deduction, or blocker lift is authorized. Unresolved costs are not zero. |
| **Q-022** — Expedited removal minimum | Expedited removal is **unavailable when the printed removal time is already the shortest increment (10 minutes)**. | Do not create an unsupported shorter increment. Other removal requirements and failure consequences remain subject to certification. |
| **Q-023** — Deactivated upgrade | A deactivated or failed-removal upgrade **continues occupying its installed slot** until removal succeeds or the upgrade is destroyed. Effect handling remains unresolved and is subject to GM adjudication. | Do not automatically release a slot or silently change/suppress effects on the basis of an uncertified mechanic. The owner has **not** specified a universal effect-state rule. |
| **Q-024** — Failed installation | Record a failed attempt as an outcome, but **do not automatically create a functioning installed-upgrade instance**. | The physical/malfunctioning state beyond the recorded failure remains for GM adjudication; this is not a new general published installation-failure rule. |
| **Q-026** — Unpriced modifications | Where a legitimate acquisition or modification requires a price and no published price exists, allow a **GM-determined price** rather than treating the unknown amount as zero. | This is not a blanket authorization to sell feat-, destiny-, or talent-granted properties as ordinary upgrades. Canonical host, acquisition, eligibility and availability restrictions remain binding; pricing does not certify installation. |
| **Q-029** — Deferred-mechanic manual outcomes | Permit an **audited GM-entered manual outcome** for deferred mechanics, with **no automatic uncertified rules effect**. | A GM entry is an adjudication record, not source certification, general blocker override, authority bypass, or executor permission. Transaction atomicity and GM permission checks remain required for any later implementation. |

## Interpretation and engineering boundary

1. The six **policy questions are decided**; the associated **mechanics, components, or blocking ledger entries are not thereby certified**. A future PR must separately establish the component-level evidence, implementation design, tests, and authorized blocker lift.
2. Q-023 deliberately does **not** define what bonus a deactivated upgrade should provide. Q-024 does **not** invent a malfunctioning installed state or its effects. Q-021 does **not** choose an installation-cost formula.
3. Q-026 respects the existing standing owner decision that an unknown price is never zero. It does not alter the provenance of Componentization or Excellent Kit.
4. Q-029 is an opt-in GM decision trail and must not be represented as an automated canonical mechanic; the future workbench/executor must retain `EXECUTOR_NOT_CERTIFIED` until its independent gate is met.
5. Official errata remains under authentication review (Q-003). Should new authenticated rules materially affect a decision's premise, return for source reconciliation rather than silently replacing this ruling.
6. This record does **not** approve G4–G9 work, G6 transaction execution, a change to immutable registry v1.5, a ledger or rules-register edit, a blocker lift, or a merge.

**Related:** `docs/audits/swse-v2-master-questions-and-decisions.md` (Part 3, Q-021–Q-024, Q-026, Q-029; Part 6 B1/B3/B6). Other owner decisions (including the template retrofit and canonical-only catalog policies documented in PR #1048) remain separate.
