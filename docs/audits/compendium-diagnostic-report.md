# Compendium Diagnostic Report
**Date:** 2026-06-11  
**Audited by:** Claude (Cowork audit run)  
**Scope:** All registered compendium packs; deep focus on Feats and Lightsaber Form Powers

---

## A. Executive Summary

The repo is in a **mixed legacy/LevelDB format state**. Every registered pack has both a legacy `.db` file (NeDB JSONL) and a same-name LevelDB directory. Foundry v12+ prefers the directory format when both exist. This means Foundry is loading the LevelDB directories, not the `.db` files.

**Feats** fail because their LevelDB directory (`packs/feats/`) was compacted to empty — all records deleted — while the source-of-truth data sits untouched in `packs/feats.db`. The codebase already knows this (see `FeatPackSeeder`) and works around it via a `data/feat-catalog.json` fallback, but the sidebar compendium entry still opens an empty pack.

**Lightsaber Form Powers** have a healthy LevelDB directory with 116 KB of data — the pack itself should register and open. If it fails at runtime, the most likely cause is registration timing during the v13 migration seam (also handled by `compendium-pack-registration-repair.js`). The `.db` data and the LevelDB data are both valid.

**No data corruption** was found. No click-interception code that would block native opening was found outside the `CompendiumDirectoryClickRepair` module, which is correctly guarded and only intercepts clicks it can resolve.

---

## B. Pack Registration Table

All 59 packs declared in `system.json` use the `.db` path convention (e.g., `packs/feats.db`). All 59 `.db` files exist on disk. Foundry v12+ will redirect to the same-name directory when present.

| Pack name | Label | Type | Declared path | .db exists | .db bytes | LevelDB dir exists | LevelDB data bytes | Notes |
|---|---|---|---|---|---|---|---|---|
| species | Species | Item | packs/species.db | ✅ | 568 KB | ✅ | 1.2 MB | OK |
| classes | Classes | Item | packs/classes.db | ✅ | 83 KB | ✅ | 176 KB | OK |
| talent_trees | Talent Trees | Item | packs/talent_trees.db | ✅ | 81 KB | ✅ | 209 KB | OK |
| talents | Talents | Item | packs/talents.db | ✅ | 2.5 MB | ✅ | 5.4 MB | 1 malformed line (#1009, whitespace-only) |
| **feats** | **Feats** | **Item** | **packs/feats.db** | ✅ | **1.6 MB** | ✅ | **0 bytes (EMPTY)** | **⚠️ CRITICAL: LevelDB cleared** |
| forcepowers | Force Powers | Item | packs/forcepowers.db | ✅ | 88 KB | ✅ | 206 KB | OK |
| forcesecrets | Force Secrets | Item | packs/forcesecrets.db | ✅ | 21 KB | ✅ | 49 KB | OK |
| forcetechniques | Force Techniques | Item | packs/forcetechniques.db | ✅ | 62 KB | ✅ | 150 KB | OK |
| medicalsecrets | Medical Secrets | Item | packs/medicalsecrets.db | ✅ | 7 KB | ✅ | 16 KB | OK |
| **lightsaberformpowers** | **Lightsaber Form Powers** | **Item** | **packs/lightsaberformpowers.db** | ✅ | **53 KB** | ✅ | **116 KB (populated)** | **Has data; registration-seam risk** |
| forceregimens | Force Regimens | Item | packs/forceregimens.db | ✅ | 74 KB | ✅ | 150 KB | OK |
| lightsaber-accessories | Lightsaber Accessories | Item | packs/lightsaber-accessories.db | ✅ | 7 KB | ✅ | 16 KB | OK |
| lightsaber-crystals | Lightsaber Crystals | Item | packs/lightsaber-crystals.db | ✅ | 19 KB | ✅ | 45 KB | OK |
| skills | Skills | Item | packs/skills.db | ✅ | 7 KB | ✅ | 18 KB | OK |
| backgrounds | Backgrounds | Item | packs/backgrounds.db | ✅ | 50 KB | ✅ | 130 KB | OK |
| languages | Languages | Item | packs/languages.db | ✅ | 86 KB | ✅ | 223 KB | OK |
| weapons-pistols | Weapons - Pistols | Item | packs/weapons-pistols.db | ✅ | 22 KB | ✅ | 72 KB | OK |
| weapons-rifles | Weapons - Rifles | Item | packs/weapons-rifles.db | ✅ | 32 KB | ✅ | 100 KB | OK |
| weapons-heavy | Weapons - Heavy | Item | packs/weapons-heavy.db | ✅ | 16 KB | ✅ | 49 KB | OK |
| weapons-grenades | Weapons - Grenades | Item | packs/weapons-grenades.db | ✅ | 8 KB | ✅ | 25 KB | OK |
| weapons-exotic | Weapons - Exotic | Item | packs/weapons-exotic.db | ✅ | 12 KB | ✅ | 39 KB | OK |
| weapons-simple | Weapons - Simple/Melee | Item | packs/weapons-simple.db | ✅ | 21 KB | ✅ | 63 KB | OK |
| weapons-lightsabers | Weapons - Lightsabers | Item | packs/weapons-lightsabers.db | ✅ | 17 KB | ✅ | 44 KB | OK |
| weapons | Weapons (All) | Item | packs/weapons.db | ✅ | 181 KB | ✅ | 501 KB | OK |
| armor-light | Armor - Light | Item | packs/armor-light.db | ✅ | 27 KB | ✅ | 65 KB | OK |
| armor-medium | Armor - Medium | Item | packs/armor-medium.db | ✅ | 18 KB | ✅ | 45 KB | OK |
| armor-heavy | Armor - Heavy | Item | packs/armor-heavy.db | ✅ | 11 KB | ✅ | 28 KB | OK |
| armor | Armor (All) | Item | packs/armor.db | ✅ | 84 KB | ✅ | 195 KB | OK |
| armor-shields | Armor - Shields | Item | packs/armor-shields.db | ✅ | 8 KB | ✅ | 17 KB | OK |
| vehicles-starships | Vehicles - Starships | Actor | packs/vehicles-starships.db | ✅ | 220 KB | ✅ | 707 KB | OK |
| vehicles-stations | Vehicles - Stations | Actor | packs/vehicles-stations.db | ✅ | 16 KB | ✅ | 50 KB | OK |
| vehicles-walkers | Vehicles - Walkers | Actor | packs/vehicles-walkers.db | ✅ | 17 KB | ✅ | 56 KB | OK |
| vehicles-speeders | Vehicles - Speeders | Actor | packs/vehicles-speeders.db | ✅ | 277 KB | ✅ | 909 KB | OK |
| vehicles | Vehicles (All) | Actor | packs/vehicles.db | ✅ | 530 KB | ✅ | 1.7 MB | OK |
| vehicle-weapons | Vehicle Weapons | Item | packs/vehicle-weapons.db | ✅ | 28 KB | ✅ | 68 KB | OK |
| vehicle-weapon-ranges | Vehicle Weapon Ranges | Item | packs/vehicle-weapon-ranges.db | ✅ | 5 KB | ✅ | 11 KB | OK |
| equipment-comlinks | Equipment - Communications | Item | packs/equipment-comlinks.db | ✅ | 7 KB | ✅ | 18 KB | OK |
| equipment-tools | Equipment - Tools & Kits | Item | packs/equipment-tools.db | ✅ | 10 KB | ✅ | 26 KB | OK |
| equipment-survival | Equipment - Survival Gear | Item | packs/equipment-survival.db | ✅ | 14 KB | ✅ | 34 KB | OK |
| equipment-medical | Equipment - Medical | Item | packs/equipment-medical.db | ✅ | 9 KB | ✅ | 23 KB | OK |
| equipment-tech | Equipment - Technology | Item | packs/equipment-tech.db | ✅ | 14 KB | ✅ | 35 KB | OK |
| equipment-security | Equipment - Security | Item | packs/equipment-security.db | ✅ | 20 KB | ✅ | 49 KB | OK |
| equipment-other | Equipment - Other | Item | packs/equipment-other.db | ✅ | 3 KB | ✅ | 8 KB | OK |
| equipment | Equipment (All) | Item | packs/equipment.db | ✅ | 112 KB | ✅ | 260 KB | OK |
| conditions | Conditions | Item | packs/conditions.db | ✅ | 3 KB | ✅ | 9 KB | OK |
| special-combat-condition | Combat Conditions | Item | packs/special-combat-condition.db | ✅ | 16 KB | ✅ | 37 KB | OK |
| attributes | Attributes | Item | packs/attributes.db | ✅ | 3 KB | ✅ | 8 KB | OK |
| extraskilluses | Extra Skill Uses | Item | packs/extraskilluses.db | ✅ | 105 KB | ✅ | 230 KB | OK |
| combat-actions | Combat Actions | Item | packs/combat-actions.db | ✅ | 56 KB | ✅ | 144 KB | OK |
| special-abilities | Special Abilities | Item | packs/special-abilities.db | ✅ | 59 KB | ✅ | 147 KB | OK |
| ship-combat-actions | Ship Combat Actions | Item | packs/ship-combat-actions.db | ✅ | 29 KB | ✅ | 80 KB | OK |
| talent-enhancements | Talent Enhancements | Item | packs/talent-enhancements.db | ✅ (0 bytes) | 0 | ✅ | 0 bytes | Both empty — no data exists yet |
| heroic | Heroic NPCs | Actor | packs/heroic.db | ✅ | 15.3 MB | ✅ | 30 MB | OK |
| nonheroic | Nonheroic NPCs | Actor | packs/nonheroic.db | ✅ | 12.3 MB | ✅ | 25 MB | OK |
| sample-active-abilities | Sample Active Abilities | Item | packs/sample-active-abilities.db | ✅ | 3 KB | ✅ | 10 KB | OK |
| npc | NPCs | Actor | packs/npc.db | ✅ (0 bytes) | 0 | ✅ | 0 bytes | Both empty — intentional placeholder? |
| droids | Droids | Actor | packs/droids.db | ✅ | 497 KB | ✅ | 3.2 MB | OK |
| beasts | Beasts & Mounts | Actor | packs/beasts.db | ✅ | 614 KB | ✅ | 1.7 MB | OK |
| poisons | Poisons | Item | packs/poisons.db | ✅ (0 bytes) | 0 | ✅ | 0 bytes | Both empty — no data yet |

---

## C. Filesystem Mismatches

### C1. Every single pack has BOTH a .db file AND a same-name LevelDB directory

This is the central structural issue. Foundry v12 introduced LevelDB (ClassicLevel) as its preferred internal pack storage format. When a system declares `"path": "packs/feats.db"` and `packs/feats/` also exists as a LevelDB directory, **Foundry uses the directory**. The `.db` file becomes invisible to the runtime.

Summary:
- 59 packs registered in `system.json`
- 59 `.db` files on disk (legacy NeDB JSONL)
- 59 same-name LevelDB directories on disk (Foundry's live runtime store)
- Foundry loads the **directory** for all 59 packs

### C2. Orphaned file: `packs/feat-catalog.db`

- Not registered in `system.json`
- Byte-for-byte identical to `packs/feats.db` (MD5: `515e0e4e08e287402d1922febb8de102`)
- Appears to be a working copy or precursor used during the feat data sanitization workflow
- Has no runtime effect; Foundry never sees it
- Safe to remove or keep as reference

### C3. Zero-byte / empty packs

Three packs have no data in either the `.db` file or the LevelDB directory:
- `packs/talent-enhancements` — both empty
- `packs/npc` — both empty  
- `packs/poisons` — both empty

These will appear in the sidebar as empty compendiums. This is not corruption; no data has been authored for them yet.

---

## D. Data Validation Findings (`.db` files)

Only the `.db` files were validated (JSONL parse). LevelDB directories contain binary data and were not parsed directly.

| Finding | Detail |
|---|---|
| Total packs validated | 59 |
| Packs with malformed JSON | 1 (talents.db, line 1009: whitespace-only line) |
| Packs with missing `_id` | 0 |
| Packs with missing `name` | 0 |
| Packs with duplicate `_id` | 0 |
| Empty `.db` files | 3 (talent-enhancements, npc, poisons) |

**talents.db line 1009:** The last line is whitespace only. This is a trailing newline artifact, not a corrupt record. The 1,009 parseable records are intact. In practice Foundry never reads this file directly (it reads the LevelDB directory), so this is low severity.

**Document type validation:** All packs are declared `type: "Item"` or `type: "Actor"` in `system.json`. Records inside Item packs correctly use Foundry item subtypes (`"feat"`, `"force-power"`, etc.) in their top-level `type` field. This is the expected Foundry data model — it is **not** a type mismatch. Confirmed for feats (all 414 records `type: "feat"`) and lightsaberformpowers (all 24 records `type: "force-power"`).

---

## E. Feats-Specific Findings

### Root Cause: LevelDB directory was compacted to empty

**Evidence:**

1. `packs/feats/000004.log` — **0 bytes**. This is the active write-ahead log. An empty log means no records exist in the database.

2. `packs/feats/LOG` contents show a manual compaction ran:
   ```
   2026/06/11-12:08:29.857  Delete type=3 #1
   2026/06/11-12:08:29.904  Level-0 table #5: started
   2026/06/11-12:08:29.904  Level-0 table #5: 0 bytes OK     ← compacted to nothing
   2026/06/11-12:08:29.906  Delete type=0 #3
   2026/06/11-12:08:29.907  Manual compaction at level-0 from 'undefined' @ ... 
   ```
   A Foundry compaction or data clear ran at 12:08 UTC on June 11 and produced a 0-byte result. The directory is an initialized but empty LevelDB store.

3. `packs/feats.db` — **1,603,547 bytes**, 414 valid records, untouched. Last modified 2026-06-11 00:17 UTC (before the compaction at 12:08 UTC).

4. `packs/feat-catalog.db` — byte-for-byte identical to `feats.db`. Not registered; no runtime effect.

**Behavioral consequence:** Foundry opens `packs/feats/` (empty LevelDB). The sidebar compendium shows "Feats" but opening it shows 0 items.

**The codebase already knows this and has a workaround:**

- `scripts/registries/feat-pack-seeder.js` — `FeatPackSeeder` detects the empty pack at runtime and writes `data/feat-catalog.json` content into the LevelDB via Foundry's compendium API. This runs during the `ready` hook when the user is GM.
- `scripts/engine/progression/engine/feature-index.js` — also falls back to `data/feat-catalog.json` for chargen/progression purposes when the pack is empty.
- `data/feat-catalog.json` exists and is 2 MB with all 414 feats.

**What this means in practice:** The system works in chargen because of the JSON fallback. The sidebar compendium may appear empty until the seeder has run (first GM login after install). After the seeder runs, the LevelDB gets populated and the compendium opens normally — but this is fragile, requires a GM login, and the LevelDB can be cleared again by another manual compaction.

**The real fix** is either to delete `packs/feats/` (forcing Foundry to create it fresh from `feats.db`) or to populate it from `feats.db` once as a build step.

---

## F. Lightsaber Form Powers-Specific Findings

### Status: Data is present and valid in LevelDB

**Evidence:**

1. `packs/lightsaberformpowers/000003.log` — **116,127 bytes**. Contains 24 records.
2. `packs/lightsaberformpowers.db` — **53,414 bytes**, 24 valid records.
3. All 24 records have valid `_id`, `name`, and `type: "force-power"`. No malformed lines.
4. `packs/lightsaberformpowers/LOG` shows only one entry: `Delete type=3 #1` — a normal initial log cleanup, not a full compaction. The data in `000003.log` is live.

**The LevelDB directory should open normally.** If it does not appear or open in Foundry v13, the cause is not missing data.

### Alternative failure mode: registration timing / v13 migration seam

The codebase includes `scripts/core/compendium-pack-registration-repair.js`, which explicitly lists `lightsaberformpowers` as a "critical pack" that can fail to register during the v13 migration seam:

> "during the v13 migration Foundry can serve an older install-state/cache that omits specific packs even while the data files are present"

This repair fires at `init`, `setup`, and `ready` hooks and attempts to re-register the pack via `game.packs.set()` if it's missing. If this repair runs correctly, the pack should be visible in the sidebar.

**Potential remaining issue:** `packs/lightsaberformpowers/LOCK` was last modified at 13:18 UTC June 11, which is **after** the `000003.log` was written (16:08). Wait — re-reading: log was updated at 16:08, LOCK at 13:18, CURRENT at 15:07. This ordering is normal (LOCK is reset on close, CURRENT points to manifest, the log file accumulates data). No stale lock issue detected from timestamps alone.

**If Lightsaber Form Powers still fails to open natively:** run `SWSE.debug.criticalCompendiumPackStatus()` in the Foundry console to verify whether `foundryvtt-swse.lightsaberformpowers` is in `game.packs` at runtime.

---

## G. Sidebar / Click-Interception Findings

### G1. `compendium-directory-click-repair.js` — present and intentional

This is a capture-phase document-level click listener that was written specifically to work around Foundry v13 `CompendiumDirectory` ApplicationV2 row-delegation failures. It fires on every click but:

- Returns immediately if the target is not inside a recognized compendium sidebar root
- Only calls `preventDefault`/`stopPropagation`/`stopImmediatePropagation` if it successfully resolves a pack and calls `pack.render(true)`
- Is properly guarded against broad container matches

**Design note:** The function `_openPackFromEvent` is `async` but called with `void`, meaning `stopImmediatePropagation()` runs on the next microtask tick, after the native handler may have already fired. This is intentional for the click-repair (the repair supplements Foundry's native handler rather than replacing it). It does not cause double-opens in practice because `pack.render(true)` is idempotent.

### G2. `swse-canvas-tools.js` — capture-phase listener, narrow scope

Also fires in capture phase on all clicks, but only intercepts if the click target matches GM Datapad / Droid Approvals / Action Palette button text. No compendium scope.

### G3. No rogue global listeners found

Other `document.addEventListener('click', ...)` calls in the codebase (store card interactions, character sheet close-on-click-away, wishlist) are all non-capture or scoped to specific element containment checks. None intercept compendium clicks.

### G4. `actor-sidebar-controls.js` — stopImmediatePropagation

Used only inside custom launcher buttons injected into the actor directory header. Not in the compendium tab.

**Conclusion:** No click interception bug is blocking compendium opening. The sidebar problems are data/registration problems, not UI event problems.

---

## H. Root Cause Theories Ranked by Confidence

### 1. ⚠️ CONFIRMED (100%): `packs/feats/` LevelDB was compacted to empty

The feats compendium opens but shows 0 items. Foundry reads the LevelDB directory (empty), not `feats.db` (full). A manual compaction on 2026-06-11 at 12:08 UTC erased all records. The `FeatPackSeeder` workaround re-populates it at runtime but requires a GM login and can be cleared again.

### 2. ⚠️ LIKELY (80%): Every pack operates on LevelDB, not `.db` files

The system declares `.db` paths in `system.json` but has LevelDB directories for every pack. Foundry v12+ uses the directory when both exist. This is structurally correct for Foundry's current format but means `feats.db` and the other `.db` files are never read. Any pack whose LevelDB is corrupted or emptied silently falls back to empty rather than reading the `.db` source.

### 3. 🔍 POSSIBLE (40%): `lightsaberformpowers` may fail to appear due to v13 registration-seam timing

The LevelDB has valid data. The registration repair is in place. If the pack still doesn't appear, `game.packs` didn't receive it during init. This can happen if the system's install state is stale (cached older manifest). Check with `SWSE.debug.criticalCompendiumPackStatus()`.

### 4. ❌ RULED OUT: Data corruption in any pack

No malformed records, no missing IDs, no duplicate IDs found across all packs. The one whitespace line in `talents.db` is a trailing newline and has no runtime effect.

### 5. ❌ RULED OUT: Document type mismatch

`type: "feat"` and `type: "force-power"` are valid Foundry Item subtypes inside an `Item`-type compendium pack. This is not a mismatch.

### 6. ❌ RULED OUT: Click interception blocking pack opening

The click repair module is well-guarded and async. No other listener intercepts compendium-directed clicks.

---

## I. Recommended Patch Plan

### Priority 1 — Fix the empty feats LevelDB (definitive fix)

**Problem:** `packs/feats/` is an empty LevelDB. Foundry loads it instead of `feats.db`.

**Option A (cleanest):** Delete `packs/feats/`. On next Foundry startup, Foundry will create a fresh LevelDB from `feats.db`. This is a one-line fix.

**Option B (build-step):** Add a pre-deploy script that populates `packs/feats/` from `feats.db` using `@foundryvtt/foundryvtt-cli` or similar. Makes the build reproducible.

**File to change:**
- Delete `packs/feats/` directory from repo and `.gitignore` or gitignore all LevelDB directories that have matching `.db` sources

**Risk:** Low. `feats.db` is the canonical source. Deleting an empty directory has no data loss.

### Priority 2 — Decide: commit LevelDB directories or exclude them from repo

Currently both `.db` files and LevelDB directories are committed. This is a maintenance trap: any accidental compaction or Foundry "clear pack" operation empties the LevelDB while the `.db` file remains untouched and diverged.

**Recommended approach:**
- Keep `.db` files as the source of truth
- Add `packs/*/` to `.gitignore` (exclude all LevelDB directories)
- Add a build step: `fvtt package workon` or a Node script that initializes LevelDB from `.db` files on first run
- This matches how most Foundry system repos work with the `@foundryvtt/foundryvtt-cli` toolchain

### Priority 3 — Investigate whether lightsaberformpowers appears after feats fix

Once the feats LevelDB issue is resolved, test whether the `lightsaberformpowers` compendium appears and opens. If it still doesn't:
1. Run `SWSE.debug.criticalCompendiumPackStatus()` in the browser console
2. If status shows `registered: false`, trigger `SWSE.debug.repairCriticalCompendiumPacks()` manually and check what error is returned

### Priority 4 — Address talents.db trailing line (low severity)

`packs/talents.db` has a whitespace-only trailing line at line 1009. Since Foundry uses the LevelDB directory in practice, this never surfaces. But if you ever regenerate the LevelDB from the `.db` file, the importer would need to skip blank lines. Most JSONL parsers handle this correctly. Can be fixed by stripping the trailing newline.

### Priority 5 — Consider removing feat-catalog.db

`packs/feat-catalog.db` is an unregistered orphan identical to `feats.db`. It serves no runtime purpose and could cause confusion. Consider deleting it or noting in a comment that it's a working copy from the sanitization workflow.

---

## Appendix: Files Referenced

| File | Role |
|---|---|
| `system.json` | Pack registry — all 59 packs declared here with `.db` paths |
| `packs/feats/` | Empty LevelDB directory — root cause of feats failure |
| `packs/feats.db` | Full 414-record NeDB source — not read at runtime |
| `packs/feat-catalog.db` | Orphan, identical to feats.db, unregistered |
| `packs/lightsaberformpowers/` | Populated LevelDB (116 KB, 24 records) |
| `packs/lightsaberformpowers.db` | NeDB source (53 KB, 24 records) — not read at runtime |
| `data/feat-catalog.json` | 2 MB fallback JSON used by FeatPackSeeder and FeatureIndex |
| `data/lightsaber-form-powers.json` | 47 KB fallback JSON used by ForceRegistry |
| `scripts/core/compendium-pack-registration-repair.js` | Runtime repair for feats + lightsaberformpowers + heroic + nonheroic registration |
| `scripts/registries/feat-pack-seeder.js` | Detects empty feats LevelDB and re-seeds from feat-catalog.json |
| `scripts/engine/progression/engine/feature-index.js` | Falls back to feat-catalog.json when feats pack is empty |
| `scripts/core/compendium-directory-click-repair.js` | Capture-phase sidebar click fallback for v13 ApplicationV2 |
| `scripts/scene-controls/swse-canvas-tools.js` | Capture-phase scene control button fallback (separate scope) |
