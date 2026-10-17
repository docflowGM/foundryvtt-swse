# Knights of the Old Republic Campaign Guide — Phase 2B Checkpoint 1

**Source-review status: 10 / 32 publication identities directly reviewed in the original printed PDF. Strict full-field and physical-mount mechanical certification: 0 / 32.**

## Provenance and guardrails

- Repository `docflowGM/foundryvtt-swse`; existing vehicle branch `audit/vehicle-phase-0-1-canonical-foundation`, verified remote HEAD `49fabf107f287b8147a59b75a9dd09e49ed7426f` (October 16, 2026).
- Immutable Phase 1 Git blob `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`, source file `data/audits/vehicles/swse-phase1-vehicle-provenance.json`.
- Original KOTOR PDF SHA-256 `fd6a61b0ca0d5d8aeec722d033a6652cb23c932f119d4298f523394f96efa419`. A printed page *p* is PDF zero-based page index *p* in this source, and ordinal physical PDF page *p+1*.
- Only the KOTOR checkpoint's audit ledger, separate mount backlog, discovery-only catalog, validator and this report are generated. No production compendia, actors, engine, or schema were modified.
- A mechanically absent field is represented as source silence, never silently made numeric zero; a reviewed printed attack group does **not** prove a fully resolved physical mount or firing arc.
- The record set is **the Phase 1 enumerated publication identities**, not an independently exhaustive inventory of every mentioned vessel in the book.

## Checkpoint metrics

| Metric | Verified value |
|---|---:|
| Phase 1 publication records preserved | 32 / 32 |
| New primary-source PDF close reads | 10 |
| Cumulative source-reviewed records | 10 / 32 |
| Unreviewed publication records | 22 |
| Individual printed weapon attack groups reviewed | 17 |
| Discovery-only schema cases | 27 |
| Published internal numeric conflicts verified in this tranche | 0 |
| Phase 1 locator mismatch preserved, not silently changed | 1 |
| Strict mechanical certificates | 0 / 32 |
| Preexisting complete-source-review count across earlier books | 219 / 316 |
| Project total *including this unpushed checkpoint* | 229 / 316 |

## Newly source-reviewed ships

| # | Phase 1 locator → actual printed statblock | Ship | CL | Attack groups | Source-derived finding |
|---:|---|---|---:|---:|---|
| 1 | p95 → **p96** | S-100 Stinger-class Starfighter | 9 | 2 | Phase 1 registered introductory page; actual statblock and both pilot weapons on p96. Eight proton torpedoes. |
| 2 | p96 → p96 | Star Saber XC-01 Starfighter | 10 | 1 | Pilot heavy laser cannons +4, autofire -1; utility-droid 10-jump memory. |
| 3 | p98 → p98 | 578-R Space Transport | 6 | 1 | Four emplacement points, stock x3 hyperdrive; defective factory examples can lack motivator/dampener. No printed SR. |
| 4 | p98 → p98 | G-Type Light Shuttle | 8 | 1 | Untrained-only +2 Pilot equipment bonus; p99 escape variant replaces shield, passenger, cargo, consumables and hyperdrive statistics. |
| 5 | p99 → p99 | Lethisk-class Armed Freighter | 10 | 2 | Gunner lasers and pilot light concussion missiles, payload twelve, three emplacement points. |
| 6 | p100 → p100 | Pelagia Duplex Command Assault Gunship | 12 | 2 | Two heavy lasers plus two lasers, specialized crew positions, +5 installation-only Mechanics checks, reduced-crew narrative. |
| 7 | p100 → p100 | Quartermaster-class Supply Carrier | 6 | 0 | **No printed Ranged or weapon attack rows**; the narrative references minor defensive systems but supplies no statted weapon inventory. |
| 8 | p101 → p101 | Praetorian-class Frigate | 14 | 3 | Tactical Fire: forego attacks for allied +1 Ref and +10 Fort and threshold in radius 2; battery groups and tractor grapple +63. |
| 9 | p143 → p143 | Baronial-class Yacht | 6 | 1 | Presented under “Jedi Covenant Shuttle,” but printed statblock identifies Baronial-class Yacht. |
| 10 | p161 → p161 | Interdictor-class Warship | 16 | 4 | Tactical Fire slows enemies and reduces Ref; gravity wells: +8, 3×3 starship-scale area, Special (SG 45); tractor grapple +61. |

## Key review conclusions

### Phase 1 Stinger locator discrepancy (provenance, not a source contradiction)

The p95 introduction is followed by the complete **CL 9 S-100 Stinger statblock on p96**. Phase 1 records `printedStatblockPage: 95` and `pdfPhysicalPage: 96` (ordinal). Those two original Phase 1 fields have **not** been mutated in the checkpoint. The ledger records `verifiedActualPrintedStatblockStartPage: 96` and the actual scanned source evidence pages `[95, 96]`. A separate identity/page reconciliation may update the canonical provenance later; this review does not do so.

### G-Type escape-shuttle equipment variant

The basic G-Type on p98 is crew 1, passengers 3, cargo 10 tons, SR 30, consumables 1 week, and **no printed hyperdrive entry**. The printed p99 escape version modifies the *same* ship entry: SR 50, no passengers, cargo 2 tons, consumables 4 months and hyperdrive x2 (backup x10), navicomputer, at a higher cost. Do not register a second publication identity or retroactively give the stock ship the variant hyperdrive.

### Quartermaster source silence

The p100 statblock has no Ranged, weapon details, or damage attack line, although prose says there are a few minor defensive systems. The ledger therefore records **zero verified attack groups** and explicit source silence, **not** an affirmative claim that the ship is unarmed or has zero physical mounts.

### Crew, weapons, and unusual support abilities

The Pelagia has two cockpits and two gunnery pods, and two *printed cannons* in each of its two weapon groups. Its narrative permits effective flight with fewer personnel than the listed five expert crew; it also has an installation-specific +5 Mechanics equipment bonus. No complete arcs or free mount totals are provided. The Praetorian and Interdictor print explicit battery counts and gunner groups, but underlying component counts, battery topology, and all arcs remain unresolved. Both have mutually distinct Tactical Fire behavior, which must not be normalized into a generic weapon attack or mistaken for an always-on aura.

The Praetorian supports nearby allied starships by increasing Reflex Defense, Fortitude Defense and damage threshold. The Interdictor instead hinders enemy starships, including a speed floor of one square. Its four gravity well projectors have an unusual area weapon row referencing **SG 45**; the reference is retained verbatim and is **not** mechanically resolved or implemented in this checkpoint.

### Explicit source silence and mount backlog

The 578-R has no shield rating line; the base G-Type and Pelagia have no hyperdrive line; and the Quartermaster has no printed weapon attack rows. Every reviewed ship still lacks full source-certified firing arcs and battery/mount topology. Where the source specifies battery quantities or gunner allocation, the ledger preserves them while separating them from inferred independent turret locations.

## Artifacts and acceptance boundary

The five changed files are:

1. `data/audits/vehicles/swse-phase2b-kotor-cp1-per-entry-source-review-ledger.json`
2. `data/audits/vehicles/swse-phase2b-kotor-cp1-weapon-mount-backlog.json`
3. `data/audits/vehicles/swse-phase2c-kotor-cp1-schema-discovery.json`
4. `tools/audits/vehicles/check_kotor_phase2b_cp1.py`
5. `docs/audits/vehicles/swse-phase2b-kotor-cp1-source-review.md`

Run: `python tools/audits/vehicles/check_kotor_phase2b_cp1.py --repo-root . --source-pdf <KOTOR PDF> --phase1 <full Phase1 JSON> --require-phase1 --zip-file <CP1 changed-files zip>`.

The validator checks fixed Phase 1 keys/name/page mappings, reviewed/pending states, exact spot-checked printed facts, cumulative counts, weapon group/backlog correspondence, source conflicts, edition-silent fields, unmapped firing arcs, discovery isolation, optional full original Phase 1 Git blob verification, optional source PDF SHA-256, and ZIP CRC/content integrity. A local run without the **full** Phase 1 file can check the live-verified 32-identity embedded projection but must not be represented as a full original-blob comparison. It is not a replacement for independent visual scrutiny or repository-wide runtime regression.

**Branch policy:** Checkpoint 1 is intentionally **not pushed**, consistent with the agreement to commit and push only after the 32/32 KOTOR source-review closure. The GitHub branch remains at its previously verified HEAD.

**Next tranche:** Checkpoint 2: Centurion-class Battlecruiser (p163), Derriphan-class Battleship (p163), Herald-class Shuttle (p164), Sith Interceptor (p164), S-250 Chela-class Starfighter (p181), Aurek Tactical Strikefighter (p181), Conductor-class Landing Craft (p182), Ministry-class Orbital Shuttle (p182), Foray-class Blockade Runner (p183), KT-400 Military Droid Carrier (p183). Target **20 / 32** cumulatively reviewed.
