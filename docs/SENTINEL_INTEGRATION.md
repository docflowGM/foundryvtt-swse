# Sentinel Integration Snippet

## Step 1: Add Imports to index.js

In the core imports section (after existing core imports):

```javascript
// ---- core / config ----
import { SWSE } from './scripts/core/config.js';
import { registerSystemSettings } from './scripts/core/settings.js';
import { initializeUtils } from './scripts/core/utils-init.js';
import { initializeRolls } from './scripts/core/rolls-init.js';
import { SWSESentinel } from './scripts/core/swse-sentinel.js';
import { Sentinel } from './scripts/core/sentinel/sentinel-core.js';
import { initializeSentinelLayers, bootstrapSentinel } from './scripts/core/sentinel/sentinel-registry.js';
```

## Step 2: Activate Sentinel

Add this hook after `registerSystemSettings()` is called:

```javascript
// After game.ready or in a ready hook
Hooks.once('ready', () => {
  // Initialize old sentinel (Phase 1-6, if keeping)
  SWSESentinel.bootstrap();

  // Initialize new Sentinel Runtime Kernel
  initializeSentinelLayers();
  bootstrapSentinel();
});
```

## Step 3: Enable in Settings

Users can toggle via:
1. **Client Settings** → **Sentinel Runtime Mode**
   - OFF, DEV, STRICT, PRODUCTION

2. **Client Settings** → Per-layer toggles
   - Sentinel CSS Layer
   - Sentinel Render Layer
   - Sentinel Data Layer
   - Sentinel Hooks Layer
   - Sentinel Promises Layer
   - Sentinel Performance Layer

3. **Dev Mode** (existing)
   - If enabled, Sentinel defaults to DEV mode

## Console Access

From browser console, developers can:

```javascript
// Check status
Sentinel.isActive()

// Get all reports
Sentinel.getReports()

// Get specific layer reports
Sentinel.getReports('css')

// Get only errors
Sentinel.getReports(null, Sentinel.SEVERITY.ERROR)

// Export diagnostics
Sentinel.exportDiagnostics()

// Get performance metrics
PerformanceLayer.getReport()
```

## Behavior

**With devMode enabled or sentinelMode !== OFF:**

1. Sentinel initializes at `ready` hook
2. All enabled layers activate
3. Console shows initialization message:
   ```
   [SWSE SENTINEL] Runtime Kernel Active Mode: DEV Layers: css, render, data, hooks, promises, performance
   ```
4. As violations occur, console logs appear with severity colors
5. Reports accumulate in memory for programmatic access

**Examples of violations detected:**

```javascript
// CSS violation
[SWSE SENTINEL] [css] ✘ Dangerous global selector in SWSE CSS
  {file: "...", selector: ".app", rule: "..."}

// Render failure
[SWSE SENTINEL] [render] ✘ ApplicationV2 rendered with zero dimensions
  {appName: "MyApp", width: 0, height: 0}

// Hook spam
[SWSE SENTINEL] [hooks] ✘ Excessive updateActor calls detected
  {hook: "updateActor", callsInWindow: 75}

// Unhandled error
[SWSE SENTINEL] [promises] ✘ Unhandled promise rejection
  {message: "Cannot read property...", isSWSECode: true}

// Performance issue
[SWSE SENTINEL] [performance] ⚠ Slow sheet render
  {sheetName: "ActorSheet", duration: "350ms", threshold: "250ms"}
```

## Migration Path

**Current State (Phases 1-6):**
- Original sentinel in `scripts/core/swse-sentinel.js`
- Logs directly to console
- Basic checks only

**New State (Runtime Kernel):**
- Modular layers in `scripts/core/sentinel/`
- Centralized reporting
- Comprehensive monitoring
- Programmatic access to reports
- Per-layer toggle control

**Recommendation:** Keep both during transition period. New sentinel focuses on architectural integrity; old sentinel can be deprecated later.

## Validation Checklist

After implementation, verify:

- [ ] Settings registered (all 8 new settings visible in client settings)
- [ ] Imports added to index.js
- [ ] `bootstrapSentinel()` called in ready hook
- [ ] Console shows kernel activation message
- [ ] Can access `Sentinel` from console
- [ ] CSS audit runs and reports found violations
- [ ] Render hooks fire and catch zero-dimension apps
- [ ] Each layer can be toggled independently
- [ ] Mode changes affect output verbosity
- [ ] No circular dependencies exist

## Performance Validation

Check runtime impact:

```javascript
// In console after ready
const snap1 = Sentinel.exportDiagnostics();
console.log('Boot ID:', snap1.bootId);
console.log('Reports collected:', snap1.reports.length);
console.log('Memory estimate: <1MB typical');
```

---

**Ready for implementation? Confirm architecture sanity and proceed with commit.**
