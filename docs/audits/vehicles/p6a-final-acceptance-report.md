# P6A Final Acceptance Report and P6B Handoff

Branch `audit/universal-vehicles-phase1`; PR #1092 draft and unmerged. Accepted baseline: `a32f31a` (owner-verified exact-head CI). This checkpoint adds migration safety only; no canonical data, census or certification change.

## Status by certification level
| Level | Count / scope | Evidence |
|---|---|---|
| SOURCE_VERIFIED | 174 catalog rows (56 SotG movement/defense in `certification.json` + 118 PDF-verified in `certification-p6a.json`) | 172 PDF-verified table rows; 91 worksheet items reconciled |
| MECHANIC_SPECIFIED | 39 (armor x4, shields x19, maneuvering jets x3, hyperdrives x11, atmospheric thrusters x2) | `vehicle-modification-effects.js`, p10 tests |
| OPERATIONALLY_INTEGRATED (offline) | 37 (atmospheric thrusters exposed, not applied) | p14 tests (derived Reflex, Initiative, shield pool, hyperdrive) |
| LIVE_RUNTIME_VERIFIED | 0 | no Foundry V13 runtime in this environment |
| LIVE_RUNTIME_PENDING | migration UI and execution, installation jobs, construction projects, sheet/Asset Bay, shield pool | checklist in `p6a-errata-migration.md` |
| DEFERRED_RULES_REVIEW | V-P6-01..06, V-P6A-01..04, V-P6A-07, V-P2-04 | register blocker table (SOURCE / AMBIGUITY / ENGINEERING) |

**Counts vs the accepted checkpoint:** catalog 187; matched 174; unresolved 7; not installable options 6; mechanic specified 39; integrated 37; installable 39; combat-authorized weapons 0 - all unchanged. The overlay of PDF-verified rows is 118 (115 at checkpoint 2, +3 when V-P6A-05 adopted the printed prices of the stygium cloaking device, hangar bay and concealed hangar bay); source-verified total 174 = 56 + 118.

## Published errata
Four canonical publications corrected under SotG Errata 1.0 (Interdictor area 3x3; three SotG Y-wings SR 25); 425 unchanged; 429 identities stable. Errata inventory: SotG `OFFICIAL_PUBLISHED_VERIFIED`; the other 13 books `NOT_YET_INVESTIGATED` with the network evidence limitation recorded (`data/audits/vehicles/errata/errata-inventory.json`). Unofficial corrections are never rule authority.

## Migration safety (this checkpoint)
Fixed: unsafe manual restore (now preview + GM confirmation + fingerprint, keeps post-migration shields, refuses conflicts without an explicit clamp decision, audited); duplicate ids; concurrent runs; stale previews; unverified backups; refused or altered writes (persisted-state verification before success); verified recovery with explicit failure reporting; restore merge defect (stale `errataApplied` key); authorization helper mutating the caller update. Unlinked token Actors are reported, not migrated. Tests: p16 (13 tests).

## P6B roadmap (`data/audits/vehicles/p6b-readiness-manifest.json`)
1. **P6B-4 runtime consumers** first where the next effects need them (Pilot-check consumer; atmosphere state).
2. **P6B-1** the 17 deferred movement/defense rows - only those whose ruling exists or whose rule is unambiguous (V-P6-05 rows are engineering: roll/action integration).
3. **P6B-3 static accessories** (cargo pods, sensor array computers), then capacity accessories (hangar units, passenger conversion, cryogenic chambers).
4. **P6B-2 weapons** (38 weapons, 9 ammunition, 4 consumables) after the mount/arc question (V-P2-04) and an ammunition quantity/loading model; firing stays behind the existing sealed-ledger + owned-Item + attack-preflight gate.
5. **P6B-3 action-based accessories** (cargo jettison, droid repair team, slave circuits, transponders, cloaking).
6. **P6B-5 custom starships** (Installation Work panel, construction systems, re-check of the five errata frames).
7. **P6B-6 live V13 verification** throughout.

Gate for every row: published rule unambiguous or owner-ruled -> effect encoded -> certification generator marks MECHANIC_SPECIFIED -> regression tests -> live check. Unresolved mechanics stay fail-closed. P6A stops here for independent review.
