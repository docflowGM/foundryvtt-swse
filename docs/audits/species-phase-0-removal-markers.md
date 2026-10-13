# SWSE Species — Phase 0: Canonical Removal Markers

**Scope:** 17 fan/community-attributed playable racial implementations, not a claim that these Star Wars species are non-canonical in lore.  
**Decision:** `MARKED_FOR_REMOVAL` from the **canonical player-selectable species compendium**.  
**Execution:** `NOT_REMOVED`, `NOT_FILTERED_IN_CHARGEN`. No pack/sidecar/Foundry runtime change.  
**Local JSON policy:** The new Phase 0 JSON manifest is maintained only in the chat artifact workspace, **not** committed to GitHub. Existing historical audit JSON files in this branch are preserved, not updated or rewritten.

## Records marked

| Species | Stable Foundry ID | Disposition |
|---|---|---|
| Aing-Tii | `species-aing-tii` | `MARKED_FOR_REMOVAL` |
| Anomid | `species-anomid` | `MARKED_FOR_REMOVAL` |
| Anx | `species-anx` | `MARKED_FOR_REMOVAL` |
| Besalisk | `species-besalisk` | `MARKED_FOR_REMOVAL` |
| Chevin | `species-chevin` | `MARKED_FOR_REMOVAL` |
| Drall | `species-drall` | `MARKED_FOR_REMOVAL` |
| Dressellian | `species-dressellian` | `MARKED_FOR_REMOVAL` |
| Gree | `species-gree` | `MARKED_FOR_REMOVAL` |
| Jenet | `species-jenet` | `MARKED_FOR_REMOVAL` |
| Kessurian | `species-kessurian` | `MARKED_FOR_REMOVAL` |
| Kiffar | `species-kiffar` | `MARKED_FOR_REMOVAL` |
| Koorivar | `species-koorivar` | `MARKED_FOR_REMOVAL` |
| Mirialan | `species-mirialan` | `MARKED_FOR_REMOVAL` |
| Mustafarian | `species-mustafarian` | `MARKED_FOR_REMOVAL` |
| Muun | `species-muun` | `MARKED_FOR_REMOVAL` |
| Ortolan | `species-ortolan` | `MARKED_FOR_REMOVAL` |
| Quermian | `species-quermian` | `MARKED_FOR_REMOVAL` |

**Count:** 17 uniquely identified species; **0** production deletions; **0** actor migrations; **0** runtime filters implemented. The previous research ledgers already identified these candidates. This Phase 0 checkpoint freezes their identities and decision.

## Removal-readiness gate (all pending)

| Field in local Phase 0 JSON | Starting value |
|---|---|
| `sourceCountercheck` | `PENDING` |
| `dependencyAudit` | `PENDING` |
| `existingActorPolicy` | `UNDECIDED` |
| `archiveSnapshot` | `NOT_CREATED` |
| `implementationAuthorization` | `NOT_AUTHORIZED` |
| `implementationCommit` | `null` |
| `regressionVerification` | `NOT_RUN` |
| `rollbackReference` | `null` |

Do not conflate an audit decision with production deletion. The current `SpeciesRegistry` reads compendium species records and the V2 `SpeciesStep` uses `SpeciesRegistry.getAll()`; neither reads this chat-local JSON. Removing these entries from live selection requires a later, explicitly approved and regression-tested patch.

## Evidence and review policy

The baseline [39-record provenance report](species-39-provenance-reconciliation.md) and [official Clone Wars versus fan-sourcebook recheck](species-clone-wars-canonical-vs-fan-recheck.md) document why these specific **playable implementations** were classified as community/fan-attributed. The *Clone Wars Saga Edition Fan Sourcebook* is not the Wizards of the Coast *Clone Wars Campaign Guide*. If an official playable racial rules block is independently established for any candidate, re-evaluate that candidate before deletion.

**Phase 0 exit criteria:** 17 stable IDs accounted for, 17 marked, 0 deleted, readiness status present in local JSON, source exceptions protected. **Passed for audit marking.** Production-removal readiness is not certified.

**Next:** Phase 1-A — Core Rulebook book/page provenance. Phase 2 attributes and Phase 3 mechanics remain out of scope.
