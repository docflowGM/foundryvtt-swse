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

## Known Limitations

- Tooltips are currently V2 character sheet only (Phase 8+ for other sheets)
- Pinned breakdown cards not yet implemented (Phase 8)
- Help mode is per-sheet (not global or persistent, Phase 8+ feature)
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
- **Tier model is for future** — tiers are documented but not yet used for behavior
- **Anti-spam policy is permanent** — don't add tooltips to every UI element

---

**Last Updated:** Phase 7 Refactoring
**Next Review:** Before Phase 8 (Pinned Breakdowns)
