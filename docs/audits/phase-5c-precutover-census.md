# Phase 5C-0 — Pre-cutover census

Frozen snapshot taken before any Phase 5C production mutation (`data/audits/phase-5c-precutover-census.json`). The generator fails if the repository has drifted from the certified expectation.

## Feats
| Measure | Value |
|---|---:|
| Canonical identities (Phase 1A) | 353 |
| Production catalog / pack records | 390 / 390 (identical: true) |
| Canonical present / missing | 351 / 2 (Recall `c352f81dde5c9dff`, Staggering Attack `c9c4130a55761330`) |
| Implementation derivatives | 6 |
| Noncanonical removals | 33 |
| Certified semantic feat records | 353 |

## Weapons
| Measure | Value |
|---|---:|
| Canonical identities | 203 |
| Production weapon records | 186 (+ 4 non-weapon records in the same pack) |
| Canonical present / missing | 151 / 52 |
| Repo-only records | 35 ({"MERGE_INTO_CANONICAL":2,"REMOVE_UNSUPPORTED":33}) |
| Category pack lines | 186 (weapons-exotic 19, weapons-grenades 12, weapons-heavy 24, weapons-lightsabers 15, weapons-pistols 36, weapons-rifles 50, weapons-simple 30) |
| Runtime registry identities | 203 |

## Hashes
Every authority, production and reference-bearing file hash is recorded in the JSON (`hashes`). Later phases compare against it to prove exactly what changed.
