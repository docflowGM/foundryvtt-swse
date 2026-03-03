# DELETION LIST — CSS ARCHITECTURAL REFACTOR STEP 1

**Generated:** 2026-03-03
**Status:** AWAITING APPROVAL

---

## CATEGORY A: SCSS SOURCE FILES (17 files) — DELETE

These are source SCSS files with no active build pipeline. They are dead code.

```
DELETE:
  styles/src/base/_reset.scss
  styles/src/base/_typography.scss
  styles/src/components/_buttons.scss
  styles/src/main.scss
  styles/src/themes/_high-contrast.scss
  styles/src/themes/_high-republic.scss
  styles/src/themes/_holo.scss
  styles/src/themes/_jedi.scss
  styles/src/themes/_sand-people.scss
  styles/src/themes/_starship.scss
  styles/src/tokens/_base.scss
  styles/src/tokens/_theme-high-contrast.scss
  styles/src/tokens/_theme-high-republic.scss
  styles/src/tokens/_theme-holo.scss
  styles/src/tokens/_theme-jedi.scss
  styles/src/tokens/_theme-sand-people.scss
  styles/src/tokens/_theme-starship.scss
```

**RATIONALE:** No SCSS compiler is running. These files exist but produce no loaded CSS. They're maintenance burden with zero effect.

---

## CATEGORY B: EXPERIMENTAL V3 SHEET ARCHITECTURE (24 files) — ARCHIVE

These are the V3 sheet system that was built but never integrated. V2 sheets are the active system.

```
ARCHIVE to styles/archive/sheets-v3/:
  styles/sheets/v3/core/layout.css
  styles/sheets/v3/core/numbers.css
  styles/sheets/v3/core/typography.css
  styles/sheets/v3/core/variables.css
  styles/sheets/v3/components/buttons.css
  styles/sheets/v3/components/cards.css
  styles/sheets/v3/components/hover.css
  styles/sheets/v3/partials/abilities.css
  styles/sheets/v3/partials/biography.css
  styles/sheets/v3/partials/combat.css
  styles/sheets/v3/partials/defenses.css
  styles/sheets/v3/partials/destiny.css
  styles/sheets/v3/partials/feats.css
  styles/sheets/v3/partials/force.css
  styles/sheets/v3/partials/header.css
  styles/sheets/v3/partials/hp-condition.css
  styles/sheets/v3/partials/identity.css
  styles/sheets/v3/partials/initiative.css
  styles/sheets/v3/partials/languages.css
  styles/sheets/v3/partials/racial.css
  styles/sheets/v3/partials/second-wind.css
  styles/sheets/v3/partials/skills.css
  styles/sheets/v3/partials/talents.css
  styles/sheets/v3/partials/xp.css
```

**RATIONALE:** These were built as an experimental architecture but V2 is the active system. Archiving preserves them in case they're planned for future migration, but they don't clutter the active codebase.

---

## CATEGORY C: DEPRECATED SHEET VARIANTS (5 files) — DELETE

These are old V2 variants that are superseded by the current sheet system.

```
DELETE:
  styles/sheets/droid-sheet-v2.css
  styles/sheets/droid-level3.css
  styles/sheets/npc-level3.css
  styles/sheets/vehicle-level3.css
  styles/sheets/npc-combat-sheet.css
```

**RATIONALE:**
- `droid-sheet-v2.css` — superseded by `droid-sheet.css`
- `droid-level3.css` — old level variant, not in load order
- `npc-level3.css` — old level variant, not in load order
- `vehicle-level3.css` — old level variant, not in load order
- `npc-combat-sheet.css` — redundant; combat styling is handled by character-sheet.css + combat files

---

## CATEGORY D: INLINE DEAD CODE IN LOADED FILES

### File: styles/swse-system.css

**DELETE Lines 166-171:**

```css
.swse-app-app button:not(.ui-control):not(.icon) {
  background: linear-gradient(180deg, var(--swse-secondary), var(--swse-primary));
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
}
```

**RATIONALE:** Lines 75-80 already define `.swse-app-app button { ... }`. The `:not()` version on line 166 will never match because the first rule already applies to all buttons. This is dead code (unreachable selector specificity).

---

## CATEGORY E: CONDITIONAL FEATURES (DECISION NEEDED)

These files represent active features. They need to be either:
- **KEPT & ADDED TO system.json** (if feature is active)
- **DELETED** (if feature is inactive)

```
AUDIT NEEDED:
  styles/sheets/abilities-tab.css          → Is abilities tab feature active?
  styles/sheets/feat-actions.css           → Is feat actions feature active?
  styles/sheets/skill-actions.css          → Is skill actions feature active?
  styles/sheets/improved-contrast.css      → Is accessibility feature used?
  styles/sheets/sheet-improvements.css     → Is this generic polish active?
```

**DECISION RULE:** Check if corresponding JS files are loaded in index.js or system initialization. If yes, keep + add to system.json. If no, delete.

---

## CATEGORY F: QUESTIONABLE FIXES (INVESTIGATION NEEDED)

```
ASSESS FOR V13 COMPATIBILITY:
  styles/fixes/canvas-viewport-fix.css     → Is this still needed in v13/AppV2?
  styles/core/first-run-experience.css     → Is first-run flow feature active?
```

**DECISION RULE:** Check Foundry v13 release notes. If v13 fixed the canvas issue, delete. Otherwise, keep and verify it's loaded.

---

## CATEGORY G: ORPHANED UTILITY FILES (AUDIT & ADD TO system.json)

These are legitimate feature CSS files that exist but are NOT loaded. Decision: Add to system.json OR delete.

```
AUDIT & LOAD (if feature is active):
  styles/actors/v2/summary/damage-reduction.css
  styles/actors/v2/summary/hp-shield-wrapper.css
  styles/actors/v2/summary/shield-rating.css
  styles/apps/combat-roll-config.css
  styles/apps/house-rules.css
  styles/apps/house-rules-controls.css
  styles/apps/skill-modifier-breakdown.css
  styles/apps/talent-tree-visualizer.css
  styles/chargen/near-human.css
  styles/chat/damage-log.css
  styles/combat/enhanced-rolls.css
  styles/combat/multi-attack.css
  styles/components/suggestion-card.css
  styles/gm/suggestion-panel.css
  styles/hooks/follower.css
  styles/miraj-attunement.css
  styles/progression/ability-rolling.css
  styles/progression/suggestion-engine.css
  styles/rolls/roll-config.css
  styles/species/species-traits.css
  styles/utils/force-enhancement.css
  styles/utils/force-power-manager.css
  styles/utils/starship-maneuver.css

POSSIBLE DUPLICATES (MERGE):
  styles/apps/talent-tree-common.css       → Check if same as talent-tree-visualizer.css
  styles/apps/ux-polish.css                → Assess if generic polish or specific feature
  styles/apps/swse-templates-consolidated.css → Assess if consolidated or dead code
  styles/apps/diff-viewer.css              → Is this dev tool still needed?
```

---

## APPROVAL CHECKLIST

**GUARANTEED DELETIONS (can proceed immediately upon approval):**
- [ ] DELETE 17 SCSS source files (Category A)
- [ ] DELETE 5 deprecated sheet variants (Category C)
- [ ] DELETE inline dead code from swse-system.css lines 166-171 (Category D)

**ARCHIVE (preserves experimental work):**
- [ ] ARCHIVE 24 V3 sheet files to styles/archive/sheets-v3/ (Category B)

**REQUIRES FEATURE AUDIT (cannot proceed until decisions made):**
- [ ] Review Category E: Conditional features (5 files)
- [ ] Review Category F: Questionable fixes (2 files)
- [ ] Review Category G: Orphaned utilities (25+ files)

---

## METRICS

| Action | Count |
|--------|-------|
| Guaranteed Deletions | 23 files |
| Archived (not deleted) | 24 files |
| Requires Audit | 32+ files |
| **Total Impact** | **79 files reviewed** |

---

## NEXT STEP

**Doc:** Review the above deletion list and approve:

1. **Approve guaranteed deletions?** (Categories A, C, D, B-Archive)
   - If YES → I execute immediately
   - If NO → List specific items to preserve

2. **Provide feature audit answers** for Category E, F, G
   - For each file: Keep (add to system.json) or Delete

Once approved, I proceed to STEP 2: Merge Map & STEP 3: Structural Execution.

---

**SAFEGUARDS IN PLACE:**
- No changes to Foundry core classes
- No Sentinel modifications
- Holo aesthetic preserved
- All changes reversible (archived to /archive/)
- No !important rules added
