# Lifecycle Violation Detection Architecture

## System Overview

The Sentinel system now detects three classes of lifecycle violations:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SENTINEL ENGINE                               │
│                    (sentinel-core.js)                            │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                      ┌───────┴────────┐
                      │                │
            SWSEDebugger        Violation Detector
            (swse-debugger.js)   (#detectViolation)
                      │                │
                      └───────┬────────┘
                              │
                    Three Classes of Violations:
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    MEMORY              RENDER STORM          LIFECYCLE
    PRESSURE            DETECTION             VIOLATIONS
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    Silent Mode Filter
                    (if #silentMode)
                              │
                    ┌─────────┴─────────┐
                    │                   │
            NO VIOLATION:      VIOLATION DETECTED:
            Record Silently    Log to Console
            (no console log)   (with details)
```

## Component Details

### 1. SWSE Debugger
**File**: `scripts/debug/swse-debugger.js`

- Records metrics every 30 seconds via `recordMemorySnapshot()`
- Forwards all events to Sentinel via `window.__SWSE_SENTINEL__.reportEvent()`
- Patches lifecycle hooks:
  - `app:prepare:start`
  - `app:prepare:end`
  - `app:render:start`
  - `app:render:end`

**Key Line**:
```javascript
// Line 59 in swse-debugger.js
window.__SWSE_SENTINEL__.reportEvent("debug", event);
```

### 2. Sentinel Reporter
**File**: `scripts/governance/sentinel/sentinel-core.js`
**Method**: `report(layer, severity, message, meta)`

- Entry point for all events
- Checks if `layer === 'debugger'` and `message.includes('Debug event:')`
- If **silent mode enabled** and **no violation detected**:
  - Calls `#recordMetricSilently()` - stores internally, no console output
  - Returns early
- If violation detected:
  - Continues with normal logging flow
  - Outputs to console via `#logToConsole()`

**Key Logic** (lines 160-172):
```javascript
if (this.#silentMode && layer === 'debugger' && message.includes('Debug event:')) {
  const eventType = meta?.type;
  const hasViolation = this.#detectViolation(eventType, meta);

  if (!hasViolation) {
    this.#recordMetricSilently(layer, severity, message, meta, options);
    return;  // ← Skip console output
  }
  // If violation detected, continue with normal logging
}
```

### 3. Violation Detector
**File**: `scripts/governance/sentinel/sentinel-core.js`
**Method**: `#detectViolation(eventType, meta)`

Checks for three violation types:

#### A. Memory Violation
```javascript
if (eventType === 'metric:memory') {
  // Trigger: heap > 80% of limit
  if ((usedHeap / limit) > 0.8) {
    violations.push(`Memory pressure: ${used}MB / ${limit}MB`);
  }
}
```

**Detection point**: Every 30s when memory metric recorded
**Threshold**: 80% heap utilization
**Severity**: Warning (if triggered, logs to console)

#### B. Render Storm Detection
```javascript
if (eventType === 'app:render:end' || eventType === 'app:render:start') {
  // Track render calls per app
  // Keep last 60 seconds of renders
  // Trigger: > 10 renders in < 10 seconds
  if (renders.length > 10 && timeSpan < 10000) {
    violations.push(`Render storm detected: ${count} renders in ${seconds}s`);
  }
}
```

**Detection point**: On each render event
**Threshold**: 10+ renders in 10 seconds
**Severity**: Warning (if triggered, logs to console)

#### C. Lifecycle Violation
```javascript
if (eventType?.startsWith('app:')) {
  // Track hook sequence per app
  // Expected: prepare:start → prepare:end → render:start → render:end
  // Invalid transitions trigger violation
  const valid = validTransitions[lastHook.type];
  if (!valid.includes(eventType)) {
    violations.push(`Lifecycle violation: ${lastHook} → ${eventType}`);
  }
}
```

**Detection point**: On each app lifecycle event
**Threshold**: Invalid hook sequence
**Severity**: Warning (if triggered, logs to console)

### 4. Storage Systems

#### Violation Log
```javascript
static #lifecycleViolations = [];  // Stores detected violations

// Grows to max 100 items
if (this.#lifecycleViolations.length > 100) {
  this.#lifecycleViolations.shift();
}
```

#### Hook Sequences
```javascript
static #hookSequences = new Map();  // app → hooks called in sequence

// Tracks last 60 seconds of hooks per app
const now = Date.now();
const recentHooks = hooks.filter(h => now - h.time < 60000);
```

#### Silent Mode Flag
```javascript
static #silentMode = false;  // Controlled by enableSilentMode()

// Checked in report() method before logging
if (this.#silentMode && layer === 'debugger' && ...) {
  // Skip console output for routine metrics
}
```

---

## Data Flow Examples

### Example 1: Memory Metric (No Violation)

```
Memory collected (metric:memory event)
         ↓
SWSEDebugger.reportEvent("debug", {type: 'metric:memory', ...})
         ↓
Sentinel.report('debugger', INFO, 'Debug event: debug', {type: 'metric:memory'})
         ↓
Silent mode enabled? YES
         ↓
#detectViolation('metric:memory', {...})
         ↓
Check: usedHeap / limit > 0.8? NO
         ↓
Return false (no violation)
         ↓
#recordMetricSilently() → Record to log, skip console
         ↓
Return early (no console output)
```

### Example 2: Memory Metric (With Violation)

```
Memory collected: usedHeap = 450MB, limit = 500MB (90%)
         ↓
SWSEDebugger.reportEvent("debug", {type: 'metric:memory', ...})
         ↓
Sentinel.report('debugger', INFO, 'Debug event: debug', {type: 'metric:memory'})
         ↓
Silent mode enabled? YES
         ↓
#detectViolation('metric:memory', {...})
         ↓
Check: 450/500 > 0.8? YES ← VIOLATION DETECTED
         ↓
violations.push("Memory pressure: 450MB / 500MB")
         ↓
Store in #lifecycleViolations (max 100 items)
         ↓
Return true (violation detected)
         ↓
Continue with normal report flow
         ↓
#logToConsole() with ⚠ warning icon
         ↓
[SWSE SENTINEL] [debugger] ⚠ Debug event: debug {Memory pressure: 450MB / 500MB}
```

### Example 3: Render Storm Detection

```
10 render events in 9 seconds detected
         ↓
#detectViolation('app:render:end', {class: 'ProgressionShell'})
         ↓
Get recent renders in last 60 seconds for ProgressionShell
         ↓
Count: renders > 10 AND timeSpan < 10000? YES
         ↓
violations.push("Render storm detected: 11 renders in 9.2s")
         ↓
Store in #lifecycleViolations
         ↓
Return true (violation detected)
         ↓
Log to console with warning
         ↓
[SWSE SENTINEL] [debugger] ⚠ Debug event: debug {Render storm: 11 renders in 9.2s}
```

---

## Public API Bridge

**File**: `scripts/governance/sentinel/sentinel-core.js` (lines ~940)

```javascript
window.__SWSE_SENTINEL__ = {
  // ... existing methods ...

  // PHASE 8: Silent mode control
  enableSilentMode: () => SentinelEngine.enableSilentMode(),
  disableSilentMode: () => SentinelEngine.disableSilentMode(),
  isSilentMode: () => SentinelEngine.isSilentMode(),

  // PHASE 8: Violation querying
  getViolations: () => SentinelEngine.getViolations(),
  getRecentViolations: (count) => SentinelEngine.getRecentViolations(count),
  getViolationsSummary: () => SentinelEngine.getViolationsSummary(),
  clearViolations: () => SentinelEngine.clearViolations()
}
```

---

## State Diagram

```
                    STARTUP
                       │
                       ▼
              Silent Mode: DISABLED
            (#silentMode = false)
                       │
         ┌─────────────┴─────────────┐
         │                           │
    User calls              Debug events
    enableSilentMode()      logged to console
         │                           │
         ▼                           │
Silent Mode: ENABLED          Normal logging
(#silentMode = true)               │
         │                           │
    Debug events incoming           │
    passed to violation              │
    detector                         │
         │                           │
    ┌────┴────┐                     │
    │          │                     │
Violation?   No           ──────────┘
    │       Violation?
    │          │
    │          ▼
    │      Record Silently
    │      (no console)
    │
    ▼
Log to Console
(with details)
    │
    ▼
User can check:
- getViolationsSummary()
- getRecentViolations()
- getViolations()
    │
    ▼
Fix the issue
    │
    ▼
clearViolations()
    │
    ▼
Back to healthy state
```

---

## Thresholds Reference

| Violation Type | Trigger | Threshold | Reset |
|---|---|---|---|
| **Memory Pressure** | metric:memory event | heap > 80% | Clear violations |
| **Render Storm** | app:render:end event | > 10 renders in 10s | Render count drops below threshold |
| **Lifecycle** | app:*:* event | Invalid sequence | Correct sequence executed |

---

## Performance Impact

### Silent Mode OFF
- Every 30s: Memory metric → Full console output (1 log entry)
- Every render: Render lifecycle events → Multiple console outputs

### Silent Mode ON (no violations)
- Every 30s: Memory metric → Internal record only (negligible)
- Every render: Render events → Internal record only (negligible)
- Console: Silent ✨

### Silent Mode ON (with violation)
- Violation detected: → Console log with warning
- Overhead: Minimal (simple threshold checks)

**Verdict**: Silent mode actually reduces overhead by eliminating console output for routine metrics.

---

## Extension Points

Future enhancements could:

1. **Dynamic thresholds**: Make 80%, 10-in-10s configurable via settings
2. **Custom violations**: Allow plugins to define their own violation types
3. **Violation hooks**: Trigger callbacks when violations detected
4. **Aggregation**: Show "3 memory violations in last hour" summary
5. **Recovery actions**: Auto-resolve minor violations (clear cache, etc.)
