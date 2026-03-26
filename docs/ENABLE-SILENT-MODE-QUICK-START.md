# Enable Silent Mode - Quick Start

The problem has been solved. Now silence the debug noise.

## One Line to Stop the Spam

Open your browser console (F12) and paste:

```javascript
__SWSE_SENTINEL__.enableSilentMode()
```

That's it. Console will now be clean. Metrics are still recorded internally.

---

## What This Does

✅ **Stops logging routine debug metrics** (memory, renders every 30 seconds)
✅ **Only logs if a violation is detected** (memory pressure, render storms, lifecycle issues)
✅ **Still records all metrics internally** (can view with `__SWSE_SENTINEL__.getReports()`)
✅ **Keeps console clean** while maintaining safety monitoring

---

## If a Problem Returns

You'll see it immediately in console:
```
[SWSE SENTINEL] [debugger] ⚠ Render storm detected: 12 renders in 8.5s
```

Check details:
```javascript
__SWSE_SENTINEL__.getViolationsSummary()
```

---

## Other Commands

```javascript
// Check health status
__SWSE_SENTINEL__.getViolationsSummary()

// See recent violations (last 10)
__SWSE_SENTINEL__.getRecentViolations(10)

// Disable silent mode if you need to debug something
__SWSE_SENTINEL__.disableSilentMode()

// Re-enable when done debugging
__SWSE_SENTINEL__.enableSilentMode()

// Clear old violations
__SWSE_SENTINEL__.clearViolations()
```

---

## That's All

Your console is now quiet and your system is still monitored. 🎉
