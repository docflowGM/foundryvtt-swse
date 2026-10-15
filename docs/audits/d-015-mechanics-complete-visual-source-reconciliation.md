# D-015 / Q-001, Q-002, Q-025 — Complete Mechanics and upgrade-installation visual source reconciliation

**Status: DIRECT-BOOK-PAGE RESEARCH EVIDENCE; proposed for independent source review. Not a repository component `SOURCE_VERIFIED` status, register resolution, partial lift, or executable contract.**
**Date:** 2026-10-15. **Repository reference baseline:** `main` at `6ecbed3efcb020ce2b23963c2f207014ca32cfad` (PR #1048 merged). This document **supplements**, and does not rewrite, `docs/audits/d-015-mechanics-requirements-source-examination.md` and `docs/audits/d-001-install-remove-pdf-verification.md`.

## 1. Direct evidence and reproducibility

Visually examined *Star Wars Saga Edition Core Rulebook*, printed **pp. 60, 68, 69 and 70**, and *Scum and Villainy*, printed **pp. 37–41**, from Project Owner-provided **scanned PDFs**, not text-search/OCR. All inspected printed page numbers agree with **zero-based PDF page indices** for these particular scans. Each page was rasterized with PyMuPDF using a 1.65x scaling matrix and read in the resulting image. No copyrighted page image is added to the repository.

| Item | SHA-256 (uploaded scan / rendered evidence) |
|---|---|
| Uploaded Core Rulebook PDF | `509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9` |
| Uploaded Scum and Villainy PDF | `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399` |
| Rendered Core p. 60 | `9a4d34e3a1e55eb43adae7e0778a75676ddacdae9c9383b8bbaff4f115b01eef` |
| Rendered Core p. 68 | `f27815f03c42dd15fedadb930e090a38a82dacdae32041b56b3a43ec26194e26` |
| **Rendered Core p. 69 (the historical missing image)** | `89b414173acd849281bc1caf08de318fc3ff87e98a8a6c8d826fe9d1b4816fb1` |
| Rendered Core p. 70 | `d1af33ade454037b05c29cfd7e521ea22253ed56d232b89d0a2706f0d6a29333` |
| Rendered S&V p. 39 | `97dfd1a4c4ab2219cd3e24d10d09e0bf04aa5a9c618532332ceea5beb2c4d270` |

Note: pixel hashes identify the actual local rendering used; a different renderer version or pixel matrix can produce a different PNG hash while displaying the same printed page. The PDFs remain the primary published-page evidence. The independently published books can be checked by book/printed page/heading without these files.

## 2. Q-001 — What printed Core Mechanics pp. 68–70 actually say

**Core p. 68, Mechanics (Int):** The skill is explicitly **Trained Only**. `Disable Device` requires a **security kit**. The opening skill summary lists disabling traps/devices, explosives, malfunctioning devices, and droid modification/repair, not the installation of equipment upgrades.

**Core p. 69 — direct visual gap now filled:** Continues `Disable Device` and details `Handle Explosives`, `Set Detonator`, `Place Explosive Device`, and `Disarm Explosive Device` (the latter requires a **security kit**). The entire printed page was visually inspected, not inferred from OCR. **No procedure or tool requirement for installing/removing *Scum and Villainy* equipment upgrades occurs there.**

**Core p. 70:** The uses include `Jury-Rig` (a tool kit gives an **optional** +5 equipment bonus), `Modify Droid` (**tool kit required**), `Recharge Shields`, `Regulate Power`, and `Repair` (**tool kit required**). `Repair` encompasses a damaged/disabled droid or object; `Repair Object` is a specific application of that `Repair` rule, not a standalone equipment-upgrade installation procedure. The `Retry` paragraph generally permits another Mechanics check unless that use has particular failure consequences. The `Special` paragraph allows taking 10 or taking 20 on a Mechanics check **in general**, except that jury-rig repairs specifically cannot take 20.

**Conclusion for Q-001:** The missing page 69 is resolved at **direct-published-page research** level. None of pp. 68–70 creates a separate equipment-upgrade installation use, or makes the `Repair` tool-kit requirement universal for all Mechanics checks. This is evidence to propose reviewed completion of D-015, **not a direct blocker lift**.

## 3. Q-002 — What S&V prints about the installation check

The equipment-upgrade chapter's printed pp. **37–41** were reviewed together. Printed **p. 39**, `Installing Upgrades` and **Table 2-2: Upgrade Installation**, expressly give a **Mechanics check** against the listed DC after the allotted time. The same page defines consequences of success, failure, retries and removal.

- **Training:** no explicit new training waiver or alternate skill is printed. The required check remains **Mechanics**, so Core's Trained Only qualification applies to the person making it.
- **Tool kit:** no general tool-kit requirement for this Table 2-2 check is printed in pp. 37–41. The specific Core repair/droid tool-kit requirements govern those named uses, not the separate S&V installation procedure.
- **Workshop:** p. 39's “overheated workshop” is narrative context, **not** a separately stated workshop prerequisite, equipment package, facility cost or mandatory workshop location.
- **Other requirements:** source-book equipment, host, license or class-specific restrictions may impose their own requirements; **absence of a universal kit/workshop requirement is not a declaration that no special upgrade ever needs one.**
- **Removal:** p. 39's removal procedure is the same-time Mechanics check, DC lower by 5; failure leaves the item deactivated but not removed, while failed expedited removal destroys it. The same general Trained Only rule applies to this Mechanics check.

**Conclusion for Q-002:** There is **no printed generic Table 2-2 tool-kit or workshop prerequisite** in the inspected passages. Do not invent one; do not waive separately printed prerequisites for named upgrades.

## 4. Q-025 — Reconcile take 10 / take 20 without inventing exceptions

| Check | Source and governing condition | Result for Table 2-2 |
|---|---|---|
| **Take 10: Core p. 60** | Available when the skill-user is **not rushed, threatened or distracted**. The page also says untrained use normally cannot take 10. | **Conditionally permitted** for a trained Mechanics user when those conditions are established. Not automatically available in every installation scene. |
| **Take 10: Core p. 70** | Mechanics `Special` expressly allows take 10 (generally). | Consistent with p. 60; no Table 2-2 specific prohibition was found. |
| **Take 20: Core p. 60** | Requires ample time and **no penalty for failure**; means repeated attempted checks, requiring twenty times the normal duration. | The S&V check does **not** meet the no-penalty condition because a failed attempt leaves a nonfunctioning upgrade and incurs a retry time/cost consequence. **Do not offer take 20 for this procedure.** |
| **Take 20: Core p. 70** | Mechanics `Special` says take 20 is generally possible; jury-rigging specifically forbids it. | That general permission does **not state** that Mechanics ignores Core p. 60's no-failure-penalty condition. The jury-rig prohibition is an example of a prohibited Mechanics activity, not a universal waiver for others. |
| **Removal take 20: S&V p. 39** | An ordinary removal failure causes **deactivation**, while expedited failure causes **destruction**. | Taking 20 is also unsuitable for these removal checks because failure consequences are expressly printed. |
| **Removal take 10** | Core p. 60 circumstances apply; S&V p. 39 does not separately ban it. | Conditionally available if the actual scene qualifies. Do not infer eligibility from the table's time alone. |
| **Tech Specialist feat (separate procedure)** | *Starships of the Galaxy* p. 21 expressly disallows take 10 and take 20 for **its feat-modification check**. | **Not interchangeable** with Table 2-2. Its explicit ban governs Tech Specialist, not every S&V upgrade. |

### Source-versus-interpretation caution

The conclusion about taking 20 is a **source-rule reconciliation** (Core p. 60 general precondition applied to the explicit S&V p. 39 negative consequence), **not** a new owner house rule or a blanket claim that no Mechanics check can take 20. The source's cost **basis** remains unspecified; the owner's Q-021 policy explicitly keeps that amount subject to GM adjudication. A known failure consequence and retry delay exist even though a universal monetary base does not.

If a future independent reviewer finds Core p. 70 intended to override p. 60's failure-penalty restriction **for this exact use**, escalate the specific textual conflict through the normal source/owner process rather than silently changing the planner.

## 5. Relationship to the six approved owner policies (PR #1047, draft)

Q-021 (GM adjudicates an unprinted attempt/retry cost), Q-022 (no expedited removal below 10 minutes), Q-023 (deactivated slot stays occupied, effects unresolved), Q-024 (record failed attempt, no automatically functioning installation), Q-026 (GM can price otherwise unpriced legitimate acquisition/modification) and Q-029 (audited GM outcomes without automatic effects) remain **separate owner-policy decisions**. This visual source check **does not** resolve their mechanical design or authorize executor behavior.

### Proposed eventual G6 check-engine tests (not executed)

1. Only trusted **Mechanics-trained** actors may use a normal upgrade-install/remove Mechanics check; untrained `Aid Another` may be a distinct assisted-check pathway if independently certified from errata, **never a way to become the installer**.
2. Tool-kit requirement is **not forced universally** for Table 2-2. A printed accessory/host-specific requirement is respected.
3. Taking 10 succeeds only when the source-defined no-rush/no-threat/no-distraction conditions are proven or the GM records the relevant circumstance; do not let a client simply assert `take10Allowed=true`.
4. Taking 20 is **not offered** for S&V Table 2-2 installation/removal because failures have printed consequences. Conversely, don't rewrite the Core Mechanics `Special` entry to prohibit taking 20 on otherwise safe checks.
5. Tech Specialist check `take10/take20` stays categorically disallowed under the *Starships* feat procedure.
6. Source check eligibility does **not** confer `runtimeSelectable`, change pricing, or lift any of D-014, D-015, D-013, `EXECUTOR_NOT_CERTIFIED`; Q-033 exact transactional rollback still blocks G6.

## 5A. Owner-directed optional GM house rules (separate from source findings)

On 2026-10-15, the Project Owner requested a **GM-controlled approval/house-rules route** for taking 10 or 20 on ordinary equipment-upgrade installation. The owner also expressed that optional toolkit and workshop bonuses should be subject to GM fiat rather than assumed printed prerequisites or fixed benefits. The exact policy and open design details are recorded in `docs/audits/modification-v2-gm-installation-check-houserules-owner-direction-2026-10-15.md`.

**This does not change the source conclusions above.** Under the ordinary printed rules, take 10 is conditionally permissible, take 20 is ineligible when installation failure has consequences, and no generic tool-kit/workshop bonus or requirement is printed. A GM who approves take 20 nevertheless is choosing an **explicit house-rule exception**, not certifying a published rule or erasing the printed cost/time/failure consequences. Likewise, a GM-added toolkit or workshop bonus has **no default printed numeric value**. These optional policy controls and the GM audit surface do not lift D-014/D-015, enable the executor or permit any unsupported effect.

## 6. Repository disposition

- **What this enables:** An independent reviewer can now cite and inspect **Core p. 69 directly** instead of relying on the prior OCR-limited D-015 note. The findings address the **evidence side** of D-015 and Q-025.
- **What it does not do:** This file adds no `Source examination log`, `Blocker lifted`, `Partial lift`, ledger scope, generator exception, specification record, sourcebook errata adoption, or versioned registry change. D-015 remains open pending the prescribed independently reviewed change.
- **Next acceptance PR:** Propose a scope-pinned, independently reviewed D-015 evidence and blocker-resolution record for the **76 governed typed definitions**, and separately verify G6 check mechanics before anything is selectable. Its acceptance still does **not** release D-014 or certify host prerequisites, effects, prices, Foundry runtime or transaction atomicity.

**No gameplay effect, source-status promotion, rules-register mutation, or merge authorization accompanies this document.**
