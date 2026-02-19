# Integration Snippet: index.js

## Step 1: Add Imports

In the core imports section:

```javascript
// ---- core / config ----
import { SWSE } from './scripts/core/config.js';
import { registerSystemSettings } from './scripts/core/settings.js';
import { initializeUtils } from './scripts/core/utils-init.js';
import { initializeRolls } from './scripts/core/rolls-init.js';
import { SWSESentinel } from './scripts/core/swse-sentinel.js';

// NEW: Sentinel Engine + Sentry + Investigator
import { SentinelEngine } from './scripts/core/sentinel/sentinel-engine.js';
import { Sentry } from './scripts/core/sentinel/sentry.js';
import { Investigator } from './scripts/core/sentinel/investigator.js';
```

## Step 2: Bootstrap in Ready Hook

```javascript
// In your ready hook (or after registerSystemSettings is called)
Hooks.once('ready', () => {
  // Initialize old Sentinel (Phase 1-6) if keeping
  SWSESentinel.bootstrap();

  // Initialize new Sentinel Engine + Sentry + Investigator
  SentinelEngine.bootstrap();
  Sentry.init();
  Investigator.init();

  // ... rest of ready code ...
});
```

## Step 3: Settings Already Registered

The setting `sentinelMode` has been added to `scripts/core/settings.js`:

```javascript
game.settings.register('foundryvtt-swse', 'sentinelMode', {
  name: 'System Integrity Mode',
  hint: 'Enable runtime diagnostics: OFF (disabled), DEV (verbose), STRICT (aggressive), PRODUCTION (errors only).',
  scope: 'client',
  config: true,
  type: String,
  choices: {
    'OFF': 'Disabled',
    'DEV': 'Development',
    'STRICT': 'Strict (Experimental)',
    'PRODUCTION': 'Production'
  },
  default: 'DEV'
});
```

Users can toggle via:
- **Client Settings** → **System Integrity Mode**

## Step 4: Access from Console

```javascript
// Check current status
SWSE_SENTINEL_STATUS()

// Get all reports
SentinelEngine.getReports()

// Filter by layer
SentinelEngine.getReports('sentry')
SentinelEngine.getReports('investigator')

// Filter by severity
SentinelEngine.getReports(null, SentinelEngine.SEVERITY.ERROR)

// Change mode at runtime
SentinelEngine.setMode(SentinelEngine.MODES.STRICT)

// Get structured status
SentinelEngine.getStatus()
```

## Full Example

### index.js excerpt:

```javascript
// ---- core / config ----
import { SWSE } from './scripts/core/config.js';
import { registerSystemSettings } from './scripts/core/settings.js';
import { initializeUtils } from './scripts/core/utils-init.js';
import { initializeRolls } from './scripts/core/rolls-init.js';
import { SWSESentinel } from './scripts/core/swse-sentinel.js';
import { SentinelEngine } from './scripts/core/sentinel/sentinel-engine.js';
import { Sentry } from './scripts/core/sentinel/sentry.js';
import { Investigator } from './scripts/core/sentinel/investigator.js';

// ... other imports ...

// ---- initialization ----
Hooks.once('setup', () => {
  registerSystemSettings();
});

Hooks.once('ready', () => {
  // Sentinel systems
  SWSESentinel.bootstrap();          // Old system (Phase 1-6)
  SentinelEngine.bootstrap();        // New engine
  Sentry.init();                     // Runtime guard
  Investigator.init();               // Structural auditor

  // ... rest of ready code ...
});
```

## No Changes Needed

- ✅ Settings already registered
- ✅ No other modifications needed
- ✅ Three lines of code to add
- ✅ Completely optional (can disable via setting)

## Behavior by Mode

### OFF
- All monitoring disabled
- Zero overhead
- Used for production when not diagnosing

### DEV
- All monitoring active
- Verbose console output
- Investigator fully active
- Used during development

### STRICT
- All monitoring active
- Aggressive reporting
- Investigator fully active
- More detailed severity escalation
- Used for QA/testing

### PRODUCTION
- Sentry only active (runtime guard)
- Investigator disabled
- Errors only (no INFO/WARN)
- Safe for live servers

## Console Output

When enabled, you'll see:

```
[SWSE SENTINEL] [sentry] ℹ Runtime surface guard activated
[SWSE SENTINEL] [investigator] ℹ Structural diagnostics enabled
[SWSE SENTINEL] [engine] ℹ Sentinel Engine bootstrapped
  {mode: "DEV", correlationId: "boot-1708362000000-abc123"}
```

Then as violations occur:

```
[SWSE SENTINEL] [sentry] ⚠ Window approaching collapse
  {title: "My App", height: "85px"}

[SWSE SENTINEL] [investigator] ℹ Registry integrity OK: TalentTreeDB
  {registry: "TalentTreeDB", size: 1247}
```

## Validation

To verify integration worked:

```javascript
// In console after reload
SWSE_SENTINEL_STATUS()

// Should return:
// {
//   mode: "DEV",
//   correlationId: "boot-...",
//   initialized: true,
//   totalReports: 4,
//   severityCounts: {INFO: 3, WARN: 0, ERROR: 0, CRITICAL: 0},
//   layerCounts: {engine: 1, sentry: 1, investigator: 1}
// }
```

---

**Integration complete. Ready for development/testing.**
