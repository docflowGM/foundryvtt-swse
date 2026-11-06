# SWSE Phase 2B — Final 17 Entries — Fixed Phase1 Census Closure

## Summary

- Final tranche: **17 newly source-reviewed published ship records**.
- **Core Rulebook**: existing 6 records preserved, 4 newly reviewed; now 10/10 source-reviewed.
- **Galaxy at War**: 5/5 source-reviewed.
- **Galaxy of Intrigue**: 6/6 source-reviewed.
- **Jedi Academy Training Manual**: 1/1 source-reviewed.
- **Threats of the Galaxy**: 1/1 source-reviewed.
- **Overall fixed Phase1 publication-specific ship census: 316/316 source reviews reported across the complete series.**
- Important: the historical 316 count is **not independently exhaustive**. Known out-of-roster complete ship statblocks include the Hornet and Deep-X. Those require reconciliation before claiming a corrected global sourcebook census.
- No new strict mechanical certificates. PDF source review is not production/mechanical certification.

| Book | New this tranche | Total reviewed | Weapon attack groups (book cumulative) | Discovery cases | Printed conflicts |
|---|---:|---:|---:|---:|---:|
| Core Rulebook | 4 | 10 | 22 | 36 | 2 |
| Galaxy at War | 5 | 5 | 13 | 18 | 1 |
| Galaxy of Intrigue | 6 | 6 | 9 | 23 | 2 |
| Jedi Academy Training Manual | 1 | 1 | 1 | 4 | 0 |
| Threats of the Galaxy | 1 | 1 | 1 | 3 | 0 |

## Priority findings

1. **YU-410, Galaxy at War p65**: printed DR 15; DR 20 labels are ambiguous. Never interpret the second DR as a resolved shield rating without documented editorial correction.
2. **Ferret recon ship, Galaxy of Intrigue p69**: main missile attack +9 versus detailed +11. Preserve both.
3. **Modified Lambda, Galaxy of Intrigue pp186-187**: visible printed editorial comment about the uncertain hyperdrive. Preserve text and ambiguity.
4. **Vulture droid, Core pp180-181**: the starfighter/walker capability is one printed publication identity with a standard-action transition.
5. **Citadel cruiser, Galaxy at War p192**: adventure notes baseline normal-crew statistics; do not apply the adventure’s damaged ship state to the entire cruiser class.
6. **Chu'unthor, Jedi Academy p151**: Colossal station capital ship with two tractor beam batteries, not an assumed conventional mobile warship.
7. **VCX-350, Threats p89**: gunner or pilot operates the laser weapon, x11 backup hyperdrive as printed.

## Fixed roster closure vs. mechanical certification

- 316/316 means original Phase1 entries were **source-reviewed**, not that 316 ships have complete certified physical mounts, fire arcs, or Foundry runtime implementations.
- The previously completed SotG 4 strict certificates are independent of this tranche; no additional strict certificates have been claimed.
- Out-of-roster Deep-X and Hornet candidates remain outside the frozen denominator and are not silently injected.
- Phase1 provenance remains immutable; no production actors, packs, or hydration modified.

## Push hygiene

- Book audit artifacts are source JSON, schema discovery JSON, reports, validation scripts only.
- This handoff and the archive comprise repository-relative audit files; PDF scans are not committed.
- GitHub push must verify branch HEAD and use non-force lease / ordinary fast forward only.
- Run focused validators; GitHub-connected repository-wide tests were unavailable in this environment.

