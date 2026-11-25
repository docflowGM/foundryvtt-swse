# B-UIS — UI shell: sheets, Holopad shell, apps, dialogs, templates, styles (domain contract)

**Audited commit:** `f734b4d` (census at HEAD `2beb7cb`). **Domain id:** `ui-shell`. **Census size:** 179 runtime modules / 55,411 SLOC (117 static, 18 dynamic, 39 orphan, 5 importers-only); 83 templates, 95 stylesheets. Sidecar: `data/audits/architecture-census/contracts/domains/ui-shell.json`. Level A invariants by ID; OSI = owner standing instructions (`A-OPEN-01`). Nothing here is `FOUNDRY_TESTED` (A-13).

## 1. Purpose and boundaries

Owns presentation: the V2 actor sheet hierarchy, the Holopad Shell Host (surfaces, overlays, drawers, routing, mutation queue), GM Datapad surfaces, dialogs and base app classes, tooltip/discovery, themes, Handlebars templates and CSS. It prepares view models from already-derived data and emits intents to engines.

Must NOT own (A-04): rule calculations (defenses, Second Wind, prerequisites), document mutation outside ActorEngine (A-02), credit movement (A-10), gameplay chat cards outside `SWSEChat` (A-05). UI-only state (tabs, panels, filters, theme, help level) must not need actor updates or full rerenders (OSI performance).

Census note: domain-specific UI files are contracted in their domain (vehicle sheet → B-VEH, droid sheet → B-DRD, NPC sheet, follower/minion apps → B-NPC, store → B-STO). This contract owns the shared shell they plug into.

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-UIS-01 | Actor sheet registration per actor type | `index.js` (Actors.registerSheet ×4) | OBSERVED · APPROVED-direction (A-14) | source-inspected | `index.js:175`, `index.js:181`, `index.js:187`, `index.js:193` |
| R-UIS-02 | Universal actor shell base: ShellHost mixin, PARTS template, render preamble, abstract per-type hooks | `scripts/sheets/v2/actor-sheet-base.js` · `SWSEV2ActorSheetBase` | OBSERVED | behavior-code-verified | `scripts/sheets/v2/actor-sheet-base.js:136`, `scripts/sheets/v2/actor-sheet-base.js:167`, `scripts/sheets/v2/actor-sheet-base.js:1704`, `scripts/sheets/v2/actor-sheet-base.js:1922` |
| R-UIS-03 | Character-like behavior (character/npc/droid): ~123 listeners, combat/force/inventory UI, context assembly | `scripts/sheets/v2/character-like-sheet.js` · `SWSEV2CharacterLikeSheet` | OBSERVED · oversized (F-UIS-008) | dependency-traced | `scripts/sheets/v2/character-like-sheet.js:786` |
| R-UIS-04 | Single shell template branching by actor mode | `templates/actors/character/v2-concept/character-sheet.hbs` | OBSERVED | source-inspected | `templates/actors/character/v2-concept/character-sheet.hbs:19`, `templates/actors/character/v2-concept/character-sheet.hbs:22` |
| R-UIS-05 | Holopad Shell Host (surface/overlay/drawer state, router) | `scripts/ui/shell/ShellHost.js` · `ShellHostMixin`; `scripts/ui/shell/ShellRouter.js` | OBSERVED · APPROVED (OSI Holopad-first) | source-inspected | `scripts/ui/shell/ShellHost.js:35` |
| R-UIS-06 | Shell mutation queue + repaint (serialised per document) | `scripts/ui/shell/mutate-and-repaint.js` · `mutateAndRepaint`, `mutateShellOnly` | OBSERVED | behavior-code-verified | `scripts/ui/shell/mutate-and-repaint.js:1` |
| R-UIS-07 | GM Datapad shell (GM surfaces incl. store governance, approvals) | `scripts/apps/gm-datapad.js` · `GMDatapad` | OBSERVED | source-inspected | `scripts/apps/gm-datapad.js:76` |
| R-UIS-08 | Dialog base | `scripts/apps/dialogs/swse-dialog-v2.js` · `SWSEDialogV2` (79 consumers) | OBSERVED | dependency-traced | `scripts/apps/dialogs/swse-dialog-v2.js:18` |
| R-UIS-09 | Panel view models | `scripts/sheets/v2/context/PanelContextBuilder.js` | OBSERVED · CONFLICT (computes Second Wind, F-UIS-005) | behavior-code-verified | `scripts/sheets/v2/context/PanelContextBuilder.js:881` |
| R-UIS-10 | Tooltip/discovery binding | `scripts/ui/discovery/index.js`, `scripts/ui/defense-tooltip.js` | OBSERVED · CONFLICT (defense recompute F-UIS-005; V1 hook names F-UIS-010) | behavior-code-verified | `scripts/ui/discovery/index.js:39`, `scripts/ui/defense-tooltip.js:226` |
| R-UIS-11 | Sheet mode / UI-only state | `scripts/sheets/v2/actor-sheet-base.js` · `setStoredSheetMode` (localStorage) | OBSERVED (conforms) | source-inspected | `scripts/sheets/v2/actor-sheet-base.js:82` |
| R-UIS-12 | Sheet theme / motion / help-level preference | `character-like-sheet.js`, `SettingsSurfaceController.js`, `HelpModeManager.js` (actor flags) | OBSERVED · CONFLICT (A-02, two writers, F-UIS-003) | behavior-code-verified | `scripts/sheets/v2/character-like-sheet.js:2825`, `scripts/ui/shell/SettingsSurfaceController.js:92`, `scripts/sheets/v2/HelpModeManager.js:75` |
| R-UIS-13 | Template preload registry | `scripts/load-templates.js` · `SWSE_TEMPLATES` | OBSERVED | source-inspected | `scripts/load-templates.js:520` |

## 3. Authorities

- **Canonical data:** none — the domain must not own canonical game data. OBSERVED exceptions: per-actor sheet preferences stored as actor flags (R-UIS-12).
- **Rules:** none permitted (A-04). OBSERVED violations: Second Wind healing/uses (`PanelContextBuilder.js:881`), defense subtotal (`defense-tooltip.js:226`), item-dialog prerequisite evaluation (`scripts/dialogs/entity-dialog/prereq-engine.js:244`) — F-UIS-005/006.
- **Mutation:** intents to ActorEngine via `mutateAndRepaint` — OBSERVED for most paths; direct `setFlag`/`Actor.create` sites classified in F-UIS-003/F-UIS-012.
- **Credits:** none permitted; OBSERVED violation `add-credits-to-actor` and form-editable `system.credits` (F-UIS-001).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `SWSEDialogV2` | `scripts/apps/dialogs/swse-dialog-v2.js:18` | 79 | dialog base |
| `BaseSWSEAppV2` | `scripts/apps/base/base-swse-appv2.js` | 30 | AppV2 base |
| `requestShellRender` | `scripts/ui/shell/request-shell-render.js:11` | 23 | debounced repaint |
| `ShellRouter` | `scripts/ui/shell/ShellRouter.js` | 15 | actor-id → sheet host |
| `PanelContextBuilder` | `scripts/sheets/v2/context/PanelContextBuilder.js` | 13 | panel view models |
| `mutateAndRepaint` / `mutateShellOnly` | `scripts/ui/shell/mutate-and-repaint.js` | 12 | serialised mutation + repaint |
| `SWSEV2CharacterLikeSheet` | `scripts/sheets/v2/character-like-sheet.js:786` | 6 | shared shell for character/npc/droid |
| `SWSEV2ActorSheetBase` | `scripts/sheets/v2/actor-sheet-base.js:136` | 4+ | universal base, abstract `_onRenderActorSheet` / `_prepareContextForActorSheet` |

## 5. Dependencies

- **Allowed (PROPOSED, A-P1):** presentation may import any lower layer (engines, registries, infrastructure); engines never import presentation (A-07).
- **Prohibited:** presentation → direct document writes on actor-owned documents; presentation computing rules.
- **Observed:** ui-shell depends on 26 domains (holonet 88 edges, infrastructure 77, combat 56) and is depended on by 22 domains (actor-core 25, talents 17, progression 17) — the reverse edges are A-07 candidates owned by those domains.

## 6. Integration points and lifecycle

- Sheet registration `index.js:175-199`; template preload `scripts/load-templates.js:520`.
- Global render listeners (live): `scripts/ui/discovery/index.js:39-41` and `scripts/ui/shell/shell-responsive-observer.js:335-343` (`renderApplication`/`renderActorSheet`/`renderItemSheet`); plus 8 `renderApplicationV2` listeners in live force/patch modules (see F-UIS-010). Others are in unreachable Sentinel modules.
- Chat: `scripts/ui/chat/chat-interaction-bridge.js:790` (`renderChatMessageHTML`), `:794` (`createChatMessage`). Holonet: `scripts/ui/shell/ShellHost.js:334` (`swseHolonetUpdated`).

## 7. Failure behavior and domain invariants

UIS-I1 every surface write goes through the shell mutation queue (PROPOSED; mostly OBSERVED). UIS-I2 UI-only state lives on the sheet instance, localStorage or client settings — never actor documents (OSI; violated by R-UIS-12). UIS-I3 one shared helper module for render-context sanitising (PROPOSED). References: A-02, A-04, A-05, A-08, A-10, A-14, A-16.

## 8. Level C subsystem contracts

- **C-UIS-1 Actor shell** — `SWSEV2ActorSheetBase` (ShellHost + PARTS + preamble) → per-type subclass implements `_onRenderActorSheet(root, signal)` and `_prepareContextForActorSheet(bag)`; one PARTS template branches on `actorSheetMode`. OBSERVED.
- **C-UIS-2 Shell surfaces** — `ShellSurfaceRegistry` + `*SurfaceService` (view model, pure) / `*SurfaceController` (DOM wiring, intents). OBSERVED; Services in `scripts/ui/shell/gm/**` are the largest pure-view-model modules.

## 9. Tests and certification

40 CI tests touch the domain (mostly GM Datapad / shell contracts, e.g. `tests/gm-datapad-wizard-contract.test.mjs`, `tests/phase4-sheet-architecture-contract.test.mjs` 1/1 pass offline here, `tests/v2-derived-panel-cache-coherency.test.mjs`). `character-like-sheet.js` has 4 transitive CI tests for 6,764 SLOC; `gm-datapad.js` 0 direct. Foundry acceptance: none — FOUNDRY_ACCEPTANCE_REQUIRED for every sheet change.

## 10. Reconciliation with existing contracts

**A-14 / CR-10 classification (answer to the census question).** OBSERVED: the four sheets are *not* parallel standalone sheets. All four extend `SWSEV2ActorSheetBase` (ShellHost + one PARTS template, `actor-sheet-base.js:167`). Character (`character-sheet.js:31`, empty body), NPC (`npc-actor-sheet.js:30`) and Droid (`droid-actor-sheet.js:145`) are subclasses of the shared `SWSEV2CharacterLikeSheet`. Vehicle (`vehicle-actor-sheet.js:281`) is a **sibling** subclass of the base, not of the character-like shell, and duplicates three pure helpers verbatim. The shared template renders vehicle and NPC content partials inside the same Holopad frame (`character-sheet.hbs:19-24`). Verdict: unified shell at base+template level; separate registration is required by Foundry's per-type `registerSheet` and is not itself a violation. Whether per-type subclasses satisfy OSI "no standalone droid/NPC/vehicle sheets" is an owner reading (PROPOSED: yes, provided no type-specific shell chrome is reintroduced).

| ID | Existing source | Claim | Observed |
|---|---|---|---|
| CR-UIS-01 | global `CR-10` (`docs/architecture/v2-contracts/contradiction-register.md`) | four separate sheet classes may violate A-14 | They share `SWSEV2ActorSheetBase` and one template; Vehicle is a base sibling with verbatim clones (F-UIS-002). Recommend owner close CR-10 as "conforming, with F-UIS-002 cleanup" |
| CR-UIS-02 | `scripts/sheets/v2/vehicle-actor-sheet.js:44` | helpers duplicated "from character-sheet.js" and importing would create Vehicle→Character dependency | Helpers live in `character-like-sheet.js`; a neutral `scripts/sheets/v2/shared/` module avoids the reverse dependency |
| CR-UIS-03 | `docs/audits/droid-vehicle-ui-convergence.md:72` | 36 of 38 `templates/actors/droid/**` unreferenced | 35 droid templates tracked at HEAD; census marks 11 unreferenced. The difference is method: the doc excluded preload/registry lists, the census counts a `load-templates.js` preload entry as a reference. A preload-only template is still a deletion candidate (class F, live droid check first) |
| CR-UIS-04 | OSI "old Action Palette is a retirement candidate" | — | Action Palette module already gone; remnants: `styles/system/scene-controls.css:34` selector and `scripts/governance/sentinel/v2-comprehensive-audit.js:242` path to missing `styles/ui/action-palette.css` |

## 11. Phase 2 conformance summary (detail in sidecar)

| ID | Sev | Title |
|---|---|---|
| F-UIS-001 | high | Sheet credit edits bypass TransactionEngine (add-credits button + form field) |
| F-UIS-002 | low | Vehicle sheet verbatim clones of three shell helpers |
| F-UIS-003 | medium | UI preferences persisted as actor flags via direct setFlag from two writers |
| F-UIS-004 | medium | Gameplay chat via raw ChatMessage.create in sheet/shell (5 sites) |
| F-UIS-005 | medium | Presentation recomputes Second Wind and defense totals |
| F-UIS-006 | medium | Second prerequisite evaluator in item dialog |
| F-UIS-007 | medium | Legacy floating apps: gm-store-dashboard (B), combat-action-browser (B/F), Action Palette remnants (C) |
| F-UIS-008 | medium | `character-like-sheet.js` 8,737 lines mixing ~123 listeners and rule dispatch |
| F-UIS-009 | low | 43 unreferenced templates / 67 unreferenced CSS (sample verified); two live apps' CSS never loaded |
| F-UIS-010 | medium | Global render listeners: V1 hook names on V2 apps (suspected no-op) and 8 post-render DOM repair listeners |
| F-UIS-011 | low | Unreachable UI modules (dev harnesses, V1 BaseAppV2, components) |
| F-UIS-012 | info | World-document creates in UI (legitimate exceptions needing comments) |
| F-UIS-013 | low | Explicit `render()` after actor mutations (double render hypothesis) |

## 12. Unimplemented, deferred and acceptance-required

- U-UIS-01 Shared pure helper module for sheet context (F-UIS-002) — PROPOSED.
- No new rules questions. Droid Second Wind eligibility/amount in the panel must come from `SecondWindRules` (owner rulings, if any, live in combat/droid contracts; A-18 "droids cannot benefit from organic resting" is out of this domain).
- FOUNDRY_ACCEPTANCE_REQUIRED: all four sheet types render through the shared template; tooltips/responsive observer bind on V2 sheets (F-UIS-010); theme/help preference persistence; credit adjustment path after F-UIS-001.
