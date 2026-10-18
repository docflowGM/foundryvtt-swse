# Starships of the Galaxy — CP17 independent strict-certification baseline

**Checkpoint:** CP17, independently recomputed structural baseline and 100-ship work queue. **No newly certified ships.**

## Verified repository authority

- Repo: `docflowGM/foundryvtt-swse`.
- Existing vehicle audit branch: `audit/vehicle-phase-0-1-canonical-foundation`, confirmed at `318c635e07577f9d04f9e1707908bf4590528758`.
- CP17 isolated branch: `audit/sotg-strict-certification-cp17` (created from that exact SHA, not main).
- Original supplied scanned *Starships of the Galaxy* PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`. Checked independently against the local original PDF, CP16 ledger and CP16 mount backlog.
- CP16 sources remain read-only. No compendium record, pack, Foundry runtime, vehicle combat code or Pure/Modified refactor is modified.

## CP17 results

| Metric | Independently recomputed |
|---|---:|
| Publication-specific entries | 104 |
| Source-review close reads | 104 |
| Prior strict field + weapon-mount certificates | 4 |
| Still uncertified | 100 |
| Attack-group records | 258 |
| Physical hardware-count source-silent row slots | 228 |
| Firing-arc source-silent row slots | 251 |
| Battery-count source-silent row slots | 132 |
| Legacy hardware-count absent keys | 2 |
| Legacy firing-arc absent keys | 1 |
| Legacy battery-count absent keys | 7 |
| Publication records with conflicting field groups | 12 |
| Separately tracked schema-discovery cases | 155 |

All values above were recomputed against CP16 records rather than merely copied from header totals. Existing strict certificates are preserved for Action VI Bulk Transport (p.58), CR70 Corvette (p.75), Class 720 Freighter (p.88) and Consular-class Cruiser (p.126). A source-complete close read is **not** a physical weapon-mount certificate.

### Work queue grouping

| Track | Count | Rule |
|---|---:|---|
| `P0_SOURCE_CONFLICT` | 12 | Exact conflicting printed source fields; reconcile or record a narrowly approved adjudication. |
| `P1_LEGACY_MISSING_FIELDS` | 3 | At least one historical missing weapon-mount key, not merely an explicit source-silent marker. |
| `P2_PHYSICAL_SOURCE_SILENCE` | 84 | One or more source-silent hardware, arc or battery slots block the existing physical-mount gate. |
| `P3_FIELD_SOURCE_SILENCE_OR_OTHER_GAP` | 1 | The Rendili Star Drive Light Corvette (p.102) needs review of its source-silent payload/field-group status and the printed arc scope despite no sentinel-marked mount fields. |
| **Total queued** | **100** | No queue item is a newly granted certificate. |

Category precedence is P0 > P1 > P2 > P3, preserving all underlying evidence even where several issues co-occur. The work queue retains ledger array indices, stable source keys, printed page locators, per-row indices for source silence and absent keys, field exceptions, conflicting field groups, and certification blockers. **The queue is an audit view, not a new rules SSOT.** Full printed facts remain in the CP16 ledger.

## Required adjudication: confirmed source silence versus physical mount certification

**Recommendation — Approve a two-layer, fail-closed certificate, with explicit source-silent states:**

1. A **published-mechanics/source-fidelity certificate** may allow explicit `SOURCE_SILENT_CONFIRMED` when a close read of the printed PDF establishes that the book truly omits a fact. Such fields must not be assigned an invented physical count, arc, battery size or launch capacity. This is evidence of omission, not evidence of zero.
2. A **physical-mount/automated-stock-combat certificate** remains independently gated. A ship/attack group lacking the weapon geometry, station configuration or mount identity needed for the intended runtime path cannot gain trusted stock attack authority. The existing four physical certificates must not be weakened.
3. Preserve explicit `None`, numeric zero, not applicable, unknown-by-neglect, malformed source, source conflict and source-silent as distinct values. Normalize legacy absent keys only when actual source evidence supports the classification; never treat a missing key as automatically source-silent.
4. Preserve all exact printed attack rows even where they conflict with inferred arithmetic. Sourcebook line citations, configuration-specific variants, and any owner adjudication must accompany the corrected state.

Until the owner approves this policy, **no new full strict mechanical certificate** may be granted by treating source silence as a pass. A policy approval does **not** automatically certify any ship; each ship still requires individual field and mount review.

**Owner decision:** Approve (recommended two-layer policy); Deny (keep existing all-physical-mount gate; many ships will remain uncertifiable from this book alone); Other (specify a different evidence/authority standard).

## Next checkpoints

- **CP18 — evidence/policy normalization:** record owner decision, define field-level source silence v. missing v. conflict v. explicit zero/None, test lossless mapping into v0.6 without production mutation.
- **CP19 — 12 conflict-bearing ships:** visual sourcebook review and explicit source-conflict resolution only where supported; preserve variants and printed anomalies.
- **CP20 — 3 legacy missing-key ships:** re-read original pages, repair audit schema shape without inventing details.
- **CP21 — source-silent physical mounts (84):** independently classify each group, distinguish printed attack-group count from installed hardware count, reject inferred arcs.
- **CP22 — 1 residual case and book closeout:** reconcile the Rendili source-silent payload and source-narrative arc scope, then reassess all 104 certificates against the adjudicated policy.
- **CP23 — conditional schema and production readiness:** after source fidelity is proven, reconcile against v0.6 and separately address the known Phase 0B legacy fixture gate (12 schemaVersion mismatches, 2,112 unclassified null/empty positions). Do not silently mark that gate green or authorize Phase 3 hydration.

## Reproduction

```bash
python tools/audits/vehicles/check_sotg_phase2b_cp17_baseline.py --repo "." --source-pdf "/path/to/SAGA EDITION - Starships of the Galaxy.pdf"
```

Run existing CP16 and the rest of the SotG suite before proposing a merged checkpoint. CP17's validator checks the immutable CP16 Git blob SHAs, primary PDF SHA (when passed), record counts, every queue row and its priority, historical four certificates and strict no-runtime-trust gates. It is structural verification; it cannot replace visual printed-page checking. The 15 CP16 audit validators were reported passing in the CP16 authority, not independently re-executed as part of the initial CP17 connector-only baseline.

## GitHub boundaries

Changes for CP17 are restricted to these new files on its own branch:

- `data/audits/vehicles/swse-phase2b-sotg-cp17-independent-baseline.json`
- `data/audits/vehicles/swse-phase2b-sotg-cp17-strict-certification-work-queue.json`
- `tools/audits/vehicles/check_sotg_phase2b_cp17_baseline.py`
- `docs/audits/vehicles/swse-phase2-sotg-checkpoint-17-independent-baseline.md`

Do **not** merge or alter CP9C vehicle combat integration as part of this audit. D01-D03 remain approved, D04 staged enforcement denied, and D-005 Pure/Modified architecture out of scope. No fully operational stock attack authority is issued by this checkpoint.
