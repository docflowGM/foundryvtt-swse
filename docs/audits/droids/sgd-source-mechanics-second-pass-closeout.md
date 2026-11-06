# Scavenger's Guide to Droids — Published Source-Mechanical Second Pass COMPLETE (M14)

**Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Primary source:** *Scavenger's Guide to Droids*, printed pp.68–159 (46 paired source presentations, 92 pages). Each spread reviewed during M5–M14 and the earlier structural-hydration program.

## Completion claim — strictly scoped

**46/46 SGD publication identities have received the detailed primary-statblock, protocol/action-economy, published modification, nonfactory equipment and construction-route second source pass.** This closes *source-mechanical claim capture*, **NOT strict mechanical certification**. All 46 records remain `mechanicalStatus: partial` and not runtime-tested. The entire publication corpus remains 234 identities and 0 strictly certified under the current project's classification.

| Audited source-ledger measure | Total |
|---|---:|
| Frozen SGD source identities | 46 |
| Hydrated/secondary-page source-reviewed | 46 |
| Detailed second source-mechanical review | **46** |
| Source-only protocol/action records | **200** |
| Published optional/nonfactory configuration claims | **110** |
| Source-only model-specific constraints | **117** |
| Preserved unresolved printed-source contradictions/divergences | **23** |
| Printed attack groups, kept non-executable | **133** |
| Strict mechanically certified | **0/46** |
| Foundry runtime verified | **0/46** |

These are **record counts**, not unique canonical trait/ability definitions and not a promise that executable actor content is ready.

## Final 046 — YVH-Series Battle Droid, pp.158–159

Unlike 036–045, this record had already been deeply populated by an earlier source-hydration closeout. The final pair of printed pages was independently rechecked, and **no duplicate actions or Guardian variant** were added.

Preserved five source-only protocol actions: ordinary blaster cannon, Maximum Firepower, vibroblade, Yuuzhan Vong Scan and Yuuzhan Vong Taunt. The printed variable-power blaster cannon has **30 normal shot units**, with stronger mode using **two units** to increase the damage die from 3d12 to 4d12; additional attack rights are not implied. Its low-powered repulsorlift booster halves Jump DCs as a free action and **does not grant flying speed**. YV sensors require opposed check against Yuuzhan Vong within 12 squares.

Preserved two contradictions:

- `SGD-046-SCAN-ACTION-COST-CONFLICT`: full-round action in main prose, **two swift actions** in protocol.
- `SGD-046-TAUNT-ACTION-AND-TARGET-CONFLICT`: main FREE action targets **all** Yuuzhan Vong within six squares; protocol TWO SWIFT actions target **up to three**. Successful targets must attack YVH next turn, not fall under generic mind control.

Guardian remains nonfactory: **12 hours reprogramming, DC25 Use Computer**, replacing one soldier talent with Harm's Way; its repeated protective reactions do not belong to baseline YVH. Heroic chassis starts separately from stock battle droid with lawful soldier acquisition, heavy armor and heavy-weapons proficiencies, laminanium replacement and YV sensor pack.

Five additional source-only constraints document repulsor, scan, taunt, shot consumption and Guardian replacement. Its previously source-recorded weapon mount notes remain uncertified: cannon right arm, interchangeable left mount, no inferred vibroblade hand/ownership.

## Last-page source locator correction

SD-X `SGD-036-THREAT-SCAN-ACTION-CONFLICT` now identifies the protocol claim on **printed p.139 / PDF p.140**, rather than citing the main p.138 for both views. Both opposing action interpretations remain unresolved.

## Project acceptance / next gate

GitHub-content audit after new claims:

- 46 unique, ordered published source keys remain.
- Every record has source-only protocol actions; 200 actions / 110 nonfactory variants / 117 constraints have distinct, source-bearing rule IDs.
- All 23 recorded contradictions remain flagged unresolved with dual citations.
- Printed attack rows remain non-executable; no record acquired `mechanicalStatus: certified`.
- No production V2 class/feat/talent/weapon roll, Garage, Store, chargen, actor, vehicle or other component-refactor workstream altered.

**Outstanding strict source-mechanical work** is material: certify exact feat/talent identities, class advancement legality, skill choices, purchased/factory equipment, appendage and weapon-mount ownership, ammunition and power resources, NPC-vs-PC chassis routes, vehicle-authored combat, and all conflicting source effects before independently issuing a record certificate. Runtime V13 tests belong to the post-implementation/merge process; lack of live runtime testing alone does not prevent a properly proven **source** certificate.

**Checks actually executed:** remote source-ledger parsing, 46-key uniqueness/order, model/claim inventory, source locator/null/execution-status guards, 23 unresolved conflict conservation, zero attack promotion and zero certification inflation, exact GitHub commit/readback. **Not executed:** original Python Draft202012 validator against GitHub ledger, full repository test suite, complete cross-domain feat/weapon/mount mechanics and live Foundry runtime.

**Machine manifest:** `data/audits/droids/sgd-source-mechanics-second-pass-closeout.json`.  
**Next publication-audit milestone:** move to strict mechanical identity/ownership certification (not another basic SGD source inventory).
