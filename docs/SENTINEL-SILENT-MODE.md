# Sentinel Silent Mode: Lifecycle Violation Detection

## Overview

The SWSE Sentinel system now supports **Silent Mode**, which suppresses routine debug metrics and only logs when lifecycle violations are detected. This keeps your console clean while still monitoring system health.

## What Changed

### Before (Noisy Console)
```
SWSE DEBUG: {timestamp: 1774203796638, uptime: 975249, type: 'metric:memory', payload: {…}}
[SWSE SENTINEL] [debugger] ℹ Debug event: debug
SWSE DEBUG: {timestamp: 1774203856645, uptime: 1035256, type: 'metric:memory', payload: {…}}
[SWSE SENTINEL] [debugger] ℹ Debug event: debug
SWSE DEBUG: {timestamp: 1774203916650, uptime: 1095261, type: 'metric:memory', payload: {…}}
[SWSE SENTINEL] [debugger] ℹ Debug event: debug
```

### After (Silent Mode Enabled)
```
[No output - metrics recorded internally]
[SWSE SENTINEL] [kernel] ℹ Silent mode enabled
```

Then **only if a violation is detected**:
```
[SWSE SENTINEL] [debugger] ⚠ Debug event: debug {Memory pressure: 450.5MB / 500MB}
```

## How to Use

### Enable Silent Mode

**In Console:**
```javascript
__SWSE_SENTINEL__.enableSilentMode()
```

**In Code:**
```javascript
import { SentinelEngine } from './sentinel-core.js';
SentinelEngine.enableSilentMode();
```

### Disable Silent Mode

**In Console:**
```javascript
__SWSE_SENTINEL__.disableSilentMode()
```

### Check Silent Mode Status

**In Console:**
```javascript
__SWSE_SENTINEL__.isSilentMode()
// Returns: true or false
```

### View Detected Violations

**Get all violations:**
```javascript
__SWSE_SENTINEL__.getViolations()
// Returns: [{time, eventType, violations, meta}, ...]
```

**Get last 10 violations:**
```javascript
__SWSE_SENTINEL__.getRecentViolations(10)
```

**Get summary:**
```javascript
__SWSE_SENTINEL__.getViolationsSummary()
// Returns:
// {
//   status: 'violations-detected' | 'healthy',
//   totalViolations: number,
//   violationTypes: {violation_name: count, ...},
//   lastViolation: {...}
// }
```

**Clear violations:**
```javascript
__SWSE_SENTINEL__.clearViolations()
```

## What Gets Detected as Violations

### 1. Memory Pressure
- **Trigger**: Heap usage > 80% of limit
- **Example**: "Memory pressure: 450.5MB / 500MB"
- **Action**: Logged immediately, contains memory stats

### 2. Render Storm
- **Trigger**: > 10 renders in < 10 seconds for same app
- **Example**: "Render storm detected: 15 renders in 8.3s"
- **Action**: Logged immediately with app class and render count

### 3. Lifecycle Violations
- **Trigger**: Invalid hook sequence (e.g., render before prepare)
- **Example**: "Lifecycle violation: app:prepare:end → app:render:end"
- **Action**: Logged immediately with expected vs actual sequence

## Console Workflow

### After Problem is Solved

```javascript
// 1. Problem solved, enable silent mode to reduce noise
__SWSE_SENTINEL__.enableSilentMode()
// Output: [SWSE SENTINEL] [kernel] ℹ Silent mode enabled

// 2. Work normally, console stays clean
// (no metric output unless violation detected)

// 3. Check health periodically
__SWSE_SENTINEL__.getViolationsSummary()
// Output: { status: 'healthy', totalViolations: 0, ... }
```

### If Problem Returns

```javascript
// 1. See violation in console
[SWSE SENTINEL] [debugger] ⚠ Render storm detected: 12 renders in 5.2s

// 2. Check details
__SWSE_SENTINEL__.getRecentViolations(1)
// Shows full violation data with timestamp, affected class, etc.

// 3. Investigate and fix

// 4. Verify fixed
__SWSE_SENTINEL__.getViolationsSummary()
// Should show: { status: 'healthy', totalViolations: 0, ... }

// 5. Re-enable silent mode
__SWSE_SENTINEL__.enableSilentMode()
```

## Violation Detection Details

### Memory Violation Thresholds

```javascript
// Flags if:
usedJSHeapSize / jsHeapSizeLimit > 0.8  // 80% of limit
```

**Memory stats included in violation:**
- `usedJSHeapSize`: Current heap usage in bytes
- `totalJSHeapSize`: Total allocated heap in bytes
- `jsHeapSizeLimit`: Maximum available heap in bytes

### Render Storm Thresholds

```javascript
// Flags if:
renderCount > 10  // More than 10 renders
AND timeSpan < 10000  // In less than 10 seconds
```

**Render stats included:**
- App class name
- Number of renders in period
- Time span (in seconds)

### Lifecycle Violation Detection

Expected sequence (per application):
1. `app:prepare:start` → `app:prepare:end`
2. `app:prepare:end` → `app:render:start`
3. `app:render:start` → `app:render:end`
4. `app:render:end` → `app:render:start` (for next cycle) or `app:prepare:start`

**Invalid transitions** trigger violation:
- `prepare:start` → `render:*` (skipped prepare:end)
- `render:start` → `prepare:*` (didn't finish render)
- Etc.

## Metrics Still Being Recorded

Even in silent mode, **all metrics are still recorded internally**:
- Memory samples (30 second intervals)
- Render timings
- Prepare timings
- Actor updates
- Settings access
- Flag get/set operations
- Global errors
- Unhandled promise rejections

View them with:
```javascript
__SWSE_SENTINEL__.getReports()  // All reports
__SWSE_SENTINEL__.getPerformanceMetrics()  // Render/prepare times
```

## Recommended Usage Pattern

### During Development
```javascript
__SWSE_SENTINEL__.disableSilentMode()
// See all metrics for debugging
```

### After Problem Solved
```javascript
__SWSE_SENTINEL__.enableSilentMode()
// Clean console, only violations logged
```

### Regular Health Checks
```javascript
// Every 5 minutes or periodically
const health = __SWSE_SENTINEL__.getViolationsSummary();
if (health.status !== 'healthy') {
  console.warn('Violations detected!', health);
}
```

### Before Shipping
```javascript
// Verify no violations in recent history
__SWSE_SENTINEL__.getRecentViolations(100)
// Should be empty or minimal
```

## Console Examples

### Example 1: Memory Pressure Detected

```javascript
// Silent mode enabled, system running normally...

// Suddenly something uses a lot of memory:
[SWSE SENTINEL] [debugger] ⚠ Debug event: debug {
  Memory pressure: 420.5MB / 500MB
}

// Check what happened:
__SWSE_SENTINEL__.getRecentViolations(1)
// [
//   {
//     time: 1234567890,
//     eventType: 'metric:memory',
//     violations: ["Memory pressure: 420.5MB / 500MB"],
//     meta: {
//       usedJSHeapSize: 440530944,
//       totalJSHeapSize: 524288000,
//       jsHeapSizeLimit: 500000000
//     }
//   }
// ]
```

### Example 2: Render Storm Detected

```javascript
// Silent mode enabled...

// Render storm happens:
[SWSE SENTINEL] [debugger] ⚠ Debug event: debug {
  Render storm detected: 12 renders in 8.5s
}

// Check which app:
__SWSE_SENTINEL__.getRecentViolations(1)
// [
//   {
//     time: 1234567890,
//     eventType: 'app:render:end',
//     violations: ["Render storm detected: 12 renders in 8.5s"],
//     meta: {
//       class: 'ProgressionShell',
//       duration: 45
//     }
//   }
// ]

// Investigate ProgressionShell render logic...
```

### Example 3: All Clear

```javascript
// After fixing issue:
__SWSE_SENTINEL__.getViolationsSummary()
// {
//   status: 'healthy',
//   totalViolations: 0,
//   violationTypes: {},
//   lastViolation: null
// }

// Everything is good!
```

## Advanced: Customizing Violation Thresholds

Currently, thresholds are hardcoded in `sentinel-core.js` in the `#detectViolation` method:
- Memory: 80% of heap limit
- Renders: > 10 in < 10 seconds
- Lifecycle: Invalid hook sequence

To adjust thresholds, modify `#detectViolation` method in sentinel-core.js.

Future: Could add configuration API for dynamic thresholds.

## FAQ

**Q: If I enable silent mode, will I miss problems?**
A: No! Problems are still detected and logged to console. Silent mode only hides routine metrics.

**Q: Can I have selective silence?**
A: Currently silent mode applies to all debug metrics. You can always use `disableSilentMode()` if you need to see everything.

**Q: Are metrics still being recorded?**
A: Yes! All metrics are recorded internally. You can view them anytime with `getReports()` and `getPerformanceMetrics()`.

**Q: Can I export metrics even in silent mode?**
A: Yes! Silent mode only affects console output. Export works the same:
```javascript
__SWSE_SENTINEL__.getReports()
__SWSE_SENTINEL__.exportDiagnostics()
```

**Q: What's the performance impact?**
A: Violation detection adds minimal overhead (simple comparisons on event). Silent mode actually reduces overhead by skipping console output for routine metrics.

## Summary

| Action | Command |
|--------|---------|
| Enable silent mode | `__SWSE_SENTINEL__.enableSilentMode()` |
| Disable silent mode | `__SWSE_SENTINEL__.disableSilentMode()` |
| Check if silent | `__SWSE_SENTINEL__.isSilentMode()` |
| View violations | `__SWSE_SENTINEL__.getViolations()` |
| Recent violations | `__SWSE_SENTINEL__.getRecentViolations(n)` |
| Health summary | `__SWSE_SENTINEL__.getViolationsSummary()` |
| Clear violations | `__SWSE_SENTINEL__.clearViolations()` |
