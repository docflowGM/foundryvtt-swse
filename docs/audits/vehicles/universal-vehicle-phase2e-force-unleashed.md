# Universal Vehicle Phase 2-E — Force Unleashed Campaign Guide

**Status:** Entire-book mechanical source staging **34 / 34** complete under existing universal schema draft v0.5. This is *not* a strict physical weapon mount or runtime certification.

## Published-identity census and scope

| Publication source | Records |
|---|---:|
| Historically PDF-reviewed spacecraft | 19 |
| Additional source-verified vehicles | 15 |
| **Distinct publication identities** | **34** |
| Source attack groups (ships + new vehicles) | 41 + 17 = **58** |
| Newly certified physical mount profiles | 0 |
| Runtime packs, compiled compendiums or Actors altered | 0 |

The source authority is the *Force Unleashed Campaign Guide* original scanned PDF, SHA-256 `0ef4b47b2bf55091c13c1960e4ea367675cb7d84a776f0b9f6dc8fc27c57840c`. Its fast-search layer is `Force Unleashed Campaign Guide_djvu.txt`. The original 19 spacecraft were previously reviewed against printed source pages and are adapted from `data/canonical/vehicles/ships.json`, not claimed to be independently close-read anew in this pass. All 15 newly discovered records were checked against relevant scanned pages, printed pp110–113, 142, 200–203 (physical PDF pp111–114, 143, 201–204).

## Materials

- Phase 1 identity/provenance authority: `data/audits/vehicles/swse-universal-phase1e-force-unleashed.json`
- 15 new source snapshots: `data/audits/vehicles/swse-universal-phase2e-force-unleashed-new-fixtures.json`
- 34-record universal-schema staging: `data/audits/vehicles/swse-universal-phase2e-force-unleashed-staged.json`
- Book-wide acceptance suite: `tests/vehicle-universal-phase2e-force-unleashed.test.mjs`

## Printed mechanical exceptions and source disagreements

The A-A5 cargo speeder's Initiative header (+3) conflicts with its Skills Initiative (-3). The modified X-34 has header Init +3 versus Skills Initiative +9. The Freerunner prints blaster cannons +3 in Ranged but +4 in the detailed weapon row. The TX-130T prints +1 in the Ranged summary, but +2 in both detailed attack rows. Both printed forms are retained. All historical source disagreements also remain attached to the originating ship records.

The Zephyr-G statblock says **Cargo 100 kg**, while adjacent narrative says stock cargo is absent and a 10-credit pannier option provides 100 kg. The staged printed cargo remains 100 kg with an explicit unresolved exception rather than asserting either reading as universal runtime behavior.

The Flare-S optional 20,000-credit SR 5 shielding, high-altitude modifications and mutually exclusive heavy weapons remain optional, not stock. The civilian Arrow-23 (without guns) is narrative, not another publication record. The open Freerunner weapons platform and optional enclosed cockpit are deferred typed configurations. The AT-CT's tractor beam can throw held objects, but its attack is not modeled as ordinary damaging cannon fire.

The A5 Juggernaut remains a 10-wheeled vehicle, the AT-KT and AT-CT have independent walker identities, and the Mobile Command Base is a tracked rather than repulsorlift vehicle. Two speeder escort statblocks from the Prisoner Convoy adventure remain independently indexed even when their chassis are known from other books.

**Authority boundary:** The 58 attack-group rows are printed evidence. No missing hardware counts, arcs, station assignments, mount identities, effects, or Foundry actor behaviors have been inferred. Special-rule and source-conflict records remain uncertified for execution. Explicit absence, unknown, stock, and optional capabilities remain distinguished.

**Next sourcebook:** Scum and Villainy, Phase 2-F; review its Phase 1 ledger and proceed in one whole-book checkpoint.
