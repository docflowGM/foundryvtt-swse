# SWSE Tooltip System: Regression Checklist

**Quick reference for verifying tooltip system integrity after changes.**

Use this checklist before committing changes to the tooltip system or whenever making updates to related files.

---

## Pre-Test Setup

- [ ] Load SWSE system in Foundry
- [ ] Open a V2 character sheet
- [ ] Open browser console (F12)
- [ ] Enable dev mode if needed for debug exposure

---

## Binding & Hover Behavior

- [ ] Move mouse over ability score (Strength) → tooltip appears after ~250ms
- [ ] Move mouse away before tooltip appears → tooltip never shows
- [ ] Tooltip disappears immediately when mouse leaves element
- [ ] Move mouse over HP display → tooltip appears and disappears correctly
- [ ] Move mouse over a skill row → tooltip appears with skill explanation

---

## Help Mode Toggle

- [ ] Help toggle button (?) visible in sheet-actions bar
- [ ] Click help toggle → button gets `.active` class (cyan highlight)
- [ ] Sheet root element gets `.help-mode-active` class
- [ ] Click again → button loses `.active` class, sheet loses `.help-mode-active`
- [ ] Help mode state persists across sheet rerender (close/open sheet)

---

## Help Mode Affordances

- [ ] In help mode OFF: no inset glow on hardpoints
- [ ] In help mode ON: inset glow (subtle cyan) on hover/focus
- [ ] Glow is subtle (not jarring), fits holo visual language
- [ ] Glow disappears in reduced-motion mode

---

## Accessibility (Keyboard)

- [ ] Tab to ability score → element gets focus outline
- [ ] On focus → tooltip appears with same delay as hover (250ms)
- [ ] Tab away → tooltip disappears
- [ ] All hardpoints are focusable (no skipped elements)
- [ ] Tab order is logical (left to right, top to bottom)

---

## Reduced Motion Support

- [ ] Enable "prefers-reduced-motion: reduce" in browser dev tools
- [ ] Tooltip still appears but with no animation
- [ ] Help mode glow disabled in reduced-motion
- [ ] No animation-related console errors

---

## Glossary & Registry

- [ ] In console: `SWSEDiscovery.glossary` shows full TooltipGlossary object
- [ ] In console: `SWSEDiscovery.tooltips.getEntry('HitPoints')` returns entry object
- [ ] In console: Glossary has 45+ entries for current V2 sheet
- [ ] All entries have: key, label, category, tier, i18nPrefix
- [ ] No undefined or null entries in glossary

---

## Localization

- [ ] Hover over tooltip → title and body text are correct (not i18n keys)
- [ ] No "SWSE.Discovery.Tooltip.*" keys visible (should be resolved)
- [ ] Special characters (−, +, ©) render correctly
- [ ] No mangled text or encoding issues

---

## Icon Buttons (1000ms Delay)

- [ ] Roll buttons (d20 icons) have 1000ms delay
- [ ] Favorite toggle buttons have 1000ms delay
- [ ] Gear/settings buttons have 1000ms delay
- [ ] These don't show tooltip during quick mouse-over
- [ ] Tooltip appears if mouse stays 1000ms+

---

## Rerender Safety

- [ ] Close sheet and reopen → tooltips still work
- [ ] Modify character data → sheet rerenders → tooltips still work
- [ ] No "listener already exists" warnings in console
- [ ] No orphaned tooltip elements in DOM after rerender
- [ ] No duplicate listeners (hover same element twice after rerender → tooltip appears once)

---

## Breakdown Providers (If Applicable)

- [ ] In console: `SWSEDiscovery.tooltips.getBreakdownProvider('ReflexDefenseBreakdown')` returns function
- [ ] Calling provider with actor: `provider(actor)` returns {title, body}
- [ ] Breakdown content is accurate (correct math)
- [ ] Defense breakdowns show base + modifiers + total
- [ ] No console errors when providers are called

---

## No Regressions: Existing Features

- [ ] Rolling ability checks still works
- [ ] Rolling skill checks still works
- [ ] Favorites toggle still works
- [ ] Character sheet layout unchanged
- [ ] Other UI systems (inventory, spells, etc.) unaffected

---

## Visual Design & Styling

- [ ] Tooltip styling matches holo design (cyan, rounded, subtle glow)
- [ ] Tooltip positioned correctly (appears below element if room, above otherwise)
- [ ] No overlapping content
- [ ] Help mode affordance (inset glow) subtle and non-intrusive
- [ ] No unwanted style conflicts or missing borders

---

## Console Cleanliness

- [ ] No console errors on sheet open
- [ ] No console errors on sheet close
- [ ] No console errors on help mode toggle
- [ ] No console errors on any hover/focus
- [ ] No console warnings about missing i18n keys

---

## Cross-Sheet Validation

- [ ] Open different character → tooltips work
- [ ] Each character has independent help mode state
- [ ] Close sheet → help mode doesn't affect other open sheets
- [ ] Open two V2 sheets simultaneously → tooltips work on both

---

## Quick Manual Tests

### Test 1: New Player Simulation (Help OFF)
1. Disable help mode
2. Hover over random sheet elements
3. Only icon buttons should show tooltips
4. Should feel calm, no tooltip spam

### Test 2: Learning Mode Simulation (Help ON)
1. Enable help mode
2. Hover over abilities, skills, defenses
3. All hardpoints should show tooltips
4. Should feel discoverable, like guidance
5. Should not feel spammy (only 45 hardpoints total)

### Test 3: Keyboard Navigation
1. Tab through sheet
2. Every tooltip hardpoint should be focusable
3. Tooltip appears on focus, disappears on blur
4. Tab order makes sense

### Test 4: Rerender Stress Test
1. Open sheet
2. Modify a character value (e.g., add skill point)
3. Sheet rerenders
4. Hover over same elements → tooltips still work
5. Close and reopen sheet
6. Tooltips still work

---

## Phase 9: Tier-Aware Help System Tests

### Help Level Cycling

- [ ] Click help toggle → Level shows "Help: CORE" with tooltip "Core help. Tier1..."
- [ ] Click again → Level shows "Help: STANDARD" with tooltip "Standard help. Tier1 + Tier2..."
- [ ] Click again → Level shows "Help: ADVANCED" with tooltip "Advanced help. All tiers..."
- [ ] Click again → Level shows "Help: OFF" with tooltip "Help mode off. Only icon tooltips..."
- [ ] Click again → Back to "Help: CORE" (cycle complete)

### Tier-Based Affordance Visibility

- [ ] In CORE mode: Abilities, Skills, Defenses, BAB, Grapple, Initiative show affordances
- [ ] In CORE mode: No tier2 or tier3 elements visible
- [ ] In STANDARD mode: All tier1 + tier2 elements show affordances
- [ ] In STANDARD mode: No tier3 elements visible
- [ ] In ADVANCED mode: All elements (tier1 + tier2 + tier3) show affordances
- [ ] In OFF mode: No affordances visible (still can click for breakdown if desired)

### Breakdown Cards (Phase 8+)

- [ ] Click BAB value → Pinned card opens showing: Base (½ Level) + Class bonus + Misc + Total
- [ ] Card shows semantic colors: neutral/positive/negative per row
- [ ] Card can be dismissed: click-away, Escape key, or close button
- [ ] Click Grapple → Shows: BAB + Strength mod + Misc + Total
- [ ] Click Initiative → Shows: Dex mod + Misc + Modifiers + Condition penalty + Total
- [ ] All breakdown cards follow normalized structure (title/definition/rows/total)

### Help Level Persistence

- [ ] Set help level to STANDARD on character A
- [ ] Close sheet
- [ ] Reopen sheet → Still shows STANDARD
- [ ] Switch to character B → Shows default CORE
- [ ] Back to character A → Still shows STANDARD
- [ ] Data persists in actor.flags['foundryvtt-swse'].helpLevel

### Affordance Styling

- [ ] Breakdown elements have inset glow in appropriate help levels
- [ ] Glow is subtle (not bright, fits holo aesthetic)
- [ ] Hover enhances glow slightly
- [ ] In reduced-motion mode: glow disabled, subtle focus indicator only
- [ ] No console errors related to CSS classes

### Interaction Model Refinement

- [ ] Hover shows tooltip → Tooltip respects help tier (e.g., tier2 tooltip doesn't show in CORE)
- [ ] Click shows breakdown → Always available if breakdown exists (regardless of help level)
- [ ] Help level change → Closes any open breakdown card
- [ ] Help level change → Updates affordance visibility immediately
- [ ] No conflicts between hover tooltip and click card

### New Providers

- [ ] BaseAttackBonus breakdown shows formula: Base + Class + Misc + Modifiers
- [ ] Grapple breakdown shows formula: BAB + Strength + Misc + Modifiers
- [ ] Initiative breakdown shows formula: Dex + Misc + Modifiers + Condition
- [ ] All rows have correct semantic colors (positive/neutral/negative)
- [ ] All totals are emphasized with system highlight color

### Console Validation (Developer)

- [ ] `SWSEDiscovery.tooltips` exists and has breakdown providers
- [ ] `await SWSEDiscovery.tooltips.getBreakdown('BaseAttackBonus', actor)` returns structure
- [ ] `SWSEDiscovery.tooltips.getBreakdown('Grapple', actor)` works correctly
- [ ] `SWSEDiscovery.tooltips.getBreakdown('Initiative', actor)` includes condition penalties
- [ ] No undefined or null in provider output

## Known Limitations

- Tooltips are currently V2 character sheet only (Phase 8+ for other sheets)
- Damage Threshold breakdown not yet implemented (Phase 9+, pending composition audit)
- Weapon breakdowns not on character sheet yet (Phase 8+, item sheet focused)
- Chargen has separate tooltip system (not integrated)

---

## If Tests Fail

| Symptom | Check |
|---------|-------|
| Tooltip never appears | Check i18n key exists in lang/en.json |
| Tooltip stays open | Check blur event handler in registry |
| Tooltip appears too fast | Verify --tooltip-delay CSS variable |
| Help toggle doesn't work | Check data-action="toggle-help-mode" in template |
| Tooltip content wrong | Check glossary i18nPrefix and lang/en.json |
| Help mode glow not visible | Check v2-sheet.css help mode affordance styles |
| Listeners accumulate | Check AbortController cleanup in rerender |

---

## Maintenance Notes

- **Glossary is source of truth** — if something's wrong, check glossary first
- **Localization is centralized** — all text changes go in lang/en.json
- **Breakdowns are separate** — don't put math in definitions
- **Tier model is now behavioral** — tiers control affordance visibility via HelpModeManager
- **Anti-spam policy is permanent** — don't add tooltips to every UI element
- **Help levels are per-character** — stored in actor.flags, not global
- **Breakdown providers are canonical** — all math lives in provider classes, not templates
- **Affordances sync with tiers** — CSS classes and data attributes keep visual state consistent

---

**Last Updated:** Phase 9 Tier-Aware Help System
**Next Review:** Phase 9 completion validation + Phase 10 planning (content freeze + item-row rules)
