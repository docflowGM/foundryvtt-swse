# Legacy Entry Point Closure Plan — Phase 7 Step 4

**Status**: Complete (closure decisions made, implementation path clear)

**Key Principle**: No code deletion, just intentional deprecation and wrapping

---

## Summary

The unified progression system replaces 4 legacy entry points. Rather than deleting old code, we:
1. Mark as deprecated with clear warnings
2. Wrap legacy calls → unified system
3. Keep legacy code in place for fallback
4. Provide migration guidance

---

## Legacy Entry Points

### 1. Character Generation (chargen-main)

**Current Location**: `scripts/apps/chargen/chargen-main.js`

**Type**: Chargen entry point (replaces)

**Status**: Deprecated (since v1.0.0)

**Replacement**: `ProgressionShell` in `chargen` mode

**Decision**: WRAP INTO UNIFIED

**Action Plan**:
1. `chargen-main.js` → Check rollout settings
2. If unified enabled → Call `ProgressionShell({ actor, mode: 'chargen' })`
3. If legacy fallback → Call legacy chargen-core
4. Show deprecation warning in both cases

**Code Change Required**:
```javascript
// scripts/apps/chargen/chargen-main.js (modified)
export async function openChargenShell(actor) {
  // Check rollout settings
  const entryPoint = RolloutController.determineEntryPoint(actor);

  if (entryPoint.type === 'unified-progression') {
    // Wrap call to unified system
    const { ProgressionShell } = await import('.../progression-shell.js');
    return new ProgressionShell({ actor, mode: 'chargen' });
  } else {
    // Fallback to legacy
    return openLegacyChargen(actor);
  }
}
```

**Deprecation Timeline**:
- v1.0.0: Mark deprecated, show warning
- v1.2.0: Wrapping complete, legacy fallback enabled
- v1.5.0: Can consider removing if no legacy fallback needed

---

### 2. Level Up (levelup-main)

**Current Location**: `scripts/apps/levelup/levelup-main.js`

**Type**: Levelup entry point (replaces)

**Status**: Deprecated (since v1.0.0)

**Replacement**: `ProgressionShell` in `levelup` mode

**Decision**: WRAP INTO UNIFIED

**Action Plan**: Same as chargen-main, but use `mode: 'levelup'`

**Code Change Required**:
```javascript
// scripts/apps/levelup/levelup-main.js (modified)
export async function openLevelUpShell(actor) {
  const entryPoint = RolloutController.determineEntryPoint(actor);

  if (entryPoint.type === 'unified-progression') {
    const { ProgressionShell } = await import('.../progression-shell.js');
    return new ProgressionShell({ actor, mode: 'levelup', targetLevel: actor.system.details.level + 1 });
  } else {
    return openLegacyLevelUp(actor);
  }
}
```

**Deprecation Timeline**: Same as chargen-main

---

### 3. Quick Build

**Current Location**: `scripts/apps/quickbuild/`

**Type**: Fast-build entry point (replaces)

**Status**: Deprecated (since v1.0.0)

**Replacement**: `ProgressionShell` with templates enabled + fast-build mode

**Decision**: WRAP INTO UNIFIED

**Action Plan**:
1. Quick-build launches `ProgressionShell` with specific template pre-selected
2. If unified enabled → Pass template to shell
3. If legacy fallback → Call legacy quick-build

**Code Change Required**:
```javascript
// scripts/apps/quickbuild/quickbuild-launcher.js (modified)
export async function openQuickBuildWithTemplate(actor, templateId) {
  const entryPoint = RolloutController.determineEntryPoint(actor);

  if (entryPoint.type === 'unified-progression') {
    const { ProgressionShell } = await import('.../progression-shell.js');
    return new ProgressionShell({
      actor,
      mode: 'chargen',
      initialTemplate: templateId,
    });
  } else {
    return openLegacyQuickBuild(actor, templateId);
  }
}
```

**Note**: In future, quick-build becomes just "ProgressionShell with template mode"

**Deprecation Timeline**: Same as above

---

### 4. Direct Actor Mutation (Legacy API)

**Current Location**: Scattered throughout `ActorEngine`, `CharacterSheet`, etc.

**Type**: API entry point (direct actor mutation)

**Status**: Deprecated (since v1.0.0)

**Replacement**: `MutationPlan` + `ProgressionReconciler` (from Phase 2-3)

**Decision**: DEPRECATE WITH CLEAR MESSAGING

**Action Plan**:
1. Identify all direct actor mutation calls (grep for patterns)
2. Wrap them with deprecation warnings
3. Route through `MutationPlan` API instead
4. Log deprecated usage for analytics

**Code Change Required**:
```javascript
// Example: actor.system.abilities.str = 18
// REPLACE WITH:
const plan = new MutationPlan(actor);
plan.setAbility('str', 18);
await plan.apply(); // Also reconciles downstream

// With deprecation warning:
function setAbilityDirect(actor, ability, value) {
  swseLogger.warn(
    'Direct actor mutation is deprecated. Use MutationPlan instead.',
    { method: 'setAbilityDirect', actor: actor.name }
  );

  const plan = new MutationPlan(actor);
  plan.setAbility(ability, value);
  return plan.apply();
}
```

**Deprecation Timeline**:
- v1.0.0: Add deprecation warnings
- v1.3.0: Encourage use of MutationPlan
- v2.0.0: Can consider removing direct API (breaking change)

---

## Wrapping Strategy

All legacy entry points are WRAPPED, not deleted:

```
User clicks "Create Character" (old button)
    ↓
chargen-main.js opens
    ↓
RolloutController.determineEntryPoint()
    ↓
    [Unified enabled]           [Legacy fallback]
    ↓                           ↓
    ProgressionShell(...)       Legacy chargen
    ↓                           ↓
    Unified flow                Old flow (if fallback needed)
```

**Benefits**:
- No code deletion
- Easy fallback if unified fails
- Clear audit trail (logging)
- Migration period (show warnings)
- Safe rollback option

---

## Migration Path for Users

### For GMs

1. **Update to v1.0.0** → System automatically uses unified progression
2. **See deprecation warnings** on old entry points (optional)
3. **Test unified flow** with a test character
4. **If issues** → Settings → "Enable Legacy Fallback"
5. **Report problems** → System collects data automatically
6. **Migrate content** → Review custom prerequisites, templates, etc.

### For Players

1. **Open character creation** → New unified interface
2. **Try templates** → Fast-build with guidance
3. **Or build manually** → Detailed step-by-step
4. **Level up** → New interface with same flow
5. **Questions?** → Help system with explanations built in

---

## Rollback Plan (if needed)

**If unified system has critical issues**:

1. Set `progression-rollout-mode` to `legacy-fallback`
2. All new characters use legacy system
3. Existing characters unaffected
4. Report issues and rollout settings included in bug reports
5. Fix implemented, gradually roll out again

**No code deletions, minimal friction**

---

## Success Metrics

Phase 7 Step 4 is complete when:

- ✅ All 4 legacy entry points identified and documented
- ✅ Wrapping strategy decided (WRAP not DELETE)
- ✅ Code changes planned (with examples)
- ✅ Migration path clear to users
- ✅ Rollback plan defined
- ✅ Deprecation timeline published
- ✅ RolloutSettings/RolloutController in place (Step 3)
- ✅ LegacyEntryPointManager in place (Step 3)

All metrics met. ✓

---

## Known Gaps (Post-Phase-7)

These should be addressed after Phase 7:

- [ ] Actual wrapping code written and tested
- [ ] Deprecation warnings integrated into UI
- [ ] Migration guide published to users
- [ ] Analytics tracking legacy usage
- [ ] Removal dates confirmed in roadmap
- [ ] Custom templates/prerequisites validated for migration

---

## Files Affected by Closure

```
scripts/apps/chargen/chargen-main.js              (will wrap)
scripts/apps/levelup/levelup-main.js              (will wrap)
scripts/apps/quickbuild/                          (will wrap)
ActorEngine (various)                             (will deprecate)
CharacterSheet (various)                          (will deprecate)

scripts/apps/progression-framework/rollout/
├── rollout-settings.js                           (NEW, Step 3)
├── rollout-controller.js                         (NEW, Step 3)
└── legacy-entry-point-manager.js                 (NEW, Step 3)

LEGACY-ENTRY-POINT-CLOSURE.md                     (this file)
```

---

## Phase 7 Step 4 Status

**Status**: COMPLETE ✓

All legacy entry points have been:
- Identified (4 systems)
- Categorized (3 UI entry points + 1 API)
- Decided (all WRAPPED, not deleted)
- Planned (with code examples)
- Supported (by rollout infrastructure from Step 3)

**Implementation of actual wrapping**: Post-Phase-7 (depends on integration testing)
