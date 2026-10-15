# SWSE V2 — Errata authority audit (candidate corrections, Q-003)

**Status: documentation and planning only. Nothing here is certified, adopted or implemented.** No registry, ledger, specification record, register entry, generated data, runtime code or gameplay behavior is changed, no blocker is lifted, and the immutable v1.5 registry is not edited. This document answers the handoff's first deliverable ("Errata authority audit") and was prepared on top of `main` at `fb6d6db33eb80a1079dd144c971b982984223b42`. It does not modify PR #1046 or PR #1047.

## 1. Evidence labels used

Per the handoff's validation rule, every finding carries exactly one label. They are not interchangeable.

| Label | Meaning |
|---|---|
| `ERRATA_CANDIDATE` | Reported by the independent reviewer from an indexed or transcribed copy of an apparently official correction. The publisher original is **not authenticated**, and the implementer has seen neither the original nor the transcription |
| `SOURCE_VERIFIED` | Visually checked by the independent reviewer against the supplied printed books (Reports 01-03) and recorded as such in the repository audits |
| `OWNER_POLICY` | An explicit Project Owner decision (this document uses none for errata) |
| `ENGINEERING_PROPOSAL` | A suggestion about how to handle the evidence, not a rule |

## 2. Provenance and what has and has not been authenticated

| Item | State |
|---|---|
| Documents reported | "Star Wars Roleplaying Game: Scum & Villainy Errata and Official Clarifications" and "Knights of the Old Republic: Errata and Official Clarifications", both stated to be January 2009 revisions |
| Where located | A public PDF index entry and a separately hosted transcription (URLs are in Report 04, section 1) |
| Authenticated as publisher originals | **No.** The reviewer states the publisher-issued originals were not independently authenticated or visually reviewed |
| Seen by the implementer | **No.** This session has not read the errata text, only the reviewer's summaries. The exact corrected sentences are therefore not transcribed here, and this document must not be used to copy wording into any record |
| Network or repository copy | No errata artifact exists in `reference/sourcebooks/` (only the two book text layers for S&V and KOTOR), and no errata file is anywhere in the repository |
| Effect on already-certified facts | Report 04 states none of the candidates rewrites S&V Table 2-2 (p. 39). Complete publisher-original review is still required before concluding that no erratum touches p. 39, the Core Mechanics entry, or Table 2-3 |

Repository precedent that applies: the feat-content rolling authority already states "Official errata/clarifications supersede conflicting first-printing text where source-verified" and that secondary indexes "do not override primary rules text" (`docs/audits/feat-content-canonical-authority.md`, operating model). That is the project's existing rule, and the operative words are *where source-verified*. A transcription on a fan-maintained host does not satisfy it until the publisher original is authenticated.

## 3. Candidate corrections and their impact

All six are `ERRATA_CANDIDATE`. "Typed IDs" come from the reviewer's 232-row crosswalk (`errataReviewFlag`) and are checked against the repository in `swse-v2-typed-domain-reconciliation-review.md` section 4.

### 3.1 KOTOR Improved Energy Cell: slot cost 2 to 1

| Field | Content |
|---|---|
| Printed position | KOTOR printed p. 75, Table 5-6: 2 slots (`SOURCE_VERIFIED` by the reviewer's physical-page inspection). Registry v1.5: 2 |
| Candidate correction | Table 5-6 slot cost becomes 1 |
| Typed ID | `kotor-accessory-improved-energy-cell::weapon` |
| Repository surfaces | Registry slot cost (immutable); runtime `slotCost.registry`; D-013 (accessories) and the cost-certification predicate. No selectable path exists, so no live behavior is affected today |
| Prerequisites | Authenticate the KOTOR erratum; transcribe the exact corrected cell; compare with printed p. 75 |
| Handling (`ENGINEERING_PROPOSAL`) | Do not alter the registry. A corrected value would be carried as a separately sourced, versioned overlay or in a future registry-version change, each needing its own authorization. Until then the printed value stays the registry claim and the typed definition stays non-selectable |

### 3.2 Powered armor and the stock-slot baseline (Phase 1a authority)

| Field | Content |
|---|---|
| Printed position | S&V printed p. 37: light 1, medium 2, heavy 3 (`SOURCE_VERIFIED`, Report 01), with a note that armor with extra slots and powered armor may differ. No powered-versus-weight-class precedence is printed on that page |
| Candidate correction | Replaces the second sentence with a separate rule: powered armor has 2 free upgrade slots, with a definition of powered armor. The reviewer notes it may supersede the medium/heavy progression rather than only add a powered exception, and asks that the exact sentence-level replacement be verified |
| Typed IDs | 36 rows flagged `POWERED_ARMOR_BASE_CAPACITY_ERRATA_DEPENDENCY` (every armor-domain typed definition among the 76 governed S&V definitions) |
| Repository surfaces | `ModificationSlotAuthority` (`scripts/engine/customization/modification-slot-authority.js`, stock capacity table `armor:light` 1, `armor:medium` 2, `armor:heavy` 3, lines 23-25; powered handling around lines 339-399 treats a trusted powered status as unresolved precedence); the Phase 1a contract section 5.3 and decisions D6, D12; register D-012 |
| Why it matters | If confirmed, the Phase 1a baseline may be wrong for non-powered armor too, which would affect a merged and certified contract, not only D-012 |
| Prerequisites | Authenticate the S&V erratum; transcribe the replaced sentence and the powered-armor definition; reconcile against S&V p. 37 and KOTOR's statement that light powered armor has 2 free slots under the S&V rules; decide whether the change is a replacement of the progression or an addition |
| Handling (`ENGINEERING_PROPOSAL`) | No change to Phase 1a until verified. If confirmed, a contract amendment (reviewed, with tests) changes the stock-capacity authority in one place; the typed-definition data is untouched |

### 3.3 Tech Specialist device extra slot (D-008)

| Field | Content |
|---|---|
| Printed position | SoG printed p. 21 table does not list a device-slot trait (`SOURCE_VERIFIED`, still literally true) |
| Candidate correction | An S&V official clarification describes one extra upgrade slot on a device, once; it also clarifies that weapons, armor and vehicles count as devices and droids as characters |
| Typed IDs | None. The reviewer's crosswalk attaches this flag to `sog-tech-improved-accuracy::weapon`, which is an unrelated weapon trait. The registry contains no device-extra-slot definition; the trait exists only in the Tech Specialist service (see below). This is a crosswalk defect recorded in the reconciliation review |
| Repository surfaces | `scripts/engine/customization/tech-specialist-modification-service.js` line 19, trait `tech_device_upgrade_slot` ("Install one additional upgrade slot. This modification can be made only once.", `unique: true`); Phase 1a constant `TECH_DEVICE_SLOT_TRAIT_ID` (treated as `unverified`, never capacity); register D-008 |
| Observation | The service text already says "can be made only once", which is consistent with the reported clarification. That consistency is not evidence for the clarification |
| Prerequisites | Authenticate; transcribe the clarification; determine whether it creates a device-slot rule independent of SoG p. 21 and what it means for the "device" classification (droid and vehicle work stays out of scope) |
| Handling | D-008 remains open; no capacity is granted until verified |

### 3.4 Superior Protective Armor: +2 armor bonus to Reflex Defense

| Field | Content |
|---|---|
| Printed position | S&V printed p. 24 table: +1 (reviewer, `SOURCE_VERIFIED`) |
| Candidate correction | Benefit becomes +2 armor bonus to Reflex Defense |
| Typed IDs | None in the registry. The 14 superior-tier traits are not registry definitions (register D-009); the registry has only the tech-tier `sog-tech-protective-armor` (+1) |
| Repository surfaces | `tech-specialist-modification-service.js` line 38, trait `superior_armor_protective`, which already reads "increases by +2" with `amount: 2` |
| Observation | The service already carries the +2 value. D-009 says the 14 superior traits are preserved as-is and not source-certified; this candidate would be the first source evidence for one of them. Whether the +2 in the repository came from the erratum or from another source is unknown to the implementer |
| Prerequisites | Authenticate; confirm the original p. 24 text and the corrected text; locate the Superior Tech source for all 14 (Q-007) |
| Handling | No change. D-009 stays open |

### 3.5 Dual Gear: independent power sources

| Field | Content |
|---|---|
| Printed position | S&V printed p. 41 (reviewer) |
| Candidate correction | An added sentence requires separate power sources for combined powered items |
| Typed ID | `sv-dual-gear::equipment` |
| Repository surfaces | A host-eligibility constraint for the D-005 universal-upgrade work (Q-014/Q-019); no code today |
| Handling | Record as a host/combination constraint candidate in the Q-014 family record; no predicate until the wording is transcribed from the authenticated source |

### 3.6 Silverplate and Spring Loaded: a sentence moves

| Field | Content |
|---|---|
| Printed position | S&V printed p. 42 (reviewer) |
| Candidate correction | The final sentence (reported as Quick Draw related) moves from Silverplate to Spring Loaded |
| Typed IDs | `sv-silverplate::weapon`, `::armor`, `::equipment`; `sv-spring-loaded::weapon`, `::equipment` |
| Repository surfaces | Registry descriptions and the `description` component verified for these definitions; no effect is automated |
| Handling | Mark both descriptions as errata-dependent; no effect projection from either until the authenticated text is compared |

## 4. What authentication needs to produce (`ENGINEERING_PROPOSAL`)

1. The original publisher artifact (or an independently verified facsimile) with title, publisher, date, version and page.
2. For each correction: the exact original sentence, the exact replacement sentence and the printed page of the affected rule, transcribed by someone who has seen the artifact. Wording from this document or from a secondary summary must not be used.
3. A statement for each correction of whether it replaces or adds to the printed text.
4. A search statement: which errata documents exist for each book used by the registry, and whether any of them touches S&V p. 39, Table 2-3 or the Core Mechanics entry (this closes the open part of Q-003).
5. Append-only recording in a new source-examination note per erratum family, consistent with `docs/audits/d-001-install-remove-pdf-verification.md`.

## 5. Governance handling (`ENGINEERING_PROPOSAL`)

- **A candidate register entry.** The register is append-only and these items affect D-008, D-009, D-012 and the KOTOR accessory family; this document does not edit it. The reviewer may wish to decide whether to add a single new entry (provisionally D-016, "Official errata reconciliation") with status `PENDING_SOURCE_VERIFICATION` and a scope row that cites the unauthenticated artifacts. If added, it would need its own pinned scope in the ledger and generator, which is a separate reviewed change.
- **Immutability.** Errata cannot be applied by editing registry v1.5. Options are a versioned overlay with its own validation, or a new canonical registry version; both need explicit authorization and a G1-style review. Neither is proposed here.
- **Ordering.** Authentication comes before any correction PR; each erratum family then gets its own reviewable PR with no blocker release.
- **No silent substitution.** Until adoption, the printed value remains the registry claim, and errata-affected definitions stay non-selectable (they already are).

## 6. Questions this raises

| ID | Question | Who | Status |
|---|---|---|---|
| E-Q1 | Can the January 2009 S&V and KOTOR errata documents be authenticated as publisher originals, and with what version and page identifiers? | Independent reviewer | NEEDS_SOURCE |
| E-Q2 | For powered armor, does the erratum replace the 1/2/3 progression or add to it, and what is its definition of powered armor? | Independent reviewer | NEEDS_SOURCE (after E-Q1) |
| E-Q3 | Does any errata document change S&V p. 39 / Table 2-2, Table 2-3 or the Core Mechanics entry? | Independent reviewer | NEEDS_SOURCE (after E-Q1) |
| E-Q4 | If confirmed, how should corrections to an immutable registry be carried: versioned overlay or new registry version? | Reviewer and Project Owner (authorization) | After E-Q1 |
| E-Q5 | Should a new register entry track errata reconciliation? | Independent reviewer / Project Owner | OWNER_DECISION (governance) |

These extend, and do not renumber, the 55 questions in PR #1047 (Q-003 is the parent of E-Q1 and E-Q3).

## 7. What this changes

Nothing in production, the registry, the ledger, the specification records, the generated runtime file or the register. The only change is this file and its two companions.
