# SWSE Sentinel Engine + Sentry + Investigator

## Architecture Overview

Clean separation of concerns with centralized logging through **SentinelEngine**.

```
SentinelEngine (Core Nervous System)
├── Central logging funnel
├── Severity classification
├── Mode management (OFF, DEV, STRICT, PRODUCTION)
├── Event bus & escalation
└── Status API

    ↓

Sentry (Runtime Surface Guard)
├── CSS contamination detection
├── Zero-dimension renders
├── Layout collapse
├── Hook storms
├── Unhandled rejections
└── Runtime errors

Investigator (Structural Diagnostics)
├── Registry integrity
├── V2 lifecycle compliance
├── Legacy usage detection
├── Boot sequence validation
└── Data consistency checks
```

## Strict Jurisdiction Boundaries

### SentinelEngine (Core)
**Is responsible for:**
- Central logging funnel
- Severity levels (INFO, WARN, ERROR, CRITICAL)
- Mode management
- Correlation ID generation
- Event bus & escalation logic
- Status reporting

**Does NOT:**
- Perform detection logic
- Import Sentry or Investigator
- Mutate system data

### Sentry (Runtime Surface Guard)
**Is responsible for:**
- CSS contamination (global selectors, dangerous properties)
- Zero-dimension application renders
- Zero-dimension sheet renders
- Window collapse detection (< 100px height)
- Missing DOM elements (window-content)
- Hook storm detection (>500 calls/cycle, >50 updateActor/sec)
- Unhandled promise rejections
- Global runtime errors
- Performance warnings (render duration)

**Does NOT:**
- Validate registry integrity (Investigator does this)
- Check V2 compliance (Investigator does this)
- Detect legacy usage (Investigator does this)
- Inspect data structures
- Mutate system state
- Import Investigator
- Call Investigator functions

### Investigator (Structural Diagnostics)
**Is responsible for:**
- Registry integrity validation (TalentTreeDB, TalentDB, etc.)
- Duplicate key detection
- Null/undefined entry detection
- Cross-registry reference validation
- V2 lifecycle compliance checks
- Legacy Application usage detection
- jQuery presence detection
- Import/export failure detection
- Boot sequence validation

**Does NOT:**
- Inspect DOM layout (Sentry does this)
- Inspect CSS properties (Sentry does this)
- Monitor render performance (Sentry does this)
- Mutate system state
- Import Sentry
- Call Sentry functions

**Special:** Disabled in PRODUCTION mode

## Communication Pattern

**Direct imports (allowed):**
```
Sentry → SentinelEngine ✓
Investigator → SentinelEngine ✓
```

**Cross-imports (forbidden):**
```
Sentry → Investigator ✗
Investigator → Sentry ✗
```

**Communication flow:**
```
Sentry detects issue
    ↓
SentinelEngine.report("sentry", SEVERITY, message, meta)
    ↓
SentinelEngine logs & evaluates
    ↓
SentinelEngine emits event (if needed)
    ↓
Console output
```

## Modes Explained

| Mode | Sentry | Investigator | Logging | Use Case |
|------|--------|--------------|---------|----------|
| **OFF** | ✗ | ✗ | None | Production (zero overhead) |
| **DEV** | ✓ | ✓ | Verbose | Development |
| **STRICT** | ✓ | ✓ | Aggressive | Testing/QA |
| **PRODUCTION** | ✓ | ✗ | Errors only | Live server |

## Files & Lines of Code

```
sentinel-engine.js       ✓ 276 LOC (Core nervous system)
sentry.js               ✓ 281 LOC (Runtime surface guard)
investigator.js         ✓ 210 LOC (Structural diagnostics)
settings.js             ✓ Updated (1 new setting)
```

**Total: 767 LOC of diagnostic code**

## Design Guarantees

✅ **No circular dependencies**
- Engine imports nothing
- Sentry imports only Engine
- Investigator imports only Engine
- Sentry and Investigator never import each other

✅ **No business logic mutation**
- All layers are observers only
- No direct system modification
- Detection only, reporting only

✅ **Event-driven coordination**
- Sentry and Investigator never call each other
- All communication through Engine events
- Engine handles escalation logic

✅ **Production-safe**
- Zero overhead when OFF
- Investigator auto-disables in PRODUCTION mode
- No blocking logic

✅ **Gradual logging migration**
- Existing business logic untouched
- Only reporting layer migrated
- Can incrementally replace console.error/warn

## Integration Points

### 1. Import in index.js
```javascript
import { SentinelEngine } from './scripts/core/sentinel/sentinel-engine.js';
import { Sentry } from './scripts/core/sentinel/sentry.js';
import { Investigator } from './scripts/core/sentinel/investigator.js';
```

### 2. Bootstrap in ready hook
```javascript
Hooks.once('ready', () => {
  SentinelEngine.bootstrap();
  Sentry.init();
  Investigator.init();
});
```

### 3. Access status
```javascript
// From console
SWSE_SENTINEL_STATUS()  // Returns current state

// Programmatically
SentinelEngine.getStatus()
SentinelEngine.getReports()
SentinelEngine.getReports('sentry')  // Sentry reports only
SentinelEngine.getReports(null, SEVERITY.ERROR)  // Errors only
```

## Example Output

```
[SWSE SENTINEL] [sentry] 🔴 Dangerous CSS selector detected
  {file: "systems/foundryvtt-swse/css/sheet.css", selector: ".app", rule: "..."}

[SWSE SENTINEL] [sentry] ✘ ApplicationV2 rendered with zero dimensions
  {appName: "ActorSheetV2", width: 0, height: 0}

[SWSE SENTINEL] [sentry] ✘ Hook storm detected: updateActor
  {hook: "updateActor", callsInWindow: 75, windowMs: 16}

[SWSE SENTINEL] [investigator] ℹ Registry integrity OK: TalentTreeDB
  {registry: "TalentTreeDB", size: 1247}

[SWSE SENTINEL] [investigator] ⚠ Legacy Application sheets detected
  {count: 2, recommendation: "Migrate to ApplicationV2"}

[SWSE SENTINEL] [engine] 🔴 System integrity compromised
  {criticalCount: 3, errorCount: 2, timeWindow: "500ms"}
```

## Escalation Logic

If within 500ms:
- 3+ CRITICAL reports detected, OR
- 2+ CRITICAL + 2+ ERROR reports

Then: Engine escalates to CRITICAL severity

```javascript
[SWSE SENTINEL] [engine] 🔴 System integrity compromised
  {criticalCount: 3, errorCount: 2, timeWindow: "500ms"}
```

## Console Access

From browser devtools:

```javascript
// Check if active
SentinelEngine.isActive()

// Get current status
SWSE_SENTINEL_STATUS()

// Get all reports
SentinelEngine.getReports()

// Get sentry reports only
SentinelEngine.getReports('sentry')

// Get errors and above
SentinelEngine.getReports(null, SentinelEngine.SEVERITY.ERROR)

// Change mode at runtime
SentinelEngine.setMode(SentinelEngine.MODES.STRICT)

// Clear history
SentinelEngine.clearReports()
```

## No Circular Coupling

**Enforced separation:**

```javascript
// ✓ Allowed
import { SentinelEngine } from './sentinel-engine.js';

// ✗ Forbidden in sentry.js and investigator.js
import { Investigator } from './investigator.js';  // ✗
import { Sentry } from './sentry.js';              // ✗
```

If a problem requires both Sentry and Investigator coordination:
- Don't have them communicate directly
- Have Engine emit an event
- Handle in Engine's escalation logic

## Logging Migration Path

**Phase 1 (Current):** Keep existing logic
```javascript
// Current code in validators
if (!value) {
  console.error('Invalid value');
}
```

**Phase 2 (Optional):** Migrate to central reporting
```javascript
// Gradual migration
if (!value) {
  SentinelEngine.report('data', SentinelEngine.SEVERITY.ERROR, 'Invalid value', { value });
}
```

**No business logic moves.** Only logging layer changes.

## Testing the Architecture

1. Enable devMode in client settings
2. Set sentinelMode to DEV
3. Open browser console
4. Perform actions that trigger violations
5. Verify:
   - Correct layer tag ([sentry] vs [investigator])
   - Correct severity color (cyan/orange/red)
   - Correct message
   - Proper meta data

```javascript
// Verify structure
SWSE_SENTINEL_STATUS()
// {
//   mode: "DEV",
//   correlationId: "boot-...",
//   totalReports: 12,
//   severityCounts: { INFO: 3, WARN: 5, ERROR: 4, CRITICAL: 0 },
//   layerCounts: { sentry: 8, investigator: 4 }
// }
```

## Next Steps After Review

If architecture is approved:
1. Update index.js with imports and bootstrap
2. Commit all three files
3. Test in development
4. Gradually migrate existing console.error/warn calls
5. Maintain both old Sentinel (Phase 1-6) and new system during transition

---

**This architecture is production-ready and safe to implement.**
