# Autonomous backlog completion: blockers

Grouped by decision type. A blocker never stops other workstreams. Nothing here is silently treated as done.

## Owner decisions (rules / architecture)
| ID | Workstream | Blocking condition | Investigated | Alternatives | Recommended next action |
| --- | --- | --- | --- | --- | --- |
| FP-RD-016 | Force V2 | 19 of 28 defense-gated powers state no comparator in the certified corpus; explicit entries disagree | corpus scan, resolver implemented for explicit ones | at-least / strictly-greater / per-power | owner ruling (register: swse-rules-decisions-pending.md) |
| FP-RD-011 | Force V2 | Force Grip / Move Object maintenance action cost not legible in repo sources | see register | n/a | owner ruling or errata PDF |
| HULL-HP | Vehicle | `system.hull.*` vs `system.hp.*` canonical vehicle HP | derived builder reads hp first; Edit tab writes hull | repoint Edit tab to hp / retire hull | owner/architecture ruling |
| PZ-08 | Games | Pazaak duplicate-card + variant rules | unique-card rule kept | duplicates with instance ids | owner ruling |
| REG | Realignment | TPS-RD-001, WEALTH-Q1, DC-A02/A03/A05, PRG-RD-001, PRQ-SRC-001..005, AUD-RQ-01..31 | see register | | owner rulings |

| VC-05 | Vehicle | System Operator role: Core p.169 makes shields, sensors and communications ONE role, but the sheet exposes `shields` as the base station and `sensor` / `communications` only as organizational custom stations | crew-resolver BASE_STATIONS, custom-station-service roles | (a) rename/alias base `shields` to System Operator and map sensor/comms to it; (b) keep labels but forbid a second concurrent holder per vehicle | architecture/UX ruling, then implement (stored data uses `shields` keys) |
| VC-RECHARGE | Vehicle | Recharge Shields and Reroute Power are 3 swift actions over one or consecutive turns (Core p.172); no cross-turn swift-progress store exists | ActionEconomyConsumption is per turn | add a per-actor progress record on the action-economy authority | design decision on where the progress lives; until then the actions are labelled and not charged |

| DJ-ART | Games | The Dejarik board PNG (12 sectors x 3 rings + hub) cannot be aligned with the engine board (8 rays x 4 rings, 32 spaces): measured, not assumed | assets/games/dejarik/dejarik-board.png, dejarik-board.js | new art for 8x4 / change engine geometry (rules/design change) | owner decision; art is not restored until then |
| SAB-SMOKE | Games | `tools/sabacc-dejarik-rules-smoke-test.mjs` expects 76 cards and Idiot's Array; the engine implements the 62-card Corellian Spike deck (code header + card assets agree) | corrected count still fails at the Idiot's Array assertion | rewrite for Spike rules | owner confirmation of the variant; Dejarik half kept as a passing test |
| FV2-DMG | Force V2 | Applying damage from the comparison: several definitions state damage type unspecified in the printed entry; 19 powers lack a comparator (FP-RD-016) | resolver + executor integration | report-only (current) | owner rulings FP-RD-016; per-power damage type |

## Foundry runtime dependencies
Everything marked OFFLINE_TESTED. Layout/CSS tasks additionally need computed-style measurement in a live Foundry window.

- Games launcher (GC-LIB-10): app-responsive-games.css applies `.is-shell-compact` overrides with many `!important`; whether they defeat the new launcher grid in a real Foundry shell window could not be tested offline.

## Missing assets / external input
(appended as encountered)

## Blocked by another task
(appended as encountered)
