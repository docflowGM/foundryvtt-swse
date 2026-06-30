# Dead-Code Scan Methodology

Date: 2026-06-30

## Key Rule: Export-Aware Scanning Required

**Filename-only grep is insufficient for dead-code detection in this codebase.**

Example that demonstrated this: `scripts/core/v1-api-scanner.js` returned zero
grep hits for the filename, but was live because `hardening-init.js` imports
it via the exported symbol `registerDiagnosticsCommand`. A filename scan would
have incorrectly flagged it as dead.

**Always perform two scans:**
1. Path/filename reference scan (does any file `import "...this-file.js"`)
2. Export-symbol scan (does any file reference the exported names)

And check for self-registering side effects:
- `Hooks.on` / `Hooks.once`
- `game.settings.register`
- `game.swse` / `globalThis` / `window` assignments
- `CONFIG.*` assignments

---

## June 2026 Export-Aware Audit Results

### Tool Used

`docs/audits/scripts/find-unreferenced.mjs` (scratchpad) — static import-graph
walker. Collected all `import … from "…"` and re-export `export {…} from "…"`
paths from all 1,749 JS files in `scripts/` plus `index.js`.

### Findings

| Category | Count | Meaning |
|----------|-------|---------|
| Total `.js` files | 1,749 | — |
| Referenced by import path | ~1,332 | Confirmed used |
| Unreferenced by path | 417 | Candidates only — see below |
| — self-registering (Hooks/game/CONFIG) | 122 | Almost certainly active via hook/init |
| — has exports, no self-register | 238 | Need symbol-level grep; too broad for one PR |
| — no exports, no self-register | 57 | CLI/test/build tools (see below) |

### "No exports, no self-register" — 57 files — NOT dead runtime code

All 57 fall into intentional non-imported categories:

- **Test files** (`*.test.js`) — run ad-hoc by developers, not imported by the runtime
- **Build scripts** (`scripts/build/*.js`) — CLI utilities run via Node.js
- **Migration scripts** (`scripts/migration/*.js`, `scripts/migrations/*.js`) — one-time or on-demand
- **Maintenance scripts** (`scripts/maintenance/*.js`) — utility scripts
- **Validation CLIs** (`scripts/validate*.js`, `scripts/validate/`, `scripts/validation/`) — static checks run externally
- **Dev tools** (`scripts/tools/*.js`, `scripts/dev/*.js`) — development-only utilities

None of these are dead; they are simply not imported because they are designed
to be run directly, not as modules.

### Confirmed Dead File — Deleted

**`scripts/engine/combat/weapons/weapons-engine.js`** (217 lines, now removed)

Evidence:
- Zero path references across all file types (`.js`, `.json`, `.hbs`, `.html`, `.md`)
- Zero references to its exported `WeaponsEngine` symbol from any file that doesn't
  also import the canonical `WeaponsEngine` from `scripts/engine/combat/weapons-engine.js`
- No dynamic string references to `combat/weapons/` path
- The active canonical version is `scripts/engine/combat/weapons-engine.js` (718 lines),
  imported by `weapon-tooltip.js`, `ModifierEngine.js`, and `miraj-attunement-app.js`
- The deleted file was a 217-line draft/subset, distinct implementation, in a
  `weapons/` subdirectory that contained only this one file

### Files Needing Future Investigation (not deleted — scope too broad)

- **238 symbol-only candidates** — files with exports but zero path references.
  Many are likely loaded via dynamic `import()` calls inside hook handlers, or
  are utility libraries reached through barrel re-exports. Full symbol-grep of
  all 238 is a separate work item.
- **Two `MentorSuggestionDialog` files** — `scripts/mentor/mentor-suggestion-dialog.js`
  and `scripts/apps/mentor/mentor-suggestion-dialog.js` both define the class with
  zero static import references. One is likely dead, but the dialog may be
  instantiated via a dynamic `import()` inside a hook handler that wasn't captured
  by static analysis.

### Limitations of Static Analysis Here

1. **Dynamic imports with variables**: `import(path)` where `path` is a
   computed string cannot be statically resolved.
2. **Barrel re-exports**: files only imported FROM a barrel index that is itself
   unreferenced by path appear as unreferenced even if the barrel is used.
3. **Template-string imports** inside closures (rare but present in Foundry apps).
4. **Side-effect-only scripts** loaded by Foundry's `esmodules` list in
   `system.json` — but this system only declares `index.js` there, so all other
   loading goes through the import graph.

### Recommendations for Future Scans

1. Before flagging a file as dead, always check its exported symbol names too.
2. For "symbol-only" candidates, prioritize those whose class name does not appear
   anywhere in the codebase (easy first filter).
3. Dynamic-import-aware analysis (e.g., Rollup bundle analysis) would give more
   accurate results than static regex.

---

## Runtime-Orphan Confirmation Pass — June 2026 (PR 9)

16 user-identified suspects across droid, vehicle, store, armor, and progression systems.

### Disposition Summary

| File | Lines | Decision | Evidence |
|------|-------|----------|----------|
| `scripts/applications/droid/droid-customization-router.js` | 65 | **DELETED** | Zero path refs, zero symbol refs. ShellHost.js routes droid garage internally at lines 671/697/961 without this class. Vehicle equivalent active via dynamic import (ShellHost:789); droid equivalent was never wired. |
| `scripts/apps/store/store-id-fixer.js` | 223 | **DELETED** | Zero imports from any other file. Labeled "DIAGNOSTIC ONLY"; `fixInvalidIds` marked `@deprecated`. The `SWSEStore` global in other files refers to the UI store class (`store/store.js`), not this utility. |
| `scripts/armor/armor-upgrade-system.js` | 312 | **DELETED** | Zero imports. Superseded by `scripts/engine/upgrades/UpgradeService.js`, which is the canonical upgrade facade with `installUpgrade`/`removeUpgrade` covering all item types including armor. |
| `scripts/engine/combat/weapons/weapons-engine.js` | 217 | **DELETED** | Zero path refs, zero symbol refs. Canonical is `scripts/engine/combat/weapons-engine.js` (718 lines). |
| `scripts/apps/maintenance/maintenance-app.js` | 62 | **RETAINED** | Zero code imports, but `templates/apps/maintenance.hbs` exists. May be invoked from macros or GM console. Maintenance flagged as sensitive system. |
| `scripts/applications/vehicle/vehicle-customization-router.js` | — | **RETAINED** | Dynamically imported by `ShellHost.js:789` via `await import(...)`. Live. |
| 10 files in `levelup/`, `progression/` pickers | — | **MISSING** | Not present on current branch — already removed in earlier work. |

### Key Lesson: Dynamic Import Blind Spot

`vehicle-customization-router.js` showed zero static import references yet was live because
`ShellHost.js:789` uses `await import('/systems/.../vehicle-customization-router.js')`.
Static regex analysis cannot catch `import(variable)` or `import(templateLiteral)` patterns.

**Protocol for future dynamic-import verification:**
1. Search for `await import(` across the entire codebase
2. Check `_open*For*` methods in ShellHost.js and ShellRouter.js specifically
3. For droid/vehicle/customization systems, always check ShellHost.js before deleting
