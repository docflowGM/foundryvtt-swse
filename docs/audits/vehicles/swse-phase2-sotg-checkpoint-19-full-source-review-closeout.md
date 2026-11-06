# Starships of the Galaxy — CP19 final 100-ship publication-specific source review closeout

**SOURCE-REVIEW WORKSTREAM COMPLETE. NOT MECHANICALLY CERTIFIED.**

Owner-approved two-layer authority: `SOTG-CP18-D01`. Source PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`. Isolated branch `audit/sotg-strict-certification-cp17`.

| Audit result | Independently validated |
|---|---:|
| Printed ships in original book | 104 |
| Preexisting field-and-mount strict certificates | 4 |
| Initially uncertified ships reviewed across seven CP19 tranches | **100 / 100** |
| Queue attack-group rows compared | **257** |
| Total book attack-group rows | 258 |
| Source-review tasks remaining | **0** |
| New source-fidelity certificates granted | 0 |
| New physical mount / stock combat certificates granted | 0 |
| Mechanically uncertified backlog (unchanged) | **100** |
| Separate schema-discovery cases | 155 |

## Review sequence and final source evidence

Seven tranches preserved stable original CP17 queue positions with batches of 15, 15, 15, 15, 15, 15 and 10 ships. The attack group partitions are **47, 39, 40, 38, 37, 38, 18**, totaling **257** of the 258 published rows; the remaining published group belongs to the four previously certified source records.

The final 25 ships (Tranches 6 and 7) were checked against the matching original PDF's rendered printed pages, preserving all CP16 raw weapon-group data. No physical gun counts or firing arcs have been derived from battery gunners, attack row totals, ammunition, deck-plan silhouettes or named variants.

## Outstanding controlled source reconciliation (NOT applied)

Four directly page-supported ledger-value correction candidates remain: **Acclamator II** p57 two heavy proton torpedo tubes; **Slave I** p85 concussion mine `8d10x2` (not `10d10x2`); **Hapan Battle Dragon** p93 four mass-pulse tubes; **Nebula-class Star Destroyer** p119 heavy ion battery `3d10x5 ion` (not `11d10x5 ion`).

One distinct **evidence-classification** candidate is the **TIE/In** p142 explicit narrative lack of hyperdrive vs CP16 source silence. It must not be forced into a nonexistent literal printed `None` stat field. One **field-semantics** issue is the Skipray p131 printed `-20` penalty vs derived attack `-15`. Twelve printed-conflict-bearing entries retain all their contradictory source claims. Eight historical attack-group rows still lack their own source-page keys; parent statblock page is a separate locator.

## Certification policy and next gate

Review completeness is independent of either level of approved certification. A publication-source fidelity certificate may retain verified source silence, but must prove complete per-ship lossless mapping, variant scoping, conflicting printed claims and schema evidence. Physical-mount/automated stock attack certification is separately blocked until mechanical geometry, configured station and provenance are supported. **No ship has been newly certified in CP19; all 100 original backlog cases remain uncertified under the existing strict gate.**

Do not mutate the immutable CP16/CP17 original evidence or the CP18 source overlay in place during this closeout. No v0.6 vehicle schema freeze, production hydration, Pure/Modified vehicle/droid refactor, or CP9C vehicle combat integration work is authorized here.

Historical CP16 comparator still cannot run because the certified CP15 comparison ledger is absent from the inherited branch. CI explicitly reports this as a skipped prerequisite, not a pass. Sourcebook PDF visual review and matching SHA-256 are separate from automated GitHub structural tests.

## Audit files

- Tranche 6: `data/audits/vehicles/swse-phase2b-sotg-cp19-tranche06-primary-source-review.json`
- Tranche 7: `data/audits/vehicles/swse-phase2b-sotg-cp19-tranche07-primary-source-review.json`
- Closeout: `data/audits/vehicles/swse-phase2b-sotg-cp19-full-100-ship-source-review-closeout.json`
- Reproducible validation: `tools/audits/vehicles/check_sotg_phase2b_cp19_closeout.mjs`

**Final CP19 disposition:** All remaining source-review items closed, all original published uncertainties and mechanical certification blockers retained. Subsequent work is controlled source-ledger correction, evidence-schema reconciliation, individual source-fidelity qualification and—separately—physical runtime capability tests.
