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
| **H1** — CompendiumDirectory lifecycle / DOM contamination via `hardening-init.js` | `_restoreSidebarDefaults()` DOES mutate `#compendium`'s classList (confirmed code defect) — **but** `hardening-init.js` is never imported anywhere in the live system (confirmed via grep + regression test). | `SWSE.debug.sentinel.diagnostics.compendium.report()` (mutation evidence is part of the correlated report/assessment now, not a separate call) / narrow `MutationObserver` on the live compendium root; will show zero mutations attributable to this function since it never runs. | **FALSIFIED** for the named function as the live cause. The defect is real but inert. (Separately worth fixing regardless — see §6.) |
| **H2** — SWSE ApplicationV2 option inheritance contamination | Confirmed reference-sharing bug in `SWSEApplicationV2.defaultOptions` (`mergeObject({}, this.DEFAULT_OPTIONS)` inserts nested objects by reference). No static path from this bridge to `CompendiumDirectory` — different class hierarchy, no monkey-patching found. | `SWSE.debug.sentinel.diagnostics.compendium.optionsSnapshot()` reports `crossHierarchySharedReferences` (identity checks between native `CompendiumDirectory.DEFAULT_OPTIONS` and `SWSEApplicationV2.DEFAULT_OPTIONS`) and a diff of `SWSEApplicationV2.DEFAULT_OPTIONS` keys between `init` and `ready`. | **WEAK / LIKELY FALSIFIED** for this specific bug. Live snapshot should confirm `crossHierarchySharedReferences` is all-`false`; if so, H2 is fully falsified for this symptom (the bridge bug remains real but off-path). |
| **H3** — another capture-phase listener consumes the click | Exhaustive grep of every `capture:true`/3rd-arg-`true` listener in `scripts/` found exactly one file whose capture listener can match compendium DOM and call `stop*Propagation`: the fallback itself. No *other* competing listener exists. | the Sentinel compendium diagnostic's 5-stage click trace + Phase 9 native-only mode isolates whether native delegation ever gets a turn once the fallback is told to stand down for one click. | **REQUIRES LIVE TRACE**, but reframed: not "another listener," but "the fallback is the only thing that ever gets a turn." Native-only mode is the direct test. |
| **H4** — CSS/hitbox/stacking issue | Zero CSS selectors in any manifest-declared stylesheet reference compendium/directory DOM. No broad fixed/absolute overlay found near the sidebar. | the Sentinel compendium diagnostic records `elementFromPoint`/`elementsFromPoint` + computed `pointer-events`/`z-index`/`position` at every click. | **STRONGLY FALSIFIED** by static evidence; live hit-test should confirm no foreign element sits above the pack row. |
| **H5** — native action markup/contract mismatch | Not resolvable statically — depends on Foundry's actual rendered markup at click time vs. what its ApplicationV2 delegation expects, neither of which lives in this repo's source. `compendium-directory-click-repair.js`'s own resolver deliberately supports many attribute variants (`data-pack`, `data-entry-id`, `data-uuid`, etc.), suggesting past uncertainty about which attribute Foundry actually renders — a weak, indirect hint, not proof. | 5-stage click trace records `target`/`packRow`/`actionElement` (closest `[data-action]` + its value) at every stage, directly comparable to what Foundry's delegation contract expects. | **REQUIRES LIVE TRACE.** |
| **H6** — native CompendiumDirectory app instance/root becomes stale | `compendium-directory-click-repair.js`'s own architecture is suggestive: `_queryRoots()` unions `ui.compendium.element` **with independently DOM-queried elements**, rather than trusting `ui.compendium.element` alone — implying the author already suspected the two could diverge. This is circumstantial, not proof. | `SWSE.debug.sentinel.diagnostics.compendium.identitySnapshot()` explicitly compares `ui.compendium.element` (as of last render) against live-queried DOM roots and reports `appElementMatchesLastRendered` / `appElementInDocument`. | **REQUIRES LIVE TRACE**, but has the strongest indirect circumstantial support of the three live-trace-only hypotheses. |

---

## 3. Static findings

All file:line citations below were verified by direct reading, not grep-only.

### 3.1 `#compendium` DOM mutation
- `scripts/core/hardening-init.js:44-95` (`_restoreSidebarDefaults`, now exported for testability) — `sidebar.querySelectorAll(...)` at line 66-69 includes `#compendium`; the `classList.remove(cls)` call at **line 78** runs for every matched panel, including `#compendium`, whenever a class matches the `isSwseLeak` predicate and isn't in `nativePanelAllowlist`. `panel.style.removeProperty('display')` at **line 92** is the only mutation explicitly excluded for `panel.id === 'compendium'` — the classList loop above it is not. This directly contradicts the comment at lines 87-90.
- **This function is dead code.** `hardening-init.js` is not imported by `index.js` (the system's only `esmodules` entry per `system.json`) or by any other file in `scripts/`. The only other repository reference to the filename is a string literal inside a console-log message in `scripts/core/sidebar-icon-class-audit.js:189` (a diagnostic "suspicious files" list, not an import). Confirmed by an automated regression test (§4).
- `compendium-directory-click-repair.js:594` — `root.dataset[REPAIR_FLAG] = 'true'` writes a dataset attribute onto matched roots (which can include `#compendium`). This is a one-time idempotency flag, not a class/style/structural mutation, and cannot affect native action delegation.
- No `innerHTML`/`outerHTML`/`append`/`prepend`/`replaceWith`/`replaceChildren` call anywhere in `scripts/` targets `#compendium` or its selectors.

### 3.2 Capture-phase click listeners
- `compendium-directory-click-repair.js:602-608` (`_installDocumentCapture`) — `document.addEventListener('click', ..., { capture: true })`, unconditional (installed once per session).
- `compendium-directory-click-repair.js:590-600` (`_installOnRoot`) — installs an additional capture listener **directly on each compendium root element** (`#compendium`, `.compendium-sidebar`, etc.), re-installed on `renderCompendiumDirectory`/`renderSidebar`/collapse hooks and on a `[0, 100, 250, 750, 1500, 3000]`ms timer sweep.
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

**Revision note (Sentinel alignment pass):** the diagnostic instrumentation described below was originally built as a standalone module (`scripts/core/compendium-interaction-forensics.js`) exposed only through `SWSE.debug.compendiumForensics`. It has since been moved so that **Sentinel — the system's existing diagnostic/governance engine — owns its lifecycle, storage, and reporting**, rather than existing as a second, independent observability stack that merely coexisted with Sentinel. See §9 for the full architectural rationale; this section describes the capability itself, updated to its current (Sentinel-owned) location and API.

All of the following installs only when the Sentinel `compendiumInteraction` layer is enabled (see §9.3) and, with the one documented Phase 9 exception, is strictly observational.

### 4.1 `scripts/governance/sentinel/sentinel-compendium-forensics.js`
- **5-stage click trace** (`document-capture` → `sidebar-capture` → `compendium-root-capture` → `compendium-root-bubble` → `document-bubble`), correlated by a trace ID stamped onto the `Event` object itself (`event.__swseSentinelCompendiumTrace`, format `COMP-0007`-style) — no WeakMap needed for cross-stage correlation since it's the same `Event` instance throughout dispatch. Each stage records `eventPhase`, `defaultPrevented`, `cancelBubble`, target/currentTarget/pack-row/action-element summaries, coordinates, and (once per trace) `composedPath()` and `elementFromPoint`/`elementsFromPoint` hit-test summaries (top 8, with computed `pointer-events`/`z-index`/`position`). After the event has finished dispatching (`queueMicrotask`), a `_finalizeTrace` step records which of the 5 stages actually fired, the **last observed stage** (the direct answer to "where does propagation stop"), and merges in any fallback observations (§9.4) reported under the same trace id — one correlated incident, not five unrelated logs.
- **Never calls** `preventDefault`/`stopPropagation`/`stopImmediatePropagation` — verified both by code review and by an automated regression test (§4.4) that greps the file for these calls.
- **App-instance/DOM-root identity forensics**: `identitySnapshot()` compares `ui.compendium.element` against independently DOM-queried compendium roots, using a `WeakMap`-based stable node-ID scheme (`node#N`) rather than any DOM mutation, and reports `appElementMatchesLastRendered`/`appElementInDocument`.
- **Narrow `MutationObserver`**, attached only to currently-known compendium roots and `#sidebar` (re-attached on every `renderCompendiumDirectory`/`renderSidebar`), watching `class`/`style`/`hidden`/`aria-hidden`/`data-tab`/`data-application-part` attributes plus direct `childList`.
- **Read-only ApplicationV2 options snapshot**: `optionsSnapshot()` deep-clones (never mutates) `foundry.applications.sidebar.tabs.CompendiumDirectory.DEFAULT_OPTIONS`, `SWSEApplicationV2.DEFAULT_OPTIONS`, and the live `ui.compendium.options`, and reports explicit reference-identity checks (`crossHierarchySharedReferences.positionShared/windowShared/actionsShared`) between the native and SWSE hierarchies. A snapshot is taken at `init` and again at `ready`.
- **Evidence-derived hypothesis assessment** (`assessHypotheses()`): computes a live verdict for H1–H6 from whatever has actually been observed this session (mutation count, latest options snapshot, latest click trace's native-only status, hit-test results, latest identity snapshot) — never a hard-coded winner. Feeds `diagnostics.compendium.report()`'s "Assessment" section.
- **No parallel storage.** Every finding above is recorded via a single call to `SentinelEngine.report('compendiumInteraction', severity, message, meta, { category: 'COMPENDIUM_INTERACTION', subcode })`. The only local state is (a) the `WeakMap` for DOM-node identity, which cannot live in a report log without retaining a DOM reference, and (b) a `Map` of in-flight click traces, cleared the instant each trace finalizes — neither is "history." See §9.2.

### 4.2 Phase 9 — "observe native" one-shot mode (the one sanctioned behavior change)
`compendium-directory-click-repair.js`'s `_openPackFromEvent` still checks `globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY === true` immediately after resolving a pack id and immediately before its `preventDefault()`/`stopPropagation()`/`pack.render(true)` sequence. If armed:
- it **disarms itself in the same branch** (`globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY = false`) — guaranteed one-shot, verified by an automated regression test (§4.4),
- it logs what it *would* have done (unchanged, existing `SWSELogger`/`_dlog` output),
- it reports `observeFallback(event, 'native-only-bypass', {...})` into Sentinel — the fallback remains the sole owner of the decision to abstain; Sentinel only records that it happened (§9.4),
- it returns `false` **without** touching the event, letting it continue to whatever native handler would otherwise receive it.

This is armed via `SWSE.debug.sentinel.diagnostics.compendium.armNativeOnlyClick()` and is off by default. It is the only way to observe, without guesswork, whether Foundry's native bubble-phase delegated action handler opens the pack when the SWSE fallback is told to stand down for exactly one click. It does not remove, disable, or alter the fallback's normal behavior in any other way.

### 4.3 `tools/audit-sidebar-compendium-interference.mjs` (unchanged in kind — remains a separate, static, build-time tool; see §9.6)
Static Node scanner (report-only by default, `--strict` fails on unallowlisted HIGH findings) over every `.js` file in `scripts/` and every CSS file declared in `system.json`. Classifies findings HIGH/MEDIUM/LOW/INFORMATIONAL using a small, justified allowlist (documenting two known false positives: the Sentinel diagnostic module itself, and `actor-sidebar-controls.js`'s Actor-Directory-scoped DOM writes, which structurally cannot resolve to `#compendium`). Current unallowlisted output:
- **HIGH**: `compendium-directory-click-repair.js:605` (the self-masking capture listener), `hardening-init.js:78` and `:92` (the dead-code `#compendium` mutation).
- **MEDIUM**: `swse-application-v2.js:24` (the `defaultOptions` reference-sharing bug).
- **LOW**: `sidebar-icon-diagnostics.js:132` (a `#sidebar`-scoped `MutationObserver`, verified read-only).
- **INFORMATIONAL**: 7 FA-icon fallback CSS rules on `#sidebar-tabs`, unrelated to `#compendium`.

### 4.4 Tests (`tests/sentinel-compendium-forensics-invariants.test.mjs`)
Following this repository's established pattern (no DOM/jsdom implementation is available under plain Node here — `tests/helpers/foundry-shim/` only shims `foundry.utils`/`game`/`ui`, never `document`), these are static/source-level invariant checks, consistent with the existing `tools/check-*.mjs` guard convention:
1. **Ownership**: `scripts/governance/sentinel/sentinel-compendium-forensics.js` exists; the old standalone `scripts/core/compendium-interaction-forensics.js` does not.
2. **Sentinel owns lifecycle**: the module calls `SentinelEngine.registerLayer(LAYER, { init: _attachInstrumentation })`; no independent top-level `Hooks.once('ready', ...)` installs listeners outside that path.
3. **No parallel init path**: `index.js` calls `registerCompendiumInteractionDiagnostic()` before `registerCompendiumDirectoryClickRepair()` (ordering, still load-bearing) and no longer references the old `installCompendiumInteractionForensics()`.
4. **No duplicate logger**: `compendium-directory-click-repair.js` imports and calls `observeFallback()` at each of the required moments (fallback-reached, pack-resolved, native-only-bypass, consuming-event, render-succeeded, render-failed) and does not maintain its own click-trace/mutation array.
5. **No duplicate ring buffer**: `sentinel-compendium-forensics.js` has no local `clickTraces`/`mutationLog` array; it stores finalized findings via `SentinelEngine.report(...)` and uses a `WeakMap` for node identity.
6. **Sentinel is the reporter**: `SentinelDebugAPI.diagnostics.compendium` is wired to the same `CompendiumInteractionDiagnostic` object the layer uses; the old `SWSE.debug.compendiumForensics` global is not independently installed anywhere.
7. **Non-mutating**: zero DOM-mutating or `stop*Propagation`/`preventDefault` calls in the diagnostic module, unconditionally.
8. **Native-only one-shot**: unchanged from the original Phase 9 invariant, plus a check that the branch reports into Sentinel.
9. **`SentinelEngine.clearReports()` layer-filter**: confirms the (minimal, additive) engine extension used by `diagnostics.compendium.clear()` exists and filters correctly, rather than a parallel per-diagnostic clear mechanism.
10. Regression-pinned interference-audit HIGH findings (line numbers updated for the refactor) and the `hardening-init.js` dead-code confirmation — both unchanged in substance from before this pass.

All 115 non-excluded test files in `tests/` (including this one, renamed from `compendium-interaction-forensics-invariants.test.mjs`) pass under `node tools/run-rolling-tests.mjs`; see §7.

Invariant "`_restoreSidebarDefaults()` must not mutate `#compendium`" is still **not** independently unit-tested with a real DOM fixture, for the same reason as before: this repository has no DOM shim, and building one just for this one function would be scope creep. Static + dead-code-import tests cover the same ground.

---

## 5. Falsification criteria

- **H1 falsified if**: `hardening-init.js`/`_restoreSidebarDefaults` is confirmed unreachable from the live init/ready hook chain. **Already met** by static analysis (§3.1, §4.4 regression test). Would be un-falsified only if some other path calls `initializeHardeningSystem()`/`registerHardeningHooks()`/`_restoreSidebarDefaults()` directly — no such path was found.
- **H2 falsified if**: `SWSE.debug.sentinel.diagnostics.compendium.optionsSnapshot()` at live `ready` shows `crossHierarchySharedReferences.positionShared/windowShared/actionsShared` are all `false`, and the `init`→`ready` diff of `SWSEApplicationV2.DEFAULT_OPTIONS` shows no keys changed. **Strongly expected** given the class-hierarchy separation found statically, but not yet confirmed live.
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

- `node tools/run-rolling-syntax-check.mjs` — **2220/2220 files pass** `node --check` (net file count unchanged by the Sentinel alignment pass: `scripts/core/compendium-interaction-forensics.js` was removed, `scripts/governance/sentinel/sentinel-compendium-forensics.js` was added).
- `node tools/run-rolling-tests.mjs` — **115/115 test files pass** (120 discovered, 5 pre-existing documented exclusions unrelated to this work — see that script's `KNOWN_EXCLUDED_TESTS`; unchanged by this audit), including `tests/sentinel-compendium-forensics-invariants.test.mjs` (renamed from `compendium-interaction-forensics-invariants.test.mjs` and extended with Sentinel-ownership invariants).
- `node tools/audit-sidebar-compendium-interference.mjs` — report-only run documented in §4.3; `--strict` run correctly exits non-zero on the 3 genuine, not-yet-fixed HIGH findings (this is expected and intentional — this audit does not fix them).
- No existing test, guard script, or CI workflow was modified. No unrelated Sentinel behavior changed — see §9.5 for the one small (additive, backward-compatible) engine extension.

---

## 8. Recommended next patch (NOT implemented in this task)

Smallest next production change, ranked by the diagnosis above:

1. **Run the Phase 9 native-only trace against a real Foundry v13 client first**, before writing any code. This is a config toggle, not a patch, and it directly resolves the highest-priority open question (§6, item 1) with zero risk.
2. **If native-only mode proves the native handler works on its own**: change `compendium-directory-click-repair.js`'s installation from *unconditional* capture-phase interception to a **conditional, deferred fallback** — e.g., let the event bubble to `document` normally (bubble-phase, not capture-phase, listener) and only act if `event.defaultPrevented` is still `false` after native delegation had its turn. This is a small, targeted change to `_installDocumentCapture`/`_installOnRoot` (swap `{ capture: true }` for `{ capture: false }` and move the `_openPackFromEvent` call to fire only once, after native's own listeners on the same node have run) — not a rewrite, and it preserves the exact same pack-resolution logic.
3. **If native-only mode proves the native handler is still broken even when given priority**: the next patch target becomes whichever of H5/H6 the same trace's `identitySnapshot()`/`actionElement` data points to — most likely a `renderCompendiumDirectory` re-render replacing `ui.compendium.element` without the fallback's root-reinstallation sweep catching the new root in time (a timing/race fix to `_installOnRoot`'s re-install triggers, not a rewrite).
4. **Independently of the above**, `swse-application-v2.js:24,33` should switch from `foundry.utils.mergeObject({}, this.DEFAULT_OPTIONS)` to `foundry.utils.deepClone(this.DEFAULT_OPTIONS)` (or pass `{ inplace: false }` consistently) so nested `position`/`window`/`actions` objects are never reference-shared with the static class default. Low risk, unrelated to the compendium symptom, but a real latent bug worth closing given how close this audit came to it.
5. **Independently of the above**, either delete `hardening-init.js` (confirmed dead code) or wire it up and fix the `#compendium` classList exclusion at the same time — leaving a commented "do not touch #compendium" contract next to code that violates it, permanently disconnected from the init chain, is exactly the kind of drift that makes future audits like this one necessary.

---

## 9. Sentinel Architecture Alignment

This section documents a follow-up pass, done after the instrumentation above was first built as an independent module. The correction: **Sentinel — the SWSE system's existing diagnostic/governance engine (`scripts/governance/sentinel/`) — must own this diagnostic**, not merely coexist with a parallel observability stack that happens to also expose itself as `SWSE.debug.*`. This section explains what Sentinel actually looks like, what was reused vs. what had to be added, and why the design below is the smallest change that gives Sentinel real ownership.

### 9.1 What Sentinel's architecture actually is (before this pass)

A full read of `scripts/governance/sentinel/` (~30 files, ~10,600 lines) found a materially different picture than the directory's size suggests:

- **Lifecycle**: the one real entry point is `initializeSentinelGovernance()` (`sentinel-init.js`), called once from `index.js`'s `init` hook. Internally it defers everything — `SentinelEngine.bootstrap()`, debug-API install, `SentinelMallCop.init()`, the boot banner — into its own `Hooks.once('ready', ...)`. There is no exported "Sentinel is up" hook or promise other code can subscribe to.
- **Registration**: `SentinelEngine.registerLayer(name, layer)` is a real, working mechanism — `SentinelEngine.bootstrap()` iterates every registered layer and calls `layer.init()` if the layer's `enabled` flag (derived from a per-layer game setting, default `true`) is set and Sentinel's overall mode isn't `OFF`. However, `sentinel-registry.js` — the file that looks like "the" central registry, importing and registering 9 `layers/*.js` modules — is **never called by anything**, including `sentinel-init.js`. Those 9 layers are dead. So is `Sentry` (`sentry.js`, a generic `MutationObserver`/render/hook-storm watcher) and `SentinelEnforcement` (`enforcement-core.js`, a `#sidebar`-scoped `MutationObserver` plus several `Element.prototype`/`Application.prototype` monkey-patches) — both fully built, both never `.init()`'d anywhere. `HookInvestigator` is wired, but from `scripts/core/init.js`, entirely outside the Sentinel init chain.
- **Gating**: `SentinelEngine.isActive()`/`getMode()` is the canonical "is Sentinel on" check, driven by the `devMode` and `sentinelMode` game settings (`OFF` by default in production). `SentinelEngine.report(...)` itself no-ops silently when mode is `OFF` — so anything that funnels through `report()` is automatically gated, with zero extra code. This canonical gate is not, however, consistently used elsewhere: several modules (including, before this pass, the compendium forensics module) reinvent their own gate.
- **Storage**: `SentinelEngine`'s private `#reportLog` (bounded by `SentinelConfig.MAX_REPORT_LOG = 1000`, real and consumed) is the one genuinely bounded, shared history. Most other modules — including the dead ones above — keep their own separate arrays instead of using it.
- **Reporting**: the live, working global surface is `globalThis.SWSE.debug.sentinel` (`SentinelDebugAPI`: `dashboard()`, `export()`, `health()`, `clear()`), installed from `sentinel-init.js`'s `ready` hook. A second, fully-built surface — `installSentinelAPI()`, exposing `globalThis.SWSE.sentinel.{getReports,getStatus,getHealth,exportDiagnostics,clearReports}` — existed in `sentinel-init.js` but was **never called**. This pass wires it up (§9.7) since it's a one-line fix, not a redesign.
- **Publishing an observation from outside `governance/sentinel/`**: `window.__SWSE_SENTINEL__.reportEvent(type, event)` exists and forwards to `SentinelEngine.report('debugger', ...)`, but it was purpose-built for one caller (`SWSEDebugger`). The generically-correct way for any file to publish into Sentinel is simply to import `SentinelEngine` and call `.report(...)` directly — there was no dedicated `Sentinel.observe(...)` convenience wrapper before this pass, and none was needed given how thin the direct call is.
- **File convention**: 25 of ~30 files are flat `sentinel-<topic>.js` (or legacy `<topic>-auditor.js`) files directly under `governance/sentinel/`. Two subfolders exist with specific, unrelated meanings (`layers/` — `registerLayer`-shaped init objects, currently dead; `enforcement/` — standalone, currently-unused static validators, name-colliding with but distinct from the top-level `enforcement-core.js`). No `diagnostics/` subfolder convention exists.

None of Sentinel's existing observers (Sentry's `document.body` watcher, Enforcement's `#sidebar` watcher, `appv2-auditor.js`'s per-instance ApplicationV2 lifecycle tracker, `hook-investigator.js`'s `Hooks.on`/`Hooks.once` patch) target `CompendiumDirectory`, click propagation, or ApplicationV2 options identity, and none is generic/pluggable enough to extend without a rewrite — even setting aside that most of them are dead code.

### 9.2 Where the diagnostic now lives

`scripts/governance/sentinel/sentinel-compendium-forensics.js` — a flat file matching the dominant, *actually-wired* `sentinel-<topic>.js` convention (not `layers/`, which is reserved for the currently-dead `registerLayer`-consumer pattern in `sentinel-registry.js`, and not `enforcement/`, which is reserved for unrelated static validators). `scripts/core/compendium-interaction-forensics.js` (the original standalone module) was deleted, not kept as a thin re-export shim — there is exactly one implementation, not one implementation plus a compatibility wrapper.

### 9.3 How Sentinel loads it

The module exports `registerCompendiumInteractionDiagnostic()`, which does exactly two things:

```js
SentinelEngine.registerLayer('compendiumInteraction', { init: _attachInstrumentation });
SentinelEngine.bootstrap();
```

`registerLayer` is the real, already-functioning extension point described in §9.1 — reused as-is, not reinvented. `_attachInstrumentation` (the function that installs the 5-stage click listeners, the `MutationObserver`, and the render-identity hook) is passed as that layer's `init`, so **Sentinel's own `bootstrap()` loop decides whether it ever runs**, gated by the exact same `devMode`/`sentinelMode` settings and per-layer `sentinelCompendiumInteraction` setting (default `true`) as every other Sentinel layer. If Sentinel ends up `OFF` (the production default), `_attachInstrumentation` never executes and **no listener, observer, or global state of any kind exists** — verified by test invariant 2 (§4.4): there is no independent top-level `Hooks.once('ready', ...)` anywhere in the file.

`SentinelEngine.bootstrap()` is idempotent (`if (this.#initialized) return;`), so calling it from `registerCompendiumInteractionDiagnostic()` at `index.js`'s `init` hook — earlier than `sentinel-init.js`'s own `ready`-hook bootstrap call — simply moves Sentinel's mode/layer activation earlier by one hook, and makes `sentinel-init.js`'s own `bootstrap()` call a no-op thereafter. `installSentinelDebugAPI()`, `installSentinelAPI()`, `SentinelMallCop.init()`, and `markBootComplete()` are untouched and still run at `ready`, exactly as before. Nothing else currently depends on Sentinel activating specifically at `ready` rather than `init` (no other layer is registered before `ready` today), so this is a one-directional, additive timing change, not a Sentinel-wide redesign. This earlier activation is **load-bearing**: `registerCompendiumDirectoryClickRepair()` installs its own document-capture listener during the `init` hook, so the Sentinel diagnostic's document-capture listener must also exist by `init` time (not wait for `ready`) to register first and observe every click before the fallback's `stopImmediatePropagation()` can consume it.

### 9.4 How fallback events flow into Sentinel

`compendium-directory-click-repair.js` no longer needs (and does not have) a private forensic logger. It imports two functions from the Sentinel module:

- `observeFallback(event, type, payload)` — reports one `SentinelEngine.report('compendiumInteraction', INFO, ..., { subcode: 'FALLBACK' })` call and buffers it, keyed by the click's trace id, so it merges into that click's `CLICK_TRACE` report when the trace finalizes.
- `getTraceId(event)` — read-only lookup of the trace id the forensics module already stamped onto the event (never invents one; if the diagnostic is disabled, this correctly returns `null` and the fallback's observation is filed under a synthetic `untraced` bucket instead of a fabricated correlation).

The fallback now calls `observeFallback` at exactly the moments requested: `fallback-reached` (event confirmed inside the compendium directory), `resolution-failed` (no pack id resolvable), `pack-resolved` (packId **and** which of the three resolver strategies — `elements-at-point`/`point`/`path` — matched, a small, behavior-preserving refactor of `_findPackElementFromEvent` that tags the winning strategy without changing precedence or which element gets chosen), `consuming-event` (state of `event.defaultPrevented` immediately before the fallback calls `preventDefault()`), `native-only-bypass` (the Phase 9 toggle fired), `render-succeeded`, and `render-failed`. The fallback remains solely responsible for *deciding* to abstain, consume, or render — Sentinel only records that it happened.

### 9.5 Storage: no parallel ring buffer

The original module kept two private ring buffers (`clickTraces`, cap 20; `mutationLog`, cap 50). The Sentinel-owned version keeps **none**. Every finalized click trace, mutation, identity snapshot, options snapshot, and fallback observation is a single `SentinelEngine.report('compendiumInteraction', severity, message, meta, { category: 'COMPENDIUM_INTERACTION', subcode })` call, stored in — and bounded by — `SentinelEngine`'s existing `#reportLog` (`SentinelConfig.MAX_REPORT_LOG = 1000`, shared across all Sentinel layers). Reads (`lastInteraction()`, `report()`) are pure queries over `SentinelEngine.getReports('compendiumInteraction')`, filtered by `subcode`.

The only genuinely local state is: a `WeakMap<Element, string>` for stable diagnostic node ids (cannot go in a report log — it must never retain a live DOM reference), and a transient `Map` of in-flight click traces plus buffered fallback observations, both cleared as soon as each trace finalizes (`queueMicrotask` after dispatch). Neither is "history."

One small, additive, backward-compatible extension was made to `SentinelEngine` itself: `clearReports(layerFilter = null)` now accepts an optional layer name and removes only that layer's reports, leaving other layers' history intact. Every existing call site (`clearReports()`, no args) is unaffected. This exists so `diagnostics.compendium.clear()` doesn't wipe every other Sentinel layer's reports — the smallest possible engine change, not a parallel per-diagnostic store.

### 9.6 The static audit tool remains separate, on purpose

`tools/audit-sidebar-compendium-interference.mjs` is unchanged in kind. It is build-time/static analysis (`node tools/...`, no Foundry runtime, no Sentinel dependency) and stays in `tools/`. Sentinel is the *runtime* observability authority; the Node scanner is a *static* one. Conflating them would mean either running Sentinel-shaped code outside a Foundry client (impossible — it needs `document`, `Hooks`, `game`) or making the static scanner runtime-dependent (losing its CI usefulness). The only change was updating two file/line references inside its allowlist to match the new location and shifted line numbers of the code it inspects.

### 9.7 Canonical developer console commands

```js
// Sentinel-wide (top-level status/reports — the previously-unwired installSentinelAPI() now runs)
SWSE.sentinel.getStatus()
SWSE.sentinel.getReports('compendiumInteraction')
SWSE.sentinel.getHealth()

// GM dashboard (existing, unchanged)
SWSE.debug.sentinel.dashboard()
SWSE.debug.sentinel.export()
SWSE.debug.sentinel.health()

// Compendium interaction diagnostic (new canonical surface)
SWSE.debug.sentinel.diagnostics.compendium.status()
SWSE.debug.sentinel.diagnostics.compendium.lastInteraction()
SWSE.debug.sentinel.diagnostics.compendium.report()
SWSE.debug.sentinel.diagnostics.compendium.clear()
SWSE.debug.sentinel.diagnostics.compendium.armNativeOnlyClick()
SWSE.debug.sentinel.diagnostics.compendium.identitySnapshot()
SWSE.debug.sentinel.diagnostics.compendium.optionsSnapshot()
SWSE.debug.sentinel.diagnostics.compendium.assessHypotheses()
```

`SWSE.debug.sentinel.diagnostics.compendium` is the real established form (`SWSE.debug.sentinel` is the one namespace Sentinel actually installs and has installed since before this pass) — not a forced `SWSE.sentinel.diagnostics.compendium` shape, since `SWSE.sentinel.*` is the thinner, generic top-level status surface, now also live but not the right place for a per-diagnostic sub-API. There is no `SWSE.debug.compendiumForensics` compatibility alias: the old surface had exactly zero external callers (it shipped in the same PR being revised here), so keeping a delegating alias would only add a second name for the same thing with no one depending on the first.

### 9.8 Live test procedure

1. Enable Sentinel: set the `sentinelMode` world setting to `DEV` (or `STRICT`) and/or the `devMode` setting to `true`, then reload. Confirm with:
   ```js
   SWSE.debug.sentinel.diagnostics.compendium.status()
   // → { installed: true, sentinelActive: true, sentinelMode: 'DEV', ... }
   ```
2. **Baseline click**: click one Compendium pack normally, then run:
   ```js
   SWSE.debug.sentinel.diagnostics.compendium.report()
   ```
   This prints a `NORMAL FALLBACK TRACE` — propagation stages, whether the fallback reached/consumed the event, and the current evidence-derived H1–H6 assessment.
3. **Native-only click**:
   ```js
   SWSE.debug.sentinel.diagnostics.compendium.armNativeOnlyClick();
   ```
   Click exactly one Compendium pack, then run `report()` again. This prints a `NATIVE-ONLY TRACE` for that click (the fallback abstained; the report shows what native delegation did, or didn't do, on its own) — compare its propagation table and `H3_propagationInterception` verdict against the baseline trace from step 2.

### 9.9 What could not cleanly integrate without redesigning Sentinel

- Sentinel has no reactive re-evaluation of per-layer `enabled` settings — like every other Sentinel layer, `compendiumInteraction`'s enabled/disabled state is decided once at `bootstrap()` time, not hot-toggleable without a reload. This matches Sentinel's existing (simple) model everywhere else; changing it would be a Sentinel-wide redesign, out of scope here.
- `SentinelEngine.report()`'s stack-capture-on-ERROR/CRITICAL behavior (`options.captureStack || severity >= ERROR`) doesn't apply to this diagnostic, since every compendium finding is reported at `INFO`/`WARN` severity by design (this is observation, not error detection) — noted here only so a future reader doesn't wonder why no stack traces appear in `getReports('compendiumInteraction')`.
- No attempt was made to revive `sentinel-registry.js`'s dead 9-layer registration, `Sentry.init()`, or `SentinelEnforcement.init()` to give the compendium diagnostic a "sibling" among other active layers — they remain exactly as dead as they were found. Reviving them was explicitly out of scope (surgical-change constraint) and would be a materially larger, separate change.

### 9.10 Confirmation

No Compendium/sidebar/ApplicationV2 *production* behavior was changed by this alignment pass. The only externally-observable difference from before it: the diagnostic's console surface moved from `SWSE.debug.compendiumForensics.*` to `SWSE.debug.sentinel.diagnostics.compendium.*`, and `SWSE.sentinel.*` (previously dead code) now exists. `compendium-directory-click-repair.js`'s actual click-resolution, control-click detection, and `pack.render(true)` logic is byte-for-byte the same as before this pass, plus the sanctioned Phase 9 toggle (unchanged) and additive `observeFallback(...)` calls that have no effect when Sentinel is `OFF`.
