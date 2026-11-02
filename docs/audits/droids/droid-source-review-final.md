# SWSE Droid Source Review — Checkpoint 11 (2026-11-02)

**SOURCE-REVIEW PHASE COMPLETE: 234/234 publication identities drafted, 234/234 selected-field PDF reviews, 3,615 selected field comparisons across 13 books with droid statblocks plus JATM (rules-only).**

**NOT MECHANICALLY CERTIFIED: 0/234 certified; 0/14 books mechanically certified.** Do not confuse selected-page visual review with field-by-field certification.

The prior nine-book checkpoint is preserved. Final books: Galaxy of Intrigue 8, Unknown Regions 6, Scum and Villainy 5, Starships of the Galaxy 3. They add 240 selected field receipts. Starships has three vehicle-primary records; attack groups and vehicle HP never become droid-actor rights.

## Source coverage

| Book | Publication identities | Selected-PDF reviews | Visual comparison receipts | Mechanical certifications |
|---|---:|---:|---:|---:|
| SGD | 46 | 46 | 811 | 0 |
| CLONE | 40 | 40 | 528 | 0 |
| THREATS | 29 | 29 | 314 | 0 |
| KOTOR | 24 | 24 | 369 | 0 |
| GAW | 22 | 22 | 285 | 0 |
| REBELLION | 15 | 15 | 325 | 0 |
| CORE | 13 | 13 | 263 | 0 |
| LEGACY | 12 | 12 | 251 | 0 |
| FORCE | 11 | 11 | 229 | 0 |
| GOI | 8 | 8 | 94 | 0 |
| UNKNOWN | 6 | 6 | 99 | 0 |
| SCUM | 5 | 5 | 32 | 0 |
| SOTG | 3 | 3 | 15 | 0 |
| JATM | 0 | 0 | 0 | 0 |
| **TOTAL** | **234** | **234** | **3615** | **0** |

## Source conflicts retained

- Galaxy of Intrigue NR-1100 prose says unarmed while printed statblock supplies blaster attack and possession. Do not auto-resolve.
- Galaxy of Intrigue 3D-4 stock narrative is unarmed while presented example carries a concealed hold-out blaster.
- Unknown Regions F1 Force points/other printed class facts do not enable droid-wide Force mechanics.
- Scum and Villainy Roche 8D8 heat resistance is its own factory component effect, not necessarily SGD 8D.
- Starships three autonomous starfighters require Vehicle SSOT; printed attack groups do not establish physical mounts or extra attacks.
- Earlier book discrepancies and exceptions remain in the separate rolling reports and evidence ledgers, including Core printed Droideka CL 4 vs census CL 6.

## Acceptance gates and reproducibility

The local source review semantic and negative mutation suites are not the full upstream universal schema validator and are not Foundry runtime tests. Full source field verification, published effects, equipment, feat/talent identity and mounted weapon legality remain pending for all 234 records. No production compendium or actor records were changed.

All books remain `IN_PROGRESS` for mechanical certification; this handoff closes only the **selected-source-field review** queue.

## Data paths

- `data/canonical/droids/source-books/{book}.json` publication-specific source records (13 nonzero books).
- `data/audits/droids/{book}-field-evidence.json` PDF hashes, indexed OCR excerpts and selected-field receipts.
- `data/audits/droids/{book}-review-backlog.json` independent mechanical blockers per record.
- `docs/audits/droids/hydration-{book}-rolling.md` source review reports.
- `data/audits/droids/sotg-vehicle-source-evidence.json` vehicle-owned figures, separated from actor fields.

**Repository push authorization:** User explicitly requested GitHub push of completed source-review checkpoint. No mechanical or production rollout implied.
