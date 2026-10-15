# SWSE V2 — Typed-domain reconciliation review and future PR plan (Batch A)

**Status: documentation and planning only.** This reviews the independent reviewer's Batch A package against the repository. It imports nothing, changes no registry, ledger, specification record, register entry, generated data or runtime code, lifts no blocker, and makes no owner ruling. Base: `main` at `fb6d6db33eb80a1079dd144c971b982984223b42`. PR #1046 and PR #1047 are not modified and, at the time of writing, are still drafts (PR #1047 head `572c54ca402f9799e026a72c3e9a330026f006cb`).

## 1. Inputs

| Input | SHA-256 |
|---|---|
| `swse_batch_a_typed_domain_crosswalk_232.csv` (232 rows; committed as read-only evidence) | `06cb541309859bfd157e3fe3b276219b50ec2678f3dda18bdec0d1f762d99fd9` |
| `swse_batch_a_source_verification_01.md` | `8eb76ea7ba58f23d4261e7e394937d81ec17d944f2ffdbbbb8724b52282e34da` |
| `swse_batch_a_source_verification_02.md` | `f12067399840bd49f0a11c51a1e78386c70a53e74680eccb9978e6917266c6a4` |
| `swse_batch_a_source_verification_03.md` | `3d7438c059c60332cf1e230197b594b93c66c600d37f64f328f265d399a521dc` |
| `swse_batch_a_source_verification_04_errata_and_crosswalk.md` | `65a5932e852997064ccffaa161b3008a6be5c9b4952d1a750f8276897e2066be` |
| `swse_v2_batch_a_consolidated_claude_handoff.md` | `bd8ac57f155a58ead96bc5f8de39b080edd9468c609d9ea3560c984eb812a86f` |

The CSV is a derived research inventory. It is preserved byte-for-byte as read-only audit evidence at `docs/audits/evidence/batch-a/swse_batch_a_typed_domain_crosswalk_232.csv`, with a README that prohibits any generator, validator, ledger, planner or loader from reading it. The hash above identifies the exact file reviewed and equals the committed copy. Source observations in Reports 01-03 are the reviewer's visual inspection of the PDFs. **This implementer has not seen those page images** and records them only as reviewer-reported.

## 2. Count and identity reconciliation

Compared against `data/modifications/runtime-definitions-v1.5.json` at the base commit.

| Check | Result |
|---|---|
| Typed IDs in the CSV | 232, all distinct |
| Typed IDs in the runtime file | 232 |
| Sets equal | Yes: no ID missing either way |
| Parent records in the runtime file | 186 |
| Distinct parents in the CSV | **185** (not 186). The one parent without a CSV row is `sv-droidification`, an excluded record with no typed domain. The handoff's "186 canonical parents accounted for" is true only counting that excluded record; the CSV itself has 185 parents |
| Book, slot kind, fixed slot value, price kind, credit amount, source role | No mismatch on any of the 232 rows |
| Page claim | 130 rows equal `printedTablePage`; the remaining 102 have no `printedTablePage` in the registry and the CSV carries the registry's `rulesPage`. After allowing that fallback there are 0 mismatches |
| The 76 governed (page-39 facts) | The CSV's `SV_76` group equals exactly the 76 typed definitions whose `installProcedure` is `SOURCE_VERIFIED` in the runtime file |
| The 156 under D-013 | The CSV's seven D-013 groups sum to 156 and equal exactly the runtime file's D-013 blocker set. Group sizes: lightsabers 44, KOTOR templates 34, long tail 23, Legacy 19, Tech/Biotech 18, Sith alchemy 10, KOTOR accessories 8 |
| D-005, D-011, D-006, D-004, D-010 sets | D-005 is 35 rows, all in `SV_76` with route `SV_TABLE_2_2_CANDIDATE`; D-011 is the 44 lightsaber rows; D-006 is 4 Componentization plus 3 Excellent Kit rows; D-004 is `sv-retractable-stock::weapon`; D-010 is the 5 Legacy template rows. All consistent with the ledger |
| `action` column | `RESEARCH_ONLY_NO_LIFT` on all 232; certification columns are `NOT_CERTIFIED` / `NOT_CERTIFIED_FOR_SELECTABILITY` on all 232 |

The reviewer's own integrity claim (FNV-1a/32 over selected registry fields) was not recomputed; the field-by-field comparison above replaces it.

### 2.1 Defects in the crosswalk (for the reviewer to correct)

1. **Parent count.** The CSV has 185 parents; the handoff text says 186. Either wording should name `sv-droidification` (excluded, no typed domain) explicitly.
2. **Mis-attached errata flag.** `sog-tech-improved-accuracy::weapon` is flagged `TECH_SPECIALIST_DEVICE_SLOT_GENERAL_CLARIFICATION_REQUIRES_SEPARATE_REGISTRY_RECONCILIATION`. That ID is a weapon accuracy trait. The device-extra-slot trait exists only in the Tech Specialist service, not as a registry definition, so no typed ID should carry that flag (see the errata audit, section 3.3).
3. **No row for Superior Protective Armor.** The registry has the tech-tier `sog-tech-protective-armor` but none of the 14 superior traits (register D-009), so the corrected-benefit finding has no typed ID to attach to (errata audit, section 3.4).
4. **Route column on Retractable Stock.** `sv-retractable-stock::weapon` has route `SV_TABLE_2_2_CANDIDATE` but sits in the long-tail group; that is consistent with its D-004 and D-013 status, but the 77 rows with that route versus the 76-row group should be noted so the route is not read as membership of the governed set.

None of these affects the identity and count findings above.

## 3. What the Batch A reports establish, by register entry

Everything in this section is reviewer-reported and unverified by the implementer. It is recorded so that later PRs cite it accurately. Labels follow the handoff: `SOURCE_VERIFIED` (reviewer visually checked), `OWNER_POLICY`, `ERRATA_CANDIDATE`, `ENGINEERING_PROPOSAL`. **A `SOURCE_VERIFIED` label here is a reviewer-reported finding. It is not the repository's component status of the same name and does not create it:** the repository's `SOURCE_VERIFIED` (ledger and specification records) changes only through its own reviewed process.

| Entry | Finding recorded | Label | Effect on blockers |
|---|---|---|---|
| D-015 / Q-001, Q-002 | Core pp. 68-70: Mechanics is Trained Only; p. 69 covers security/devices and explosives and has no equipment-upgrade installation use; Repair's tool-kit requirement governs Repair Object. S&V pp. 37-41 add no general tool-kit or workshop requirement; absence is not a prohibition | `SOURCE_VERIFIED` | Evidence half of D-015 now exists in reviewer-reported form. Not lifted: lifting needs a "Blocker lifted" row with source and an existing repository evidence file, through the normal process |
| Q-025 | Core p. 60: take 20 needs no penalty for failure; S&V p. 39 imposes failure consequences, so take 20 cannot be assumed available; reconcile the general rules first | `SOURCE_VERIFIED` (p. 60) with reconciliation outstanding | No owner choice yet; the reconciliation is a source task |
| D-013 KOTOR accessories (8) / Q-004 | Slot costs are for the S&V gear-enhancement system; no Table 2-2 cross-reference and no prohibition; one accessory per host normally; host rules per accessory | `SOURCE_VERIFIED` | No partial lift. The application question remains (policy, Q-027) |
| KOTOR templates (34) / Q-005 | Templates are manufacturing processes; supports a manufacturing classification, partial only | `SOURCE_VERIFIED` (partial) | Retrofit policy is now `OWNER_POLICY` (section 5); no family blocker release |
| D-002 / Q-011 | Stripping: DC 20, 1 hour, 50% of base item cost for the attempt; a method cannot be applied twice to one item | `SOURCE_VERIFIED` | D-002 remains; per-host features and failure detail still unspecified |
| D-003 / Q-012 | Size increase: one category larger, cost doubled, no effectiveness gain, at most one slot; armor one weight class heavier, heavy armor cannot use it | `SOURCE_VERIFIED` | D-003 remains; the repository's two disagreeing writers are an engineering inconsistency |
| D-004 / Q-013 | Table value 0 or 1; the p. 44 paragraph gives 1 slot for pistols and 0 for rifles; allowed hosts rifles and pistol-like exotic weapons | `SOURCE_VERIFIED` (partial) | Candidate resolution, not lifted; a pistol-like exotic weapon's treatment may need a determination |
| D-012 / Q-016 | Printed baseline light 1, medium 2, heavy 3; no powered-versus-weight precedence on p. 37 | `SOURCE_VERIFIED` | Superseded in part by the powered-armor errata candidate; unresolved |
| Q-015 / D-007 | Computerized Interface Scope is *Rebellion Era* printed p. 51 (canonical candidate); Night Vision Device has no verified canonical publication in the supplied corpus | `SOURCE_VERIFIED` plus `OWNER_POLICY` | Canonical-only policy applies; D-007 not lifted; nothing added or deleted |
| Q-003 | Candidate errata (see the errata audit) | `ERRATA_CANDIDATE` | Open |
| Families Q-006 to Q-010, Q-014 | Described in Reports 02 and 03 and the CSV research routes; per-definition certification not complete | Mixed, reviewer-reported | None released |

Noted discrepancy to confirm: the master audit (Q-013) asked about the Table 2-4 value; Report 01 locates the controlling paragraph on p. 44, while the registry cites p. 42. This is a source-location note for the D-004 record, not a repository change.

## 4. Typed-domain claim handling (Q-018 to Q-020)

The CSV `registrySlot*` and `registryPrice*` columns equal the registry claims on all 232 rows, so they confirm the inventory, not the printed values. Per the handoff and the existing contracts:

- A slot cost is certified only through the Phase 1b predicate; the CSV does not change that. Of the 232, 84 remain cost-verified in the repository; the CSV adds no certification.
- Non-numeric price kinds (percentage, feat-granted, destiny, not-for-sale, unpriced) must never be coerced to zero.
- `hostRestrictionResearchNote` is a research clue, not a predicate. All 232 `hostPrerequisiteCertification` and `executableEffectCertification` values stay `NOT_CERTIFIED`.
- Errata-flagged rows (36 powered-armor-dependent, 1 Dual Gear, 3 Silverplate, 2 Spring Loaded, 1 KOTOR slot) must not be certified from printed values until the errata audit resolves them.

## 5. Owner-policy decisions recorded by the reviewer

Both are reported by the independent reviewer as explicit Project Owner decisions. The implementer records them as `OWNER_POLICY` as reported; the Project Owner should confirm the wording the first time it appears in the register.

- **OWNER-TEMPLATE-RETROFIT.** An acquired template item has the template as an inherent property. Later application to existing gear is a request routed to the existing GM-approval workflow; printed conversion procedures take precedence; otherwise the GM decides legality, requirements, cost and time; a denial causes no gameplay or economy mutation; template rarity, eligibility and stacking limits still apply. This answers the template-specific part of Q-005 and Q-028 and does not release D-013 or G6. A design proposal is in `swse-v2-template-retrofit-approval-design-proposal.md`.
- **OWNER-CANONICAL-ONLY.** The V2 player catalog contains published SWSE content only; homebrew is deferred. No record is added or deleted without a reviewed disposition.

Policies not yet ruled, per the handoff: D-014 (retry cost basis, shortest expedited removal, deactivated state, failed-installation state), D-006 (unpriced modifications), and Q-029 (GM-entered manual outcome). These do **not** wait for the errata or source PRs. They can be presented to the Project Owner now, in one grouped session, in parallel with the research. Any decision that depends on an unauthenticated erratum must be qualified as such, may need reconsideration if that erratum is authenticated, and does not authorize production implementation until its evidence is resolved. A ruling is not an implementation authorization either way (G4-G9 gates still apply).

## 6. Future PR plan (documentation first; no blocker releases)

Each PR below is separate, independently reviewed, and releases no blocker by itself. Code PRs wait for the named gate and its separate authorization.

| # | PR | Scope | Depends on |
|---|---|---|---|
| 1 | Errata authentication record (parallel with PR 9) | One note per erratum family with the authenticated artifact, the exact original and replacement sentences, and the search statement for Q-003 | E-Q1 (authentication) |
| 2 | S&V structural records | Stripping (D-002), size increase (D-003), Retractable Stock (D-004), powered armor (D-012, with the errata outcome) as `PUBLISHED_FACTS` records | PR 1 for D-012 |
| 3 | D-015 evidence | Certification record for Core pp. 60, 68-70 and S&V pp. 37-41, with an evidence file and the proposed lift row for review; Q-025 reconciliation | Reviewer records; independent review |
| 4 | D-013 KOTOR accessories | Per-definition record (8): slot cost with errata outcome, host rules, application classification | PR 1; policy Q-027 |
| 5 | D-013 per-family records | One PR per family (templates, lightsabers, Tech/Biotech, Sith alchemy, Legacy, long tail), each with per-definition or demonstrably uniform conclusions | Reports 02/03; Q-028 classification; Q-039/Q-040 traces for lightsabers and alchemy |
| 6 | S&V Table 2-3 host records | 16 upgrades / 35 typed definitions, host conditions, with Dual Gear and Silverplate/Spring Loaded errata outcomes | PR 1 |
| 7 | Phase 1a stock-capacity amendment | Only if the powered-armor erratum is authenticated and confirmed; reviewed contract change plus tests | PR 1, separate authorization |
| 8 | Q-033 atomicity design | Engineering proposal with fault-injection test plan | none; independent of sources |
| 9 | Owner batch (parallel track, not sequenced after PRs 1-8) | One grouped question set: D-014, D-006, Q-029, each qualified where it touches an unauthenticated erratum | none |

## 7. Validation performed

- Identity, count, field and blocker-set comparisons between the CSV and `data/modifications/runtime-definitions-v1.5.json`, as tabulated in section 2 (one-off script, not committed; the CSV it read is committed as read-only evidence).
- Cross-references in the errata audit were checked against `scripts/engine/customization/modification-slot-authority.js` (lines 23-25 stock table), `scripts/engine/customization/tech-specialist-modification-service.js` (lines 19 and 38) and the Phase 1a contract.
- `git diff --check`. No code, data or test file is touched, so the normal test suites are unaffected.

## 8. What was intentionally not done

No registry, ledger, specification, register, generated-data or runtime change; no lift of D-013, D-014, D-015 or any other entry; no import of the CSV; no adoption of any errata value; no G4-G9 work; nothing merged; PR #1046 and PR #1047 untouched.
