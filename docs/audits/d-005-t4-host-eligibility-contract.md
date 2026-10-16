# D-005 T4a — Host-Eligibility Contract (approved principles)

**Status:** documentation only. Working PR #1057, branch `audit/d-005-t2-host-published-facts`.
**Authority:** project owner. Approved by the owner's T4 authorization; engineering details remain under review (see §3).

> **Completeness notice.** The owner's T4 command referred to an attached design file, `d005-t4-host-eligibility-contract-proposal.md`. **That file was not delivered to the execution environment** (the command text carried only a download link; no attachment reached the container). This document therefore records (a) the owner-approved principles and (b) the fixed constraints, both taken verbatim in substance from the T4 command, and (c) cross-references to the T4b census. It does **not** reproduce, paraphrase or reconstruct the proposal's engineering sections. Predicate names, schemas, field mappings, reason codes and per-definition encodings are deliberately **absent** rather than invented. When the proposal file is supplied it is to be appended as a follow-up commit on #1057, with §3 updated to show which of its details the owner has approved.

---

## 1. Approved owner-policy principles

These seven principles are approved. They establish no mechanic, no evaluator and no selectability.

1. Eligibility outcomes remain exactly `legal`, `illegal` and `not_established`.
2. Unknown, untrusted, contradictory or missing information does not establish eligibility. The system fails closed: missing information never automatically means eligible *or* ineligible.
3. A **proven failed requirement** may establish ineligibility.
4. GM review may flag an uncertain case for adjudication but does not automatically override certification and cannot make a case executable.
5. Item requirements (installation), use requirements, payload requirements and effects are **distinct** concerns and must stay separate.
6. Category-level support never proves individual Item eligibility. A supported or conditionally supported domain is not evidence that a given Item satisfies a requirement.
7. This design authorizes no runtime selectability, no executor and no mechanical certification.

## 2. Fixed constraints (restated from existing governance)

* The existing **G3 legality framework remains authoritative** (`modification-legality.js`, `modification-planner.js`): per-Item host eligibility can be established only by a registered, certified evaluator, and a specified host requirement is not an evaluation.
* **Free-text `behavior` must never be parsed as executable rules.** The 35 `PUBLISHED_FACTS` records verify published host rules only.
* **Registry v1.5 remains immutable**, including its domain applicability, stacking policy (`UNVERIFIED`), `maxPerHost` (`null`), `printedTablePage` and `rulesPage` values. The 35 source-verified records cannot override the registry or any existing certification gate.
* The 35 D-005 typed definitions **still lack the canonical domain certification** required for eventual selectability. D-005 source verification is not domain certification.
* **No change to `domainBasisFor()`** is authorized.
* **No `COMPLETE_MECHANIC` specification and no host evaluator implementation is authorized.**
* Source findings are preserved unchanged: 15 parents, 35 typed definitions (15 equipment, 11 weapon, 9 armor), domain verdicts 19 SUPPORTED / 16 CONDITIONALLY SUPPORTED, Extra Power Source explicitly repeatable, Memory Upgrade Advanced replaces (does not stack with) the basic version, all other stacking `NOT SPECIFIED BY SOURCE`. Authoritative text: `docs/audits/d-005-universal-upgrade-host-text-transcription.md`; records: `data/modifications/specification-records-v1.json` (`D005::*`).
* Silverplate's Quick Draw benefit and Spring Loaded's action remain unspecified and are not to be inferred.
* Rules decisions belong to the project owner (`CLAUDE.md`; `docs/audits/swse-rules-decisions-pending.md`). Nothing here resolves a rules question.

## 3. Engineering details — NOT yet approved

The owner approved the *direction* only. The following were to be reviewed as proposals and are **not** approved by this document, and none is specified here:

* exact structured predicate names;
* the item-fact adapter schema;
* the evidence / provenance representation;
* specific producer-field mappings;
* the reason-code vocabulary;
* detailed rules-to-predicate encodings for the 35 typed definitions;
* evaluator registration and certification strategy.

## 4. Non-normative cross-reference to the T4b census

The published host requirements involve the following *kinds* of facts. This table only points at where the census looked; it names no predicate and implies no mapping.

| Parent (typed domains) | Kind of host fact in the source findings | Census section |
| --- | --- | --- |
| Extra Power Source (w/a/e) | host actually uses energy cells or power packs | F1 |
| Memory Upgrade, Advanced (e) | has an Intelligence score; not a droid or converted droid | F2, F3 |
| Spring Loaded (w/e) | held and used in one hand | F4 |
| Dual Gear (e), Secret Compartment, Storage Capacity (w/a/e) | size-category and weight comparisons (added/carried item vs host) | F5, F6 |
| Secret Compartment, Storage Capacity, Dual Gear | containment / combined-item capacity | F7, F10 |
| Recognition System (w/a/e) | function restrictable to an authorized user | F8 |
| Remote Activation (w/a/e) | function capable of remote activation | F9 |
| Cheater, Cloaked, Environmental Sealing, Miniaturized, Silverplate, Electrograpple Handle | broad equipment / no additional host prerequisite stated (or a *use* prerequisite distinct from host eligibility) | — |
| any (stacking/limits) | installed-upgrade identities | F11 |

Findings that matter for the next review: no family is both explicit and complete across the domains that need it; size, weight and several others are defaulted or absent on whole item types; containment capacity, droid status, restrictable functions, remote-activation and added-item relationships have no structured representation. See `d-005-t4-item-fact-capability-census.md`.

## 5. Non-effects

No registry, manifest, specification record, ledger, generated runtime, decisions-register row, production code, Item model, compendium record, test or `PINNED_SCOPE_SHA256` is changed. No D-014, G4–G9 or mechanical-certification work is begun.
