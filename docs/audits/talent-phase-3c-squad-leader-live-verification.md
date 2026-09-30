# Squad Leader — live Foundry v13 verification checklist

**Status: NOT YET EXECUTED.** The automated checks below pass under Node with the foundry shim; nothing here has been run in a live
Foundry v13 instance. The runtime issue is not certified until a person completes this checklist after the Phase 3C packs are applied.

## Why this needs a live check

Phase 3B certifies two distinct trees with the same display name:

| Tree | Pack `_id` | Class access |
|---|---|---|
| Squad Leader (Clone Wars Campaign Guide) | `781feba15dc9e42f` | Soldier |
| Squad Leader (Galaxy at War), new in Phase 3C | `3b30dd12884bb2e4` | Elite Trooper |

`TalentTreeDB` derives ids from names, so before the fix the later tree overwrote the earlier one and the load audit failed
(`duplicateIds: squad_leader`). The fix keeps the Clone Wars tree on `squad_leader` and gives the later tree
`squad_leader_3b30dd12884bb2e4`; class access resolves through `talentTreeSourceIds` (`ClassesDB` → `bySourceId`), never the pack slug.

## Automated evidence (Node + foundry shim, `tests/talent-tree-registry-runtime.test.mjs`)

Both tree ids remain addressable and `TalentTreeDB.trees.size` equals the pack tree count (no name-key overwrite); the load audit
reports 0 duplicate ids/stable keys and 1 disambiguated same-name tree; the registry has two entries with unique ids and correct
`classAccess`; Soldier resolves the Clone Wars tree and Elite Trooper the Galaxy at War tree; each tree's membership contains only its
own talent IDs; the Core/JATM Charm Beast talents stay in their own trees.

## Manual checklist (after applying Phase 3C to a test world)

1. **Start-up** — reload the world with the browser console open. Expect no `[TalentTreeDB] Talent tree load audit FAILED`, no
   `duplicateIds`, no `duplicateStableKeys`, no `[ClassesDB] ... unknown talent tree sourceId`, no registry/membership warning.
   A single informational `sameNameTreesDisambiguated: 1` is expected.
2. **Both identities hydrate** — in the console: `game.packs.get('foundryvtt-swse.talent_trees').index.filter(t => t.name === 'Squad Leader')`
   returns two entries; the talent-tree browser/progression UI lists Squad Leader for both classes.
3. **Class access** — create/open a Soldier: its talent-tree list offers Squad Leader with *Commanding Officer, Coordinated Tactics,
   Fire at Will, Squad Actions*. Create/open an Elite Trooper: it offers Squad Leader with *Fall Back, Form Up, Full Advance,
   Hold Steady, Search and Destroy*. Neither class shows the other's talents.
4. **No cross-routing** — as an Elite Trooper level-up, select *Fall Back*; the granted item's `system.treeId` is `3b30dd12884bb2e4`.
   As a Soldier select *Commanding Officer*; `system.treeId` is `781feba15dc9e42f`. Repeat picking from the tree page directly.
5. **Reload / restart** — reload the browser and restart the world; repeat steps 1–4. The distinction must persist (ids are derived
   from pack `_id`, not from load order).
6. **Console hygiene** — throughout: no duplicate-document-ID, `Invalid URL`, registry-key or `TalentTreeRegistry` errors.
7. **Charm Beast (same-name talents)** — open the Dathomiri Witch tree (Core) and the Beastwarden tree (JATM): each lists exactly one
   *Charm Beast*; adding each to a character yields distinct item `sourceId`s (`c919d7682bd9df40` vs `bab9a1ce285f98b9`).

Record the Foundry version, system version, date, the tester and pass/fail per step in this file before certifying.
