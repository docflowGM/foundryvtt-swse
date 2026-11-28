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

## Foundry runtime dependencies
Everything marked OFFLINE_TESTED. Layout/CSS tasks additionally need computed-style measurement in a live Foundry window.

## Missing assets / external input
(appended as encountered)

## Blocked by another task
(appended as encountered)
