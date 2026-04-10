# Sidebar Sentinel Trace - Diagnosis Guide

## What This Does

Surgical DOM lifecycle tracing **only for the sidebar/tab path** — no global noise.

Tracks sidebar state through these phases:
- `init` hook
- `setup` hook
- `ready` hook entry
- Pre-hardening (50ms)
- Post-hardening (100ms)
- Post-fallback (600ms)
- Timed snapshots (+250ms, +500ms, +1000ms)

Also monitors mutations to `#sidebar-tabs` in real-time via MutationObserver.

**Console prefix**: `[SIDEBAR TRACE]`

---

## How to Use

### 1. Load Foundry
Game will start collecting trace data automatically.

### 2. View Trace in Console
At any time, paste into console:
```javascript
SWSE_SIDEBAR_TRACE.printLog()
```

This prints the complete trace with timestamps.

### 3. Quick Manual Snapshot
```javascript
SWSE_SIDEBAR_TRACE.getSnapshot()
```

Returns current sidebar state (button count, content, computed styles).

### 4. Raw Trace Data
```javascript
SWSE_SIDEBAR_TRACE.getLog()
```

Returns full array of trace entries for analysis.

---

## What to Look For

### Pattern 1: Buttons Exist But Content Missing

```
[SIDEBAR TRACE 100ms] [READY] Sidebar state post-hardening
  tabCount: 9
  tabs: [
    {
      dataTab: "chat",
      innerHTML: "",        ❌ EMPTY
      textContent: "",
      beforeContent: "none"
    }
  ]
```

**Meaning**: Buttons exist but icon content never inserted.

---

### Pattern 2: Buttons Populated Then Emptied

```
[SIDEBAR TRACE 50ms] [READY] State pre-hardening
  tabs[0].innerHTML: "<i class=\"fas fa-comments\"></i>"   ✓ HAS CONTENT

[SIDEBAR TRACE 100ms] [READY] State post-hardening  
  tabs[0].innerHTML: ""                                     ❌ NOW EMPTY

[SIDEBAR TRACE 100ms] [MUTATION] childList change
  removedCount: 1
```

**Meaning**: Content exists, then something removes it.

---

### Pattern 3: activeTab Null Status

```
[SIDEBAR TRACE 50ms] [READY] ui.sidebar.activeTab status
  isNull: true
  value: null
```

**Meaning**: Sidebar initialization failed, triggering hardening.

---

### Pattern 4: Hardening/Fallback Execution Order

```
[SIDEBAR TRACE 100ms] [EVENT] READY+100ms: Hardening code should have run by now
[SIDEBAR TRACE 600ms] [EVENT] READY+600ms: Fallback detection should have run
```

If you see mutations or state changes between these events, that's the culprit.

---

### Pattern 5: MutationObserver Captures Real Changes

```
[SIDEBAR TRACE 102ms] [MUTATION] childList change
  addedCount: 0
  removedCount: 9

[SIDEBAR TRACE 102ms] [MUTATION] REMOVED: BUTTON
  dataTab: "chat"
  outerHTML: "<button class="ui-control plain icon"..."
```

**Meaning**: SWSE or Foundry code is rebuilding the sidebar tabs.

---

## Key Questions the Trace Answers

1. **Are tab buttons created?**
   - Check `tabCount` at each phase

2. **Are buttons populated with icon content?**
   - Check `innerHTML` for `<i>` tags or `beforeContent` for pseudo-element content

3. **When does content disappear?**
   - Compare snapshots across phases to find where `innerHTML` becomes empty

4. **Is `activeTab` null?**
   - If yes, hardening code will run and try to fix it

5. **Does hardening/fallback properly activate tabs?**
   - Check state before/after the 100ms and 600ms marks

6. **Is something mutating the tabs after they're created?**
   - MutationObserver log shows removals/replacements

---

## Example: Reading a Complete Trace

```javascript
SWSE_SIDEBAR_TRACE.printLog()

// Output:
[SIDEBAR TRACE 0ms] [INIT] === SIDEBAR SENTINEL TRACE STARTED ===
[SIDEBAR TRACE 1ms] [INIT] MutationObserver active on #sidebar-tabs
[SIDEBAR TRACE 2ms] [INIT] Sidebar Sentinel Trace ready...

[SIDEBAR TRACE 50ms] [INIT] Init hook fired
[SIDEBAR TRACE 51ms] [INIT] Sidebar state at init
  {label: "INIT hook", sidebarTabsExists: true, tabCount: 0, ...}
  // Tabs don't exist yet at init — normal

[SIDEBAR TRACE 75ms] [SETUP] Setup hook fired
[SIDEBAR TRACE 76ms] [SETUP] Sidebar state at setup
  {tabCount: 9, tabs: [{dataTab: "chat", innerHTML: "<i class=\"fas fa-comments\"></i>"}, ...]}
  // Tabs created with icons — good

[SIDEBAR TRACE 100ms] [READY] Ready hook fired
[SIDEBAR TRACE 50ms] [READY] Before hardening/fallback execution
  {tabCount: 9, tabs: [{dataTab: "chat", innerHTML: "<i class=\"fas fa-comments\"></i>"}, ...]}
  // Still has icons

[SIDEBAR TRACE 50ms] [READY] ui.sidebar.activeTab status
  {isNull: false, value: "scenes"}
  // activeTab is set — no hardening needed

[SIDEBAR TRACE 100ms] [READY] Sidebar state post-hardening
  {tabCount: 9, tabs: [{dataTab: "chat", innerHTML: "<i class=\"fas fa-comments\"></i>"}, ...]}
  // Still has icons after hardening

[SIDEBAR TRACE 600ms] [READY] Sidebar state post-fallback
  {tabCount: 9, tabs: [{dataTab: "chat", innerHTML: "<i class=\"fas fa-comments\"></i>"}, ...]}
  // Still has icons after fallback

// VERDICT: Icons persist through all phases. Sidebar works correctly.
```

---

## Comparing Before/After Snapshots

Use this to find exactly WHERE icons disappear:

```javascript
// At console:
const snap50 = SWSE_SIDEBAR_TRACE.getLog().find(e => e.elapsed === '50');
const snap100 = SWSE_SIDEBAR_TRACE.getLog().find(e => e.elapsed === '100');

// Compare:
console.log('Pre-hardening icons:', snap50.data.tabs[0].innerHTML);
console.log('Post-hardening icons:', snap100.data.tabs[0].innerHTML);
```

If one has content and the other doesn't, you know exactly when they disappear.

---

## Output Format

Each trace entry contains:
- `phase`: Current boot phase (INIT, SETUP, READY, MUTATION, EVENT)
- `elapsed`: Milliseconds since startup
- `message`: What happened
- `data`: Detailed snapshot or mutation info

---

## Files

- **Tracer**: `/scripts/core/sidebar-sentinel-trace.js`
- **Activated in**: `/scripts/core/init.js`

To disable: Comment out `initSidebarSentinelTrace()` call in init.js.

---

## After You Run This

Report what pattern matches your results:
- Pattern 1, 2, 3, 4, or 5?
- At what timestamp does the problem appear?
- Does `activeTab` become null?
- Do mutations show tabs being removed/replaced?

This will pinpoint exactly what's breaking the sidebar.
