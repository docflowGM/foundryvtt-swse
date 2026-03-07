# Always-On Passive Audit Architecture

**Status:** Baseline specification for passive, always-enabled Sentinel monitoring
**Policy:** All audits passive, always on, performance-safe for 24/7 operation

---

## Architecture Overview

### Policy

```
Collect diagnostics for: EVERYONE
Report to Sentinel:      EVERYONE
UI notifications:        GM ONLY (filtered)
Manual audit APIs:       REMOVED (replaced by "show Sentinel report")
Dev-mode gating:         NONE (always enabled)
```

### How It Works

```
Hook Event
    ↓
[Sentinel Layer]
    ├─ Perform lightweight check (sampled/rate-limited)
    ├─ Aggregate finding with key (prevent spam)
    ├─ Report via SentinelEngine.report()
    └─ If GM: also display notification
        ↓
    [SentinelEngine]
        ├─ Store report in memory
        ├─ Apply rate-limit cooldown
        ├─ Emit swse-sentinel-report hook (for dashboard)
        └─ [__SWSE_SENTINEL__ API] ← Query reports here
```

---

## Sentinel Layers (Always-On)

### 1. **sentinel-appv2** (ApplicationV2 governance)
✅ **Status:** Existing, convert to always-on

**Hook Points:**
- `renderApplicationV2` — validate lifecycle
- `closeApplicationV2` — cleanup tracking

**Checks:**
- Confirm render via `_renderHTML()` (not DOM mutation outside lifecycle)
- Confirm no global CSS injection
- Confirm BaseSWSEAppV2 inheritance

**Sampling:**
- All sheets (no limit, low overhead)
- Per sheet instance

**Rate Limit:**
- Per app ID: 60s cooldown
- Aggregation key: `sentinel-appv2-${appId}`

**Reports:**
```javascript
__SWSE_SENTINEL__.getReports("appv2")
// Returns: { appId, violation, timestamp }
```

---

### 2. **sentinel-sheet-hydration** (NEW) — Tab/Panel integrity

**Scope:** Monitor sheets for partial loading / content presence

**Hook Points:**
- `renderApplicationV2` → sample known sheets
- `updateActor` (debounced) → revalidate on data change

**Checks (sampled per app class):**

For **character sheets**:
- Overview tab: health panel exists + non-empty
- Skills tab: skill list has rows OR empty-state message
- Inventory tab: item grid has rows OR empty-state message
- Combat tab: action cards OR empty-state message

For **compendium browsers** (sheets):
- Table has rows OR empty state

For **dialogs** (e.g. CharacterGenerator):
- Required sections present (no half-loaded UI)

**Sampling:**
- First 3 unique app instances per session
- Per sheet class (CharacterSheet, SWSEStore, etc.)

**Rate Limit:**
- Per app class: 60s cooldown
- Aggregation key: `sentinel-sheet-hydration-${appClass}`

**Reports:**
```javascript
__SWSE_SENTINEL__.getReports("sheet-hydration")
// Returns: { appClass, selector, hasContent, timestamp }
```

**Example Report:**
```
{
  layer: "sheet-hydration",
  severity: "WARN",
  title: "Character sheet skills tab appears empty",
  details: {
    appClass: "SWSEV2CharacterSheet",
    selector: "[data-tab=skills] .skills-list",
    hasRows: false,
    actorHasSkills: true
  },
  aggregationKey: "sentinel-sheet-hydration-skills-tab-empty"
}
```

---

### 3. **sentinel-roll-pipeline** (NEW) — Roll execution routes

**Scope:** Monitor rolls route through SWSE engine (not bypassed)

**Hook Points:**
- Roll creation (intercept via `Roll.create()` if possible, else sample via chat)
- Chat message display (`createChatMessage`)
- SWSEChat pipeline (audit logs)

**Checks:**

- Rolls use `Roll.evaluate({ async: true })`
- Chat cards include SWSE flags (type, system origin)
- Roll metadata present (bonus source, modifier reason)
- No direct `roll.toMessage()` calls

**Sampling:**
- First 50 rolls per session
- Then sample 1-in-10 thereafter

**Rate Limit:**
- Per source key: 120s (rolls are frequent)
- Aggregation key: `sentinel-roll-${source}`

**Reports:**
```javascript
__SWSE_SENTINEL__.getReports("roll-pipeline")
// Returns: { source, hasFlags, async, timestamp }
```

**Example Report:**
```
{
  layer: "roll-pipeline",
  severity: "INFO",
  title: "50 rolls validated (all routed through SWSE engine)",
  details: {
    sampleSize: 50,
    allAsync: true,
    allHaveFlags: true,
    sources: { "CombatExecutor": 20, "ForceExecutor": 30 }
  },
  aggregationKey: "sentinel-roll-pipeline-sample",
  devOnly: true
}
```

---

### 4. **sentinel-update-atomicity** (NEW) — Update loop detection

**Scope:** Monitor for multi-update bursts, loops, non-atomic changes

**Hook Points:**
- `preUpdateActor` (track change sources)
- ActorEngine hooks (audit logs)
- Update debounce detector (existing in ActorEngine)

**Checks:**

- Detect "same actor, 3+ updates in 500ms" → flag as potential loop
- Detect "same field updated N times in sequence" → accumulation issue
- Confirm atomic patterns (single update per UX action)

**Sampling:**
- All actors (debounced, low overhead)
- Per actor instance

**Rate Limit:**
- Per actor: 120s cooldown
- Per aggregate key: 60s cooldown
- Aggregation key: `sentinel-update-atomicity-${actorId}-loop`

**Reports:**
```javascript
__SWSE_SENTINEL__.getReports("update-atomicity")
// Returns: { actorId, burst size, timestamp }
```

**Example Report:**
```
{
  layer: "update-atomicity",
  severity: "WARN",
  title: "Potential update loop detected",
  details: {
    actorId: "abc123",
    updateCount: 5,
    timeWindowMs: 250,
    fields: ["system.hp.value", "system.hp.value", ...],
    sources: ["CharacterSheet", "CharacterSheet", ...]
  },
  aggregationKey: "sentinel-update-atomicity-abc123-loop"
}
```

---

### 5. **sentinel-template-integrity** (NEW) — Partial/template validation

**Scope:** Monitor handlebars templates for missing partials, case errors, etc.

**Hook Points:**
- `renderApplicationV2` (check rendered HTML structure)
- Boot/module init (static validation)

**Checks:**

- Detect missing `partial` includes → empty regions
- Detect `#each` on undefined arrays → skipped loops
- Case sensitivity in selectors (hbs uses lowercase partial names)
- Detect unclosed block helpers (`{{#if}}...` without `{{/if}}`)

**Sampling:**
- Static check at boot: all templates in `templates/` directory
- Runtime check: first 5 app renders per class

**Rate Limit:**
- Per partial: no limit (static, one-time)
- Per app class: 60s
- Aggregation key: `sentinel-template-${partialName}-missing`

**Reports:**
```javascript
__SWSE_SENTINEL__.getReports("template-integrity")
// Returns: { partial, missing, timestamp }
```

**Example Report:**
```
{
  layer: "template-integrity",
  severity: "ERROR",
  title: "Template partial not found",
  details: {
    parentTemplate: "character-sheet.hbs",
    attemptedPartial: "partials/skills-table.hbs",
    actualPath: "partials/skills-table.hbs",
    exists: false
  },
  aggregationKey: "sentinel-template-skills-table-missing"
}
```

---

### 6. **sentinel-mall-cop** (NEW) ✅ — Store system health

✅ **Status:** Just implemented

See `scripts/governance/sentinel/sentinel-mall-cop.js`

**Hook Points:**
- `swse-store-inventory-loaded` — comprehensive health check
- `swse-store-rendered` — render result validation

**Checks:**
- Pack availability
- Document hydration (sampling)
- Cache age/validity
- Empty store detection
- Governance compliance (purchase paths)

**Sampling:**
- 25 items per load (not all)
- First store open per session

**Rate Limit:**
- Per pack: 3600s (hourly)
- Per store load: 300s (allow reopens)
- Aggregation key: `mall-cop-${checkType}`

---

## Performance Guardrails (Non-Negotiable)

### Sampling

All layers MUST sample, not scan full datasets:

```javascript
// ✗ BAD
for (const item of allItems) { validateItem(item); } // 1000+ items

// ✓ GOOD
const sample = allItems.slice(0, 25);
for (const item of sample) { validateItem(item); }
```

**Limits per layer per session:**
| Layer | Limit | Scope |
|-------|-------|-------|
| appv2 | ∞ | Per instance (lightweight) |
| sheet-hydration | 25 | Per app class |
| roll-pipeline | 50 then 1-in-10 | Per session |
| update-atomicity | ∞ (debounced) | Per actor |
| template-integrity | 5 | Per app class at boot |
| mall-cop | 25 | Per pack, per load |

### Rate Limiting

Every report MUST use an aggregation key + cooldown:

```javascript
SentinelEngine.report({
  aggregationKey: "sentinel-roll-missing-flags",  // ← REQUIRED
  severity: "WARN",
  // ... report data
  timestamp: Date.now()
});
// After reporting, SentinelEngine suppresses identical keys for 60s
```

**Cooldown defaults:**
- Fast checks (appv2): 60s
- Medium checks (rolls, updates): 120s
- Rare checks (templates): 3600s

### Debouncing

High-frequency hooks MUST debounce:

```javascript
// ✗ BAD
Hooks.on("updateActor", checkAtomicity); // Fires on every field change (100+ times/sec)

// ✓ GOOD
let debounceTimer = null;
Hooks.on("updateActor", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(checkAtomicity, 250);
});
```

**Recommended debounce windows:**
| Hook | Window |
|------|--------|
| updateActor | 250–500ms |
| renderApplicationV2 | 100–200ms |
| updateItem | 250–500ms |

### DOM Access

- No full page traversals
- Only inspect known selectors (class-based, data attributes)
- Cache query results per check
- Sample: query first 5 cards, not all 1000

---

## Implementation Checklist

### Phase 1: Core Layers (This Sprint)

- [x] sentinel-mall-cop ✅
- [ ] sentinel-sheet-hydration
- [ ] sentinel-roll-pipeline
- [ ] sentinel-update-atomicity (extend existing loop detector)
- [ ] sentinel-template-integrity

### Phase 2: Integration

- [ ] Register layers in sentinel-registry.js
- [ ] Add setting: `sentinelAlwaysOn` (default: true)
- [ ] Add setting: `sentinelGMNotifications` (default: true)
- [ ] Remove manual audit APIs (or make them wrappers)

### Phase 3: Dashboard (Optional UX Win)

- [ ] Sentinel dashboard command (GM only)
- [ ] Summary report: "N issues across X layers"
- [ ] One-page printout of recent reports

---

## Accessing Reports

### For Developers (Console)

```javascript
// Get all mall-cop reports
__SWSE_SENTINEL__.getReports("mall-cop")

// Get all reports across layers
__SWSE_SENTINEL__.getReports()

// Get reports of severity ERROR or WARN
__SWSE_SENTINEL__.getReports(null, { minSeverity: "WARN" })

// Get reports from last 5 minutes
const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
__SWSE_SENTINEL__.getReports(null, { since: fiveMinutesAgo })
```

### For GMs (Macro / Command)

```javascript
// Display Sentinel dashboard (future)
game.swse.sentinelDashboard.render(true);
```

### For Systems (Hooks)

```javascript
Hooks.on("swse-sentinel-report", (report) => {
  if (game.user.isGM && report.severity === "ERROR") {
    ui.notifications.error(report.title);
  }
});
```

---

## Governance Compliance

### No Mutations
✅ All layers read-only, no DOM mutation, no actor.update()

### No Blocking
✅ All checks non-blocking, async/debounced where needed

### No Performance Regression
✅ Sampling, rate-limiting, debouncing ensure <1% overhead

### No Dev-Mode Gating
✅ All layers always enabled (no `isDevMode` checks)

### Accessibility for Players
✅ Diagnostics collected for all, notifications filtered to GM only

---

## Potential Blind Spots

1. **Compendium sync issues** — Only monitor loaded packs, not disk state
2. **Network/socket errors** — Don't detect Foundry socket failures
3. **Permission mismatches** — Don't validate user permissions vs actions
4. **Macro execution** — Don't intercept user macros (outside SWSE)
5. **Third-party systems** — Don't validate non-SWSE modules

---

## Future Extensions

- **Sentinel Dashboard:** GM command to view health summary
- **Slack/Discord webhook:** Send critical alerts to external systems
- **Session replay:** Record action sequence leading to errors (requires opt-in)
- **Trend analysis:** Track issue frequency over time (requires historical storage)
- **Auto-remediation:** Fixed-time audit runs to fix common issues (low priority, high risk)

---

## Next Steps

1. Implement remaining layers (sheet-hydration, roll-pipeline, update-atomicity, template-integrity)
2. Register layers in sentinel-registry
3. Add UI notifications filter (GM only)
4. Test performance under load (100+ items, lots of renders)
5. (Optional) Build Sentinel dashboard

---

*Architecture specification: Always-On Passive Audits*
*Date: 2026-03-07*
*Status: Ready for implementation*
