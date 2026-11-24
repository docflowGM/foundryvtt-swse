# SWSE Force V2 — Cross-book Certification, Checkpoint 01

**Date:** 2026-11-17  
**Scope:** Seven-book source-definition packages under `docs/audits/force-v2/bookwise-v2.9/`; first independent review of additional supplement-level Force rules.  
**Authority:** Submitted Book 7 source ZIP, its schemas and source audit; user-provided printed SWSE PDFs as primary evidence; DJVU text files only for discovery.  
**Repository:** `docflowGM/foundryvtt-swse`  
**Release classification:** **OFFLINE STRUCTURE PASS; SOURCE-CONTRACT BLOCKERS OPEN; NOT IMPLEMENTATION-READY.**

## Certification method and boundaries

This pass did **not** write to existing Force definitions, existing influence graphs, production compendiums, or runtime logic. Existing package files remain a reproducible historical snapshot. The read-only verifier performs two Draft 2020-12 JSON Schema checks per book, identity-collision and page/provenance presence checks, cross-book Force-domain reference checks, a strict historical count comparison, and a truthfulness scan for inconsistent acquisition and readiness metadata. PDF source claims were checked by visually opening the relevant scanned printed pages—not solely searching TXT files.

This is **not** proof of exhaustive sourcebook coverage, executable effect fidelity, current GitHub production consumer ownership, or Foundry v13 test execution. Schema validation proves structural shape, not canonical behavior.

## A. Seven-book structural certification — PASS

| Measure | Observed | Status |
|---|---:|---|
| Bookwise definition files | 7 | PASS |
| Bookwise influence files | 7 | PASS |
| All strict v2.9 JSON Schema checks | 14 / 14 | PASS |
| Canonical definition IDs | 212 distinct / 212 | PASS |
| Influence rule IDs | 178 distinct / 178 | PASS |
| Missing printed-page values | 0 | PASS |
| Unexpected shared printed-name collisions | 0 | PASS |
| Unresolved *Force-domain* graph source/target IDs | 0 | PASS |
| Foundry runtime acceptance executions | 0 evidenced | **NOT TESTED** |
| Whole-corpus completeness | Not established | **OPEN** |

**Domain breakdown:** 65 Force Powers; 58 Force Techniques; 15 Force Secrets; 12 Force Regimens; 24 Lightsaber Form Powers; 27 starship maneuvers; 11 Unleashed overlays. Total = **212**. Graph total = **178**.

**Intentional duplicate titles:** FUCG versus JATM **Force Storm** (different Powers), FUCG versus JATM **Improved Force Storm** (different Techniques), and JATM Force Power versus SotG maneuver **Intercept**. Matching title strings do not authorize collapsing these identities. Legacy **Force Shield** remains an FUCG-origin Power with a Legacy reprint publication; it is not a second definition.

**Graph authority boundary:** 67 distinct external source IDs in the influence graphs refer to talents, feats, equipment, or other rules outside these 212 definitions. Their absence from this specialized definition set is **not** itself a broken reference, but the external IDs **have not** been reconciled against live V2 production authorities in this checkpoint. At least one graph target also names an external talent (Battle Meditation). These are pending *cross-system* reference certifications, not automatically invented definition records.

**Readiness classification is truthful only at structural granularity:** 208 definitions report `design-needs-runtime-validation`; 4 report `blocked-on-ruling`; and **12** package-level editorial questions explicitly have `blocks-full-automation` severity. Those different levels of granularity do not directly equal each other. A single global implementation-ready flag must include all open gates rather than equating 4 blocked definitions with only 4 outstanding issues.

## B. Confirmed cross-book defect and editorial drift

### FVC-001 — Force Training repeated-power copy policy — P0 blocker

**Independent primary source:** Core Rulebook printed **p.95** (*Selecting Force Powers*) explicitly permits selecting the **same** Force Power more than once to obtain multiple uses in the active suite. This was visually checked on the printed page. The source rule applies to Force Training's learned suite and is not restricted by which supplement originally published a Power.

**Data finding:** Of **65** definitions with `domain: force-power` and `acquisition.method: force-training-suite`, **31** currently carry `acquisition.repeatable:false` (all 16 Core, all 10 KOTOR, all 5 FUCG), whereas **34** carry `true` (Clone Wars 8, JATM 17, Legacy 9). The same acquisition method cannot have two inconsistent duplicate-copy policies without a documented semantic distinction.

**Severity:** Source contract inconsistent; importing this boolean as a picker/finalizer ban would make canonical repeated power copies illegal. The boolean might originally have intended another kind of repeatability, so **do not blindly flip flags** until its meaning is explicitly pinned down.

**Required ruling:** Separate **definition identity** (one published rule) from **owned suite instances** (one or more copies of a single learned Power). Define exactly how `acquisition.repeatable` is used or replace it with an unambiguous field. A character can learn two `Battle Strike` instances without creating a second `Battle Strike` definition. Use the same instance approach for JATM Form Powers within the Force suite, subject to their separate lightsaber activation rules. Regress: initial pick, subsequent Force Training, Wisdom increases, spent/copy recovery, and finalizer save/load.

### FVC-002 — Stale JATM active-form ruling — editorial correction required

**Independent primary source:** JATM printed **p.29** states that the *additional benefit* of a Lightsaber Form Power comes from possessing the appropriate Lightsaber Form talent. The individual form rider texts (e.g. *Assured Strike* on p.29 and *Deflecting Slash* on p.30) likewise use talent ownership. They do **not** require that the matching form be selected as a separate active persistent stance. A ready/activated lightsaber remains a distinct base-use requirement.

**Internal inconsistency:** The rolling source audit's **v2.8** correction already adopted ownership-only riders, and the revalidated JATM influence edges test the same rule. But `REVALIDATED_JATM_Definitions_for_v2.9.json` still includes editorial issue `JATM-RAWPOL-001` saying the user requested an active-form gate. This is **superseded editorial wording** and must not become a new runtime requirement. Preserve historical Book 7 archive; use this checkpoint as the superseding clarification pending an editorial cleanup commit.

### FVC-003 — External cross-domain authority contract — pending

The graphs name 67 distinct non-Force definition source identifiers across talents, feats, equipment and rule selectors. Each must bind to a current, canonical V2 authority, with exact option prerequisites and no invented fallback or duplicate mechanics owner. Do not infer that a syntactically valid graph edge has a real executable effect route. The next checkpoint must inspect production consumers and produce a source-ID-to-SSOT-owner matrix, marking missing/renamed/obsolete producers.

### FVC-004 — Blocker status aggregation — P0 readiness gate

The 12 explicit `blocks-full-automation` issues (listed below) exist across Core (1), SotG (1), FUCG (5), Clone Wars (3) and Legacy (2). Only four individual definitions have `automationReadiness=blocked-on-ruling`; the rest default to design-needs-runtime-validation. Do not claim only four blockers or mark the 208 remaining definitions runtime-ready. Implement a machine-checkable aggregate gate with unresolved issue state and per-definition effect coverage.

## C. Supplemental source-screen extension — real mechanics outside the seven packages

The seven *additional* principal supplements screened were **Galaxy at War**, **Galaxy of Intrigue**, **Scum and Villainy**, **Rebellion Era Campaign Guide**, **Unknown Regions**, **Threats of the Galaxy**, and **Scavenger's Guide to Droids**. Earlier targeted screens found **no new authored Power / Technique / Secret / Regimen / Form Power / maneuver definition section** in those seven. This checkpoint independently searched their complete available DJVU transcripts for the relevant headings and inspected selected primary PDF source pages. It is a **section screen**, not an exhaustive text-by-text certification of every supplement or an assertion of zero rules interactions.

**Primary-PDF-verified source claims (source rule certified; runtime not certified):**

| Claim | Primary source | Certified source-level contract | New definition? |
|---|---|---|---|
| SRC-001 | Core p.95 | A Power may be selected multiple times in a Force suite. | No; acquisition policy |
| SRC-002 | JATM pp.29–30 | Form Power extra rider checks matching **form talent ownership**, not active stance. | No; rider contract |
| SRC-003 | Rebellion p.23 | **Recall**: a Force Point spent to recover one expended Power returns **two** instead. | No; talent -> recovery receipt |
| SRC-004 | Rebellion p.23 | **Gradual Resistance** defense bonus keys to the **particular Power** that damaged the user; **Reap Retribution** bonus keys to the **responsible creature**. | No; encounter-tracked talent state |
| SRC-005 | Rebellion p.34 | **Jedi Heritage**, requiring Twi'lek and Force Sensitivity, grants **two extra** Force Powers for **each** Force Training feat without actually changing actor Wisdom. | No; species feat -> entitlement count |
| SRC-006 | Galaxy of Intrigue p.27 | **Forceful Recovery**, requiring Force Sensitivity and Force Training, lets a Second Wind return **one** expended Power. | No; feat -> recovery event |
| SRC-007 | Unknown Regions p.143 | **Sorcerer of Rhand** gains Force Sensitivity and a **bonus Force Training** with at least half its Power picks dark-side and none light-side. | No; origin-scoped feat selection |
| SRC-008 | Unknown Regions p.220 | **Mask of Darth Nihilus** grants conditional feats while worn; requires at least half the granted Power picks to be dark-side; Power uses or Force Point spends add DSP, with a source-defined persistent CT drawback. | No; item-scoped temporary feat/power entitlements and use events |

The first six supplement-derived interactions above must be added to the *expanded canonical influence/certification inventory* and checked against existing feat/talent/equipment owners. They do **not** change the original 178-edge historical package count or become extra Power definitions. For the Mask of Darth Nihilus, the relationship between its two printed DSP triggers when a single Power use also involves an FP spend remains an **explicit semantic question**, not a reason to silently double-charge or silently suppress a cost.

**Remaining supplement book screen states:** Galaxy at War, Scum and Villainy, Threats of the Galaxy, and Scavenger's Guide to Droids remain **SECTION-SCREENED / NO NEW DOMAIN DEFINITIONS FOUND**; do not label them *exhaustively certified*. Galaxy of Intrigue's atmospheric interference on Nyriaan and other source-granted modifiers remain for follow-up. Some NPC Power lists copy existing Powers rather than introduce new definitions, so matching names there do not count as missing catalog items.

## D. Explicit unresolved automation blockers — preserve pending source decisions

| Source package | Blocker IDs | Count |
|---|---|---:|
| Core | `core/secret/devastating-power/odd-dice` | 1 |
| Starships | `sotg/maneuver/attack-formation-zeta-nine/minimum-dice` | 1 |
| Force Unleashed | `FUCG-ED-01` through `FUCG-ED-05` | 5 |
| Clone Wars | `CW-ED-01` through `CW-ED-03` | 3 |
| Legacy | `LEG-001`, `LEG-002` | 2 |
| **Total** | | **12** |

Those unresolved issues involve dice rounding, minimum damage dice, delayed effects, resource requirements and option interaction. They must be resolved by **source-backed ruling** or explicitly delegated for GM choice; the verifier cannot decide them by schema validity. The remaining 35 nonblocking editorial issues also require disposition or review before a definitive implementation handoff.

## E. Mandatory regression contracts derived from this checkpoint (not executed)

1. `CERT-FT-01`: Force Training picks two instances of **one** existing Force Power, consumes and restores them separately, and does not add another definition. All six Power-origin book groups receive identical copy legality.
2. `CERT-FT-02`: Form Power selection through Force Training counts as a suite instance; possessing form talent grants the rider, activating another stance does not suppress it; lacking matching talent suppresses only rider, not ordinary base-use permission.
3. `CERT-REB-01`: A paid FP suite recovery operation normally restores one; with **Recall** it restores two *available spent copies* with one FP receipt, not twice the cost.
4. `CERT-REB-02`: **Jedi Heritage** affects Power-instance count **per acquired Force Training feat**, including subsequent entitlements; ordinary Wisdom rolls, Force Point pool, regimen/maneuver slots remain unchanged.
5. `CERT-GOI-01`: Forceful Recovery on Second Wind restores **one** expended eligible Power and consumes neither an invented extra Force Training pick nor an extra Force Point.
6. `CERT-UR-01`: A Sorcerer of Rhand's granted Force Training must satisfy dark-side composition rules for that **origin-granted instance**, not blanket restrictions on all later Force Training feats.
7. `CERT-UR-02`: Wearing/removing the Mask adds/removes only artifact-derived entitlements, preserving independently learned Power copies and persisted DSP/CT consequences according to the printed removal rules.
8. `CERT-IDENT-01`: Both published Force Storms, both Improved Force Storms, and Force Power vs maneuver Intercept survive identical-title deduplication without changing stable IDs.
9. `CERT-READY-01`: Release readiness remains blocked if any of the 12 book-level blocking interpretation issues remain unresolved, even if all 212 definitions pass JSON Schema and only four carry `blocked-on-ruling`.
10. `CERT-LINK-01`: Every external influence edge source and target resolves to an approved V2 authority, or is explicitly quarantined; no name-only fallback.

## F. Sequenced certification backlog

1. **Checkpoint 02 — Source-scope and owner registry:** Reconcile the seven screened supplements' Force-affecting feats/talents/species/equipment and environmental rules with the seven-book influence graph; do a fuller chapter/sidebars screen. Identify missing source interactions without inventing new Powers. Resolve the 67 external source IDs against current GitHub V2 source authorities. Also check formal official errata for published changes not yet authenticated.
2. **Checkpoint 03 — Shared semantics:** Resolve FVC-001 copy-instance model, JATM editorial drift, resource choice/exclusivity (LEG-001/002 and KOTOR/Clone Wars/FUCG overlaps), cost timing, rounding, and alternate action/tier resolution. Require explicit independent tests for each ruling.
3. **Checkpoint 04 — Effect execution contracts:** Reconcile 159 typed operation names with their real V2 owners (damage, conditions, resources, movement, shielding, duration, fire, targeting). Define deterministic action/roll receipts, fail-closed rules and GM adjudication boundaries.
4. **Checkpoint 05 — Implementation handoff:** Produce one source-linked contract with no unresolved *blocking* decisions. Do not claim all Foundry runtime acceptance scenarios executed until they actually run in Foundry v13.

## Reproducibility

From the project checkout:

```bash
python -m pip install jsonschema
python tools/audits/verify-force-v2-bookwise.py --package-dir docs/audits/force-v2/bookwise-v2.9 --json-out /tmp/force-v2-crossbook-verification.json
```

For a deliberately strict release gate, append `--strict-ready`: it returns nonzero while any unresolved certification blockers remain. The companion `cross-book-certification-checkpoint-01.json` records the offline results (including all 31 repeated-power metadata IDs and all 12 blocking issue IDs).

**Next action:** begin checkpoint 02; no production mutation is authorized by this certification file.
