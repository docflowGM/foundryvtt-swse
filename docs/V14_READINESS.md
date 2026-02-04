# SWSE System: Foundry v14+ Readiness

This document tracks the system's readiness for Foundry VTT v14 and beyond.

## Current Status

**System Built For:** Foundry v13 with CSS Layers future-proofing
**Current v13 Compatibility:** ✅ Full (verified in index.js guards)

---

## V14 Migration Checklist

### Phase 1: Compatibility Assurance (When v14 drops)

- [ ] Test SWSE in Foundry v14 dev build
- [ ] Run `npm run lint` and fix any new ESLint violations
- [ ] Check browser console for deprecation warnings
- [ ] Test all character sheets (V2 API compat)
- [ ] Test CharGen (template paths, dom selectors)
- [ ] Test icon rendering (FA v6 still valid?)

### Phase 2: API Changes (If needed)

- [ ] Review Foundry v14 migration guide
- [ ] Update HandlebarsApplicationMixin usage if changed
- [ ] Check for Application V2 lifecycle changes
- [ ] Test form updates and actor mutations
- [ ] Verify CSS containment still works (or adjust)

### Phase 3: Modernization (Optional)

- [ ] Consider CSS Cascade Layers improvements
- [ ] Review new Foundry v14 UI patterns
- [ ] Evaluate Foundry's improved icon system (if any)
- [ ] Consider adopting new accessibility features

---

## Known Safe Areas (Will Likely Not Break)

✅ **Icon System**

- Uses frozen `ICONS` constant
- FA v6 will remain stable
- Single source of truth makes migration easy

✅ **CharGen Modules**

- Uses modern DOM APIs (querySelector, addEventListener)
- No jQuery dependencies
- Template paths are hardcoded and validated

✅ **Character Sheets**

- Uses HandlebarsApplicationMixin correctly
- Template validation at constructor
- No deprecated Foundry patterns

✅ **CSS Themes**

- Uses CSS containment (`contain: layout paint`)
- No transforms/filters on critical containers
- CSS Layers declaration adds v14+ insurance

✅ **ESLint Rules**

- Already bans jQuery patterns
- Already catches deprecated accessors
- Will catch v14 breaking changes early

---

## Areas Requiring Attention

🟡 **Application V2 Lifecycle**

- Track any changes to `_onRender`, `_prepareContext`
- Monitor async rendering behavior
- Test CharGen step transitions

🟡 **Template Resolution**

- Global guard added for dev mode
- Verify all template paths still resolve in v14
- Check for partial rendering changes

🟡 **CSS Inheritance**

- New Foundry CSS might conflict with theme
- CSS Layers will protect us, but test visually
- Check z-index stacking with new UI

---

## Pre-Migration Preparation (Now)

These are already done, but verify before v14 hits:

✅ No jQuery patterns (ESLint enforces)
✅ CSS containment locked in
✅ Icons centralized + frozen
✅ Template paths validated
✅ Pre-commit hooks prevent regressions
✅ CONTRIBUTING.md documents all invariants
✅ Foundry version expectations in index.js

---

## Quick Migration Path When V14 Releases

1. **Test Immediately** (5 min)

   ```bash
   npm run lint
   # Run SWSE in Foundry v14
   # Check browser console
   ```

2. **If Tests Pass** (5 min)
   - Update system.json `verified` to "14"
   - Run `npm run package`
   - Release hotfix

3. **If Tests Fail** (30-60 min)
   - Follow Phase 1 checklist above
   - Fix API changes in order of impact
   - Commit separately per fix (no mega-commits)
   - Test each fix independently

4. **Release**
   - Tag release as `v1.2.x-v14-compat`
   - Document breaking changes

---

## Monitoring Foundry Changes

Keep tabs on:

- Foundry v14 beta releases
- Foundry's migration guide
- Foundry's deprecation warnings
- ESLint output (new violations = API changes)

---

## Contact Points with Foundry Core

**Critical APIs to Monitor:**

- `Application V2` constructor/lifecycle
- `HandlebarsApplicationMixin` interface
- `renderTemplate` behavior
- CSS containment support
- FontAwesome v6+ support

**Non-Critical but Watch:**

- Dialog system changes
- Hooks system (unlikely to break)
- Combat system (we override it)

---

## Resources

- [Foundry VTT Docs](https://foundryvtt.wiki/)
- [Migration Guides](https://foundryvtt.wiki/en/development/guides)
- SWSE CONTRIBUTING.md (UI Invariants)
- GitHub Issues (report any v14 incompatibilities)

---

**Last Updated:** 2026-02-04
**Next Review:** When Foundry v14 beta available
