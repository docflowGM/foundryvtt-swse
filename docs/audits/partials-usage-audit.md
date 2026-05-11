# Handlebars Templates & Partials Comprehensive Audit

**Date:** 2026-05-11  
**Scope:** All `.hbs` files in the `templates/` directory  
**Status:** AUDIT ONLY - No files modified or deleted

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total .hbs files on disk** | 409 |
| **Pre-loaded in load-templates.js** | 272 |
| **Pre-load missing (partials + app templates)** | 144 |
| **Validator status (current)** | PASS (0 strict issues) |
| **Categorized as ACTIVE/USED** | ~350+ (estimated) |
| **Categorized as REGISTRY-MISSING but ACTIVE** | ~30-40 (estimated) |
| **Categorized as LEGACY/COMPATIBILITY** | ~10-15 |
| **Categorized as LIKELY OBSOLETE** | ~5-10 |
| **Categorized as DESIGN REFERENCE** | 60+ (v2-concept) |

## Key Findings

### 1. Pre-Loading Strategy is Intentional and Correct

The system does **not pre-load all templates** in `load-templates.js`. Instead, it:

- **Pre-loads core UI, characters, droids, vehicles, and some apps** (272 files)
- **Relies on dynamic template loading** for sheet partials and app templates not in core load list
- **Pre-loads v2-concept templates** explicitly for design reference/planned migration purposes

This is **not a problem**. Pre-loading all 409 templates would be wasteful; dynamic loading on-demand is correct for partials.

### 2. Validator Now Truthful but Doesn't Prove All Templates Are Active

The recent PR (#837) fixed strict partial validation:
- ✓ All registered partials exist on disk  
- ✓ All full-path includes use `.hbs` suffix
- ✓ All file-backed partials are accessible
- ✓ Same-file inline partials work correctly

**However**, this only proves the template graph is internally consistent. It does NOT prove every template is actually used at runtime. Some registered partials might be:
- Orphaned from old features
- Referenced in legacy code paths not yet removed
- Concept/design-only material in v2-concept folder

### 3. Major Template Categories

#### **ACTIVE / CORE SHEETS (DEFINITELY USED)**
- `templates/actors/character/v2/character-sheet.hbs` → Used by CharacterSheet class
- `templates/actors/droid/v2/droid-sheet.hbs` → Used by DroidSheet class  
- `templates/actors/vehicle/vehicle-sheet.hbs` → Used by VehicleSheet class
- `templates/actors/npc/npc-sheet.hbs` → Legacy but callable
- All `templates/actors/npc/v2/` partials → NPC v2 sheets
- All `templates/actors/droid/v2/` partials → Droid v2 sheets
- All `templates/actors/vehicle/v2/` partials → Vehicle v2 sheets
- All `templates/actors/character/v2/` partials → Character v2 partials

#### **ACTIVE / SHELL + DATAPAD (DEFINITELY USED)**
- `templates/shell/shell-surface.hbs` → Datapad shell (preloaded)
- `templates/shell/partials/shell-*.hbs` (drawer, overlay) → Shell layers
- `templates/shell/partials/surface-*.hbs` (home, upgrade, store, settings, etc.) → Dynamic shells
- Referenced from `scripts/ui/shell/ShellHost.js`

#### **ACTIVE / APPS (PRE-LOADED)**
- `templates/apps/store/store-splash.hbs`
- `templates/apps/upgrade/upgrade-app.hbs`
- `templates/apps/progression-framework/*.hbs` (full suite)
- Chat templates: `templates/chat/*.hbs`
- All progression app flows (dialogs, details, steps)

#### **ACTIVE / APPS (NOT PRE-LOADED BUT USED)**
- `templates/apps/droid-builder.hbs` → Referenced by DroidBuilder app class
- `templates/apps/npc-template-importer.hbs` → NPC import app
- `templates/apps/combat-action-browser.hbs` → Combat UI
- `templates/apps/houserules/*.hbs` → House rules system
- `templates/apps/gm-*.hbs` → GM tools and dashboards
- `templates/apps/customization/*.hbs` → Item customization workbench
- Many others referenced directly from JavaScript app classes

#### **PARTIALS / COMPONENTS (NOT PRE-LOADED, INCLUDED FROM SHEETS)**
- All `templates/partials/*.hbs` → Shared panel/card partials (60+)
- All `templates/components/*.hbs` → Reusable UI components
- All `templates/actors/shared/partials/` → Shared actor partials  
- These are included via `{{> "systems/.../path.hbs"}}` from sheet templates

#### **DESIGN REFERENCE / V2-CONCEPT (PRE-LOADED, STATUS UNCLEAR)**
- All 60+ files under `templates/actors/character/v2-concept/` → PRE-LOADED
- Classified as design-reference templates for planned v2 migration
- Some panels may overlap with current v2 implementation
- **Decision pending**: Keep as living prototypes or archive elsewhere

#### **LIKELY OBSOLETE OR LEGACY**
- `templates/actors/character/tabs/starship-maneuvers-tab.hbs` → Old tab system (no longer used)
- `templates/items/base/item-sheet-old.hbs` → Marked as "old"
- `templates/dialogs/` → Some old-style dialogs may not be in use
- Possibly some `templates/apps/` from pre-v2 architecture

#### **ICONS / SVG / VISUAL ASSETS**
- `templates/icons/*.hbs` → SVG render templates
- These may be outdated SVG generation; unclear if still used vs. static assets

## Classification Reference Guide

| Category | Keep/Delete | Evidence | Risk |
|----------|------------|----------|------|
| **A. ACTIVE / USED / KEEP** | KEEP | Referenced from JS classes, included from active templates | None |
| **B. REGISTRY-MISSING / KEEP + REGISTER** | KEEP + REGISTER | Used but not in partials-auto.js | Medium (validator may flag if included as full-path) |
| **C. USED BUT NEEDS PATH CLEANUP** | KEEP + PATCH | Active but include syntax is bad (missing `.hbs`) | High (breaks strict validation) |
| **D. INLINE / DYNAMIC BUT VALID** | KEEP | Same-file inline defs, valid hash args | None (validator now handles correctly) |
| **E. LEGACY COMPATIBILITY / USED OR POSSIBLY USED** | INVESTIGATE FIRST | May be in legacy code paths or fallback rendering | Medium (may be relied upon by old content) |
| **F. OBSOLETE / LIKELY SAFE TO DELETE** | DELETE | No inbound references, not in any registry, no JS references | High (must have evidence) |
| **G. BROKEN / STALE REFERENCES** | REPLACE OR DELETE | References deleted files (like old character tabs) | Medium (breaks rendering if used) |
| **H. CONCEPT / DESIGN REFERENCE** | KEEP OR ARCHIVE | Intentional design material, not for runtime use | Low if archived; High if hidden in live folder |

## Validator Findings (Post-PR #837)

The validator now reports **0 strict issues**:

```
SWSE | OK (strict): 413 .hbs files scanned; 129 file-backed partial(s) referenced
- 169 full-path references (all valid)
- 21 inline references (all valid same-file definitions)
```

### What This Proves
✓ All registered partials exist on disk  
✓ All full-path includes use correct `.hbs` suffix  
✓ No broken file references  
✓ Same-file inline partials work correctly  

### What This Does NOT Prove
✗ All templates are actually used at runtime  
✗ No orphaned/unused partials exist  
✗ Legacy paths are still functional  
✗ v2-concept templates are currently needed  

---

## Detailed Classification by Folder

### `/actors/character/v2/` – Character Sheet V2 (Active)
- **Status:** ACTIVE  
- **Evidence:** Referenced from `scripts/sheets/v2/character-sheet.js`  
- **Pre-loaded:** Partial list in load-templates.js  
- **Recommendation:** KEEP - Core character sheet infrastructure

### `/actors/character/v2-concept/` – Character Sheet V2 Concept (Design Reference)
- **Status:** DESIGN REFERENCE / LIVING PROTOTYPE  
- **Evidence:** Pre-loaded in load-templates.js; appears to be template design material  
- **Panels included:** 60+ files covering all potential v2 sheet functionality  
- **Recommendation:** KEEP AS DESIGN REFERENCE – Do NOT delete unless confirming v2 migration is complete and current v2 is final

### `/actors/character/tabs/` – Old Tab System (Obsolete)
- **Status:** LIKELY OBSOLETE  
- **Evidence:** Single file `starship-maneuvers-tab.hbs` remains; other tabs were deleted (referenced in validator logs)  
- **Previously referenced:** Yes, by legacy NPC sheet (now replaced in PR #837)  
- **Recommendation:** DELETE with evidence of no remaining references

### `/actors/droid/v2/` – Droid Sheet V2 (Active)
- **Status:** ACTIVE  
- **Evidence:** Droid sheet panels referenced from render code  
- **Pre-loaded:** Yes  
- **Recommendation:** KEEP

### `/actors/droid/` (legacy) – Droid Diagnostic Files (Active)
- **Status:** ACTIVE  
- **Evidence:** `droid-diagnostic.hbs` and related included from droid views  
- **Recommendation:** KEEP

### `/actors/npc/v2/` – NPC Sheet V2 (Active)
- **Status:** ACTIVE  
- **Evidence:** NPC v2 sheet panels referenced from NPC sheet classes  
- **Pre-loaded:** Yes  
- **Recommendation:** KEEP

### `/actors/npc/` (legacy) – NPC Legacy Partials (Active)
- **Status:** ACTIVE  
- **Evidence:** Registered in partials-auto.js; included from npc-summary-hud.hbs  
- **Recommendation:** KEEP – Support legacy NPC sheet path

### `/actors/vehicle/v2/` – Vehicle Sheet V2 (Active)
- **Status:** ACTIVE  
- **Evidence:** Vehicle v2 partials in render code  
- **Recommendation:** KEEP

### `/actors/shared/` – Shared Actor Partials (Active)
- **Status:** ACTIVE  
- **Evidence:** Included from character/droid/vehicle/NPC sheets  
- **Recommendation:** KEEP

### `/shell/` – Datapad Shell (Active)
- **Status:** ACTIVE  
- **Evidence:** Referenced from ShellHost.js; explicitly pre-loaded  
- **Note:** Recent PR #837 added all shell surface partials to registry  
- **Recommendation:** KEEP

### `/apps/store/` – Store App (Active)
- **Status:** ACTIVE  
- **Evidence:** Pre-loaded; store-splash.hbs referenced from shell  
- **Contains:** store.hbs, product cards, cart templates  
- **Recommendation:** KEEP – Core shop interface

### `/apps/upgrade/` – Lightsaber Upgrade App (Active)
- **Status:** ACTIVE  
- **Evidence:** upgrade-app.hbs pre-loaded; referenced from shell  
- **Recommendation:** KEEP

### `/apps/progression-framework/` – Character Progression (Active)
- **Status:** ACTIVE  
- **Evidence:** All templates pre-loaded; core character creation UI  
- **Contains:** 50+ templates for character creation flow  
- **Recommendation:** KEEP – Essential system

### `/apps/` (other) – Miscellaneous Apps (Mostly Active, Some Questionable)
- **droid-builder.hbs**: ACTIVE – GM tool
- **combat-action-browser.hbs**: ACTIVE – Combat UI
- **npc-template-importer.hbs**: ACTIVE – NPC import
- **houserules/**: ACTIVE – House rules config system
- **gm-*.hbs**: ACTIVE – GM dashboards and tools
- **customization/**: ACTIVE – Item mod workbench
- **mentor-*.hbs**: ACTIVE – Mentor system
- **droid-modification/**: ACTIVE – Droid modification UI
- **Others**: Most tied to feature systems; need per-class verification

### `/partials/` – Shared Panels & Components (Active)
- **Status:** ACTIVE – Included from sheet templates  
- **Examples:**
  - `actor/persistent-header.hbs` – Top bar across all sheets
  - `ui/condition-track.hbs` – Health/condition panels
  - `ability-card.hbs`, `skill-action-card.hbs` – Card renders  
  - `starship-maneuvers-panel.hbs` – Maneuvers display  
- **Recommendation:** KEEP – These are core sheet components

### `/components/` – Reusable UI Components (Active but Needs Verification)
- **Status:** LIKELY ACTIVE  
- **Examples:** stepper.hbs, narrator.hbs, hud.hbs, tabs.hbs, panel.hbs  
- **Evidence:** Included from various app and sheet templates  
- **Recommendation:** KEEP – Verify before any deletion

### `/sheets/` – Layout Shells (Mostly Active)
- **`_sheet-skeleton.hbs`**: ACTIVE – Layout template used by many sheets
- **`actor-sheet.hbs`**: Layout for v2 actor sheets
- **`partials/*`**: sheet-header.hbs, sheet-tabs.hbs, etc.
- **Recommendation:** KEEP

### `/dialogs/`, `/gm-tools/` – Miscellaneous Dialogs (Status Unclear)
- **swse-generic-dialog.hbs**: Possibly used
- **welcome-dialog.hbs**: Possibly used
- **Others**: Need per-dialog verification
- **Recommendation:** INVESTIGATE before deletion

### `/icons/` – SVG Icon Templates (Likely Obsolete)
- **Status:** POSSIBLY OBSOLETE  
- **Files:** menu-svg.hbs, damage-svg.hbs, customize-svg.hbs, attack-svg.hbs  
- **Note:** These are HBS templates that render SVG; likely replaced by static assets  
- **Recommendation:** INVESTIGATE – Check if any JS code still calls `renderTemplate()` on these

### `/ui/` – UI Dialog Templates (Mixed Status)
- **action-palette.hbs**: Possibly active combat UI
- **weapon-damage-tooltip.hbs**: Possibly active in item sheets
- **weapon-config-dialog.hbs**: Possibly active in customization
- **Recommendation:** INVESTIGATE per-file

### `/chat/` – Chat Message Renders (Likely Active)
- **level-up-summary.hbs**: Character advancement summary
- **holo-roll.hbs**: Roll result display
- **progression-session-summary.hbs**: Session XP summary
- **Recommendation:** KEEP – Chat renders are active

---

## Safe Future Deletion Candidates

**These files have HIGH confidence that they can be safely deleted:**

| File | Reason | Confidence |
|------|--------|-----------|
| `templates/actors/character/tabs/starship-maneuvers-tab.hbs` | Old tab system; replaced by panels; no references found | HIGH |
| `templates/icons/*.hbs` (if unused) | SVG generation; likely replaced by static assets (verify first) | MEDIUM |
| `templates/items/base/item-sheet-old.hbs` | Marked "old"; verify not in fallback path | MEDIUM |

**None recommended for immediate deletion without runtime verification first.**

---

## Must-Keep / Do-Not-Delete List

These templates are **critical** and should **never be deleted**:

### Core Sheet Functionality
- [ ] `actors/character/v2/character-sheet.hbs`
- [ ] `actors/droid/v2/droid-sheet.hbs`
- [ ] `actors/vehicle/vehicle-sheet.hbs`
- [ ] `actors/npc/v2/npc-sheet*.hbs` (all)

### Core App Functionality
- [ ] `apps/store/store-splash.hbs`
- [ ] `apps/upgrade/upgrade-app.hbs`
- [ ] `apps/progression-framework/*` (entire suite)
- [ ] `apps/droid-builder.hbs`

### Core UI Shells
- [ ] `shell/shell-surface.hbs`
- [ ] `shell/partials/shell-*.hbs` (drawer, overlay)
- [ ] `shell/partials/surface-*.hbs` (all surfaces)

### Core Layout & Components
- [ ] `sheets/_sheet-skeleton.hbs`
- [ ] `sheets/layouts/actor-sheet.hbs`
- [ ] `partials/actor/persistent-header.hbs`
- [ ] `components/stepper.hbs`, `narrator.hbs`, `hud.hbs`

### Active Shared Panels
- [ ] `partials/ui/condition-track.hbs`
- [ ] `partials/ability-card.hbs`, `skill-action-card.hbs`
- [ ] `partials/starship-maneuvers-panel.hbs`
- [ ] `actors/shared/partials/*`

### Design Reference (Until v2 Migration Complete)
- [ ] All 60+ `actors/character/v2-concept/**/*.hbs` files

---

## Recommended Next PR Plan

### PR 1: Registry Verification & Runtime Testing
**Goal:** Confirm all currently registered partials are actually used at runtime

**Actions:**
1. Spin up Foundry with latest code
2. Open each major sheet type (character, droid, vehicle, NPC)
3. Open each app (store, upgrade, progression, combat, etc.)
4. Check browser console for any 404 or missing template errors
5. Document any partials that fail to load
6. Move truly unused partials to a "candidates" list

**Output:** Confirmed list of active vs. dead partials

### PR 2: Legacy Template Audit
**Goal:** Classify legacy sheets and identify genuine obsolete templates

**Actions:**
1. Search codebase for all references to deleted character tabs
2. Confirm NPC sheet replacement is fully functional  
3. Identify any fallback renders or compatibility paths
4. Check if v2-concept templates are actively used or frozen for design reference
5. Document any templates that should be archived (not deleted)

**Output:** Classification of legacy vs. truly obsolete; decisions on v2-concept folder

### PR 3: Optional Dead-Template Cleanup (if evidence allows)
**Goal:** Delete truly unused templates with high confidence

**Actions:**
1. Only delete templates with zero inbound references
2. Only delete after runtime verification confirms no 404s
3. Include specific evidence in commit message for each deletion
4. Update any validator/registry as needed

**Output:** Cleaner repo; fewer stale files to maintain

---

## Notes for Implementation

### About v2-concept Folder
The 60+ templates under `actors/character/v2-concept/` are explicitly pre-loaded in `load-templates.js`. This suggests they are intentional design references for a planned full v2 character sheet migration. **Do not delete** without confirmation that:
1. The v2 sheet implementation is complete and final
2. No design team is using these as working prototypes
3. A new architecture is ready to replace them

### About Load-Templates.js
The system intentionally does NOT pre-load all partials. This is correct:
- Partials are lazy-loaded when included
- Pre-loading everything would waste memory
- load-templates.js pre-loads only "entry point" templates (sheets, apps, design references)

### About Icon/SVG Templates
The `.hbs` files in `templates/icons/` are templates that **generate SVG markup**. They may be obsolete if the system now uses static SVG or icon assets. Requires verification before deletion.

### About App Templates
Most app templates are **not** pre-loaded in load-templates.js but are still active. They are loaded dynamically when the app class calls `renderTemplate()`. This is why they don't appear in the pre-load list but ARE still used.

---

## Conclusion

The validator is now truthful and strict validation passes. However, the codebase contains many templates of unclear status:
- 272 definitely pre-loaded and active (core sheets, apps, v2-concept)  
- 100+ partials actively included but not pre-loaded (components, panels, shared)  
- 30+ app templates used dynamically but not pre-loaded  
- 60+ v2-concept design references (status pending)  
- 5-10 likely obsolete candidates (need runtime verification)

**Recommendation:** Proceed with PR 1 (runtime verification) before attempting any deletions. The validator now ensures the graph is consistent, but consistency ≠ activeness.

---

*Report generated for audit purposes. No files were modified or deleted during this analysis.*

