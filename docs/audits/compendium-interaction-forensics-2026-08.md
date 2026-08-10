# Compendium Interaction Forensics — 2026-08

**Status:** Audit + instrumentation only. No fix implemented. No Compendium/sidebar/ApplicationV2 behavior changed except one explicit, opt-in, one-shot diagnostic toggle (Phase 9, see below).

**Question under investigation:** why do native Foundry v13 `CompendiumDirectory` pack-card clicks fail to open packs, while the SWSE capture-phase fallback (`scripts/core/compendium-directory-click-repair.js`) can resolve and open the same click?

---

## 1. Executive finding

Static analysis of this repository **can** establish, with high confidence:

- There is exactly **one** file in `scripts/` that installs a `document`-level capture-phase `click` listener capable of consuming a compendium pack-card click before it reaches any bubble-phase handler: `compendium-directory-click-repair.js` itself. No other stray listener was found. This means the leading suspicion behind H3 as originally framed ("some *other* listener is eating the click") is not supported — but a closely related and more interesting mechanism is: **the fallback is positioned to consume the click before native delegation ever gets a chance to run, on every architecturally-successful resolution**, because it installs its listener in the capture phase directly on `document` and on the compendium root itself, and calls `stopImmediatePropagation()` unconditionally once it resolves a pack id. This makes the fallback a plausible **self-masking** interceptor: its own success is not evidence that native delegation is broken, only that native delegation never got a turn.
- `scripts/core/hardening-init.js`'s `_restoreSidebarDefaults()` — the function H1 named as the "prime area" — **does** contain a `classList.remove()` loop that reaches the `#compendium` panel element, directly contradicting its own code comment ("Foundry controls visibility via active state... Do not touch the CompendiumDirectory panel at all"). This is a real, confirmed source-level defect.
- However, **`scripts/core/hardening-init.js` is not imported anywhere in the live system.** `index.js` is the system's sole `esmodules` entry point (per `system.json`), and it never imports `hardening-init.js`; no other file does either (confirmed by both grep and an automated regression test added in this audit, see §4). `registerHardeningHooks()`, `initializeHardeningSystem()`, and `_restoreSidebarDefaults()` are therefore **dead code that never executes in a running game.** This is a **falsifying** result for H1 as originally scoped: the named function cannot be causing the reported symptom, because it never runs.
- `scripts/apps/base/swse-application-v2.js`'s legacy `static get defaultOptions()` compatibility bridge does have a real reference-sharing bug (`mergeObject({}, this.DEFAULT_OPTIONS)` inserts nested option objects — `position`, `window`, `actions` — by reference, not by deep clone, when the target lacks those keys). But this bridge is private to SWSE's own `ApplicationV2` subclass chain (`SWSEApplicationV2` → `BaseSWSEAppV2` → ~50 SWSE app subclasses). Foundry's native `CompendiumDirectory` does not extend any SWSE base class and nothing in `scripts/` monkey-patches core `ApplicationV2`/`HandlebarsApplicationMixin`. There is therefore no static path by which this bug could reach `CompendiumDirectory`'s own options.
- No CSS rule in any `system.json`-declared stylesheet references `#compendium`, `.compendium-sidebar`, `[data-tab="compendium"]`, or `[data-application-part="directory"]`. No `position:fixed`/`position:absolute` overlay with a broad selector or high `z-index` was found scoped anywhere near the sidebar. This is a **falsifying** result for H4.
- No `MutationObserver` in `scripts/` targets `#compendium` with a mutating callback. One observer (`enforcement-core.js`) watches `#sidebar` (which structurally contains `#compendium`) but is read-only/diagnostic and auto-disconnects after a timeout.

What static analysis **cannot** establish — and where this audit's instrumentation (§5) is aimed — is everything that depends on the actual DOM state and app-instance identity at the moment of a real click inside a running Foundry v13 client: whether `ui.compendium.element` is ever a different node than the one visually clicked (H6), whether Foundry's own action-delegation markup contract still matches what SWSE's own CSS/render pipeline produces at that moment (H5), and — critically — **what native delegation actually does when the SWSE fallback is prevented from acting first** (the self-masking question above). None of that is observable from source text alone; it requires the live-trace instrument built in this audit, specifically the Phase 9 "native-only" one-shot mode.

---

## 2. Hypothesis matrix

| Hypothesis | Static evidence | Runtime instrument | Current confidence |
|---|---|---|---|
| **H1** — CompendiumDirectory lifecycle / DOM contamination via `hardening-init.js` | `_restoreSidebarDefaults()` DOES mutate `#compendium`'s classList (confirmed code defect) — **but** `hardening-init.js` is never imported anywhere in the live system (confirmed via grep + regression test). | `compendiumForensics.lastMutations()` / narrow `MutationObserver` on the live compendium root; will show zero mutations attributable to this function since it never runs. | **FALSIFIED** for the named function as the live cause. The defect is real but inert. (Separately worth fixing regardless — see §6.) |
| **H2** — SWSE ApplicationV2 option inheritance contamination | Confirmed reference-sharing bug in `SWSEApplicationV2.defaultOptions` (`mergeObject({}, this.DEFAULT_OPTIONS)` inserts nested objects by reference). No static path from this bridge to `CompendiumDirectory` — different class hierarchy, no monkey-patching found. | `compendiumForensics.optionsSnapshot()` reports `crossHierarchySharedReferences` (identity checks between native `CompendiumDirectory.DEFAULT_OPTIONS` and `SWSEApplicationV2.DEFAULT_OPTIONS`) and a diff of `SWSEApplicationV2.DEFAULT_OPTIONS` keys between `init` and `ready`. | **WEAK / LIKELY FALSIFIED** for this specific bug. Live snapshot should confirm `crossHierarchySharedReferences` is all-`false`; if so, H2 is fully falsified for this symptom (the bridge bug remains real but off-path). |
| **H3** — another capture-phase listener consumes the click | Exhaustive grep of every `capture:true`/3rd-arg-`true` listener in `scripts/` found exactly one file whose capture listener can match compendium DOM and call `stop*Propagation`: the fallback itself. No *other* competing listener exists. | `compendiumForensics` 5-stage click trace + Phase 9 native-only mode isolates whether native delegation ever gets a turn once the fallback is told to stand down for one click. | **REQUIRES LIVE TRACE**, but reframed: not "another listener," but "the fallback is the only thing that ever gets a turn." Native-only mode is the direct test. |
| **H4** — CSS/hitbox/stacking issue | Zero CSS selectors in any manifest-declared stylesheet reference compendium/directory DOM. No broad fixed/absolute overlay found near the sidebar. | `compendiumForensics` records `elementFromPoint`/`elementsFromPoint` + computed `pointer-events`/`z-index`/`position` at every click. | **STRONGLY FALSIFIED** by static evidence; live hit-test should confirm no foreign element sits above the pack row. |
| **H5** — native action markup/contract mismatch | Not resolvable statically — depends on Foundry's actual rendered markup at click time vs. what its ApplicationV2 delegation expects, neither of which lives in this repo's source. `compendium-directory-click-repair.js`'s own resolver deliberately supports many attribute variants (`data-pack`, `data-entry-id`, `data-uuid`, etc.), suggesting past uncertainty about which attribute Foundry actually renders — a weak, indirect hint, not proof. | 5-stage click trace records `target`/`packRow`/`actionElement` (closest `[data-action]` + its value) at every stage, directly comparable to what Foundry's delegation contract expects. | **REQUIRES LIVE TRACE.** |
| **H6** — native CompendiumDirectory app instance/root becomes stale | `compendium-directory-click-repair.js`'s own architecture is suggestive: `_queryRoots()` unions `ui.compendium.element` **with independently DOM-queried elements**, rather than trusting `ui.compendium.element` alone — implying the author already suspected the two could diverge. This is circumstantial, not proof. | `compendiumForensics.identitySnapshot()` explicitly compares `ui.compendium.element` (as of last render) against live-queried DOM roots and reports `appElementMatchesLastRendered` / `appElementInDocument`. | **REQUIRES LIVE TRACE**, but has the strongest indirect circumstantial support of the three live-trace-only hypotheses. |

---

## 3. Static findings

All file:line citations below were verified by direct reading, not grep-only.

### 3.1 `#compendium` DOM mutation
- `scripts/core/hardening-init.js:44-95` (`_restoreSidebarDefaults`, now exported for testability) — `sidebar.querySelectorAll(...)` at line 66-69 includes `#compendium`; the `classList.remove(cls)` call at **line 78** runs for every matched panel, including `#compendium`, whenever a class matches the `isSwseLeak` predicate and isn't in `nativePanelAllowlist`. `panel.style.removeProperty('display')` at **line 92** is the only mutation explicitly excluded for `panel.id === 'compendium'` — the classList loop above it is not. This directly contradicts the comment at lines 87-90.
- **This function is dead code.** `hardening-init.js` is not imported by `index.js` (the system's only `esmodules` entry per `system.json`) or by any other file in `scripts/`. The only other repository reference to the filename is a string literal inside a console-log message in `scripts/core/sidebar-icon-class-audit.js:189` (a diagnostic "suspicious files" list, not an import). Confirmed by an automated regression test (§4).
- `compendium-directory-click-repair.js:553` — `root.dataset[REPAIR_FLAG] = 'true'` writes a dataset attribute onto matched roots (which can include `#compendium`). This is a one-time idempotency flag, not a class/style/structural mutation, and cannot affect native action delegation.
- No `innerHTML`/`outerHTML`/`append`/`prepend`/`replaceWith`/`replaceChildren` call anywhere in `scripts/` targets `#compendium` or its selectors.

### 3.2 Capture-phase click listeners
- `compendium-directory-click-repair.js:564-568` (`_installDocumentCapture`) — `document.addEventListener('click', ..., { capture: true })`, unconditional (installed once per session).
- `compendium-directory-click-repair.js:549-559` (`_installOnRoot`) — installs an additional capture listener **directly on each compendium root element** (`#compendium`, `.compendium-sidebar`, etc.), re-installed on `renderCompendiumDirectory`/`renderSidebar`/collapse hooks and on a `[0, 100, 250, 750, 1500, 3000]`ms timer sweep.
- Both share `_openPackFromEvent`, which calls `event.preventDefault()`, `event.stopPropagation()`, and `event.stopImmediatePropagation()` (lines 529-531, now guarded by the Phase 9 toggle — see §5) **once it resolves a pack id from the click**, which for a genuine compendium pack-card click is nearly always.
- No other file in `scripts/` installs a `document`/`window`-level capture `click` listener whose target predicate can match compendium DOM and which calls any `stop*Propagation` variant. (Full listener inventory — scroll position handlers, GM Datapad drag-stop, progression-framework rail resize, shell surface state trackers, etc. — is in the background research transcript; none overlap compendium DOM.)

### 3.3 ApplicationV2 `DEFAULT_OPTIONS`/`defaultOptions` bridges
- `scripts/apps/base/swse-application-v2.js:22-34`:
  ```js
  static get defaultOptions() {
    const base = super.defaultOptions ?? {};
    const o = foundry.utils.mergeObject({}, this.DEFAULT_OPTIONS);   // line 24
    ...
    return foundry.utils.mergeObject(base, o);                        // line 33
  }
  ```
  Foundry's `mergeObject` does not deep-clone values it inserts for keys absent on the merge target. Since the target at line 24 is a fresh `{}`, every top-level key of `DEFAULT_OPTIONS` — including the nested `position`, `window`, and `actions` objects — is assigned into `o` **by reference**, not by copy. The same applies again at line 33 for any key of `o` not already present in `base`. In practice this means `o.position`/`o.window`/`o.actions` are literally the same object instances as `SWSEApplicationV2.DEFAULT_OPTIONS.position/window/actions` (the static, class-level, shared-across-all-instances object). If any downstream code mutates those nested objects in place (a real risk for `position`, since Foundry's own AppV2 position tracking does write into `app.position` after drag/resize), it would corrupt the shared static default for every future SWSE app instance and subclass.
  - `scripts/apps/base/base-swse-appv2.js` does not define its own `DEFAULT_OPTIONS`/`defaultOptions` and adds no `mergeObject` calls; it only adds lifecycle/contract enforcement on top of `SWSEApplicationV2`.
  - **This bug does not reach `CompendiumDirectory`.** Foundry's native `CompendiumDirectory` is not a subclass of `SWSEApplicationV2`/`BaseSWSEAppV2`; opening a pack goes through `game.packs.get(id).render(true)`, Foundry's own `CompendiumCollection`/`Compendium` application class, never an SWSE base class. The bug is real but off-path for this investigation. (28 other files across `scripts/` define their own `static get defaultOptions()`, but these are unrelated legacy-v1-Application patterns in other app classes, not part of this bridge chain, and none reference `CompendiumDirectory`.)
  - One live consumer of the legacy getter exists: `scripts/governance/sentinel/appv2-auditor.js:116` reads `app.constructor?.defaultOptions || app.constructor?.DEFAULT_OPTIONS || {}` for auditing purposes — read-only, not a mutation path.

### 3.4 CSS
- Zero selector hits for `#compendium`, `.compendium-sidebar`, `[data-tab="compendium"]`, or `[data-application-part="directory"]` across all 134 files listed in `system.json`'s `styles` array.
- `#sidebar`-touching CSS is either explicit "do not touch" comments (`styles/core-overrides.css:4`; `styles/dialogs/holo-dialogs.css:14,612,619-622`), FA-icon fallback `::before` pseudo-element rules scoped to `#sidebar-tabs button[data-tab="..."]` (icon glyphs only, no `position`/`z-index`/`pointer-events` on the actual tab content), or scoped to unrelated custom launcher classes (`.swse-directory-launcher*`, `.swse-action-browser-tab`).
- No unqualified `.application`/`.window-app` rule was found that would match a native, non-SWSE-classed `ApplicationV2` root — every such rule is further qualified with an SWSE-specific class.
- High `z-index` values (`>2 billion`, GM Datapad's intentional always-on-top stacking) are scoped entirely to `styles/apps/gm-datapad.css` classes, not the sidebar.

### 3.5 Hooks touching Compendium/Sidebar render
- `renderCompendiumDirectory` — only `compendium-directory-click-repair.js:607-640` (installs its root listener + a debug-only DOM-vs-`game.packs` pack-id comparison log).
- `renderSidebar` — `compendium-directory-click-repair.js:642` (re-install roots), plus unrelated diagnostic/injection hooks (`actor-sidebar-controls.js`, `enforcement-core.js`, `sidebar-structure-diagnostics.js`, `sidebar-icon-fallback.js`) that are scoped to Actor Directory or `#sidebar-tabs`, never `#compendium`.
- No `renderSidebarTab` hook registration exists anywhere in `scripts/`.

### 3.6 `compendium-diagnostics.js` / `compendium-pack-registration-repair.js`
Both are pre-existing, diagnostic-only, debug-gated modules (`SWSE.debug.compendiumDiagnostics()`, `SWSE.debug.traceCompendiumPack()`, `SWSE.debug.diagnoseCriticalCompendiumPacks()`) focused on whether specific packs (`feats`, `lightsaberformpowers`, `heroic`, `nonheroic`) are registered/visible at all — a **pack-registration** problem, not a **click-delegation** problem. They overlap each other (near-duplicate `_isDebug()` and pack-metadata-snapshot logic) but neither touches click handling, and neither is duplicated by the new forensics module, which is scoped exclusively to click/mutation/options/identity forensics.

---

## 4. Instrumentation added

All of the following is debug-gated (`globalThis.SWSE_DEBUG_COMPENDIUMS === true` or the existing `debugMode` world setting) and, with the one documented Phase 9 exception, strictly observational.

### 4.1 `scripts/core/compendium-interaction-forensics.js` (new)
- **5-stage click trace** (`document-capture` → `sidebar-capture` → `compendium-root-capture` → `compendium-root-bubble` → `document-bubble`), correlated by a trace ID stamped onto the `Event` object itself (`event.__swseForensicsTrace`) — no WeakMap needed for cross-stage correlation since it's the same `Event` instance throughout dispatch. Each stage records `eventPhase`, `defaultPrevented`, `cancelBubble`, target/currentTarget/pack-row/action-element summaries, coordinates, and (once per trace) `composedPath()` and `elementFromPoint`/`elementsFromPoint` hit-test summaries (top 8, with computed `pointer-events`/`z-index`/`position`). After the event has finished dispatching (`queueMicrotask`), a `_finalizeTrace` step records which of the 5 stages actually fired and, critically, the **last observed stage** — the direct answer to "where does propagation stop."
- **Never calls** `preventDefault`/`stopPropagation`/`stopImmediatePropagation` — verified both by code review and by an automated regression test (§4.3) that greps the file for these calls.
- **App-instance/DOM-root identity forensics**: `identitySnapshot()` compares `ui.compendium.element` against independently DOM-queried compendium roots, using a `WeakMap`-based stable node-ID scheme (`node#N`) rather than any DOM mutation, and reports `appElementMatchesLastRendered`/`appElementInDocument`.
- **Narrow `MutationObserver`**, attached only to currently-known compendium roots and `#sidebar` (re-attached on every `renderCompendiumDirectory`/`renderSidebar`), watching `class`/`style`/`hidden`/`aria-hidden`/`data-tab`/`data-application-part` attributes plus direct `childList` — bounded ring buffer of 50 records. Each record includes a best-effort caller stack hint, documented as unreliable (MutationObserver callbacks run as a microtask after the synchronous mutator has already unwound, so this is not a true call-site trace — a known, stated limitation, not a false negative).
- **Read-only ApplicationV2 options snapshot**: `optionsSnapshot()` deep-clones (never mutates) `foundry.applications.sidebar.tabs.CompendiumDirectory.DEFAULT_OPTIONS`, `SWSEApplicationV2.DEFAULT_OPTIONS`, and the live `ui.compendium.options`, and reports explicit reference-identity checks (`crossHierarchySharedReferences.positionShared/windowShared/actionsShared`) between the native and SWSE hierarchies. A snapshot is taken at `init` and again at `ready`; `report()` diffs the SWSE side's keys between the two.
- **Public console API**, bounded ring buffers (20 click traces, 50 mutation records):
  ```js
  SWSE.debug.compendiumForensics.status()
  SWSE.debug.compendiumForensics.lastClick()
  SWSE.debug.compendiumForensics.lastMutations()
  SWSE.debug.compendiumForensics.optionsSnapshot()
  SWSE.debug.compendiumForensics.identitySnapshot()
  SWSE.debug.compendiumForensics.allClicks()
  SWSE.debug.compendiumForensics.clear()
  SWSE.debug.compendiumForensics.report()
  SWSE.debug.compendiumForensics.armNativeOnlyClick()
  SWSE.debug.compendiumForensics.isNativeOnlyArmed()
  ```

### 4.2 Phase 9 — "observe native" one-shot mode (the one sanctioned behavior change)
`compendium-directory-click-repair.js`'s `_openPackFromEvent` now checks `globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY === true` immediately after resolving a pack id and immediately before its `preventDefault()`/`stopPropagation()`/`pack.render(true)` sequence. If armed:
- it **disarms itself in the same branch** (`globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY = false`) — guaranteed one-shot, verified by an automated regression test (§4.3),
- it logs what it *would* have done,
- it returns `false` **without** touching the event, letting it continue to whatever native handler would otherwise receive it.

This is armed via `SWSE.debug.compendiumForensics.armNativeOnlyClick()` and is off by default. It is the only way to observe, without guesswork, whether Foundry's native bubble-phase delegated action handler opens the pack when the SWSE fallback is told to stand down for exactly one click. It does not remove, disable, or alter the fallback's normal behavior in any other way.

### 4.3 `tools/audit-sidebar-compendium-interference.mjs` (new)
Static Node scanner (report-only by default, `--strict` fails on unallowlisted HIGH findings) over every `.js` file in `scripts/` and every CSS file declared in `system.json`. Classifies findings HIGH/MEDIUM/LOW/INFORMATIONAL using a small, justified allowlist (documenting two known false positives: this forensics module itself, and `actor-sidebar-controls.js`'s Actor-Directory-scoped DOM writes, which structurally cannot resolve to `#compendium`). Current unallowlisted output:
- **HIGH**: `compendium-directory-click-repair.js:583` (the self-masking capture listener), `hardening-init.js:78` and `:92` (the dead-code `#compendium` mutation).
- **MEDIUM**: `swse-application-v2.js:24` (the `defaultOptions` reference-sharing bug).
- **LOW**: `sidebar-icon-diagnostics.js:132` (a `#sidebar`-scoped `MutationObserver`, verified read-only).
- **INFORMATIONAL**: 7 FA-icon fallback CSS rules on `#sidebar-tabs`, unrelated to `#compendium`.

### 4.4 Tests (`tests/compendium-interaction-forensics-invariants.test.mjs`, new)
Following this repository's established pattern (no DOM/jsdom implementation is available under plain Node here — `tests/helpers/foundry-shim/` only shims `foundry.utils`/`game`/`ui`, never `document`), these are static/source-level invariant checks, consistent with the existing `tools/check-*.mjs` guard convention:
1. The forensics module contains zero calls to any DOM-mutating method or any `preventDefault`/`stop*Propagation` — Phase 11 invariant "diagnostic modules do not mutate production UI when flags are off," verified unconditionally (not just when debug is off, since the module should never mutate regardless).
2. The Phase 9 native-only toggle disarms itself in the same guarded block it's read in (strict one-shot guarantee).
3. `compendium-directory-click-repair.js` retains its `_isDebug()`/`SWSE_DEBUG_COMPENDIUMS` gate (Phase 11 invariant "the Compendium click repair remains debug-instrumentable").
4. `installCompendiumInteractionForensics()` is called before `registerCompendiumDirectoryClickRepair()` in `index.js` — the load-bearing ordering fact that makes the document-capture stage trustworthy.
5. A regression-pinned run of `audit-sidebar-compendium-interference.mjs`, asserting the exact current set of 3 unallowlisted HIGH findings — any new one (a new stray capture listener, a new unscoped `#compendium` mutation) must be triaged (fixed or added to the tool's allowlist with a written justification), not silently absorbed.
6. A regression-pinned confirmation that `hardening-init.js` is not imported anywhere in the live system — the fact H1's falsification depends on. If this test ever fails, H1 must be re-evaluated against live wiring, not this document's static conclusion.

All 115 non-excluded test files in `tests/` (including this new one) pass under `node tools/run-rolling-tests.mjs`; see §7.

Invariant #1 from the original task list ("`_restoreSidebarDefaults()` must not mutate `#compendium`") is **not** independently unit-tested with a real DOM fixture: this repository has no DOM shim, and building one just for this one function would be scope creep beyond an audit-and-instrument phase. Static + dead-code-import tests (above) cover the same ground: the mutating code is confirmed to exist, and confirmed to never run.

---

## 5. Falsification criteria

- **H1 falsified if**: `hardening-init.js`/`_restoreSidebarDefaults` is confirmed unreachable from the live init/ready hook chain. **Already met** by static analysis (§3.1, §4.4 regression test). Would be un-falsified only if some other path calls `initializeHardeningSystem()`/`registerHardeningHooks()`/`_restoreSidebarDefaults()` directly — no such path was found.
- **H2 falsified if**: `compendiumForensics.optionsSnapshot()` at live `ready` shows `crossHierarchySharedReferences.positionShared/windowShared/actionsShared` are all `false`, and the `init`→`ready` diff of `SWSEApplicationV2.DEFAULT_OPTIONS` shows no keys changed. **Strongly expected** given the class-hierarchy separation found statically, but not yet confirmed live.
- **H3 falsified if**: with `armNativeOnlyClick()` armed, a real compendium pack-card click reaches `document-bubble` with `defaultPrevented === false` **and** the pack still fails to open (proving native delegation is broken on its own, independent of the fallback). H3 would instead be **supported** if native delegation successfully opens the pack once the fallback stands down — meaning there was never a "broken native handler," only a fallback that always won the race.
- **H4 falsified if**: `elementsFromPoint` at the click coordinates shows the clicked pack row (or a descendant of it) among the top hit-test elements, with no foreign SWSE element carrying `pointer-events` other than `none` above it. **Already strongly supported** by the CSS static sweep (§3.4); live hit-test should confirm.
- **H5 falsified if**: the `actionElement`/`packRow` recorded at `compendium-root-bubble` matches what Foundry's delegation contract expects (a `[data-action]` element whose closest pack-identifying ancestor carries the attribute Foundry's own `CompendiumDirectory._onClickAction`-equivalent reads) — i.e., the DOM shape at click time is unremarkable. **Requires live trace**; no static opinion possible.
- **H6 supported if**: `identitySnapshot().appElementMatchesLastRendered === false`, or `appElementInDocument === false`, at the moment of a real click — i.e., `ui.compendium.element` no longer describes the DOM the user is actually clicking. **Requires live trace**; circumstantial static support only (§2, H6 row).

---

## 6. Ranked diagnosis

Ranked strictly from evidence collected in this pass — **not** from the task prompt's original hypothesis ordering, and the previous framing of H1 as the "prime area" is explicitly not preserved where the evidence contradicts it.

1. **POSSIBLE, REQUIRES LIVE TRACE — highest priority to test:** the SWSE fallback is a self-masking capture-phase interceptor. It installs on `document` and on the compendium root(s) in the capture phase and unconditionally stops the event once it can resolve a pack id — which for a real pack-card click is nearly always. This means every "successful" click today, including ones a hypothetically-working native handler would also have opened, is attributed to the fallback by construction, not by elimination. The Phase 9 native-only mode (§4.2) is a direct, cheap, already-implemented test of this.
2. **REQUIRES LIVE TRACE, circumstantial support:** H6 (stale app-instance root). The click-repair code's own architecture — deliberately unioning `ui.compendium.element` with independently DOM-queried roots rather than trusting the app instance alone — is a hint that a prior author already suspected root staleness. `identitySnapshot()` will resolve this on the next real click.
3. **FALSIFIED by static evidence:** H1 as originally scoped (`hardening-init.js`'s `_restoreSidebarDefaults`). The mutation is real but the function is dead code. If sidebar/`#compendium` DOM contamination turns out to be real via live trace, it is not coming from this function, and the search should widen to other DOM writers, not re-focus here.
4. **STRONGLY FALSIFIED by static evidence:** H4 (CSS/hitbox/stacking). No CSS touches compendium/directory DOM in this codebase.
5. **LIKELY FALSIFIED by static evidence, pending live options snapshot:** H2 (SWSE ApplicationV2 option contamination). The reference-sharing bug in `SWSEApplicationV2.defaultOptions` is real but architecturally cannot reach `CompendiumDirectory`. Worth fixing on its own merits (it can still corrupt SWSE's *own* app windows across renders), but it is very unlikely to be this bug's cause.
6. **REQUIRES LIVE TRACE, no static opinion:** H5 (action markup/contract mismatch). Nothing in this repository's source describes Foundry's actual rendered markup or its delegation contract closely enough to judge statically.

---

## 7. Validation

- `node tools/run-rolling-syntax-check.mjs` — **2220/2220 files pass** `node --check` (includes the 2 new production files and 1 new test file added in this audit).
- `node tools/run-rolling-tests.mjs` — **115/115 test files pass** (120 discovered, 5 pre-existing documented exclusions unrelated to this work — see that script's `KNOWN_EXCLUDED_TESTS`; unchanged by this audit), including the new `compendium-interaction-forensics-invariants.test.mjs`.
- `node tools/audit-sidebar-compendium-interference.mjs` — report-only run documented in §4.3; `--strict` run correctly exits non-zero on the 3 genuine, not-yet-fixed HIGH findings (this is expected and intentional — this audit does not fix them).
- No existing test, guard script, or CI workflow was modified.

---

## 8. Recommended next patch (NOT implemented in this task)

Smallest next production change, ranked by the diagnosis above:

1. **Run the Phase 9 native-only trace against a real Foundry v13 client first**, before writing any code. This is a config toggle, not a patch, and it directly resolves the highest-priority open question (§6, item 1) with zero risk.
2. **If native-only mode proves the native handler works on its own**: change `compendium-directory-click-repair.js`'s installation from *unconditional* capture-phase interception to a **conditional, deferred fallback** — e.g., let the event bubble to `document` normally (bubble-phase, not capture-phase, listener) and only act if `event.defaultPrevented` is still `false` after native delegation had its turn. This is a small, targeted change to `_installDocumentCapture`/`_installOnRoot` (swap `{ capture: true }` for `{ capture: false }` and move the `_openPackFromEvent` call to fire only once, after native's own listeners on the same node have run) — not a rewrite, and it preserves the exact same pack-resolution logic.
3. **If native-only mode proves the native handler is still broken even when given priority**: the next patch target becomes whichever of H5/H6 the same trace's `identitySnapshot()`/`actionElement` data points to — most likely a `renderCompendiumDirectory` re-render replacing `ui.compendium.element` without the fallback's root-reinstallation sweep catching the new root in time (a timing/race fix to `_installOnRoot`'s re-install triggers, not a rewrite).
4. **Independently of the above**, `swse-application-v2.js:24,33` should switch from `foundry.utils.mergeObject({}, this.DEFAULT_OPTIONS)` to `foundry.utils.deepClone(this.DEFAULT_OPTIONS)` (or pass `{ inplace: false }` consistently) so nested `position`/`window`/`actions` objects are never reference-shared with the static class default. Low risk, unrelated to the compendium symptom, but a real latent bug worth closing given how close this audit came to it.
5. **Independently of the above**, either delete `hardening-init.js` (confirmed dead code) or wire it up and fix the `#compendium` classList exclusion at the same time — leaving a commented "do not touch #compendium" contract next to code that violates it, permanently disconnected from the init chain, is exactly the kind of drift that makes future audits like this one necessary.
