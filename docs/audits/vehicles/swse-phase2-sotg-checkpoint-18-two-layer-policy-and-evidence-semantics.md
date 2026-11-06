# Starships of the Galaxy — CP18 owner-approved two-layer certification and evidence semantics

**Status:** OWNER POLICY APPROVED; EVIDENCE REPRESENTATION RECONCILED IN A SEPARATE AUDIT SIDECAR. **No additional ship is newly certified.** No universal vehicle schema is frozen or migrated; no runtime or production data changed.

## Explicit owner decision and existing policy continuity

On **2026-10-18**, the owner approved the recommended two-layer SotG policy. Authority: `data/audits/vehicles/swse-phase2c-cp18-approved-two-layer-policy.json`, decision `SOTG-CP18-D01`.

This is compatible with the already approved global `P2C-D01`–`P2C-D03` decisions. It does **not** supersede the original published-source canonical evidence, previous four strict certificates, the source-complete vs operational boundary, the original published-conflict preservation rules, or the explicit per-instance GM-override restrictions.

1. **Source-fidelity certificate**: each ship may individually pass using explicitly source-verified silence, if the complete statblock and adjacent source evidence, every recorded conflict and printed fact, and a lossless schema mapping are independently reviewed. This level does not require a fictional weapon blueprint that the source never published. Source-review-complete **is not by itself a source-fidelity certificate**.
2. **Physical-mount / automated-stock-combat certificate**: independent stronger gate requiring supported physical installations, applicable geometry, crew/gunner and attack-group binding, trusted mutation-safe provenance and operational tests. An unprinted arc or hardware count may not be guessed to make it green. Existing four historical strict *source-field-and-mount* certifications do **not** imply currently trusted runtime stock attacks.

**Operational stock attack authority remains zero** and is governed independently by CP9C/vehicle combat workstream, which this branch does not change.

## Verified CP16 inputs and CP18 normalized output

| Observation | Verified count |
|---|---:|
| Publication-specific source entries | 104 |
| Previously strict field/mount certified | 4 |
| Source-reviewed but not strict certified | 100 |
| Published attack-group rows | 258 |
| Observed field positions (3 per group) | 774 |
| `SOURCE_SILENT_CONFIRMED` | 611 |
| Historical `KEY_NOT_STORED` | 10 |
| Observed numeric claims other than zero | 146 |
| Descriptive text arc claims | 6 |
| Explicit recorded numeric zero | 1 |
| Historical attack-group rows lacking their own `sourcePage` key | **8** |
| Newly granted CP18 source-fidelity certificates | **0** |
| Newly granted CP18 physical-mount certificates | **0** |

**Additional CP18 provenance defect:** Eight of the 258 original attack-group rows do not store a `sourcePage` key: Delta-7 Aethersprite (p.60; 1 row), ARC-170 (p.61; 3), A-wing (p.63; 3), and Baudo-class Yacht (p.65; 1). The corresponding ship statblock start pages are verified, but are separate fields, **not proof that the historical individual row carried source-page provenance**. The overlay records `sourcePageRecorded: false` and omits both row `sourcePage` and `sourcePrintedPage` rather than inventing a value. These four ships need explicit per-row page reconciliation before source-fidelity certificates are issued.

The 611 source-silent positions comprise physical hardware count 228, firing arc 251, battery count 132. The 10 missing historical keys comprise 2, 1 and 7 respectively. The one recorded `batteryCount: 0` remains numeric zero, **not** None or unknown. Six printed firing-arc descriptions are retained as *text* and are not automatically converted to executable line-of-fire geometry. All 12 source-conflict-bearing entries remain conflict-bearing. The append-only 155 schema-discovery cases remain unchanged.

All 104 source identities, exact ledger array offsets, individual weapon attack rows, associated printed page references, full source field status groups, conflict field groups, and per-row values are traced by `data/audits/vehicles/swse-phase2c-sotg-cp18-evidence-observation-overlay.json`. Nothing from this evidence overlay changes the CP16 source ledger or CP17 work queue.

## Persistence and semantic contract

The `observations` object for each source attack row includes its exact CP16 JSON-pointer locator, the recorded evidence state, and the original per-row printed page **only when that key was actually recorded**. The **raw original field value is stored only when the key was present**. When `sourcePage` is historically absent, retain the separate entry-level printed statblock start page without pretending it was a row locator. This is the core lossless/reversible condition.

| State | Meaning | Storage behavior |
|---|---|---|
| `PRINTED_VALUE` | A printed numeric/boolean claim | Keep signed value; do not compute from damage, BAB or weapon count |
| `PRINTED_ZERO` | Recorded numeric zero | Keep `rawValue: 0` |
| `EXPLICIT_NONE` | Printed literal absence | Keep literal printed token; requires original source evidence |
| `SOURCE_SILENT_CONFIRMED` | Source page reviewed and specifically silent | Keep source sentinel; do not set physical count, arc, weapon quantity or zero |
| `KEY_NOT_STORED` | Historic ledger lacks the key | Keep `rawValue` absent, **not** null; not automatically certified source silence |
| `RECORDED_NULL_UNRESOLVED` | Observed JSON null | Preserve raw null and require separate page-based classification |
| `RECORDED_DESCRIPTIVE_TEXT` | Qualified source text without a complete geometry contract | Retain exact text; geometry automation remains blocked |
| `PUBLISHED_CONFLICT` | Multiple printed inconsistent claims | Preserve each observation and original pages in the CP16 source ledger; no winner elected |
| `NOT_REVIEWED` | Primary source not read | Never promote to confirmed silence |

The first seven states above are directly used for the observed three fields in the CP18 overlay; conflict and unreviewed remain independent field-/entry-level review states with separate evidence and constraints. A configuration-conditional statement is preserved in the original ledger and must carry variant scope before production normalization.

Examples from real source-ledger observations:

- **Acclamator**, p.56: quad turbolaser `batteryCount: 2` is an explicit group/battery count, **not** two physical turbolaser barrels. Hardware count and arc remain source silent.
- **Rendili Star Drive Light Corvette**, p.102: six physical double-laser turrets are described in adjacent source prose, but `flank-mounted turrets; numeric/coverage arcs not printed` must remain a qualified arc string; p.102 also has a source-silent `payload` field group not solved by its installed gun count.
- **Ghtroc Class 720**, p.88: the prior strict certificate preserves the fixed-forward source arc and known physical count. CP18 does not reinterpret it.
- **Other rows:** `batteryCount: 0` remains distinct from source silence, missing keys or physical zero weapons.

## Universal schema compatibility findings (CP18 pressure test)

The committed universal schema `data/audits/vehicles/swse-phase0b-vehicle.schema.json` is **draft v0.5**, not a frozen v0.6 document. Its `armament.firingGroups` contains a `mountKeys` array and printed attack-group metadata. Its `armament.weaponMounts` describes *physical installation*, with nullable `weaponCount`, `mountCount` and `firingArc`. Its `fieldStates` supports `not-stated`, `not-yet-reviewed`, `unclear-source`, `explicitly-none` and `not-applicable`, but does not independently retain source raw values and group/mount evidence at CP16 granularity.

**Read-only schema test:** A draft fire-group record can validate with `mountKeys: []` and `rules.reviewStatus: partial-source-probe`. That does not certify a physical mount, does not infer one or mean the attack can execute. Projecting 258 ledger attack rows into fictional `weaponMounts` would violate both the published facts and the existing schema contract. The CP18 evidence sidecar is necessary; the owner-approved policy is **not** permission to freeze v0.6 or produce pack records.

The older Phase 0B v0.5 report says some nulls represent only explicit verified absence, while the newer Phase 2C null semantics contract also permits null for genuinely informationless unknowns when annotated. Preserve both historical records for now; design v0.6 to explicitly disambiguate with typed evidence instead of silently declaring all nulls identical. The exact approved null/absence policy remains an input to schema freeze.

CP18 v0.6-facing proposal (discovery only): a published *source attack-group* layer with typed field-level evidence, independent of installed physical mounts; stable publication identity; raw value and page provenance; separate group/battery/mount counts; explicit configuration scope; and unresolved conflict alternatives. Operational mount records bind to source groups only when the source supplies the required identity and geometry, or the separately governed GM-instance mechanism permits a limited action.

## Workstream and certification gates

CP18 produces the approved policy, deterministic typed sidecar, JSON Schema for the sidecar, a read-only verifier, and this report. The original CP16 source/CP17 queue, v0.5 production schema and all compendia are untouched.

**Next CP19:** Individually inspect and reconcile the 12 conflict-bearing publication entries, preserving printed contradictions and explicit owner/errata adjudication requirements; only consider granting source-fidelity certificates after each entry's full evidence/schema gate is separately checked. Continue CP20 for the 3 legacy missing-key entries, CP21 for the 84 physically source-silent cases, CP22 for the 1 residual entry. These are queue review categories, not automatic final statuses; overlapping defects remain visible per entry.

**Historical CI limitation retained:** the remote CP16 continuity script cannot compare to a CP15 ledger absent from the inherited branch. This is reported as `NOT_EXECUTED_MISSING_CP15`; it does not justify reconstructing CP15 from CP16. The independent CP17 test remains an executable gate.

### Audit-only regression checks

```bash
python3 -m pip install jsonschema==4.25.1
python3 tools/audits/vehicles/check_sotg_phase2b_cp17_baseline.py --repo "."
python3 tools/audits/vehicles/check_sotg_phase2c_cp18_evidence_policy.py --repo "."
```

When the original sourcebook is locally accessible, pass `--source-pdf "/path/to/SAGA EDITION - Starships of the Galaxy.pdf"` to each validator for a primary PDF SHA cross-check. Validation checks the exact prior Git blob hashes, all 774 reversible field states, the 8 missing row-page keys, 104/258 identities/groups, source conflicts, v0.5 pressure compatibility and zero new certifications. The proof is structural and does not substitute for independent visual verification of sourcebook pages.
