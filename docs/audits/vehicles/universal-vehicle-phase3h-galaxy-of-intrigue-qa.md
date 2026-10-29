# Universal Vehicles Phase 3H — Galaxy of Intrigue PDF field QA

**Verified source:** `Galaxy of Intrigue.pdf` SHA256 `c43531ac33c6e6bd84c18ff8e26a472dc8ef95ebb46948beb3beb29be384da21`; printed p. 71, physical PDF p. 72, checked from the original rendered page. The DjVu TXT was used only to locate text. This certification is **source-field QA**, NOT weapon mount, arc, station, attack execution, or live Foundry approval.

## Result

- **2/2 newly enumerated groundspeeders direct PDF field-QA verified**; 6 inherited spacecraft retained without retranscription.
- **Galaxy of Intrigue: 8/8 exact publication identities preserved.**
- **Universal 48-entry queue: 2 PDF-field verified; 46 pending.** Source staging remains 429/429.
- Existing `data/canonical/vehicles/ships.json`, compendiums, generated Actors, and runtime are unchanged.

## Printed-page reconciliation

| Field | Corona Limited Luxury Groundspeeder (CL 4) | SoroSuub JG-8 Luxury Landspeeder (CL 2) |
| --- | --- | --- |
| Printed type | Huge ground vehicle (speeder) | Large ground vehicle (speeder) |
| Init; Senses Perception | +7; +6 | +8; +6 |
| Ref (flat-footed); Fort; armor | 14 (11); 24; +3 | 14 (11); 15; +2 |
| HP; DR; Threshold | 90; 5; 34 | 55; 5; 20 |
| Speed | 12 squares, max 300 km/h | fly 12 squares, max 450 km/h |
| Space; Cover | 3×3; total | 2×2; +5 |
| BAB; Grp | +2; +26 | +2; +12 |
| Str; Dex; Con; Int | 38; 16; none; 14 | 21; 16; none; 14 |
| Skills (Init / Mechanics / Perception / Pilot / Use Computer) | +7 / +6 / +6 / +7 / +6 | +8 / +6 / +6 / +8 / +6 |
| Crew; passengers | 1 skilled; 6 | 1 skilled; 1 |
| Cargo; consumables; carried craft | 300 kg; 2 days; none | 50 kg; 1 day; none |
| Availability; new / used cost | Licensed; 70,000 / 20,000 credits | Licensed; 45,000 / 12,500 credits |
| Printed ranged attacks | No attack line | No attack line |
| Printed hyperdrive | Not stated | Not stated |

**Repair:** Phase 2 had copied the *left-column Sabaoth Frigate Spy Ship* into Corona's speed, hyperdrive, abilities, attacks, crew, passengers, cargo, consumables, and price. The scanned PDF explicitly places Corona in the right column. All contaminated fields have been corrected. The Corona movement mode is categorized as repulsorlift from the printed vehicle type; the exact speed line is preserved independently without inventing a printed `fly` label. The JG-8 field values were already correct, but its source notes now record direct primary-PDF verification. Its rollover-gravity narrative is not promoted into an executable rule.

**Other bookkeeping:** Phase 2 summary had stale `missingHP`/`missingRef` entries for Ferret and Prowler despite populated values; those are cleared. Count of source firing groups changes from 10 to 9 because the Corona's copied frigate gun is removed.

## Scope and acceptance

- Original PDF checksum agrees with frozen Phase 1 ledger.
- The six inherited ship keys and mechanical fields are untouched; prior ship source reviews are not restarted.
- The two new vehicles retain `rules.reviewStatus = partial-source-probe` and `/rules/strictMechanicalCertification = not-yet-reviewed`. No physical mount keys are established, no stock attacks are trusted.
- `swse-universal-phase3-source-pdf-qa-queue.json` lists the exact 48 pending/verified publication identities from the seven final books; no first-seven or previously reviewed spacecraft are in this queue.
- Automated `tests/vehicle-universal-phase3h-galaxy-of-intrigue.test.mjs` locks the verified fields, eight keys, queue, provenance and fail-closed boundaries. Existing aggregate 429-staging regression remains unchanged.

**Next book:** Jedi Academy Training Manual (0 new records): check its one existing ship identity/provenance without retranscription, document no new PDF-field QA work, and checkpoint.
