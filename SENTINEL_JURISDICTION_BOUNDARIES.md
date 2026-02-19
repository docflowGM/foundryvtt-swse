# Sentinel Jurisdiction Boundaries - STRICT ENFORCEMENT

## System Overview

```
User → Settings (sentinelMode: OFF|DEV|STRICT|PRODUCTION)
         ↓
    SentinelEngine (Core)
         ↓
    Sentry (Runtime)  +  Investigator (Structure)
         ↓
    Console Output + Event Bus + Status API
```

## Jurisdiction Matrix

| Responsibility | SentinelEngine | Sentry | Investigator |
|---|---|---|---|
| **Central logging** | ✓ | ✗ | ✗ |
| **Severity classification** | ✓ | ✗ | ✗ |
| **Mode management** | ✓ | ✗ | ✗ |
| **Correlation IDs** | ✓ | ✗ | ✗ |
| **Event bus** | ✓ | ✗ | ✗ |
| **Escalation logic** | ✓ | ✗ | ✗ |
| **CSS validation** | ✗ | ✓ | ✗ |
| **Render monitoring** | ✗ | ✓ | ✗ |
| **Hook frequency** | ✗ | ✓ | ✗ |
| **Error handling** | ✗ | ✓ | ✗ |
| **Registry audit** | ✗ | ✗ | ✓ |
| **V2 compliance** | ✗ | ✗ | ✓ |
| **Legacy detection** | ✗ | ✗ | ✓ |
| **Boot validation** | ✗ | ✗ | ✓ |

---

## SentinelEngine Jurisdiction

### OWNS:
- ✓ Centralized logging funnel
- ✓ Severity levels (INFO, WARN, ERROR, CRITICAL)
- ✓ Mode management (OFF, DEV, STRICT, PRODUCTION)
- ✓ Correlation ID generation per boot
- ✓ Event bus for listeners
- ✓ Escalation logic (3 CRITICAL or 2 CRITICAL + 2 ERROR = escalate)
- ✓ Report history & filtering
- ✓ Status API
- ✓ Console color coding

### DOES NOT:
- ✗ Perform detection logic
- ✗ Import Sentry or Investigator
- ✗ Mutate system data
- ✗ Hook into Foundry systems directly
- ✗ Inspect DOM
- ✗ Validate data structures
- ✗ Check registries

### Reports From:
- `SentinelEngine.report("engine", severity, message, meta)`
- `Sentry.report("sentry", severity, message, meta)` → routed to Engine
- `Investigator.report("investigator", severity, message, meta)` → routed to Engine

---

## Sentry Jurisdiction (Runtime Surface)

### OWNS:
- ✓ CSS contamination detection (.app, .window-app, contain, mask-image, etc.)
- ✓ Zero-dimension render detection (width=0, height=0)
- ✓ Layout collapse detection (< 100px)
- ✓ Missing DOM elements (window-content)
- ✓ Hook storm detection (>500/cycle, >50 updateActor/sec)
- ✓ Unhandled promise rejection tracking
- ✓ Global runtime error catching
- ✓ Performance warning thresholds
- ✓ Hook call frequency monitoring

### DOES NOT:
- ✗ Validate registry integrity (Investigator does)
- ✗ Check V2 compliance (Investigator does)
- ✗ Detect legacy usage (Investigator does)
- ✗ Validate import/export (Investigator does)
- ✗ Audit data consistency (Investigator does)
- ✗ Inspect code structure
- ✗ Mutate system state
- ✗ Import Investigator
- ✗ Call Investigator functions

### Monitors:
- `renderApplicationV2` hook
- `renderDocumentSheetV2` hook
- `window.onerror` event
- `window.unhandledrejection` event
- CSS stylesheets
- DOM mutations (MutationObserver)
- Hook call frequency

### Reports Via:
```javascript
SentinelEngine.report("sentry", severity, message, meta)
```

---

## Investigator Jurisdiction (Structural)

### OWNS:
- ✓ Registry integrity validation
  - TalentTreeDB size > 0
  - TalentDB size > 0
  - SpeciesDB, ClassDB, FeatDB consistency
- ✓ Duplicate key detection in registries
- ✓ Null/undefined entry detection
- ✓ Cross-registry reference validation
- ✓ V2 lifecycle compliance checks
- ✓ Legacy Application usage detection
- ✓ jQuery presence detection
- ✓ Import/export failure detection
- ✓ Boot sequence validation (game.ready, SWSEData, etc.)
- ✓ Circular hook detection
- ✓ Mutation storm detection

### DOES NOT:
- ✗ Inspect DOM layout (Sentry does)
- ✗ Inspect CSS properties (Sentry does)
- ✗ Monitor render performance (Sentry does)
- ✗ Check window dimensions (Sentry does)
- ✗ Detect hook call storms (Sentry does)
- ✗ Mutate system state
- ✗ Import Sentry
- ✗ Call Sentry functions
- ✗ Interfere with application lifecycle

### Special Behavior:
- **Disabled in PRODUCTION mode** (only Sentry runs)
- Runs after registries are available
- Waits for `swseDataReady` hook
- Falls back to checking at `ready` hook

### Reports Via:
```javascript
SentinelEngine.report("investigator", severity, message, meta)
```

---

## Forbidden Patterns

### ✗ NEVER DO:

```javascript
// In sentry.js
import { Investigator } from './investigator.js';  // ✗ FORBIDDEN
Investigator.checkRegistry();                      // ✗ FORBIDDEN

// In investigator.js
import { Sentry } from './sentry.js';              // ✗ FORBIDDEN
Sentry.scanCSS();                                  // ✗ FORBIDDEN

// In either Sentry or Investigator
window.game.actors = [];                           // ✗ FORBIDDEN (mutation)
```

### ✓ DO THIS INSTEAD:

```javascript
// In sentry.js (allowed)
import { SentinelEngine } from './sentinel-engine.js';  // ✓ OK
SentinelEngine.report("sentry", SEVERITY, msg, meta);  // ✓ OK

// If coordination needed between Sentry and Investigator
// Don't have them talk to each other
// Instead, Engine handles it:
SentinelEngine.on('report', (report) => {
  // Engine's escalation logic runs here
  // Can see reports from both Sentry and Investigator
});
```

---

## Severity Escalation (SentinelEngine Only)

### Engine Logic:
```
If 3+ CRITICAL in 500ms:
  → Escalate to CRITICAL

If 2+ CRITICAL + 2+ ERROR in 500ms:
  → Escalate to CRITICAL

Otherwise:
  → Report as-is
```

### Example:

**Timeline:**
```
T+0ms  : Sentry reports CRITICAL (CSS selector)
T+50ms : Sentry reports CRITICAL (zero dimension)
T+100ms: Investigator reports ERROR (empty registry)
T+150ms: Sentry reports CRITICAL (hook storm)
         ↓
         [3 CRITICAL detected]
         ↓
Engine escalates:
[SWSE SENTINEL] [engine] 🔴 System integrity compromised
  {criticalCount: 3, errorCount: 1, timeWindow: "500ms"}
```

---

## Communication Protocol

### Layer Order (No Cycles):

```
1. SentinelEngine (imports: nothing)
   ↑
2. Sentry (imports: SentinelEngine)
   ↑
3. Investigator (imports: SentinelEngine)
```

### Never Imported:
- Engine never imports Sentry
- Engine never imports Investigator
- Sentry never imports Investigator
- Investigator never imports Sentry

### Single Communication Path:
```
Sentry/Investigator → SentinelEngine.report() → Console + Event Bus
```

---

## Mode Effects on Jurisdiction

| Mode | SentinelEngine | Sentry | Investigator | Logging |
|---|---|---|---|---|
| **OFF** | ✗ | ✗ | ✗ | None |
| **DEV** | ✓ | ✓ | ✓ | All |
| **STRICT** | ✓ | ✓ | ✓ | Aggressive |
| **PRODUCTION** | ✓ | ✓ | ✗ | Errors only |

---

## Data Flow Examples

### Example 1: CSS Violation

```
1. Sentry.scanInitialCSS() detects dangerous selector
2. Sentry calls: SentinelEngine.report("sentry", CRITICAL, "...", meta)
3. Engine:
   - Stores report
   - Increments severity counter
   - Increments layer counter
   - Logs to console with color
   - Emits 'report' event
4. Event listeners notified
5. User sees in console:
   [SWSE SENTINEL] [sentry] 🔴 Dangerous CSS selector detected
```

### Example 2: Registry Check

```
1. Investigator._auditRegistries() runs after data loaded
2. Investigator finds empty TalentTreeDB
3. Investigator calls: SentinelEngine.report("investigator", CRITICAL, "...", meta)
4. Engine:
   - Stores report
   - Increments counters
   - Logs to console
5. In PRODUCTION mode:
   - Engine is active, Sentry is active, Investigator is OFF
   - This report would NOT be generated
   - Only runtime issues tracked
```

### Example 3: Escalation

```
1. Sentry detects 3 CRITICAL issues rapidly
2. Each calls SentinelEngine.report()
3. Engine checks escalation conditions
4. Threshold met: 3 CRITICAL in < 500ms
5. Engine generates its own CRITICAL:
   [SWSE SENTINEL] [engine] 🔴 System integrity compromised
```

---

## Boundary Enforcement

### How Boundaries Are Maintained

1. **Import Structure**
   - SentinelEngine has zero external imports (checked in code review)
   - Sentry only imports SentinelEngine
   - Investigator only imports SentinelEngine

2. **Communication Check**
   - No cross-calling between Sentry and Investigator
   - Grep for `Sentry.`, `Investigator.` in each file
   - Should only find in-file references or Engine calls

3. **Mutation Prevention**
   - All layers are read-only observers
   - No `game.actors.modify()`, `registry.push()`, etc.
   - Only calls to `SentinelEngine.report()`

4. **Mode Isolation**
   - Investigator checks mode before init
   - Returns early if PRODUCTION or OFF
   - Sentry respects mode in Engine

---

## Files & Checksums

| File | LOC | Purpose | Imports |
|---|---|---|---|
| sentinel-engine.js | 276 | Core kernel | None |
| sentry.js | 281 | Runtime guard | SentinelEngine only |
| investigator.js | 210 | Structure auditor | SentinelEngine only |

**Total: 767 LOC of pure diagnostic code with zero cross-coupling.**

---

## Validation Checklist

Before implementation, verify:

- [ ] No `import { Investigator }` in sentry.js
- [ ] No `import { Sentry }` in investigator.js
- [ ] No direct calls between Sentry and Investigator
- [ ] All Sentry reports via `SentinelEngine.report()`
- [ ] All Investigator reports via `SentinelEngine.report()`
- [ ] No mutations in any layer
- [ ] Engine has zero external imports
- [ ] Investigator respects mode check
- [ ] All console output goes through Engine
- [ ] Color coding applied in Engine only

---

**Jurisdiction boundaries are strictly enforced by architecture design.**
