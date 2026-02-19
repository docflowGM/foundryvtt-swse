# SWSE Sentinel Runtime Kernel Architecture

## Overview

The Sentinel Runtime Kernel is a modular diagnostic system designed to detect and report runtime integrity violations without blocking execution or mutating state.

**Key Principles:**
- Non-invasive observation only
- No data mutation
- No execution blocking
- Dev-mode configurable
- Centralized logging
- Modular layer system

---

## Directory Structure

```
scripts/core/sentinel/
├── sentinel-core.js          # Main kernel (bootstrap, reporting, layer mgmt)
├── sentinel-registry.js      # Layer registration and initialization
└── layers/
    ├── css-layer.js          # CSS selector and property violations
    ├── render-layer.js       # AppV2 and sheet rendering failures
    ├── data-layer.js         # Registry and data integrity
    ├── hooks-layer.js        # Hook call frequency monitoring
    ├── promises-layer.js     # Unhandled rejections and errors
    └── performance-layer.js  # Initialization and render timing
```

---

## Core Components

### sentinel-core.js

Central kernel managing all diagnostic operations.

**Key Methods:**

```javascript
// Bootstrap the kernel
Sentinel.bootstrap()

// Register a diagnostic layer
Sentinel.registerLayer(name, layer)

// Report a diagnostic event
Sentinel.report(layer, severity, message, meta)

// Set runtime mode
Sentinel.setMode(mode)

// Retrieve reports
Sentinel.getReports(layerFilter, severityFilter)

// Export diagnostics snapshot
Sentinel.exportDiagnostics()
```

**Modes:**
- `OFF` (0) - Disabled
- `DEV` (1) - Development (verbose logging)
- `STRICT` (2) - Strict mode (warnings treated as errors)
- `PRODUCTION` (3) - Production (only critical issues)

**Severity Levels:**
- `INFO` (0) - Informational
- `WARN` (1) - Warning
- `ERROR` (2) - Error
- `CRITICAL` (3) - Critical failure

**Structured Log Format:**
```javascript
{
  layer: string,
  severity: "INFO"|"WARN"|"ERROR"|"CRITICAL",
  message: string,
  meta: object,
  timestamp: number,
  correlationId: string
}
```

### sentinel-registry.js

Manages layer initialization and registration order.

**Exported Functions:**

```javascript
// Register and initialize all layers
initializeSentinelLayers()

// Activate the kernel
bootstrapSentinel()
```

---

## Layer System

Each layer is self-contained and implements a standard interface.

### Layer Interface

```javascript
export const LayerName = {
  // Required: Initialize the layer
  init() {
    // Set up hooks, observers, etc.
  }
};
```

### Existing Layers

#### 1. CSS Layer (`css-layer.js`)

**Detects:**
- Global selector overrides (`.app`, `.window-app`, `body`, `html`, `*`)
- Dangerous CSS properties (`contain`, `mask-image`, `overflow: hidden`)
- Unscoped selectors (missing `system-foundryvtt-swse` namespace)
- Width/height constraints on core UI

**Severity:**
- `CRITICAL` - Dangerous global selectors
- `ERROR` - Dangerous CSS properties
- `WARN` - Unscoped selectors

#### 2. Render Layer (`render-layer.js`)

**Detects:**
- Zero-dimension renders (width or height = 0)
- Missing window structure elements
- Window collapse (< 100px height)
- Slow renders (>250ms, >1000ms thresholds)

**Severity:**
- `ERROR` - Zero dimensions, fully collapsed windows
- `WARN` - Approaching collapse, slow renders

#### 3. Data Layer (`data-layer.js`)

**Detects:**
- Empty registries (TalentTreeDB, TalentDB, etc.)
- Null/undefined entries in registries
- Key-ID mismatches
- Registry size anomalies

**Severity:**
- `CRITICAL` - Empty critical registries
- `WARN` - Integrity issues, null entries

#### 4. Hooks Layer (`hooks-layer.js`)

**Detects:**
- Excessive hook calls in render cycle (>500)
- Rapid repeated calls (updateActor >50/sec)
- Potential infinite loops

**Severity:**
- `ERROR` - Excessive frequency (>500 in cycle, >50/sec for updateActor)
- `WARN` - High frequency (>100 calls)

#### 5. Promises Layer (`promises-layer.js`)

**Detects:**
- Unhandled promise rejections
- Global runtime errors
- Stack trace analysis (distinguishes SWSE vs external)

**Severity:**
- `ERROR` - Errors from SWSE code
- `WARN` - Errors from external code

#### 6. Performance Layer (`performance-layer.js`)

**Detects:**
- System initialization time
- Registry build time
- Sheet/app render duration
- Performance degradation patterns

**Severity:**
- `ERROR` - Renders >1000ms
- `WARN` - Slow initialization (>5s), renders >250ms

---

## Configuration

### Settings

All settings are client-scoped and can be toggled independently:

```javascript
// Main kernel mode
sentinelMode: 'OFF' | 'DEV' | 'STRICT' | 'PRODUCTION'

// Per-layer toggles
sentinelCss: boolean
sentinelRender: boolean
sentinelData: boolean
sentinelHooks: boolean
sentinelPromises: boolean
sentinelPerformance: boolean
```

### Bootstrap Behavior

Sentinel activates on `Hooks.once('ready')` if:
- `devMode === true` OR
- `sentinelMode !== 'OFF'`

---

## Integration

### Import in index.js

```javascript
// Import Sentinel kernel and registry
import { Sentinel } from './scripts/core/sentinel/sentinel-core.js';
import { initializeSentinelLayers, bootstrapSentinel } from './scripts/core/sentinel/sentinel-registry.js';

// ... other imports ...

// Initialize and activate Sentinel (after settings are registered)
Hooks.once('ready', () => {
  initializeSentinelLayers();
  bootstrapSentinel();
});
```

---

## Adding New Layers

### Step 1: Create Layer File

Create `scripts/core/sentinel/layers/my-layer.js`:

```javascript
import { Sentinel } from '../sentinel-core.js';

export const MyLayer = {
  /**
   * Initialize your monitoring
   */
  init() {
    // Set up hooks, observers, etc.
    Hooks.on('someHook', () => {
      // Monitor something
    });
  }
};
```

### Step 2: Register in sentinel-registry.js

Add import:
```javascript
import { MyLayer } from './layers/my-layer.js';
```

Register in `initializeSentinelLayers()`:
```javascript
Sentinel.registerLayer('myLayer', MyLayer);
```

### Step 3: Add Settings

In `scripts/core/settings.js`:
```javascript
game.settings.register('foundryvtt-swse', 'sentinelMyLayer', {
  name: 'Sentinel My Layer',
  hint: 'Description of what this layer monitors',
  scope: 'client',
  config: true,
  type: Boolean,
  default: true
});
```

### Step 4: Report in Your Layer

Use `Sentinel.report()`:
```javascript
Sentinel.report('myLayer', Sentinel.SEVERITY.ERROR, 'Something went wrong', {
  detail1: value1,
  detail2: value2
});
```

---

## Console Output

Sentinel logs are color-coded by severity:

- **ℹ INFO** (Cyan) - Operational status
- **⚠ WARN** (Orange) - Potential issues
- **✘ ERROR** (Red) - Actual problems
- **🔴 CRITICAL** (Red+Yellow) - Severe failures

Example:
```
[SWSE SENTINEL] [css] ✘ Dangerous global selector in SWSE CSS {
  file: "...",
  selector: ".app",
  rule: "..."
}
```

---

## API Usage Examples

### Check if Sentinel is Active

```javascript
if (Sentinel.isActive()) {
  console.log('Sentinel is monitoring');
}
```

### Get Recent Reports

```javascript
// All reports
const all = Sentinel.getReports();

// From specific layer
const cssReports = Sentinel.getReports('css');

// Only errors and above
const errors = Sentinel.getReports(null, Sentinel.SEVERITY.ERROR);
```

### Export Diagnostics for Debugging

```javascript
const snapshot = Sentinel.exportDiagnostics();
console.log(JSON.stringify(snapshot, null, 2));
```

### Get Performance Report

```javascript
const perfReport = PerformanceLayer.getReport();
```

---

## Design Constraints

✅ **Enforced:**
- No circular imports
- No direct registry mutation
- No coupling to sheet logic
- No interference with production mode
- Zero blocking logic
- Non-invasive observation only

---

## Testing Integration

To verify architecture after implementation:

1. Enable `devMode` in client settings
2. Set `sentinelMode` to `DEV`
3. Open browser console
4. Perform actions that trigger violations
5. Verify console logs appear with correct severity colors
6. Use `Sentinel.exportDiagnostics()` in console to verify data collection

---

## Performance Impact

**Negligible when disabled.** When enabled:
- Initial scan: ~50-100ms (CSS audit)
- Ongoing: <1ms per hook/mutation (observer batches events)
- Memory: <1MB for typical session (report log)

---

## Future Extensions

Potential additional layers:
- **Item Layer** - Item creation/modification tracking
- **Actor Layer** - Actor update frequency and data validation
- **Migration Layer** - Data migration success/failure tracking
- **UI Layer** - Component render failures and state issues
- **Network Layer** - API request success rates and timing

---

**This architecture ensures Sentinel can grow without bloating the core system or creating dependencies.**
