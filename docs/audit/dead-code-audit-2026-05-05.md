# SWSE FoundryVTT — Dead Code Audit Report

**Date:** 2026-05-05  
**Branch:** `claude/audit-swse-dead-code-6hib5`  
**Repo size:** 4,016 files — 1,589 JS · 228 CSS · 403 HBS templates  
**Method:** Static import tracing from `system.json` entry points + cross-reference against all file paths on disk

---

## 0. CRITICAL ARCHITECTURAL FINDING (Must Fix Before Any Pruning)

### `esmodules` Array Was Emptied in a Recent Commit

**Evidence (git diff HEAD~5 HEAD -- system.json):**
```diff
-  "esmodules": ["index.js"],
+  "esmodules": [],
```

**Impact:** `index.js` at the repo root is the **entire system init entry point**. It registers all
Foundry hooks (`init`, `ready`, scene controls, actor directory intercept), all Handlebars templates
(`preloadHandlebarsTemplates`), all v1 actor/sheet classes, and the complete infrastructure hooks
chain (`registerInitHooks`).

With `esmodules: []`, Foundry loads **only** `scripts/actors/v2/base-actor.js` and
`scripts/items/base/swse-item-base.js` via the `documents.Actor.documentClass` mechanism — 97 files
covering actor data math only. No hooks fire. No templates register. No UI initialises.

**Full dependency graph:**
- Reachable from `base-actor.js` entry: **97 files**
- Reachable from `index.js` (when it was loaded): **554 files**
- Total JS files on disk: **1,589**
- Currently unreachable from either entry: **~1,000+ files**

**Required action before any pruning:** Either:
1. Restore `"index.js"` to `esmodules` (stabilises v1/current path), OR
2. Wire `registerInitHooks()` and `preloadHandlebarsTemplates()` into the v2
   `base-actor.js` initialization path (advances v2 migration)

---

## 1. SAFE PRUNE CANDIDATES — Phase 1 (Zero Reference, Low Risk)

### 1.1 Backup / Temp Files Committed to Repo

| File | Risk | Action |
|------|------|--------|
| `scripts/Documents - Shortcut.lnk` | Low | **Delete** — Windows artifact |
| `scripts/scripts/Documents - Shortcut.lnk` | Low | **Delete** — Windows artifact |
| `assets/Concept/scraps/sketch-2026-04-23T08-53-33-ff1p4l.napkin` | Low | **Delete** — scratch file |
| `styles/apps/chargen.css.pre_holo_backup` | Low | **Delete** — committed backup |
| `templates/apps/chargen.hbs.pre_holo_backup` | Low | **Delete** — committed backup |
| `templates/actors/character/v2/partials/attacks-panel.hbs.pre_phase_b` | Low | **Delete** |
| `templates/actors/character/v2/partials/initiative-control.hbs.pre_phase_b` | Low | **Delete** |
| `templates/actors/character/v2/partials/resources-panel.hbs.pre_phase_b` | Low | **Delete** |
| `templates/actors/character/v2/partials/skills-panel.hbs.pre_phase_b` | Low | **Delete** |
| `templates/actors/character/v2/partials/skills-panel.hbs.pre_phase_h2` | Low | **Delete** |
| `scripts/ui/combat/action-economy-bindings.js.pre_phase_f` | Low | **Delete** |

**Validation:** `git grep "pre_phase_b\|pre_holo_backup\|\.lnk\|\.napkin"` → must return zero.

---

### 1.2 `styles/archive/sheets-v3/` — Explicitly Archived CSS

24 CSS files covering old v3 sheet fragments (`core/variables.css`, `partials/abilities.css`,
`partials/combat.css`, etc.). Self-labelled archive directory. Not in `system.json`, not
`@import`ed by any loaded CSS, not dynamically injected.

**Action:** Delete entire `styles/archive/sheets-v3/` directory.  
**Validation:** Reload Foundry; no visual change expected.

---

### 1.3 `scripts/scripts/` — Misplaced Duplicate Directory Tree (82 files)

`scripts/scripts/` is a **misplaced copy** of files that belong at `scripts/` root level. Nothing
imports it by path.

```bash
grep -r "scripts/scripts/" . --include="*.js" --include="*.json"
# → 0 results
```

**Sub-directory analysis:**

| Sub-path | Status | Action |
|----------|--------|--------|
| `core/` (3 files) | Identical to `scripts/holonet/scripts/core/` | **Delete** |
| `scene-controls/` | Identical to `scripts/holonet/scripts/scene-controls/` | **Delete** |
| `ui/action-palette/` | Identical to `scripts/holonet/scripts/ui/action-palette/` | **Delete** |
| `sheets/v2/npc/NPCSheet.js` | Identical to `scripts/sheets/v2/npc/NPCSheet.js` | **Delete** |
| `mentor/` (29 files) | Near-identical to `scripts/mentor/` (1 file diverges: `engine.js`) | **Investigate** |
| `macros/`, `maintenance/` | Unknown — may be unique content | **Investigate** |
| `Documents - Shortcut.lnk` | Windows artifact | **Delete** |

---

### 1.4 `assets/Concept/` and `assets/concepts/` — UI Design Mockups

Standalone HTML prototypes, `.jsx` scratch files, and concept JavaScript with no production import
path. Not referenced by `system.json`, templates, or CSS.

| Path | Action |
|------|--------|
| `assets/Concept/` (entire dir: ~25 items incl. HTML, CSS, JS, JSX, PNG) | **Delete** |
| `assets/concepts/droid-shipyard-customization-concept.html` | **Delete** |

---

## 2. PROBABLY DEPRECATED — Medium Risk (Phase 2)

### 2.1 V1 Actor Files (Superseded by v2 Architecture)

| File | Why Deprecated | References | Risk |
|------|---------------|------------|------|
| `scripts/swse-actor.js` | V1 Actor + Sheet; `SWSEV2BaseActor` in `actors/v2/base-actor.js` is canonical | `index.js`, `swse-droid.js` | Medium |
| `scripts/swse-droid.js` | Extends v1 SWSEActorSheet | `index.js` | Medium |
| `scripts/actors/vehicle/swse-vehicle.js` | Only caller: `store-checkout.js` via SWSEVehicleHandler | `store-checkout.js` | Medium |
| `scripts/actors/vehicle/swse-vehicle-core.js` | Part of v1 vehicle trio | `swse-vehicle.js` | Medium |
| `scripts/actors/vehicle/swse-vehicle-handler.js` | Part of v1 vehicle trio | `swse-vehicle.js`, `store-checkout.js` | Medium |
| `scripts/actors/vehicle/vehicle-crew-positions.js` | Part of v1 vehicle trio | `swse-vehicle-core.js` | Medium |
| `scripts/actors/vehicle/vehicle-precreate-hooks.js` | Imported by orphaned `core/init.js` only | `core/init.js` | Medium |

**Action:** Replace `SWSEVehicleHandler` usage in `store-checkout.js` with v2 vehicle actor, then delete this group.

---

### 2.2 Old Chargen Apps (Superseded by Progression Framework)

The canonical chargen/levelup path is `scripts/apps/progression-framework/`. These are predecessors:

| File | Why Deprecated | Risk |
|------|---------------|------|
| `scripts/apps/chargen.js` | Barrel re-exporting old generators | Medium |
| `scripts/apps/chargen-init.js` | Registers competing `renderActorDirectory` hook | Medium |
| `scripts/apps/chargen-improved.js` | Old multi-step chargen; superseded by progression-framework | Medium |
| `scripts/apps/chargen-narrative.js` | Imported by chargen-init.js | Medium |
| `scripts/apps/chargen/CharacterGeneratorApp.js` | Intermediate impl; progression-framework is canonical | Medium |

**Validation:** Confirm `renderActorDirectory` intercept lives only in progression-framework:
```bash
grep -rn "renderActorDirectory" scripts/ --include="*.js"
```

---

### 2.3 Old Progression Apps Directory (Superseded by progression-framework)

`scripts/apps/progression/` (11 files) predates `scripts/apps/progression-framework/`:

| File | Evidence of Deprecation |
|------|------------------------|
| `engine-autoload.js` | Comment: "Skip early template loading — templates are loaded in index.js ready hook" |
| `levelup-module-init.js` | Superseded by `progression-framework/levelup-shell.js` |
| `progression-ui.js` | Old UI layer importing root-level `progression-engine.js` barrel |
| `sidebar.js` | Superseded by `shell/progress-rail.js` |
| `force-power-picker.js`, `force-secret-picker.js`, `force-technique-picker.js`, `starship-maneuver-picker.js` | Superseded by progression-framework step equivalents |
| `ability-method.js`, `engine-helper.js`, `progression-preview.js` | Old helpers with no v2 callers |

**Grep to confirm no live callers:**
```bash
grep -rl "apps/progression/" scripts/ --include="*.js" | grep -v "progression-framework"
```

---

### 2.4 Levelup Compatibility Shims

| File | Status |
|------|--------|
| `scripts/apps/swse-levelup.js` | File comment: "maintained for backwards compatibility" — thin proxy to progression-entry |
| `scripts/apps/swse-levelup-enhanced.js` | File comment: "compatibility shim" — re-exports SWSELevelUpEnhanced from levelup-main.js |
| `scripts/progression-engine.js` (root) | Barrel re-export to `engine/progression/engine/`; 3 callers |

**Action:** Migrate callers to import directly from canonical paths, then delete shims.

---

### 2.5 Duplicate NPC Template Hierarchies

Two parallel NPC template trees exist:

| Path | Registered in SWSE_TEMPLATES | Status |
|------|------------------------------|--------|
| `templates/actors/npc/v2/` | **Yes** | Canonical — keep |
| `templates/v2/npc/` (14 files) | **No** | Stale parallel — investigate, then delete |

The two `npc-sheet.hbs` files **differ in content**. `templates/v2/npc/` appears to be a stale
development branch.

**Grep to confirm no callers:**
```bash
grep -r "templates/v2/npc" scripts/ templates/ system.json
```

---

### 2.6 Orphaned Init Files

| File | Status |
|------|--------|
| `scripts/core/init.js` | Not imported by any file in the dependency graph. Registers Handlebars helpers (`range`, `mul`, `roundPercent`, `add`). Competing draft with `scripts/holonet/scripts/core/init.js`. |
| `scripts/holonet/scripts/core/init.js` | Not imported by any file. One extra import vs `scripts/core/init.js`. |

**Before deleting:** Verify templates don't rely on these helpers:
```bash
grep -rn "{{range}}\|{{mul}}\|{{roundPercent}}" templates/ --include="*.hbs"
```

---

### 2.7 Unregistered CSS Files (~92 files not in system.json)

After accounting for 2 loaded via `@import` and 24 in `styles/archive/`, approximately **66 CSS files** are completely inert. Key candidates:

| File | Why Dead |
|------|----------|
| `styles/sheets/character-sheet.css` | V1 character sheet; v2 uses `v2-sheet.css` (registered) |
| `styles/sheets/droid-sheet.css` | V1 droid sheet |
| `styles/sheets/vehicle-sheet.css` | V1 vehicle sheet |
| `styles/apps/chargen/chargen.css` | Old chargen (note: `styles/apps/chargen/chargen.css` is also the registered path — confirm which is which) |
| `styles/apps/chargen/chargen-talent-tree.css` | Old talent tree CSS |
| `styles/apps/houserules.css` | Duplicate of unregistered `house-rules.css` |
| `styles/progression-framework/progression-framework.css` | Superseded by `foundation-integration.css` (registered) |
| `styles/core/swse-base.css` | V1 base styles |
| `styles/swse-system.css` | V1 system CSS |
| `styles/themes/holo.css` | Old theme; `swse-theme-holo.css` registered variant exists |
| `styles/actors/v2/summary/` (3 files) | Path family not in system.json |

**Note:** Two CSS files in `scripts/` (not `styles/`) ARE in system.json:
- `scripts/ui/dialogue/dialogue-effects.css`
- `scripts/ui/action-palette/action-palette.css`

These are intentionally co-located with their JS components. Do not confuse with orphaned CSS.

---

### 2.8 Unregistered Templates (~244 of 403 HBS files)

Of 403 HBS template files on disk, only 159 are registered in `SWSE_TEMPLATES`. Key groups:

| Group | Count | Status |
|-------|-------|--------|
| `templates/actors/character/v2-concept/partials/panels/` | ~50 | Unregistered v2-concept panel variants — may be active alternate sheet or abandoned prototype |
| `templates/v2/npc/` | 14 | Stale NPC tree (covered above) |
| `templates/actors/npc/` (flat, pre-v2) | 8 | V1 NPC templates |
| `templates/actors/vehicle/` (flat) | 3 | V1 vehicle templates |
| `templates/sheets/` | 5 | Old sheet skeletons |
| `templates/items/base/item-sheet-old.hbs` | 1 | Self-named as old |
| `templates/actors/character/v2/minimal-test-sheet.hbs` | 1 | Test scaffold |
| `templates/actors/character/v2/partials/summary/hp-shield-wrapper.hbs` | 1 | Missing from SWSE_TEMPLATES but may be used — add to registry or confirm unused |

---

## 3. KEEP — Canonical Authorities (Do Not Touch)

| File | Reason |
|------|--------|
| `scripts/data/classes-db.js` | SSOT for class data per system docs |
| `scripts/data/class-normalizer.js` | Normalization layer for class data |
| `scripts/engine/registries/classes-registry.js` | Canonical class enumeration API |
| `scripts/data/models/ClassModel.js` | Data model used by progression engine |
| `scripts/data/talent-tree-db.js` | SSOT for talent tree data |
| `scripts/data/prerequisite-authority.js` | Authoritative prereq system |
| `scripts/engine/registries/feat-registry.js` | Static import in v2 chain |
| `scripts/governance/actor-engine/actor-engine.js` | Core v2 mutation authority |
| `scripts/actors/v2/base-actor.js` | v2 entry point via documents.Actor.documentClass |
| `scripts/actors/base/swse-actor-base.js` | Extended by SWSEV2BaseActor |
| `scripts/infrastructure/hooks/init-hooks.js` | Canonical hook registration orchestrator |
| `scripts/load-templates.js` | Canonical template registry |

---

## 4. KEEP — Data/Content Authority

| Path | Reason |
|------|--------|
| `data/dialogue/mentors/*/` | Mentor NPC dialogue content |
| `data/backgrounds.json`, `data/class-features.json`, etc. | Game rules data |
| `data/archetypes/` | Archetype definitions |
| `scripts/data/prerequisite-checker.js` | Active validator |
| `packs/` | Compendium LevelDB files — never touch |
| `assets/class/*.webp`, `assets/feats/*.png` | Referenced by compendium items |
| `lang/` | Localisation strings |

---

## 5. UNKNOWN — Needs Human Review

| File/Group | Concern |
|------------|---------|
| `scripts/apps/levelup/levelup-*.js` | Are these the canonical levelup steps or superseded by `progression-framework/steps/`? |
| `scripts/mentor/` vs `scripts/apps/mentor/` vs `scripts/scripts/mentor/` | Three copies. Which is canonical? Only `engine.js` differs between `scripts/mentor/` and `scripts/scripts/mentor/`. |
| `scripts/core/init.js` Handlebars helpers | `{{range}}`, `{{mul}}`, `{{roundPercent}}` — are these used in any HBS file? If yes, wire them into a loaded init path before deleting. |
| `scripts/holonet/` (47 orphaned files) | New comms infrastructure. Unclear if wired — check git log for recent merge PRs. |
| `templates/actors/character/v2-concept/` | Active alternate sheet or abandoned prototype? Check if any sheet class references these templates. |
| `scripts/apps/customization/` (multiple overlapping impls) | `customization-bay-app.js`, `item-customization-workbench.js`, `raw-customization-workbench-app.js`, `unified-customization-workbench.js`, `unified-workbench-integration.js` — which is canonical? |
| `data/audit/talent_audit_master.json` | Audit artifact — delete if audit is complete |
| `APPLY_METADATA.js` (root) | One-shot macro. Move to `scripts/maintenance/` or document in README. |
| `test-droid-chargen-flow.js` (root) | Test script at root — move to `scripts/testing/`. |
| `scripts/scripts/maintenance/` (migration utilities) | One-shot DB migration scripts — if migrations are complete, delete. |

---

## 6. DUPLICATE SYSTEMS TO CONSOLIDATE

| System A | System B | Recommendation |
|----------|----------|----------------|
| `scripts/mentor/` (30 files) | `scripts/scripts/mentor/` (30 files, 1 diverges) | Delete `scripts/scripts/mentor/`; keep `scripts/mentor/` |
| `templates/v2/npc/` | `templates/actors/npc/v2/` | Delete `templates/v2/npc/`; `actors/npc/v2/` is registered |
| `scripts/apps/progression/` (v1) | `scripts/apps/progression-framework/` (v2) | Delete v1 after wiring callers to v2 |
| `scripts/apps/chargen*.js` (old trio) | `scripts/apps/progression-framework/chargen-shell.js` | Delete old trio |
| `scripts/actors/vehicle/` (v1 vehicle) | `scripts/actors/v2/vehicle-actor.js` | Delete v1 after replacing store-checkout.js caller |

---

## 7. TOP 10 SAFEST DELETIONS

1. `scripts/Documents - Shortcut.lnk` — Windows artifact
2. `scripts/scripts/Documents - Shortcut.lnk` — Windows artifact
3. `assets/Concept/scraps/sketch-2026-04-23T08-53-33-ff1p4l.napkin` — scratch file
4. `styles/apps/chargen.css.pre_holo_backup` — committed backup
5. `templates/apps/chargen.hbs.pre_holo_backup` — committed backup
6. `styles/archive/sheets-v3/` (24 files) — self-labelled archive
7. `templates/actors/character/v2/partials/attacks-panel.hbs.pre_phase_b` — committed backup
8. `templates/actors/character/v2/partials/initiative-control.hbs.pre_phase_b` — committed backup
9. `templates/actors/character/v2/partials/skills-panel.hbs.pre_phase_b` — committed backup
10. `templates/actors/character/v2/partials/skills-panel.hbs.pre_phase_h2` — committed backup

---

## 8. TOP 10 HIGHEST-RISK DEPRECATED FILES

1. **`index.js`** — Currently not loaded but is the entire v1 init. Do not delete until v2 init is wired.
2. **`scripts/swse-actor.js`** — 1,600+ line v1 actor. Safe only after v2 documentClass confirmed working.
3. **`scripts/core/init.js`** — Registers Handlebars helpers that templates may require.
4. **`scripts/infrastructure/hooks/init-hooks.js`** — All hook orchestration. Critical if index.js is restored.
5. **`scripts/apps/chargen-init.js`** — Registers actor creation UI intercept. Remove only after progression-framework handles this.
6. **`scripts/apps/progression/engine-autoload.js`** — Has `Hooks.on('swse:progression:created')`. If events still fire, removing drops listeners silently.
7. **`scripts/actors/vehicle/swse-vehicle-handler.js`** — Imported by `store-checkout.js`. Breaks vehicle purchase flow if removed without replacement.
8. **`scripts/data/class-relationship-registry.js`** — Declared SSOT but not in static import chain; may be dynamically imported by progression-framework.
9. **`scripts/load-templates.js`** — Not currently loaded but is the canonical template registry; must stay intact until init chain is re-established.
10. **`templates/actors/character/v2-concept/`** — ~50 extra panel templates; could be live alternate sheet.

---

## 9. RECOMMENDED GREP/SEARCH COMMANDS

```bash
# Verify no references to backup files
git grep "pre_phase_b\|pre_holo_backup\|\.lnk\|\.napkin"

# Verify scripts/scripts/ has no callers
grep -r "scripts/scripts/" . --include="*.js" --include="*.json"

# Find all CSS not in system.json
python3 -c "
import json, os
with open('system.json') as f: d = json.load(f)
reg = set(d.get('styles', []))
for root, _, files in os.walk('styles'):
    for f in files:
        if f.endswith('.css'):
            p = os.path.relpath(os.path.join(root, f))
            if p not in reg and 'archive' not in p:
                print('UNREGISTERED:', p)
"

# Confirm old progression dir has no live callers
grep -rl "apps/progression/" scripts/ --include="*.js" | grep -v "progression-framework"

# Confirm v1 vehicle files not used elsewhere
grep -rl "actors/vehicle/swse-vehicle\|swse-vehicle-handler" scripts/ --include="*.js"

# Confirm templates/v2/npc/ not referenced
grep -r "templates/v2/npc" scripts/ templates/ system.json

# Confirm actor creation intercept location
grep -rn "renderActorDirectory" scripts/ --include="*.js"

# Check if Handlebars helpers are used in templates
grep -rn "{{range}}\|{{mul}}\|{{roundPercent}}\|{{add " templates/ --include="*.hbs"

# Check for competing customization workbench callers
grep -rn "customization-workbench\|UnifiedCustomization\|CustomizationBayApp" scripts/ --include="*.js" | grep "import"
```

---

## 10. PHASED PRUNING PLAN

### Phase 1 — Immediate Zero-Risk Deletions

- Delete all 11 backup/temp/artifact files (`.pre_*`, `.lnk`, `.napkin`)
- Delete `styles/archive/sheets-v3/` (24 CSS files)
- Delete `assets/Concept/` and `assets/concepts/` (design mockups)
- Delete `scripts/scripts/core/`, `scripts/scripts/scene-controls/`, `scripts/scripts/ui/`, `scripts/scripts/sheets/v2/npc/NPCSheet.js` (confirmed duplicates)

Expected savings: ~60 files. Zero runtime impact.

---

### Phase 2 — Quarantine Medium-Risk Files

1. **Fix the loading chain first** — restore `"index.js"` to `esmodules` in `system.json`
2. Move `scripts/swse-actor.js`, `scripts/swse-droid.js`, `scripts/actors/vehicle/` to `_deprecated/`
3. Move `scripts/apps/progression/` (old) to `_deprecated/`
4. Move `templates/v2/npc/` to `_deprecated/`
5. Confirm Handlebars helper usage; move `scripts/core/init.js` to `_deprecated/` if helpers are wired elsewhere
6. Remove confirmed-dead unregistered CSS: `styles/sheets/character-sheet.css`, `styles/sheets/droid-sheet.css`, `styles/sheets/vehicle-sheet.css`, `styles/core/swse-base.css`

---

### Phase 3 — Runtime Validation in Foundry

1. Load Foundry + SWSE system
2. Create Actor → confirm progression shell launches
3. Open existing character → confirm all sheet tabs render
4. Vehicle purchase in Store → confirm checkout works
5. Monitor browser console for 404s on deleted paths
6. Restore any file causing a 404 from `_deprecated/`

---

### Phase 4 — Final Removal After Smoke Test

1. Promote `_deprecated/` to permanent deletion
2. Delete remaining ~66 unregistered CSS files
3. Audit the 244 unregistered templates — delete confirmed dead ones, register live ones in `SWSE_TEMPLATES`
4. Consolidate the three mentor code locations into one canonical path
5. Resolve `scripts/apps/customization/` workbench overlap
6. Final verification: `find . -name "*.pre_*" -o -name "*.lnk" -o -name "*.napkin" -o -path "*/archive/*"` → zero results

---

## 11. SUMMARY METRICS

| Category | Count | Estimated Safe-to-Delete |
|----------|-------|--------------------------|
| Backup/temp files committed to repo | 11 | 11 (100%) |
| CSS in `styles/archive/` | 24 | 24 (100%) |
| CSS unregistered (not in system.json, not @imported) | ~92 | ~66 confirmed dead |
| HBS templates not in `SWSE_TEMPLATES` | 244 | ~50 confirmed dead, 194 needs audit |
| `scripts/scripts/` misplaced copy | 82 | ~55 confirmed, ~27 needs diff check |
| V1 actor files (superseded) | 7 | 7 after v2 migration complete |
| Old chargen / old progression apps | ~25 | ~20 after canonical path confirmed |
| Design mockups in `assets/Concept/` | ~25 | 25 (100%) |
| Duplicate NPC template tree | 14 | 14 after caller check |

**Conservative Phase 1 deletions:** ~60 files, zero runtime risk.  
**Full cleanup potential (all 4 phases):** ~500+ files.  

**Highest-value single fix:** Restore `"index.js"` to `esmodules` in `system.json`. This re-establishes
the entire loading chain, makes subsequent pruning decisions tractable, and unblocks the v2 migration.
