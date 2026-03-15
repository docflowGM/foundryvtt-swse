# Sentinel Subsystem Contract

## 1. Architectural Overview

Sentinel is SWSE's observability stack. Its job is to observe, classify, and report system behavior without changing gameplay behavior.

**Pipeline:**
- **SWSEDebugger** captures low-level telemetry (events, timings, errors)
- **SentinelEngine** aggregates telemetry and produces authoritative health classification
- **SentinelReports** reads from authoritative sources and generates exports
- **SentinelConfig** is the single source of truth for thresholds, buffer caps, and timing constants

**Key principle:**

The observability stack must be **read-only, bounded, idempotent, and explainable**.

---

## 2. Responsibility Boundaries

### SentinelConfig

**Purpose:** Configuration only.

**Owns:**
- Performance thresholds (baseline, warn, slow)
- Buffer caps (events, logs, aggregates)
- Sampling intervals
- Health classification thresholds

**Must not:**
- Hold runtime state
- Contain logic beyond trivial constant composition
- Import other Sentinel subsystems

### SWSEDebugger

**Purpose:** Capture raw telemetry.

**Owns:**
- Raw events ring buffer
- Optional raw timing samples (bounded)
- Memory snapshots (bounded)
- Global error capture feed (bounded)

**Must:**
- Remain read-only (no mutation of actors, items, combat state)
- Emit structured events to SentinelEngine (best-effort)
- Be safe when SentinelEngine is absent or uninitialized
- Be idempotent in patching (patch only once)

**Must not:**
- Compute health classifications
- Apply thresholds to determine system state
- Produce "truth" metrics if SentinelEngine already owns them
- Contain UI concerns

### SentinelEngine

**Purpose:** Authoritative classification + aggregation.

**Owns:**
- Health state (HEALTHY / DEGRADED / UNSTABLE)
- Explainable "reasons" array for classification
- Aggregates map (bounded, evicting)
- Report log (bounded ring buffer)
- Performance metrics (rolling samples, bounded)
- Timer map (bounded / cleaned)

**Must:**
- Centralize classification logic
- Centralize performance truth (rolling metrics)
- Provide introspection APIs (`health()`, `healthDetails()`, `export()`)
- Maintain explainability: every degraded/unstable state must have reasons

**Must not:**
- Depend on SWSEDebugger at import-time (no circular imports)
- Require global window objects to function
- Create unbounded storage

### SentinelReports

**Purpose:** Read-only reporting and export.

**Owns:**
- No runtime state other than transient computations

**Must:**
- Read from authoritative sources only:
  - SentinelEngine for performance + classification truth
  - SWSEDebugger for raw telemetry, only if explicitly intended
- Never mutate SentinelEngine state
- Never mutate SWSEDebugger state
- Produce deterministic exports (same inputs → same output)

**Must not:**
- Re-implement classification logic
- Define separate thresholds
- Store unbounded data

---

## 3. Authority Model

Authority is non-negotiable. Only one component can be "truth" for each domain.

### Health Classification Authority
- **SentinelEngine** is the sole authority for health state
- SWSEDebugger and SentinelReports may not compute or override health state
- Any "health" shown elsewhere must be a direct reflection of SentinelEngine

### Performance Metrics Authority
- **SentinelEngine** is the sole authority for performance truth (rolling metrics)
- SWSEDebugger may capture raw samples for forensic export, but those are auxiliary
- SentinelReports uses SentinelEngine for performance conclusions

### Threshold Authority
- **SentinelConfig** is the sole authority for thresholds and caps
- No subsystem may hardcode "32ms", "120ms", etc.

---

## 4. Data Ownership Rules

Each subsystem owns its data. Other subsystems may read it only via a defined interface.

**SentinelEngine owns:**
- `reportLog` (bounded ring buffer)
- `aggregates` (bounded map with eviction)
- `performanceMetrics` (rolling bounded samples)
- `timers` (bounded / cleaned)
- `healthState` + `healthReasons`

**SWSEDebugger owns:**
- `events` (bounded ring buffer)
- optional raw timing sample buffers (bounded)
- memory snapshots buffer (bounded)
- error buffers (bounded)
- patch state (idempotent guard)
- interval handles (clearable)

**SentinelReports owns:**
- Nothing persistent. Computes and returns results only.

---

## 5. Event Schema Contract

All telemetry events must conform to:

```json
{
  "timestamp": 1710000000000,
  "uptime": 12345,
  "type": "app:render:end",
  "payload": {}
}
```

**Rules:**
- `timestamp` must be epoch ms
- `uptime` must be ms since debugger boot (not system boot)
- `type` must be stable and namespaced (`domain:action:phase`)
- `payload` must be JSON-serializable

**Event naming conventions:**
- `app:*` — Application lifecycle
- `actor:*` — Actor operations
- `settings:*` — Settings access
- `flag:*` — Flag access
- `error:*` — Runtime errors
- `metric:*` — Measured metrics

---

## 6. Threshold and Configuration Contract

All thresholds and caps are defined in **SentinelConfig**.

**Required constants:**
- `BASELINE_FRAME_MS`
- `RENDER_WARNING_MS`
- `RENDER_SLOW_MS`
- `PREPARE_WARNING_MS`
- `MAX_EVENTS`
- `MAX_REPORT_LOG`
- `MAX_AGGREGATES`
- `MEMORY_SAMPLE_INTERVAL_MS`

**Rules:**
- No subsystem may define "fallback thresholds"
- No subsystem may compute baseline from other numbers
- Changing a threshold requires changing **SentinelConfig only**

---

## 7. Performance Metric Contract

SentinelEngine must track:
- Prepare time (ms) by class
- Render time (ms) by class

**With:**
- Rolling sample window
- Fixed max samples per label
- Precomputed: `average`, `max`, `count`, `lastSeen`

**SentinelReports uses these for:**
- Slowest components list
- Health evaluation reasons
- Regression comparisons (future)

**SWSEDebugger raw timings (if retained) are only for:**
- Forensic export
- Deep-dive correlation

---

## 8. Memory Discipline Rules

No unbounded memory growth is allowed.

**Global rules:**
- Every array must be capped (ring buffer or shift)
- Every Map must have eviction
- Every interval must have a stored handle and be clearable
- `patch()` must be idempotent
- Exports must snapshot data (copy), not retain live references

**Recommended caps:**
- Debugger events: 1,000
- Report log: 1,000
- Aggregates: 200
- Performance samples per label: 10–30
- Memory snapshots: 120 max (1 hour at 30s)

---

## 9. Lifecycle Rules

**Initialization order:**
- SentinelEngine initializes in `init` or early `ready`
- SWSEDebugger patches only after Foundry is ready (to ensure prototypes exist)
- Reports require both to exist but must degrade safely if not

**Patch safety:**
- `SWSEDebugger.patch()` must be callable multiple times but only apply once
- No multiple intervals may be created

**Degradation behavior:**
- If SentinelEngine is unavailable, SWSEDebugger must still function locally
- If SWSEDebugger is disabled, SentinelEngine must still be able to operate on its own metrics

---

## 10. Extension Rules

Any new observability feature must:
1. Add thresholds/caps to SentinelConfig
2. Add bounded storage for any new state
3. Define event schema + naming
4. Avoid new globals
5. Avoid import-time coupling between subsystems
6. Include export support if it creates important state

---

## 11. Explicit Non-Goals

Sentinel is not:
- A gameplay engine
- A rules adjudicator
- A UI framework
- A remote telemetry uploader
- A log persistence system beyond session export
- A code refactor agent

No orchestrator will be introduced unless:
- Subsystems require coordination beyond simple init/ready sequencing
- Or dynamic enable/disable becomes complex enough to justify it

---

## 12. Risk Areas to Monitor

- Patch stacking (multiple monkey patches)
- Event volume spikes (settings/flag spam)
- Aggregate cardinality explosion (unique error messages)
- Export size creep
- Threshold drift (hardcoded numbers reintroduced)
- Timer leaks (start without end)
- Backpressure absence (debugger flooding engine)

---

---

# Reviewer Checklist

Use this checklist when reviewing any changes to Sentinel subsystems. A change must pass **all checks** in its relevant section(s).

## General Checks (all Sentinel changes)

- [ ] Thresholds are defined only in `SentinelConfig`
- [ ] No hardcoded performance numbers (e.g., "32ms", "120ms")
- [ ] No unbounded arrays or Maps
- [ ] No new global variables
- [ ] Event schema conforms to: `{ timestamp, uptime, type, payload }`
- [ ] Event type is namespaced (e.g., `app:*`, `actor:*`, `error:*`)
- [ ] No circular imports between subsystems

## SentinelConfig Changes

- [ ] Only constants and configuration
- [ ] No runtime state
- [ ] No logic beyond trivial constant composition
- [ ] No imports of other Sentinel subsystems

## SWSEDebugger Changes

- [ ] Read-only: no mutation of gameplay objects
- [ ] Events are emitted to SentinelEngine
- [ ] Patch is idempotent (apply once, safe to call many times)
- [ ] Interval handles are stored and clearable
- [ ] No health classification logic
- [ ] No thresholds applied to determine state
- [ ] Safe degradation if SentinelEngine unavailable

## SentinelEngine Changes

- [ ] Only one source of truth for health state
- [ ] Only one source of truth for performance metrics
- [ ] Health reasons are explainable (not opaque)
- [ ] All bounded storage has eviction strategy
- [ ] No import-time dependency on SWSEDebugger
- [ ] Works independently if SWSEDebugger disabled
- [ ] Introspection APIs available (`health()`, `healthDetails()`, `export()`)

## SentinelReports Changes

- [ ] No new persistent state
- [ ] Reads only from SentinelEngine + SWSEDebugger (if needed)
- [ ] Never mutates SentinelEngine or SWSEDebugger
- [ ] No re-implementation of classification logic
- [ ] No separate thresholds
- [ ] Exports snapshot data, not live references
- [ ] Same input always produces same output

## New Features (if applicable)

- [ ] Thresholds/caps added to SentinelConfig
- [ ] Bounded storage defined (size + eviction)
- [ ] Event schema documented
- [ ] Export support included (if creates important state)
- [ ] No import-time coupling with other Sentinel subsystems

## Size & Performance

- [ ] Export size reasonable (< 500KB for typical session)
- [ ] No event volume spikes from tight loops
- [ ] Timer map doesn't leak (every start has end)
- [ ] Aggregates don't explode in cardinality

---

---

# Examples of Violations

## ❌ Violation: Hardcoded Thresholds

**Bad:**
```javascript
// SWSEDebugger.js
if (duration > 32) {  // ← hardcoded!
  this.flagSlow();
}
```

**Good:**
```javascript
// SentinelConfig.js
RENDER_WARNING_MS: 32

// SentinelEngine.js
if (duration > SentinelConfig.RENDER_WARNING_MS) {
  this.flagSlow();
}
```

---

## ❌ Violation: SWSEDebugger Computes Health

**Bad:**
```javascript
// SWSEDebugger.js
isHealthy() {
  return this.slowCount < 10;  // ← owns health!
}
```

**Good:**
```javascript
// SWSEDebugger.js
// Only emit events
this.emit({ type: 'metric:render', payload: { duration } });

// SentinelEngine.js
// Only place that owns health
this.health = this.slowCount < SentinelConfig.SLOW_THRESHOLD
  ? 'DEGRADED'
  : 'HEALTHY';
```

---

## ❌ Violation: Unbounded Array

**Bad:**
```javascript
// SWSEDebugger.js
this.events = [];  // Can grow forever
this.events.push(event);
```

**Good:**
```javascript
// SWSEDebugger.js
this.events = [];
this.events.push(event);
if (this.events.length > SentinelConfig.MAX_EVENTS) {
  this.events.shift();  // Ring buffer behavior
}
```

---

## ❌ Violation: Multiple Intervals

**Bad:**
```javascript
// SWSEDebugger.patch()
setInterval(() => this.sample(), 1000);
setInterval(() => this.sample(), 1000);  // Called twice = 2 intervals!
```

**Good:**
```javascript
// SWSEDebugger.js
static #patched = false;

patch() {
  if (SWSEDebugger.#patched) return;  // Idempotent
  SWSEDebugger.#patched = true;

  this.sampleHandle = setInterval(() => this.sample(), 1000);
}

stop() {
  if (this.sampleHandle) {
    clearInterval(this.sampleHandle);
    this.sampleHandle = null;
  }
}
```

---

## ❌ Violation: SentinelReports Mutates State

**Bad:**
```javascript
// SentinelReports.js
export() {
  SentinelEngine.reportLog.length = 0;  // ← mutates!
  return { /* ... */ };
}
```

**Good:**
```javascript
// SentinelReports.js
export() {
  const snapshot = [...SentinelEngine.reportLog];  // Copy
  return { reportLog: snapshot };
}
```

---

## ❌ Violation: SentinelReports Defines Thresholds

**Bad:**
```javascript
// SentinelReports.js
const SLOW_THRESHOLD = 100;  // ← where should this live?

export() {
  return metrics.filter(m => m.duration > SLOW_THRESHOLD);
}
```

**Good:**
```javascript
// SentinelConfig.js
RENDER_SLOW_MS: 100

// SentinelReports.js
export() {
  const threshold = SentinelConfig.RENDER_SLOW_MS;
  return metrics.filter(m => m.duration > threshold);
}
```

---

## ❌ Violation: Circular Import

**Bad:**
```javascript
// SentinelEngine.js
import SWSEDebugger from './SWSEDebugger';  // ← at top level

// SWSEDebugger.js
import SentinelEngine from './SentinelEngine';  // ← circular!
```

**Good:**
```javascript
// SentinelEngine.js
// No import at top level

emitFromDebugger(event) {
  // Handle event sent by SWSEDebugger
  this.processEvent(event);
}

// SWSEDebugger.js
import SentinelEngine from './SentinelEngine';

emit(event) {
  SentinelEngine.emitFromDebugger(event);  // One-way dependency
}
```

---

## ❌ Violation: Exporting Live References

**Bad:**
```javascript
// SentinelReports.js
export() {
  return {
    events: SentinelEngine.events  // ← live array, can be mutated!
  };
}
```

**Good:**
```javascript
// SentinelReports.js
export() {
  return {
    events: JSON.parse(JSON.stringify(SentinelEngine.events))  // Deep copy
  };
}
```

---

## ✅ Correct Example: New Feature Addition

**Scenario:** Add a new "timeout" classification to health.

**Step 1: Update SentinelConfig**
```javascript
// SentinelConfig.js
TIMEOUT_THRESHOLD_MS: 5000,
MAX_TIMEOUT_EVENTS: 50,
```

**Step 2: Update SWSEDebugger to emit**
```javascript
// SWSEDebugger.js
monkeyPatchAsync() {
  // Emit timeout events
  this.emit({
    type: 'metric:timeout',
    payload: { context, duration }
  });
}
```

**Step 3: Update SentinelEngine to classify**
```javascript
// SentinelEngine.js
import SentinelConfig from './SentinelConfig';

// Store timeouts with eviction
this.timeouts = [];

processMetricTimeout(event) {
  this.timeouts.push(event);
  if (this.timeouts.length > SentinelConfig.MAX_TIMEOUT_EVENTS) {
    this.timeouts.shift();
  }

  // Update health based on thresholds
  if (this.timeouts.length > 5) {
    this.addHealthReason('Too many timeouts detected');
    this.healthState = 'DEGRADED';
  }
}
```

**Step 4: Update SentinelReports to export**
```javascript
// SentinelReports.js
export() {
  return {
    health: SentinelEngine.health,
    timeoutCount: SentinelEngine.timeouts.length,
    timeouts: [...SentinelEngine.timeouts],  // snapshot
  };
}
```

All checks pass:
- ✅ Thresholds in SentinelConfig
- ✅ Bounded storage (MAX_TIMEOUT_EVENTS)
- ✅ SWSEDebugger only emits
- ✅ SentinelEngine owns classification
- ✅ SentinelReports only exports
- ✅ No mutations

---

# Quick Reference: Who Owns What?

| Domain | Authority | Can Read | Cannot |
|--------|-----------|----------|---------|
| **Health state** | SentinelEngine | Reports, SWSEDebugger | Define own health |
| **Performance truth** | SentinelEngine | Reports, SWSEDebugger | Redefine metrics |
| **Thresholds** | SentinelConfig | All subsystems | Hardcode numbers |
| **Raw events** | SWSEDebugger | Engine, Reports | Mutate by others |
| **Health reasons** | SentinelEngine | Reports | Modify elsewhere |
| **Report log** | SentinelEngine | Reports (read-only) | Persist elsewhere |

