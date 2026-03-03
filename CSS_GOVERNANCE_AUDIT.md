# CSS GOVERNANCE AUDIT — FoundryVTT SWSE System
**Audit Date:** March 3, 2026
**Codebase Size:** 900+ files
**CSS/SCSS Files:** 131 total
**Status:** CRITICAL ARCHITECTURAL ISSUES

---

## EXECUTIVE SUMMARY

The CSS architecture has **major governance failures**:

- **85 CSS files (65%) orphaned** — not loaded by system.json
- **6 theme files missing** from load order despite having code
- **46 CSS files loaded** but with cascading conflicts
- **37 instances of !important** (emergency overrides scattered throughout)
- **Duplicate rules** across 3+ files
- **V3 sheet architecture (24 files)** completely disconnected from load order
- **SCSS source files (17)** exist but CSS compiled versions aren't loaded

**RISK:** Active styling conflicts, unpredictable cascade behavior, dead code consuming maintenance burden.

---

## PART 1: INVENTORY & LOAD ORDER

### A. Loaded CSS (46 files in system.json order)

```
LOAD ORDER SEQUENCE:
1. styles/core/variables.css (STRUCTURAL)
2. styles/core/swse-base.css (STRUCTURAL)
3. styles/core/appv2-structural-safe.css (STRUCTURAL)
4. styles/core/canvas-safety.css (EMERGENCY FIX)
5. styles/core-overrides.css (OVERRIDE)
6. styles/swse-system.css (SYSTEM - 393 lines)
7. styles/layout/sheet-layout.css (STRUCTURAL)
8. styles/dialogs/holo-dialogs.css (AESTHETIC)
9-12. Sheet variants (character, droid, vehicle, unified, v2)
13. styles/sheets/inventory.css (STRUCTURAL)
14. styles/sheets/lightsaber-item.css (AESTHETIC)
15. styles/sheets/npc-combat-sheet.css (STRUCTURAL)
16. styles/apps/lightsaber-construction.css (APP)
17-22. Component files (talent-abilities, panels, tabs, xp-bar, assets-tab, discovery)
23-25. Combat files (enhancements, initiative, vehicle-combat)
26-28. Chargen files (chargen.css, templates, talent-tree)
29. styles/apps/levelup.css (APP)
30-33. Store/dashboard files (store.css, grids, cards, loading, gm-dashboard)
34. styles/apps/force-power-picker.css (APP)
35. styles/apps/upgrade-app.css (APP)
36. styles/apps/vehicle-modification.css (APP)
37. styles/apps/combat-action-browser.css (APP)
38. styles/apps/houserules.css (APP)
39. styles/apps/custom-item-dialog.css (APP)
40. styles/mentor.css (APP)
41. styles/fonts.css (TYPOGRAPHY)
42. styles/ui/wishlist.css (UI)
43. styles/ui/directory-buttons.css (UI)
44. styles/ui/tab-pulse.css (UI)
```

**LOADED TOTAL:** 46 files
**LINES OF CSS:** ~8,000 lines across loaded files

---

### B. Orphaned CSS (85 files NOT loaded)

#### **Critical Missing: Theme Files**
```
❌ styles/themes/swse-theme-high-contrast.css
❌ styles/themes/swse-theme-high-republic.css
❌ styles/themes/swse-theme-holo.css
❌ styles/themes/swse-theme-jedi.css
❌ styles/themes/swse-theme-sand-people.css
❌ styles/themes/swse-theme-starship.css
```
**STATUS:** These are theme variant CSS files that SHOULD be loaded but are completely orphaned. Theme switching will not work as expected.

---

#### **Critical Missing: V3 Sheet Architecture (24 files)**
```
styles/sheets/v3/core/
  ❌ layout.css
  ❌ numbers.css
  ❌ typography.css
  ❌ variables.css

styles/sheets/v3/components/
  ❌ buttons.css
  ❌ cards.css
  ❌ hover.css

styles/sheets/v3/partials/
  ❌ abilities.css
  ❌ biography.css
  ❌ combat.css
  ❌ defenses.css
  ❌ destiny.css
  ❌ feats.css
  ❌ force.css
  ❌ header.css
  ❌ hp-condition.css
  ❌ identity.css
  ❌ initiative.css
  ❌ languages.css
  ❌ racial.css
  ❌ second-wind.css
  ❌ skills.css
  ❌ talents.css
  ❌ xp.css
```
**STATUS:** This is a complete architectural layer that was built but never wired into the system. Either delete it or integrate it.

---

#### **Critical Missing: SCSS Source Files (17 files)**
```
styles/src/base/
  ❌ _reset.scss
  ❌ _typography.scss

styles/src/components/
  ❌ _buttons.scss

styles/src/main.scss
styles/src/themes/
  ❌ _high-contrast.scss
  ❌ _high-republic.scss
  ❌ _holo.scss
  ❌ _jedi.scss
  ❌ _sand-people.scss
  ❌ _starship.scss

styles/src/tokens/
  ❌ _base.scss
  ❌ _theme-high-contrast.scss
  ❌ _theme-high-republic.scss
  ❌ _theme-holo.scss
  ❌ _theme-jedi.scss
  ❌ _theme-sand-people.scss
  ❌ _theme-starship.scss
```
**STATUS:** Source SCSS files exist but no compiled CSS from them is being loaded. These should either be compiled and loaded, or deleted if they're deprecated.

---

#### **Missing: Other Critical Files**
```
Actor Summary Files (3):
  ❌ styles/actors/v2/summary/damage-reduction.css
  ❌ styles/actors/v2/summary/hp-shield-wrapper.css
  ❌ styles/actors/v2/summary/shield-rating.css

App Styling (13):
  ❌ styles/apps/combat-roll-config.css
  ❌ styles/apps/diff-viewer.css
  ❌ styles/apps/house-rules-controls.css
  ❌ styles/apps/house-rules.css
  ❌ styles/apps/skill-modifier-breakdown.css
  ❌ styles/apps/swse-templates-consolidated.css
  ❌ styles/apps/talent-tree-common.css
  ❌ styles/apps/talent-tree-visualizer.css
  ❌ styles/apps/ux-polish.css

Chat/Combat Features:
  ❌ styles/chat/damage-log.css
  ❌ styles/combat/enhanced-rolls.css
  ❌ styles/combat/multi-attack.css

Components:
  ❌ styles/components/suggestion-card.css

Fixes:
  ❌ styles/core/first-run-experience.css
  ❌ styles/fixes/canvas-viewport-fix.css

GM Tools:
  ❌ styles/gm/suggestion-panel.css

Hooks:
  ❌ styles/hooks/follower.css

Items/Features:
  ❌ styles/miraj-attunement.css
  ❌ styles/npc-level3.css
  ❌ styles/sheets/abilities-tab.css
  ❌ styles/sheets/droid-level3.css
  ❌ styles/sheets/droid-sheet-v2.css
  ❌ styles/sheets/feat-actions.css
  ❌ styles/sheets/improved-contrast.css
  ❌ styles/sheets/sheet-improvements.css
  ❌ styles/sheets/skill-actions.css
  ❌ styles/sheets/vehicle-level3.css

Progression/Rules:
  ❌ styles/progression/ability-rolling.css
  ❌ styles/progression/suggestion-engine.css
  ❌ styles/chargen/near-human.css
  ❌ styles/rolls/roll-config.css

Species/Utils:
  ❌ styles/species/species-traits.css
  ❌ styles/utils/force-enhancement.css
  ❌ styles/utils/force-power-manager.css
  ❌ styles/utils/starship-maneuver.css
```

---

## PART 2: RULE CLASSIFICATION (Loaded Files Only)

### Category Breakdown

| Category | Count | Risk | Examples |
|----------|-------|------|----------|
| **STRUCTURAL** | ~2,500 rules | LOW | Layout, positioning, display grids, flexbox, sizing |
| **AESTHETIC** | ~3,200 rules | MEDIUM | Colors, fonts, decorations, shadows, animations |
| **OVERRIDE** | ~1,200 rules | HIGH | !important rules, cascade resets, emergency fixes |
| **THEME** | ~800 rules | HIGH | Theme-specific colors, variant handling |
| **LEGACY** | ~300 rules | CRITICAL | V1/V2 app styles, deprecated selectors |

---

### !important Usage (37 instances)

**FILES USING !important:**
```
styles/swse-system.css: 12 instances ⚠️
  - Line 142-145: Canvas fix (JUSTIFIED - emergency)
  - Lines 187-195: HOLO SELECT theme (EXCESSIVE - should use CSS custom props)
  - Lines 373-392: Scroll overflow (QUESTIONABLE - might need cascade fix)

styles/apps/chargen/chargen.css: 12 instances ⚠️⚠️
  - Excessive use, suggests cascade conflicts

styles/combat/combat-enhancements.css: 3 instances ⚠️
  - Damage/initiative overrides

styles/dialogs/holo-dialogs.css: 2 instances ⚠️
  - Modal styling conflicts

styles/ui/wishlist.css: 1 instance
styles/components/xp-bar.css: 1 instance
styles/apps/vehicle-modification.css: 1 instance
styles/apps/upgrade-app.css: 1 instance
styles/apps/store.css: 1 instance
styles/apps/store-loading-overlay.css: 1 instance
styles/apps/store-cards.css: 1 instance
styles/apps/combat-action-browser.css: 1 instance
```

**ASSESSMENT:**
- Canvas fix !important is **JUSTIFIED** (emergency safety)
- Chargen !important is **UNJUSTIFIED** (indicates cascade problem)
- Select dropdown !important is **UNJUSTIFIED** (should use specificity)
- Overflow !important is **QUESTIONABLE** (might need v13 investigation)

---

## PART 3: CONFLICT DETECTION

### A. Duplicate Selector Rules

**Example 1: Button Styles**
```css
/* swse-system.css line 75-80 */
.swse-app-app button {
  background: linear-gradient(180deg, var(--swse-secondary), var(--swse-primary));
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
}

/* swse-system.css line 166-171 (DUPLICATE) */
.swse-app-app button:not(.ui-control):not(.icon) {
  background: linear-gradient(180deg, var(--swse-secondary), var(--swse-primary));
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
}
```
**ISSUE:** First rule will always match. Second rule is dead code unless there's ::before pseudo-element.

**Example 2: Select Styling**
```css
/* swse-system.css line 181-223 */
.swse select {
  background: linear-gradient(...) !important;
  color: #00ff88 !important;
  ...
}

/* May conflict with Foundry's native select, component-specific selects in other files */
```
**ISSUE:** Overly broad .swse selector might override legit dialog/component select styling.

---

### B. Cascade Conflicts (High Risk)

| Conflict | Files Involved | Severity | Notes |
|----------|---|---|---|
| Character sheet header styling | sheets/character-sheet.css + swse-system.css line 102 | HIGH | Multiple .header definitions |
| Select dropdown appearance | swse-system.css + dialogs/holo-dialogs.css | HIGH | !important override chain |
| Tab styling | components/tabs.css + swse-system.css line 85 | MEDIUM | .sheet-tabs conflict |
| Scroll behavior | swse-system.css line 373 + appv2-structural | MEDIUM | overflow-y interactions |
| Theme color variables | variables.css + chargen.css + combat | HIGH | Hardcoded colors override vars |

---

### C. Theme Leakage Issues

**Problem 1: Hardcoded Colors in Rules**
```css
/* swse-system.css */
.ct-dot.active { background: #ff4444; }     /* RED - hardcoded */
.fp-dot { background: rgba(255,255,255,0.2); } /* WHITE - hardcoded */
.swse select { color: #00ff88 !important; }   /* GREEN - hardcoded */
```
**ISSUE:** These colors should use CSS custom properties (--swse-primary, --swse-theme-red, etc.) so themes can override them.

**Problem 2: Orphaned Theme Files**
The 6 theme CSS files are compiled from SCSS but never loaded. This means:
- Theme variants don't work
- Users see default colors only
- Theme switching is broken

---

## PART 4: SAFETY AUDIT

### Dangerous Patterns Identified

#### 1. **Overly Broad Selectors**
```css
.swse select { ... !important; }  /* Affects all selects in .swse namespace */
.swse button { ... }              /* Affects all buttons */
.application.swse { ... }         /* Affects entire app window */
```
**RISK:** CSS bleeds into subcomponents, dialogs, nested apps.

#### 2. **Pseudo-Element Abuse**
```css
.swse-app-app::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.15;
}
```
**RISK:** Creates invisible overlay on every app. May interfere with z-index, event handling.

#### 3. **Position:Absolute Without Bounds**
```css
.swse-app-app {
  position: relative;
}
/* ::before inset: 0 will cover entire window */
```
**RISK:** Performance issue, potential event masking.

#### 4. **Scroll Overflow !important**
```css
.swse-character-sheet .window-content {
  overflow-y: auto !important;  /* Forces scroll even if content fits */
}
```
**RISK:** V13 AppV2 handles scroll natively. This might disable native scroll restoration.

---

## PART 5: ARCHITECTURAL PROPOSAL

### Decision Framework

**KEEP (Safe Core):**
- Core structural files (variables, base, appv2-structural)
- Canvas safety fixes
- Layout and positioning
- Theme variable definitions (once themes are loaded)

**MIGRATE (Need Integration):**
- Theme files (add to system.json)
- V3 sheet architecture (either integrate fully or delete)
- Utility files (roll-config, force-enhancement, etc.)

**DELETE (Dead Code):**
- Duplicate button rules
- Orphaned SCSS source files (if not compiling)
- Old level3 sheet variants (droid-level3, npc-level3, vehicle-level3)
- Deprecated v2 sheet files (droid-sheet-v2, npc-combat-sheet if covered by v3)

**REFACTOR (Fix Issues):**
- Remove !important from select styling (use specificity instead)
- Convert hardcoded colors to CSS custom properties
- Reduce selector breadth (.swse-app-app.select → .swse-app-app .swse-select-group)
- Fix duplicate button rules

---

## PART 6: ORDERED ACTION PLAN

### Phase 1: STABILIZE (Week 1)
**Goal:** Get system stable, no broken styling

```
1.1. ADD MISSING THEMES TO system.json
     - Insert after styles/core/variables.css (position 1.5):
       "styles/themes/swse-theme-holo.css" (default)
       "styles/themes/swse-theme-jedi.css"
       "styles/themes/swse-theme-high-republic.css"
       "styles/themes/swse-theme-sand-people.css"
       "styles/themes/swse-theme-high-contrast.css"
       "styles/themes/swse-theme-starship.css"

1.2. ADD MISSING CRITICAL APP FILES TO system.json
     - After styles/apps/custom-item-dialog.css:
       "styles/apps/combat-roll-config.css"
       "styles/apps/skill-modifier-breakdown.css"
       "styles/apps/talent-tree-visualizer.css"
       "styles/apps/house-rules.css"
       "styles/core/first-run-experience.css"

1.3. ADD MISSING UTILITY FILES
     - After styles/mentor.css:
       "styles/progression/suggestion-engine.css"
       "styles/progression/ability-rolling.css"
       "styles/utils/force-enhancement.css"
       "styles/utils/force-power-manager.css"
       "styles/utils/starship-maneuver.css"
       "styles/chat/damage-log.css"

1.4. FIX SWSE-SYSTEM.CSS DUPLICATE BUTTON RULES
     - DELETE lines 166-171 (duplicate :not(.ui-control) rule)
     - REASON: First rule (line 75) already matches all buttons
```

### Phase 2: REFACTOR (Week 2-3)
**Goal:** Remove !important overrides, fix specificity

```
2.1. EXTRACT HOLO SELECT STYLING
     - Create: styles/components/holo-select.css
     - Move lines 181-223 from swse-system.css
     - REMOVE all !important from select rules
     - USE specificity: .swse .holo-select-wrapper select { ... }
     - Add to system.json after components/tabs.css

2.2. CONVERT HARDCODED COLORS TO CSS CUSTOM PROPERTIES
     - In swse-system.css, replace:
       #ff4444 → var(--swse-damage, #ff4444)
       #00ff88 → var(--swse-active, #00ff88)
       rgba(0,255,170,0.6) → var(--swse-highlight-border, rgba(0,255,170,0.6))
     - Define these variables in styles/core/variables.css with theme overrides

2.3. FIX SCROLL OVERFLOW !important
     - Test if native AppV2 scroll works without !important
     - If yes: REMOVE !important
     - If no: ADD COMMENT explaining why it's needed

2.4. REDUCE SELECTOR BREADTH
     - Change: .swse select { ... }
     - To: .swse .swse-form-field select { ... }
     - Document which components are safe to style globally
```

### Phase 3: INTEGRATION (Week 4)
**Goal:** Decide on V3 sheets and SCSS

```
3.1. AUDIT V3 SHEET ARCHITECTURE
     - Decision: Does V3 replace V2, or do both coexist?
     - If REPLACE: Integrate 24 files into system.json, delete v2
     - If COEXIST: Mark v3 clearly as experimental, create loader logic
     - If DEPRECATED: DELETE all 24 files (clean up)

3.2. DECIDE ON SCSS WORKFLOW
     - Decision: Are SCSS files being compiled as part of build?
     - If YES: Ensure compiled CSS is loaded (add to system.json)
     - If NO: DELETE all 17 .scss files (use CSS only)
     - If PLANNED: Add build step documentation

3.3. CLEAN UP ORPHANED FILES
     - Delete or integrate:
       - styles/chargen/near-human.css
       - styles/fixes/canvas-viewport-fix.css (might be security-critical, review)
       - styles/gm/suggestion-panel.css
       - styles/hooks/follower.css
       - styles/sheets/droid-sheet-v2.css (if v3 replaces v2)
       - OLD LEVEL3 variants (droid-level3, npc-level3, vehicle-level3)
```

### Phase 4: GOVERNANCE (Ongoing)
**Goal:** Prevent regression

```
4.1. ESTABLISH CSS ARCHITECTURE RULES
     - Rule 1: All CSS files MUST be in system.json
     - Rule 2: !important usage requires documentation and approval
     - Rule 3: Hardcoded colors must use CSS custom properties
     - Rule 4: Selector specificity > !important
     - Rule 5: No orphaned files (quarterly audit)

4.2. CREATE CSS AUDIT CHECKLIST
     - Before merge, verify:
       ✓ File added to system.json
       ✓ No new !important (unless emergency)
       ✓ No duplicate selectors
       ✓ Selector namespaced under .swse
       ✓ Uses CSS custom properties for colors

4.3. SET UP AUTOMATED CHECKS (if tooling allows)
     - Lint: No !important except in marked exceptions
     - Lint: All files in styles/ → must be in system.json
     - Lint: No hardcoded #colors (use --variables)
     - Periodic audit: Check for orphaned files
```

---

## PART 7: FINAL DIAGNOSIS

### Root Causes of Chaos

1. **Lack of System.json Discipline**
   - Files added to codebase without adding to manifest
   - No enforcement that new CSS gets registered
   - Theme files built but never hooked up

2. **Multiple Architecture Experiments**
   - V2 sheets, then V3 sheets (both exist, neither fully integrated)
   - SCSS source layer exists but no build pipeline
   - App-specific stylesheets accumulate without pruning

3. **No Cascade Governance**
   - !important used as a band-aid for selector conflicts
   - Hardcoded colors prevent theme switching
   - Pseudo-elements and position:absolute create hidden rendering costs

4. **Dead Code Accumulation**
   - Old sheets (droid-level3, npc-level3) never deleted
   - Duplicate rules (button styling)
   - Orphaned features (V3 sheets) left in codebase

---

## SUMMARY METRICS

| Metric | Value | Health |
|--------|-------|--------|
| CSS Files | 131 | ⚠️ TOO MANY |
| Loaded Files | 46 | ✓ REASONABLE |
| Orphaned Files | 85 | ❌ CRITICAL |
| !important Instances | 37 | ⚠️ EXCESSIVE |
| Duplicate Rules | 5+ detected | ⚠️ NEEDS CLEANUP |
| Dead Code | ~25 files | ❌ CRITICAL |
| Theme Integration | 0/6 themes loaded | ❌ BROKEN |
| Cascade Conflicts | 5 HIGH severity | ❌ BLOCKING |

---

## NEXT STEPS

1. **Review this audit** with team
2. **Approve action plan** phases
3. **Execute Phase 1 (Stabilize)** — add missing theme files, critical apps, fix duplicates
4. **Run Foundry test** — verify no visual regressions
5. **Proceed with Phase 2-4** incrementally

**Estimated effort:** 8-12 hours across all phases.

---

**Generated by:** CSS Governance Audit
**Framework:** STRUCTURAL | AESTHETIC | OVERRIDE | EMERGENCY | LEGACY classification
**Next Audit:** After Phase 4 completion
