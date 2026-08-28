# GM Datapad Recovery — Action & Wizard Integrity Audit

Branch: `claude/gm-datapad-recovery-nzh4gz`
Scope: GM Datapad only (`scripts/apps/gm-datapad.js`, `scripts/ui/shell/gm/**`,
`templates/apps/gm-datapad/**`, `templates/shell/shell-surface.hbs`). No actor
sheet, Phase 7, mechanics, or SWSE rule changes.

## 1. Executive summary

The independent audit's premise was correct in outline and wrong in some
specifics. Two real architecture violations existed exactly as described —
**Job status had two handlers racing each other**, and **`GMControllerCompatibilityService`
was silently overriding real controller methods with instance-property
monkeypatches**. But two of the three "compatibility repairs" the audit
flagged as real defects turned out, on direct verification, to no longer be
real: the Job Board's own `transitionJobStatus()` public API already exists
and works, and the Locations template no longer contains any smart-drop
zones for `GMSmartFormDropService` to repair. Only the **Faction Dossier**
patch was masking a genuine, still-live bug: `_mutate()` called
`mutateShellOnly(operation, reason)` — a function where the `host` argument
belongs and a string where the mutation callback belongs — so every faction
create/delete/contact mutation silently did nothing.

Separately, static scanning turned up a defect the audit brief did not
mention at all: the Job dossier/settlement second-level tab strip
(`data-job-subtab-switch` / `data-job-subtab-panel`, six tabs across two
workspaces) had **zero** JavaScript wiring anywhere in the codebase. Every
one of those tab buttons was a clickable placebo.

All four defects are fixed. `GMControllerCompatibilityService` is deleted —
every patch it carried was either migrated into the real controller (Faction)
or proven obsolete against the current codebase (Jobs, Locations) — so its
retirement did not require inventing replacement behavior for anything.
`GMInteractionRepairService` is reduced by one responsibility (the Job status
root-capture interceptor) and retained for the rest, each item classified
below with a reason.

**Verdict: GM DATAPAD RECOVERY COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP.**
See §17–19.

## 2. Before architecture

```
VISIBLE CONTROL (job status button)
    ↓
GMSurfaceControllerRegistry.bind()
    ├─ GMInteractionRepairService.bind()      (registered FIRST)
    │     └─ root.addEventListener('click', …, { capture: true })
    │           └─ stopImmediatePropagation()
    │           └─ HolonetMessengerService._gmTransitionJobStatus()  [PRIVATE API]
    └─ GMControllerCompatibilityService.prepare()
          └─ controller._wireStatusButtons = <patched fn>   (shadows the real method)
                └─ (never runs — capture-phase listener above always wins)
```

Because the interaction-repair listener was bound on `root` with
`capture: true`, it always fired before any listener on a descendant element
— including the real controller's own delegated handler — regardless of
registration order. `stopImmediatePropagation()` then guaranteed nothing else
ever saw the click. The compatibility patch that was supposedly "fixing" the
real controller's method was itself unreachable dead code.

For Factions, the pattern was different but the outcome was the same kind of
silent failure: the real controller shipped with a broken `_mutate()` and
listeners bound to attributes (`data-gm-faction-delete`, `data-gm-faction-job`,
`data-gm-faction-intel`) the current template no longer renders. Every
Dossier button that worked, worked *only* because
`GMControllerCompatibilityService._repairFactionController` replaced both the
mutation helper and the button wiring wholesale, silently, at controller
construction time — invisible to anyone reading `GMFactionRelationshipSurfaceController.js`
in isolation.

## 3. After architecture

```
VISIBLE CONTROL (job status button)
    ↓
GMSurfaceControllerRegistry.bind()
    └─ GMJobBoardSurfaceController.attach()
          └─ this._wireStatusButtons(pageElement, signal)
                └─ HolonetMessengerService.transitionJobStatus()  [PUBLIC API]
                      └─ .threadAction() → _gmTransitionJobStatus()
                └─ requestShellRender()
```

```
VISIBLE CONTROL (Dossier action button, data-gm-faction-action="…")
    ↓
GMFactionRelationshipSurfaceController.attach()
    └─ this._wireButtons(pageElement, signal)   (delegated, one listener)
          └─ switch(action) → FactionRegistryService / FactionJobBridgeService / …
          └─ this._mutate() → mutateShellOnly(this.host, operation, { reason, surfaceId })
          └─ this._refresh() / this.host._navigateTo()
```

One control → one controller-owned handler → one public service API → one
state change → one render request, with no compatibility shim in the path.

## 4. Surface registry table

| Surface | Service | Controller | Wizard | Modal | Compat patch (before) | Repair dependency (before) | Status (after) |
|---|---|---|---|---|---|---|---|
| home | GMDashboardSurfaceService | *(host-wired: `data-app-card`/`data-nav-to`)* | – | – | none | viewport stabilization, checkbox feedback (global) | FUNCTIONAL |
| bulletin | GMBulletinSurfaceService | GMBulletinSurfaceController | – | preview drawer | none | same as home | FUNCTIONAL |
| jobs | GMJobBoardSurfaceService | GMJobBoardSurfaceController | Contract wizard (4 pages) | wizard overlay | **Job status (retired — see §7)** | **Job status root-capture (retired — see §8)** | FUNCTIONAL (subtabs fixed — see §9) |
| trade | GMTradeConsoleSurfaceService | GMTradeConsoleSurfaceController | – | – | none | same as home | FUNCTIONAL |
| house-rules | GMHouseRulesSurfaceService | GMHouseRulesSurfaceController | – | – | none | same as home | FUNCTIONAL |
| store | GMStoreControlSurfaceService | GMStoreControlSurfaceController | – | – | none | same as home | FUNCTIONAL |
| approvals | GMApprovalsSurfaceService | GMApprovalsSurfaceController | – | – | none | same as home | FUNCTIONAL |
| healing | GMHealingSurfaceService | GMHealingSurfaceController | – | – | none | same as home | FUNCTIONAL |
| workspace | GMWorkspaceSurfaceService | GMWorkspaceSurfaceController | – | party member modal | none | same as home | FUNCTIONAL |
| factions | GMFactionRelationshipSurfaceService | GMFactionRelationshipSurfaceController | Faction wizard (3 pages) | wizard overlay | **`_mutate` + `_wireButtons` (migrated — see §7)** | modal bounds, checkbox feedback | FUNCTIONAL |
| intel | GMIntelSurfaceService | GMIntelSurfaceController | Compose wizard (6 pages) | editor modal | none | **Intel skill-grid/difficulty hydration (retained, justified — see §8)** | FUNCTIONAL WITH RUNTIME FOLLOW-UP |
| locations | GMLocationsSurfaceService | GMLocationsSurfaceController | Create/Import wizard (2+ pages) | create/import/delete modals | **smart-drop init (proven obsolete — see §7)** | modal bounds, checkbox feedback | FUNCTIONAL |
| skill-challenges | GMSkillChallengeSurfaceService | GMSkillChallengeSurfaceController | – | – | none | same as home | FUNCTIONAL |
| settings | GMSettingsSurfaceService | GMSettingsSurfaceController (delegates to shared `SettingsSurfaceController`) | – | – | none | same as home | FUNCTIONAL |

No surface is BROKEN. No surface required disabling.

## 5. Complete action classification

Hand-cataloging every control was rejected in favor of a scanner, per the
task's own guidance ("do not hardcode a meaningless static list if a scanner
can derive it"): `scripts/dev/gm-datapad-action-registry.mjs`, enforced by
`tests/gm-datapad-action-integrity-contract.test.mjs`.

Method: for each of the 14 registered surfaces, BFS-resolve every template
reachable from that surface's root partial (mirroring Handlebars'
`{{> "…"}}` resolution), collect every literal-valued `data-*="…"` attribute
rendered on it (a Handlebars expression value like `data-faction-id="{{this.id}}"`
is a reference/id binding, not an authored action token, and is excluded),
and cross-reference the attribute name against `dataset.<name>` reads (or
equivalent `[data-name]` selectors) in: that surface's own controller, the
GM Datapad host, `GMInteractionRepairService`, and the shared cross-surface
services (`GMSmartFormDropService`, `DossierDragDropService`,
`HolonetComposerAssist`, `SettingsSurfaceController`).

Result at the end of this pass: **86 controls scanned across 14 surfaces, 0
UNRESOLVED.** Before the Job subtab fix (§9), the same scan reported the six
`data-job-subtab-switch` controls and six `data-job-subtab-panel` targets as
UNRESOLVED — the scanner's first real catch.

Non-scanner findings from direct code reading, not caught by the (necessarily
generic) scanner because they are wiring-correctness bugs rather than
missing-wiring bugs:

| Finding | Surface | Status before | Status after |
|---|---|---|---|
| `_mutate(operation, reason)` argument order | factions | LIVE_BROKEN (silent no-op mutation) | fixed |
| `_wireButtons` targeting retired attributes | factions | DUPLICATE_HANDLER (compat's delegated listener always won; real per-button listeners always matched zero elements) | fixed (single delegated handler, current attribute contract) |
| Job status buttons | jobs | DUPLICATE_HANDLER (repair-service capture handler always won over both the real and the compat handler) | fixed (single handler, real controller) |
| Job dossier/settlement subtabs | jobs | DEAD_UI (zero handlers anywhere) | fixed |
| `approve-suggestion`, `reject-suggestion`, `remove-relationship` | factions | FUTURE_FEATURE (no service semantics exist) | unchanged — see §17 |

## 6. Wizard inventory

| Wizard | Surface | Open | Pages | Page state owner | Next | Back | Direct step nav | Validation | Submit | Cancel/Close | Rerender behavior | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Contract wizard | jobs | `data-gm-wizard-open="contract"` | 4 | `wizard.dataset.currentPage` (in-DOM, no rerender) | `data-gm-wizard-next` | `data-gm-wizard-back` | `data-gm-wizard-step-button` | `novalidate` form; primary objective required at submit only | `data-gm-wizard-submit` → `[data-job-create-form]` submit handler | `data-gm-wizard-close` | opening resets to page 1 (`setPage(wizard, 1)`); mid-fill DOM state is not disturbed by unrelated surface rerenders | FUNCTIONAL |
| Faction Dossier wizard | factions | `data-gm-wizard-open="faction"` | 3 | `wizard.dataset.currentPage` (in-DOM, no rerender) | `data-gm-wizard-next` | `data-gm-wizard-back` | `data-gm-wizard-step-button` | `novalidate` form | `data-gm-wizard-submit` → `[data-gm-faction-create-form]` submit handler | `data-gm-wizard-close` | same as Contract wizard | FUNCTIONAL |
| Intel Compose wizard | intel | server-rendered surface-state modal (`patchSurfaceState('intel', { modal: { type: 'editor' } })` + rerender) | 6 | `wizard.dataset.currentPage` (in-DOM after each attach) | `data-intel-action="wizard-next"` (disabled at last page) | `data-intel-action="wizard-back"` (disabled at page 1) | step indicators are display-only (no direct-nav) | none enforced client-side | page 6 (Review) submits via the record editor's own save action, not a dedicated wizard-submit button | `data-intel-action="close-modal"` (server-rendered close) | surface rerender (e.g. any `patchSurfaceState` on `intel`) re-attaches the controller, which resets the wizard to page 1 — see §17 | FUNCTIONAL WITH RUNTIME FOLLOW-UP |
| Locations Create/Import wizard | locations | server-rendered surface-state modal (`patchSurfaceState('locations', { modal: { type: 'create'|'import' } })` + rerender) | 2+ (varies by form) | `wizard.dataset.currentPage` (in-DOM after each attach) | `data-location-action="wizard-next"` (disabled at last page, relabels "Review Complete") | `data-location-action="wizard-back"` (disabled at page 1) | none | none enforced client-side | the wizard's own create/import form submit (not a `wizard-submit` action) | `data-location-action="close-modal"` | same rerender-resets-to-page-1 behavior as Intel | FUNCTIONAL WITH RUNTIME FOLLOW-UP |

Every wizard can reach its final page from open; none is intentionally
incomplete or hidden.

## 7. `GMControllerCompatibilityService` patch inventory (retired)

| Patch | Original defect claim | Verified still true? | Proper owner | Migrated? | Removed? |
|---|---|---|---|---|---|
| `_repairFactionController` | `_mutate` argument-shift bug; template drifted to `data-gm-faction-action` | **Yes, both true.** `_mutate(operation, reason)` called `mutateShellOnly(operation, reason)` against a real `(host, mutation, options)` signature — confirmed by reading `scripts/ui/shell/mutate-and-repaint.js`. The template (`templates/apps/gm-datapad/surfaces/factions.hbs`) uses `data-gm-faction-action` exclusively; zero occurrences of `data-gm-faction-delete`/`-job`/`-intel` remain. | `GMFactionRelationshipSurfaceController` | Yes — `_mutate` fixed in place; `_wireButtons` replaced with the compat service's (already-correct) delegated `data-gm-faction-action` handler, moved verbatim into the real controller. | Yes |
| `_repairJobStatusContract` | Real controller called a "removed" `transitionJobStatus()` API | **No — false today.** `HolonetMessengerService.transitionJobStatus()` exists (`scripts/holonet/subsystems/holonet-messenger-service.js:2689`) and correctly forwards to `.threadAction()`, which for `set-job-status`/`override-job-status` calls the same `_gmTransitionJobStatus()` the repair service was calling directly. The real controller's own `_wireStatusButtons` (line 993) already called this correctly. | `GMJobBoardSurfaceController` (already correct) | N/A — nothing to migrate | Yes |
| `_repairLocationsInitialization` | Extracted controller never initialized `GMSmartFormDropService` for Locations' smart-drop zones | **No — false today.** `templates/apps/gm-datapad/surfaces/locations.hbs` contains zero `data-smart-*` attributes. `GMSmartFormDropService.bind()` against this page element is a no-op with the current template. | N/A | N/A — nothing to migrate | Yes |

**`GMControllerCompatibilityService.js` is deleted.** All three patches are
accounted for; none required inventing new implementation.

## 8. `GMInteractionRepairService` inventory

| Behavior | Classification | Still needed? | Proper owner | Action taken |
|---|---|---|---|---|
| Job status root-capture interception (`_bindJobStatusRepair`) | CONTROLLER DEFECT COMPENSATION (masked the real controller's own working handler) | No | `GMJobBoardSurfaceController._wireStatusButtons` (already correct) | **Removed** |
| Checkbox `aria-checked` + `.is-selected` sync (`_bindCheckboxFeedback`) | CSS DEFECT COMPENSATION | Yes, for now | future: CSS `:has()` selectors / template-level `aria-checked` binding | Retained — global, low-risk, not blocking any control |
| Modal bounds sync (`_bindModalBounds`, `_syncModalBounds`) | APPLICATIONV2 LIFECYCLE COMPENSATION | Yes, for now | future: stable modal CSS (Phase I, out of scope this pass) | Retained — removing without a CSS replacement would break wizard/modal visibility |
| Viewport stabilization (`_stabilizeViewport`, ResizeObserver) | APPLICATIONV2 LIFECYCLE COMPENSATION | Yes, for now | future: CSS containment (Phase I) | Retained |
| Intel wizard skill-grid/difficulty hydration (`_hydrateIntelWizard`) | REAL REQUIRED BEHAVIOR | Yes | `GMIntelSurfaceController` (not yet — see §17) | Retained, documented as a migration target |

`GMInteractionRepairService` is **retained**, with one responsibility (Job
status interception) removed. It is no longer in the authoritative path for
any control that has its own real handler.

## 9. Duplicate handlers found and fixed

1. **Job status buttons** (`[data-job-status-action]`, `[data-job-transition-action]`) —
   three code paths existed for one click: the real controller's own
   `_wireStatusButtons`, the compat service's instance-property shadow of the
   same method, and the interaction-repair service's root capture-phase
   interceptor. Only the third ever ran. Fixed by deleting the first
   shadow and the interceptor, leaving the real controller's method as the
   sole handler.
2. **Faction Dossier action buttons** (`[data-gm-faction-action]`) — the real
   controller's `_wireButtons` bound per-button listeners to attributes the
   template no longer renders (zero matches, so zero real listeners), while
   the compat service's page-level delegated listener on the *current*
   attribute was the only thing actually firing. Fixed by migrating the
   compat service's delegated handler into the real controller and deleting
   the dead per-button listeners.
3. **Job dossier/settlement subtabs** (`[data-job-subtab-switch]`) — not a
   duplicate; the opposite defect (zero handlers). Documented separately in
   §5 and fixed in `GMJobBoardSurfaceController._wireJobSubtabs`.

No other duplicate-handler pattern was found across the 86 scanned controls
or the direct reading of every controller file in `scripts/ui/shell/gm/controllers/`.

## 10. State authority map

| Concept | Owner | Notes |
|---|---|---|
| current GM surface (`currentPage`) | `GMDatapad` host field, driven by `_navigateTo()` | HOST STATE |
| current tab within a surface (e.g. Store options/inventory) | `ShellSurfaceState` via `host.getSurfaceState(surfaceId)` / `patchSurfaceState()` | SURFACE STATE |
| wizard current page (Job/Faction) | `wizard.dataset.currentPage` (in-DOM, not persisted across surface rerenders that don't touch the wizard) | TRANSIENT DOM STATE — intentional; a wizard is meant to reset on open |
| wizard current page (Intel/Locations) | same DOM dataset, but the wizard lives inside a server-rendered modal keyed off `ShellSurfaceState`'s `modal` field, so *any* unrelated `patchSurfaceState` on that surface re-renders the modal and resets the page — see §17 | mixed TRANSIENT DOM STATE / SURFACE STATE, documented follow-up |
| selected Job thread | `host.selectedJobThreadId` | HOST STATE (mirrors the actor-holopad convention of hanging a handful of cross-surface selections off the host) |
| selected Faction/Dossier item, Locations filters, Intel filters | `ShellSurfaceState` per surface | SURFACE STATE |
| GM sidebar collapsed / surface focused | `host._gmSidebarCollapsed` / `host._gmSurfaceFocused` | HOST STATE (chrome, not surface data) |
| Job Board active top-level tab | `localStorage` (`swse.gmDatapad.jobBoard.activeTab`) | PERSISTED USER PREF |
| theme / language | `SettingsSurfaceController` → game settings | SERVICE/DOCUMENT STATE |
| Faction/Job/Intel/Location records | `FactionRegistryService` / `HolonetStorage` / `HolonetIntelService` / `LocationRegistryService` | SERVICE/DOCUMENT STATE |

No concept was found stored in more than one authority without an explicit
projection relationship (DOM classes/dataset are always a projection of the
`ShellSurfaceState`/host fields above, never an independent copy).

## 11. Shell contract findings

`templates/shell/shell-surface.hbs`'s "persistent home nav" floating button
was gated `{{#unless (eq shellSurface "home")}}` — a check written for the
actor holopad's own `shellSurface` vocabulary, where the home surface's id
really is `"home"`. The GM Datapad computes its home surface id as
`"gm-home"` (`GMDatapad._getGmShellSurfaceId`), so the check never matched on
GM home, and a redundant floating home button rendered even while already on
the GM home screen — a genuine **ACTOR-SPECIFIC LEAK** (Finding F).

Fixed: `{{#unless (or (eq shellSurface "home") (eq shellSurface "gm-home"))}}`.

No other `shellSurface`/`_shellSurface` string-comparison leaks were found
against the GM Datapad: `ShellHost.js`'s several `_shellSurface === 'home'`
checks are in a class the GM Datapad does not use (`GMDatapad extends
BaseSWSEAppV2` directly; it has no `ShellHost` mixin and no `_shellSurface`
field), so they are out of scope and unaffected.

## 12. CSS ownership findings

Not touched this pass, per the task's explicit sequencing ("Do not
prioritize visual cleanup before functionality"; Phase I is CSS
consolidation and was intentionally deferred). For the record, the current
load order is `styles/apps/gm-datapad.css` → `styles/system/gm-datapad-phases.css`
→ shared Holopad shell CSS → `GMInteractionRepairService`'s single runtime
`<style id="swse-gm-datapad-interaction-repairs">` injection (checkbox
sizing, wizard actor-row grid, modal-layer positioning fallbacks). The
runtime injection was not removed because two of its three still-active
justifications (modal bounds, viewport stabilization) are load-bearing until
a CSS replacement is built and tested — seePhase I in §17.

## 13. Repairs implemented

1. `GMFactionRelationshipSurfaceController._mutate` — fixed the
   `mutateShellOnly` argument order (real bug; every faction mutation was a
   silent no-op).
2. `GMFactionRelationshipSurfaceController._wireButtons` — replaced dead
   per-button listeners on retired attributes with the correct delegated
   `data-gm-faction-action` handler (migrated from the compatibility
   service).
3. `GMJobBoardSurfaceController._wireJobSubtabs` (new) — wired the
   previously-dead `data-job-subtab-switch`/`-panel` tab strip in both the
   Dossier detail rail and the Settlement workspace.
4. `templates/shell/shell-surface.hbs` — fixed the GM-home floating
   home-button leak.

## 14. Compatibility patches retired

All three (`_repairFactionController`, `_repairJobStatusContract`,
`_repairLocationsInitialization`) — see §7. `GMControllerCompatibilityService.js`
deleted; `GMSurfaceControllerRegistry` no longer imports or calls it.

## 15. Interaction repairs retired

One: `GMInteractionRepairService._bindJobStatusRepair` (the root
capture-phase Job-status interceptor). The other four responsibilities are
retained with reasons in §8.

## 16. Tests added

- `tests/gm-datapad-action-integrity-contract.test.mjs` — runs the new
  scanner (`scripts/dev/gm-datapad-action-registry.mjs`) across all 14
  surfaces and asserts zero unresolved controls.
- `tests/gm-datapad-wizard-contract.test.mjs` — per-wizard static contract
  (open selector, page count, back/next/step-button/submit selectors present
  in both template and controller) for all 4 live wizards.
- `tests/gm-datapad-no-duplicate-handler-regression.test.mjs` — pins the
  fixes in §9: `GMControllerCompatibilityService.js` stays deleted, the
  interaction-repair service never regains a job-status interceptor or a
  `stopImmediatePropagation()` call, the Job controller's real
  `_wireStatusButtons` remains the sole definition and calls the public API,
  and the Faction controller's `_mutate`/`_wireButtons` keep their fixed
  signatures.

## 17. Remaining runtime requirements (not fixed this pass)

These are deliberate scope boundaries, not oversights:

- **Intel/Locations wizard "resets to page 1 on unrelated surface rerender."**
  Because these two wizards live inside a server-rendered `modal` field of
  `ShellSurfaceState` rather than a static in-DOM overlay (unlike Job/Faction),
  *any* `patchSurfaceState` call on that surface while the modal is open
  re-renders the whole surface, which re-attaches the controller, which
  resets `wizard.dataset.currentPage` to 1. In static reading this did not
  turn up an in-scope trigger (no control on either surface calls
  `patchSurfaceState` while its own modal is open except the wizard's own
  next/back, which do not go through a surface rerender), so this is a
  **live-Foundry follow-up to verify, not a proven live defect**. See the
  live-smoke checklist in §18.
- **`GMInteractionRepairService`'s CSS/viewport/modal-bounds/Intel-hydration
  responsibilities** — retained per §8, each with a named future owner. Phase
  I (CSS consolidation) was intentionally not started this pass.
- **Job/Faction wizard navigation duplication.** `_wireWizardControls` /
  `setPage` in `GMJobBoardSurfaceController` and
  `GMFactionRelationshipSurfaceController` are near-identical (~90 lines
  each). Both are independently verified correct in this pass. The task's
  own guidance only sanctions a shared helper when multiple wizards *already*
  follow the same contract — which is now demonstrably true for these two —
  but extracting it was judged higher-risk than valuable within this pass's
  budget, given both implementations are currently correct and tested.
  Recommended follow-up, not started.
- **Dead Dossier actions** (`approve-suggestion`, `reject-suggestion`,
  `remove-relationship`) — rendered in `factions.hbs`, no service semantics
  exist anywhere in the codebase. They already fail loudly (the delegated
  handler's `default` case shows a "not connected yet" `ui.notifications`
  warning rather than doing nothing), so they are not silent, but they are
  not implemented. No service semantics were invented for them, per the
  task's explicit prohibition.

## 18. Live Foundry follow-up checklist

| Surface | Control | Expected controller | Expected service | Expected DOM change | Sentinel signal | Failure signal |
|---|---|---|---|---|---|---|
| jobs | Contract wizard open→Next×3→Create Contract | `GMJobBoardSurfaceController` | `HolonetMessengerService.createJobPosting`/`threadAction` | wizard closes, job appears in Board tab | new thread in Job Board list | wizard stays open / no new thread |
| jobs | Status button (e.g. Accept→In Progress) | `GMJobBoardSurfaceController._wireStatusButtons` | `HolonetMessengerService.transitionJobStatus` | status chip updates, one render | single `gm-controller-refresh` render | duplicate console errors, or two status-history entries for one click |
| jobs | Dossier/Settlement subtabs | `GMJobBoardSurfaceController._wireJobSubtabs` (new) | none (local DOM only) | correct panel shows, no render | `.is-active` moves to clicked panel | click does nothing (regression of the bug this pass fixed) |
| factions | Dossier action buttons (Make Job, Create Intel, Delete, etc.) | `GMFactionRelationshipSurfaceController._wireButtons` | `FactionRegistryService`/`FactionJobBridgeService`/`FactionIntelBridgeService` | navigates or mutates + one render | faction/contact record actually changes | button click does nothing (regression of the `_mutate` bug this pass fixed) |
| factions | Add Faction wizard open→Next×2→Create | `GMFactionRelationshipSurfaceController` | `FactionRegistryService.upsertFaction` | wizard closes, faction appears in list | new registry entry | wizard stuck / faction not created |
| intel | Compose wizard open→Next×5→Deliver | `GMIntelSurfaceController` + `GMInteractionRepairService._hydrateIntelWizard` | `HolonetIntelService` | record created/updated | Intel list shows new/updated record | wizard resets page on an unrelated action; skill grid empty |
| locations | Create/Import wizard open→Next→Save/Reopen | `GMLocationsSurfaceController` | `LocationRegistryService` | modal closes, location list updates | location appears/updates | modal stuck; wizard resets page on an unrelated action |
| skill-challenges | Open/create, configure, submit, edit existing | `GMSkillChallengeSurfaceController` | `SkillChallengeStore` | tracker updates | challenge state persists across reopen | edits don't persist |

Watch specifically for: duplicate clicks (should not exist post-fix), a
missing/invisible modal footer at a realistic Foundry viewport, wizard
resetting to page 1 unexpectedly (§17), repeated render loops, and any
console error naming a removed private API.

## 19. Recommended next step

Do not begin Phase 7 (actor sheet) work as part of this effort. The
recommended next GM Datapad follow-up, in priority order, is: (1) live-Foundry
validation against §18, (2) Phase I CSS consolidation so
`GMInteractionRepairService`'s remaining modal/viewport JS can be retired in
favor of stable CSS, (3) migrate Intel wizard hydration into
`GMIntelSurfaceController` once CSS consolidation reduces the risk of doing
so, (4) evaluate extracting the now-duplicated Job/Faction wizard-navigation
helper.
