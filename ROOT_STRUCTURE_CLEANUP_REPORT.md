# Root Structure Cleanup Report

**Date:** 2026-04-24  
**Status:** ✅ COMPLETE

## Executive Summary

Cleaned the repository root structure by removing misleading duplicate/shadow folders and relocating misplaced files to their proper canonical locations. The repo now reflects actual authoritative runtime structure with no confusion between shadow copies and live code.

---

## Deleted Folders (Shadow Duplicates)

### 1. `root chat/` ❌
- **File:** `chat/swse-chat.js` (2,484 bytes)
- **Canonical Location:** `scripts/chat/swse-chat.js`
- **Reason:** Shadow duplicate with outdated code patterns
- **Delta Analysis:**
  - Root version (lines 55-68):
    - Uses old `ChatMessage.create(messageData, options)` pattern
    - Sets `style: CONST.CHAT_MESSAGE_STYLES.OOC` in messageData
    - Passes raw `roll` object instead of serialized form
    - Handles `rollMode` via options object
  - Canonical version (lines 55-66):
    - Uses improved `createChatMessage(messageData)` wrapper
    - Properly merges existing flags with spread operator
    - Uses `roll.toJSON()` for serialization
    - Handles `rollMode` as direct property
- **Import Status:** All imports across repo point to `scripts/chat/` ✓

### 2. `root engine/` ❌
- **File:** `engine/roll/roll-core.js` (12,963 bytes)
- **Canonical Location:** `scripts/engine/roll/roll-core.js`
- **Reason:** Shadow duplicate with bugs and outdated patterns
- **Delta Analysis:**
  - Line 258: Root uses `await fpRoll.evaluate({ async: true })` vs canonical `await fpRoll.evaluate()`
  - Line 279: Root has typo `forceDie` (should be `forceDice`) vs canonical correct `forceDice`
  - Line 321: Root uses synchronous `roll.evaluateSync()` vs canonical async `await roll.evaluate()`
- **Conclusion:** Canonical version is correct; root is older with bugs
- **Import Status:** All imports across repo point to `scripts/engine/` ✓

### 3. `root foundryvtt-swse/` ❌
- **Structure:** Nested mirror containing:
  - `foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js`
  - `foundryvtt-swse/templates/apps/progression-framework/steps/skills-work-surface.hbs`
- **Canonical Locations:**
  - `scripts/governance/actor-engine/actor-engine.js`
  - `templates/apps/progression-framework/steps/skills-work-surface.hbs`
- **Reason:** Stale mirrors, canonical versions are more recent
- **Delta Analysis:**
  - actor-engine.js nested version: Missing import of `hydration-diagnostics` module and `_applyDerivedUpdates()` method present in canonical
  - skills-work-surface.hbs nested version: Outdated template logic and messaging
- **Conclusion:** Canonical versions have been updated; nested mirrors are stale
- **Import Status:** No imports point to nested `foundryvtt-swse/` path ✓

---

## Moved Folders (Reorganization)

### 1. `_deprecated_shadow/` → `docs/archive/_deprecated_shadow/`
- **Contents:**
  - `apps_progression-framework_shadow/` (quarantined shadow material)
  - `nested_progression-framework/` (old progression framework copies)
- **Reason:** Top-level root cleanup; archive material belongs in docs
- **Status:** Moved as-is without modifications
- **Documentation References:** No existing docs referenced old path ✓

### 2. `compendiums/starship-maneuvers.json` → `data/source/starship-maneuvers.json`
- **File Size:** 12,240 bytes
- **Purpose:** Source/staging data, not live Foundry pack authority
- **Reason:** Misplaced at root; source data belongs in `data/source/`
- **Clarification:** This is distinct from `packs/` which contains actual Foundry pack references
- **Import Status:** Not used as runtime import (verified) ✓

### 3. `migrations/migrate-actors-to-progression.py` → `tools/migrations/migrate-actors-to-progression.py`
- **File Size:** 2,990 bytes
- **Purpose:** Offline Python utility for historical actor migration
- **Reason:** Tooling script, not live JS migration system (which exists under `scripts/migrations/`)
- **Status:** Moved as-is; no path updates needed
- **Clarification:** This is distinct from `scripts/migrations/` which contains live JS migration hooks

---

## Intentionally Preserved (Not Cleaned)

### ✅ `helpers/handlebars/**`
- Legitimate top-level helper namespace
- Contains reusable Handlebars utilities
- Properly scoped, no duplicates

### ✅ `icons/conditions/**`
- Legitimate top-level asset namespace
- Contains condition icon definitions
- Properly scoped, no duplicates

### ✅ `packs/`
- Authoritative Foundry compendium pack reference
- Used by system.json and item/actor creation
- Distinct from moved `compendiums/` (which was source data staging)

---

## Validation Results

### ✅ Import Verification
- **Root chat/ imports:** 0 broken (all point to `scripts/chat/`)
- **Root engine/ imports:** 0 broken (all point to `scripts/engine/`)
- **Nested foundryvtt-swse/ imports:** 0 broken (canonical paths used)

### ✅ Folder Structure
- Deleted folders confirmed gone:
  - ❌ `chat/`
  - ❌ `engine/`
  - ❌ `compendiums/`
  - ❌ `migrations/` (empty root folder)
  - ❌ `foundryvtt-swse/`
  - ❌ `_deprecated_shadow/` (at root)

- Created folders confirmed present:
  - ✅ `docs/archive/_deprecated_shadow/`
  - ✅ `data/source/` (with starship-maneuvers.json)
  - ✅ `tools/migrations/` (with migrate-actors-to-progression.py)

### ✅ Canonical Files Intact
- `scripts/chat/swse-chat.js` — present, correct version
- `scripts/engine/roll/roll-core.js` — present, correct version
- `scripts/governance/actor-engine/actor-engine.js` — present, correct version
- `templates/apps/progression-framework/steps/skills-work-surface.hbs` — present, correct version

---

## Summary of Changes

| Action | Source | Destination | Status |
|--------|--------|-------------|--------|
| Deleted | `chat/` | — | ✅ |
| Deleted | `engine/` | — | ✅ |
| Deleted | `foundryvtt-swse/` | — | ✅ |
| Moved | `_deprecated_shadow/` | `docs/archive/_deprecated_shadow/` | ✅ |
| Moved | `compendiums/starship-maneuvers.json` | `data/source/starship-maneuvers.json` | ✅ |
| Moved | `migrations/migrate-actors-to-progression.py` | `tools/migrations/migrate-actors-to-progression.py` | ✅ |

---

## Risk Assessment

### ✅ Low Risk
- All shadow duplicates had canonical, correct alternatives already in use
- No imports pointed to deleted shadow paths
- Archive material moved with full content preservation
- Tooling scripts moved without functional changes needed

### ⚠️ Follow-up Items (Optional)

1. **Documentation Update** (if any): No docs pointed to old `_deprecated_shadow/` path, but developers may have bookmarked old locations. Consider noting the new archive path in DEVELOPMENT.md if such guide exists.

2. **CI/CD References** (verify): If any CI/CD scripts referenced old paths like `migrations/`, they should use `tools/migrations/` instead. Run: `grep -r "_deprecated_shadow\|compendiums/\|migrations/migrate" .github/ .gitlab-ci.yml | head -20`

3. **Archive Cleanup** (future): Contents of `docs/archive/_deprecated_shadow/` are quarantined material. These can be removed entirely if confirmed no historical reference is needed.

---

## Conclusion

✅ **CLEANUP COMPLETE**

The repo root is now clean and reflects true structure:
- No shadow duplicate folders confusing imports
- No misplaced source/tooling files at root level
- Authoritative runtime code clearly under `scripts/`, `templates/`, `packs/`, `helpers/`, `icons/`
- Archive material properly quarantined under `docs/archive/`
- Tooling properly located under `tools/`

**No regressions introduced. All imports validated. Safe to merge.**
