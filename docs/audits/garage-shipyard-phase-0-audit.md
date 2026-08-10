# Droid Garage / Starship Shipyard — Phase 0 Corrective-Engineering Audit

**Audited SHA:** `f651ec6eff9efe091131f03eb4e120af02a1448f` (main, "Merge pull request #945 ... workbench-ux-refactor-phase-4-visual-polish-smoke")
**Audit branch:** `claude/garage-shipyard-audit-o3c1lm` (created from the SHA above; contains only this document)
**Scope:** Audit only. No production source file was modified to produce this report. See [Validation](#validation) at the end.

All findings below are sourced from direct reads of the cited files at the SHA above, with `file:line` citations. Where a claim could not be verified by static reading alone (e.g., a runtime toast message, a rendered layout at a specific viewport size), it is explicitly flagged as **INFERRED** rather than presented as observed fact.

---

## 1. Executive Summary

**What is healthy:**
- The engine layer (`DroidCustomizationEngine`, `VehicleCustomizationEngine`) is well-factored, reuses canonical chargen/vehicle-system data sources instead of inventing costs, and — with one major exception (wallet actor, below) — routes every mutation through `TransactionEngine` → `ActorEngine.applyMutationPlan`. **Zero direct `actor.update()`/`item.update()` calls exist in the UI or engine layer.** The "UI is purely requester/viewer" contract is real and intact.
- `TransactionEngine.executeAssetCustomizationTransaction` is already correctly designed as a cross-actor commerce primitive (independent wallet/asset snapshot, mutate, and rollback) — its own docstring says it is "the cross-actor commerce boundary used by Shipyard modify-existing." The capability exists; it's just not invoked correctly (see below).
- Garage and Shipyard already share one unified app (`CustomizationBayApp`), one adapter (`CustomizationSurfaceAdapter`), and one shell surface id (`'customization'`), which is a good foundation — there is no structural need to build two parallel UIs.
- The System/Parts card grid correctly surfaces installed / compatible / incompatible / staged-add / staged-remove states with distinct visual treatment, and per-column scroll ownership (left rail / main / right rail each scroll independently) is a reasonable, non-conflicting model already in place.
- Tech Specialist, embedded inside the Bay, is a real, substantial feature (764-line service) — and it is the one part of the Bay that **already resolves the owner's wallet correctly**, which makes it the reference pattern for fixing the wallet bug elsewhere in the same file.

**What is unfinished:**
- Save Draft, Request GM Approval, Send to Store Quote, and Validate Build are `ui.notifications.info(...)` stubs with no backing behavior.
- The Build New / Chargen Draft context pills are cosmetic — `contextMode` never gates any functional branch anywhere in `customization-bay-app.js`.
- The "Build Stages" strip is fully decorative: `#buildStages()` is called with a **hardcoded literal** `activeIndex` (4 for droid, 5 for vehicle, 1 for placeholder) at every call site, never derived from actual player choices, and stage items have no click handler.
- Per-card resale value and prerequisites are computed by the droid engine but never rendered; the vehicle engine doesn't compute prerequisites at all. There is no search, filter, or sort UI, and no inspect/detail-rail step before staging a change.
- Mentor presentation for both Seraphim and Marl Skindar is a static one-line fallback string plus a Unicode glyph — no portrait image, no dialogue-JSON usage, no translation integration, despite all three existing and being wired for other mentors.

**What is structurally wrong:**
- **Wallet authority bug (BLOCKER):** When Garage or Shipyard is opened for an owned droid/vehicle from the owner's Asset Bay, the droid/vehicle pays for its own upgrades out of its own `system.credits` — the owning character's wallet is never touched. This is confirmed end-to-end from the Asset Bay click through to `TransactionEngine`, not inferred.
- **Shipyard/Asset-Bay routing divergence (HIGH):** Garage opens inline inside the owner's own Holopad window. Shipyard, from the same Asset Bay, detours through `VehicleCustomizationRouter` and opens (or reuses) a **second, separate Foundry window** — the vehicle's own actor sheet — and the owner-actor reference is dropped along the way. Closing Shipyard returns to an `'asset-bay'` surface bound to the *vehicle*, not the owner, which will show a nonsensical or empty asset list.
- **Nested device-frame chrome (HIGH):** `.swse-customization-bay` renders its own full border/background/box-shadow/scanline "screen," which is injected byte-for-byte into the already-framed Holopad shell surface with no chrome-stripping — the exact anti-pattern the Workbench project was created to eliminate, and for which Workbench has a working fix pattern (a chrome-free content partial + host-side stripping rule) that Garage/Shipyard never adopted.
- **Responsive authority gap (HIGH):** The shell's `ResizeObserver`-based `is-shell-*` classification system never observes this app at all (its target-selector list omits the Bay's actual class names), and `customization-bay.css` uses two raw, browser-viewport `@media (max-width)` queries plus an unconditional `max-height: calc(100vh - 96px)` instead — meaningless for a resizable floating window or an inline Holopad surface, and with no height-only trigger at all (so a short-but-wide shell gets no adaptation in either direction).

**What is merely ugly:**
- 4-6x duplication of credits/cost, legality/GM-review, and (for vehicles) slot count across different panels on the same screen, all sourced from one computation.
- A permanently-visible `<details>` block titled "Implementation Notes for Future V2 Build," and two template-hardcoded strings ("Authority: Existing Engine," "UI Contract: No Direct Mutation") that read as internal architecture notes shipped directly into the player-facing UI.
- Four independent, uncoordinated mentor-portrait-path resolvers exist in the codebase; the one named "registry" is used in exactly one call site.

**What is functionally risky:**
- The wallet bug is an economy-correctness issue, not merely a display bug — a player can buy droid/vehicle upgrades using credits the game never intends them to spend from that source.
- The Store's "Build Custom Starship" button appears to pass a non-vehicle (buyer) actor into a router that explicitly guards `actor.type !== 'vehicle'` — this looks broken as wired (**INFERRED** from code trace; not executed live).
- Zero test coverage exists for `CustomizationBayApp`, `VehicleCustomizationEngine`, `CustomizationSurfaceAdapter`, Asset Bay routing, or wallet resolution. Only `DroidCustomizationEngine`'s preview/apply dedup logic has real tests.

**Is a rewrite necessary?** No. Per the product intent constraints, this is confirmed: the engines, the transaction plumbing, and the unified app/adapter/surface architecture are sound and should be preserved. The corrective work is shell integration (chrome, responsive, routing), wallet-actor wiring (one parameter, already-supported by the transaction layer), mentor presentation, and information-hierarchy cleanup — not a new engine or a new app.

---

## 2. Runtime Architecture Diagram

### Garage (droid), from the owner's Asset Bay — the healthy path

```text
Owner's Holopad (ShellHost, actor = owner PC)
  └─ Asset Bay surface ("Modify" click, data-actor-id = droid)
       └─ ShellHost._wireAssetBaySurfaceEvents  (ShellHost.js:670-693)
            └─ this.setSurface('customization', {
                 source:'asset-bay', returnSurface:'asset-bay',
                 ownerActorId: <owner id>, targetActorId: <droid id>,
                 bayMode:'garage', mode:'garage', contextMode:'modifyExisting'
               })
               — SAME WINDOW, no new Application opened
       └─ ShellSurfaceRegistry._buildCustomizationSurfaceVm(ownerActor, options, shellHost)
            targetActor = game.actors.get(options.targetActorId)   // = droid
            └─ CustomizationSurfaceAdapter.getOrCreate(shellHost, targetActor, options)
                 adapter.actor = droid   (NOT the owner)
                 └─ _getApp() → new CustomizationBayApp(droid, options)
                      app.render/app.close monkey-patched to re-render/return
                      the SAME owner shellHost — no standalone window ever opens
                 └─ app._prepareContext() → #buildDroidContext()
                      DroidCustomizationEngine.getNormalizedDroidProfile(droid)
                      DroidCustomizationEngine.getAvailableSystems(droid)
                      DroidCustomizationEngine.previewDroidCustomization(droid, changeSet)
       └─ templates/shell/partials/surface-customization.hbs
            injects {{{vm.contentHtml}}} = rendered customization-bay.hbs VERBATIM
            (full chrome included — see Audit 2)
       └─ player clicks "Apply Changes" → handleInlineAction('apply-build')
            └─ #applyBuild() → DroidCustomizationEngine.applyDroidCustomization(droid, changeSet)
                 — called with ONLY the droid; no wallet actor passed —
                 └─ TransactionEngine.executeAssetCustomizationTransaction({
                      actor: droid, assetActor: droid, ...
                    })
                    walletActor === assetActor === droid
                    credits debited from droid.system.credits  ⚠ WALLET BUG (Audit 14)
                 └─ ActorEngine.applyMutationPlan(droid, ...)   — sole mutation path
```

### Shipyard (vehicle), from the owner's Asset Bay — diverges structurally

```text
Owner's Holopad (ShellHost, actor = owner PC)
  └─ Asset Bay surface ("Modify" click, data-actor-id = vehicle, bayMode='shipyard')
       └─ ShellHost._wireAssetBaySurfaceEvents  (ShellHost.js:670-693)
            bayMode==='shipyard' && targetActor.type==='vehicle' branch:
            └─ this._openShipyardForAsset(vehicle, {
                 source:'asset-bay', ownerActor: <owner actor object>,
                 contextMode:'modifyExisting'
               })
                 ⚠ ownerActor is silently DROPPED inside this method — never forwarded
       └─ VehicleCustomizationRouter.openVehicleCustomization(vehicle, {...})
            guards actor.type !== 'vehicle' (only relevant for the Store path, §3e)
            └─ ShellRouter.openSurface(vehicle, 'customization', {...})
                 shell = getShell(vehicle.id)  — looked up by the VEHICLE's own id
                 if (!shell) → vehicle.sheet.render(true)
                   ⚠ OPENS A SECOND, SEPARATE FOUNDRY WINDOW
                      (the vehicle's own actor sheet, itself a full ShellHost)
                 shell.setSurface('customization', {...})
       └─ (inside the NEW vehicle-sheet window)
            CustomizationSurfaceAdapter.getOrCreate(vehicleShellHost, vehicle, options)
            adapter._shellHost = the VEHICLE's own shell, not the owner's Holopad
            → CustomizationBayApp(vehicle, options) — mode = 'shipyard'
            → #buildVehicleContext() → VehicleCustomizationEngine.*
       └─ player clicks "Apply Changes" → #applyBuild()
            → VehicleCustomizationEngine.applyVehicleCustomization(vehicle, changeSet)
                 → TransactionEngine.executeAssetCustomizationTransaction({
                     actor: vehicle, assetActor: vehicle, ...
                   })
                   walletActor === assetActor === vehicle  ⚠ SAME WALLET BUG
       └─ player clicks "Back / Close" → app.close()
            returnSurface === 'asset-bay' →
            self._shellHost.setSurface('asset-bay', {...})
            ⚠ self._shellHost is the VEHICLE's shell — Asset Bay is rebuilt with
              actor = vehicle, not the owner. AssetBaySurfaceService will show
              assets "owned by" the vehicle (INFERRED: nonsensical/empty), not
              return the player to their own dashboard.  (Audit 13)
```

### Direct entry points (both lanes, symmetric and internally consistent)

```text
Droid's own actor sheet ("Droid Systems" tab)
  → this.setSurface('customization', {bayMode:'garage', targetActorId: this.actor.id, ...})
    (inline, same window — this ShellHost IS the droid's sheet)

Vehicle's own actor sheet ("customize-vehicle" button)
  → this.setSurface('customization', {bayMode:'shipyard', targetActorId: this.actor.id, ...})
    (inline, same window — bypasses VehicleCustomizationRouter entirely)

Allies/Companions surface
  → 'open-garage' action exists (AlliesSurfaceController.js)
  → NO 'open-shipyard' equivalent exists — asymmetric entry point coverage

Store — "Build Custom Droid"
  → routes to the Progression Framework's chargen droid-builder step
    (a completely different subsystem; does not touch CustomizationBayApp at all)

Store — "Build Custom Starship"
  → VehicleCustomizationRouter.openVehicleCustomization(buyerActor, ...)
    buyerActor.type !== 'vehicle' → guard fails → error, every time (INFERRED, not executed)
```

---

## 3. Ownership Matrix

| Entry point | Shell host (window) | Owner actor | Target/asset actor | Wallet actor actually charged | Adapter | App | Engine | Transaction authority |
|---|---|---|---|---|---|---|---|---|
| Garage via owner's Asset Bay | Owner's Holopad (unchanged) | Owner PC (threaded as `ownerActorId`, **never consumed downstream**) | Droid | **Droid itself** (bug) | `CustomizationSurfaceAdapter` | `CustomizationBayApp` | `DroidCustomizationEngine` | `TransactionEngine.executeAssetCustomizationTransaction` |
| Shipyard via owner's Asset Bay | **Vehicle's own sheet** (new/second window) | Owner PC (object passed, **dropped in `_openShipyardForAsset`**) | Vehicle | **Vehicle itself** (bug) | `CustomizationSurfaceAdapter` (bound to vehicle's own shell) | `CustomizationBayApp` | `VehicleCustomizationEngine` | `TransactionEngine.executeAssetCustomizationTransaction` |
| Droid's own actor sheet | Droid's own sheet (unchanged) | N/A (droid is its own shell subject) | Droid | Droid itself (consistent w/ Asset-Bay path, same bug) | `CustomizationSurfaceAdapter` | `CustomizationBayApp` | `DroidCustomizationEngine` | same |
| Vehicle's own actor sheet | Vehicle's own sheet (unchanged) | N/A | Vehicle | Vehicle itself (same bug) | `CustomizationSurfaceAdapter` | `CustomizationBayApp` | `VehicleCustomizationEngine` | same |
| Allies surface → Garage | Owner/caretaker's Holopad | Caretaker | Follower droid | **Owner (correct)**, but only if the droid is `type:'npc'` + follower-flagged (`follower-droid-garage-hotfix.js` monkeypatch) | `CustomizationSurfaceAdapter` | `CustomizationBayApp` (patched `_prepareContext`) | `DroidCustomizationEngine` (patched) | `TransactionEngine` (patched) |
| Tech Specialist sub-flow (inside either lane) | Same as hosting lane | Resolved via `TechSpecialistModificationService.resolveWalletActor()` | Droid/vehicle | **Correctly resolved owner**, via `ownedByActorId` flags → `game.user.character` fallback | N/A (service call) | `CustomizationBayApp.#openTechSpecialist()` | `TechSpecialistModificationService` | `TransactionEngine.executeAssetCustomizationTransaction` (cross-actor, used correctly here) |
| Store "Build Custom Starship" | N/A (guard fails before any shell opens) | Buyer PC | **None — guard rejects** | N/A | — | — | `VehicleCustomizationRouter` guard rejects (**INFERRED** broken) | — |

---

## 4. Surface / Template Map

**Live, in the mainline Garage/Shipyard path:**

| Role | File |
|---|---|
| Unified App class | `scripts/apps/customization/customization-bay-app.js` |
| Inline shell bridge/adapter | `scripts/ui/shell/CustomizationSurfaceAdapter.js` |
| Surface registry entry (`'customization'`) | `scripts/ui/shell/ShellSurfaceRegistry.js` (`_buildCustomizationSurfaceVm`) |
| Shell host (all actor sheets) | `scripts/ui/shell/ShellHost.js` |
| Single-window routing authority | `scripts/ui/shell/ShellRouter.js` |
| Vehicle-only entry router | `scripts/applications/vehicle/vehicle-customization-router.js` |
| Owner dashboard VM builder | `scripts/ui/shell/AssetBaySurfaceService.js` |
| Droid mutation engine | `scripts/engine/customization/droid-customization-engine.js` |
| Vehicle mutation engine | `scripts/engine/customization/vehicle-customization-engine.js` |
| Tech Specialist service | `scripts/engine/customization/tech-specialist-modification-service.js` |
| Transaction authority | `scripts/engine/store/transaction-engine.js` (`executeAssetCustomizationTransaction`) |
| Content + chrome template (both standalone and inline) | `templates/apps/customization/customization-bay.hbs` |
| Inline shell wrapper | `templates/shell/partials/surface-customization.hbs` |
| Styling | `styles/apps/customization-bay.css` |
| Follower-droid wallet hotfix | `scripts/patches/follower-droid-garage-hotfix.js` |
| Mentor config (inline in app) | `MODE_CONFIG` constant, `customization-bay-app.js:38-73` |
| Seraphim dialogue data (unused by Garage) | `data/dialogue/mentors/seraphim/seraphim_dialogue.json` |
| Marl Skindar dialogue data (unused by Shipyard) | `data/dialogue/mentors/marl_skindar/skindar_dialogue.json` |
| Mentor portrait registry (unused by Garage/Shipyard) | `scripts/mentor/mentor-portrait-registry.js` |
| Mentor translation integration (unused by Garage/Shipyard) | `scripts/mentor/mentor-translation-integration.js` |

**Test coverage:** `tests/droid-customization-exploit.test.mjs` — the only test file touching any part of this stack.

**Orphaned/dead, superseded, or parallel (see Audit 19 for full classification):** `templates/applications/droid/droid-customization.hbs`, `templates/applications/vehicle/vehicle-customization.hbs`, `scripts/domain/vehicles/vehicle-modification-factory.js`, `scripts/domain/vehicles/vehicle-transaction-service.js`, `scripts/domain/droids/droid-modification-factory.js`, `scripts/domain/droids/droid-transaction-service.js`, `ShellHost._resolveAssetOwnerActor` (dead method).

---

## 5. UX Findings

### BLOCKER

- **B1 — Wallet authority: droid/vehicle pays for its own upgrades, not the owner.** See Audit 14 for full trace. `customization-bay-app.js:823-825`, `droid-customization-engine.js:404-406`, `vehicle-customization-engine.js:253-255`.

### HIGH

- **H1 — Shipyard-from-Asset-Bay opens a second window and drops the owner reference**, breaking the return-to-Asset-Bay route. `ShellHost.js:673-693, 782-800`. See Audit 2/13.
- **H2 — Nested device-frame chrome.** `.swse-customization-bay` (`styles/apps/customization-bay.css:42-68`) renders a full border/background/box-shadow/scanline "screen" that is injected unmodified into the Holopad's own already-framed `.swse-v2-screen`, with no equivalent to Workbench's chrome-stripping split. `templates/shell/partials/surface-customization.hbs:38-41`.
- **H3 — Responsive authority is absent for this app.** `shell-responsive-observer.js`'s own `applicationTargets` selector list never matches this app's real class tokens (`.swse-customization-bay`, `.swse-customization-bay-app`, `.swse-shell-surface--customization`); `customization-bay.css` uses only two raw `@media (max-width)` browser-viewport queries and an unconditional `100vh`-based max-height, none of which respond to actual Foundry shell size. `styles/apps/customization-bay.css:752-791`.
- **H4 — Build Stages panel is fully decorative and non-interactive**, with a hardcoded `activeIndex` at every call site. `customization-bay-app.js:428, 509, 559, 654-665`.
- **H5 — Zero test coverage** for `CustomizationBayApp`, `VehicleCustomizationEngine`, `CustomizationSurfaceAdapter`, Asset Bay routing, and wallet resolution.

### MEDIUM

- **M1 — Four independent mentor-portrait-path resolvers** with no single choke point (Audit 9/10).
- **M2 — Mentor presentation is a static glyph + static text** for both Seraphim and Marl Skindar — no portrait, no dialogue-JSON, no translation, despite all three existing. (Audit 7/8.)
- **M3 — 4-6x duplication** of credits/cost, legality, and (vehicle) slots across panels on one screen (Audit 3).
- **M4 — No inspect/detail step** before staging a system add/remove; resale and prerequisites are computed by the engine but never shown per-card (Audit 6).
- **M5 — Store "Build Custom Starship" appears broken** as wired (type-mismatch guard). **INFERRED**, not executed live (Audit 13/§3e).
- **M6 — "Current bay mode" state exists in three places** (`ShellHost._shellSurfaceOptions.bayMode`, `CustomizationSurfaceAdapter._registry` key, `CustomizationBayApp.mode`) that can drift; self-correcting for display today but a latent architecture debt.
- **M7 — Triplicated scroll/layout CSS** for the same contract across `shell-host.css` (2 copies) and `customization-bay.css` (1 copy) — currently non-conflicting but no single source of truth.

### LOW

- **L1 — Stub buttons** (Save Draft, Request GM Approval, Send to Store Quote, Validate Build) are visually indistinguishable from functional buttons (Apply, Reset).
- **L2 — Developer-facing content shipped to players**: the "Implementation Notes for Future V2 Build" `<details>` block, and hardcoded "Authority: Existing Engine" / "UI Contract: No Direct Mutation" strings.
- **L3 — Context pills (Build New / Chargen Draft / Store Quote) are cosmetic** — `contextMode` never gates a functional branch.
- **L4 — No search/filter/sort** in the system browser; vehicle lane has no sort at all.
- **L5 — `openCustomizationBay()` export is dead code** — no caller anywhere in the tree.
- **L6 — No dedicated `:focus-visible` styling** found in `customization-bay.css` beyond default browser outlines (only `:hover`/`:disabled` states are explicitly styled). Not independently re-verified against a live render; based on a full read of the 823-line stylesheet.

---

## 6. Mentor Findings

### Seraphim / Garage

- **Current behavior:** `customization-bay.hbs:46-49` renders only `{{config.glyph}}` (`⏣`) inside an `aria-hidden` span — **no `<img>` tag exists for the mentor portrait at all.** `#buildMentorText()` (`customization-bay-app.js:691-702`) returns a single hardcoded fallback string with at most one appended sentence based on legality/change state — it never reads `seraphim_dialogue.json`.
- **Real infrastructure that exists but is unreached:** `data/dialogue/mentors/seraphim/seraphim_dialogue.json` has structured per-class-path greetings and guidance text; `scripts/apps/seraphim-narrator.js` (`Seraphim` class) is a genuinely reactive, step-aware dialogue generator — but it is **live only for a different, narrower app** (`DroidBuilderApp`, reached via `stock-droid-conversion-dialog.js`), not the Garage. A translation preset (`'seraphim': 'droid'`) exists in `translation-presets.js` but `customization-bay-app.js` never imports `MentorTranslationIntegration`.
- **Recommendation:** do not resurrect the old Droid Builder architecture. Instead: (1) wire a real portrait via the consolidated portrait resolver (Audit 9/10), (2) either adapt `seraphim-narrator.js`'s reactive-dialogue pattern for the Garage's staged-add/remove/legality state, or build an equivalent thin generator reading `seraphim_dialogue.json`, and (3) wire `MentorTranslationIntegration` using the existing preset.

### Marl Skindar / Shipyard

- **Current behavior:** identical gap to Seraphim — glyph-only portrait (`◭`), static fallback text, `skindar_dialogue.json` never read, translation preset (`'marl skindar': 'scoundrel'`) defined but unreachable.
- **Historical Vehicle Modification remnants — searched and NOT found.** No `vehicle-modification-app.js` or equivalent contextual-commentary application exists in the current tree or in git history (`git log --all` search for Marl/Skindar/vehicle-modification-app returned nothing). What *does* exist — `vehicle-modification-manager.js` and `vehicle-modification-factory.js` — is pure cost/legality calculation logic with **zero narrative strings**. The only Marl Skindar prose anywhere in the live codebase is one static store-checkout confirmation-dialog paragraph, not contextual in-session commentary.
- **Recommendation:** the premise of a rich, portable "old Marl commentary engine" does not hold against this repository's actual contents. There is nothing to migrate beyond what's already in `skindar_dialogue.json`. The realistic path is the same as Seraphim's: wire the existing JSON dialogue plus build a new, thin, staged-changes/cost-reactive generator (optionally modeled structurally on `seraphim-narrator.js`), not a resurrection of lost content.

### Delta / Workbench — reference only

- Workbench (`item-customization-workbench.js`/`workbench-content.hbs`) **does** render a real `<img>` portrait for Delta and its Miraj (lightsaber) variant, driven by real per-mentor JSON dialogue (`delta_dialogue.json`'s `workshop` key) and translation integration — but its portrait paths are **hardcoded literal strings**, bypassing every resolver, and its visual treatment is a plain cyan/green-tinted box with **no hologram effect** (no grayscale, no scanlines). Delta is ahead of Seraphim/Marl Skindar on dialogue and image presence, but behind the eventual hologram contract on visual treatment — same as everyone else.

---

## 7. Global Mentor Hologram Contract

**Canonical WebP authority — currently fragmented, not resolved.** At least four independent portrait-path resolvers coexist:
1. `scripts/mentor/mentor-portrait-registry.js` — the file whose name and docstring claim to be "the" registry; in reality it has exactly one live call site (`store-main.js`, for Rendarr only).
2. `scripts/engine/mentor/mentor-dialogues.js`'s own `CANONICAL_MENTOR_PORTRAIT_BASENAMES` / `resolveMentorPortraitPath()` — the resolver actually used by the Progression Framework's L1-survey, prestige-survey, and `MentorSurfaceService` (the Holonet mentor-chat surface).
3. Hardcoded literal path strings inside `item-customization-workbench.js` (Delta/Miraj).
4. An inline JavaScript path-normalization one-liner embedded in an `onload=` attribute inside `templates/apps/progression-framework/mentor-rail.hbs`.

Plus one raw-passthrough site (`progression-framework/steps/class-step.js`) that does no resolution at all.

**Grayscale / blue-cyan tint / scanlines / glow — one near-exact precedent already exists, but misapplied.** `styles/progression-framework/holo-theme.css` (statically active in production via the unconditional `.prog-holo` class on `progression-shell.hbs`) implements almost precisely the requested filter chain:

```css
filter: grayscale(1) sepia(0.08) hue-rotate(165deg) saturate(0.70)
        brightness(1.12) contrast(1.10) drop-shadow(0 0 5px rgba(0,190,255,0.24));
mix-blend-mode: screen;
```

This is the single best starting point for the future shared primitive. **However**, it is applied via a generic `.prog-holo-media__image` class that is *also* attached to player-character portraits (`actor.img`) in `species-summary.hbs` and `droid-builder-summary.hbs` — i.e., **the one implementation that already matches the requested contract currently violates the "never player portraits" rule the brief establishes.** Any reuse of this CSS must first be re-scoped to a mentor-only class, not extended as-is.

A second, different treatment exists on the progression mentor-rail itself (`mentor-rail.css`): cyan tint + scanlines + glow, but **not grayscale** (`filter: saturate(1.02) contrast(1.04) brightness(0.98)` — essentially neutral). A third, still-different treatment exists on the Holonet mentor-chat surface (`mentor-surface.css`): per-mentor accent-color glow with `brightness(0.88) saturate(0.9)` dimming — no grayscale, no scanlines. None of these three share code or CSS custom properties today.

**Garage/Shipyard currently implement none of this** — Seraphim and Marl Skindar render a Unicode glyph, not an image, so there is nothing to skin yet; wiring a real portrait (Audit 6/7) is a prerequisite to applying any hologram treatment there.

**Explicit exclusion of player-character portraits** — verified sites that must stay excluded: `templates/partials/actor/persistent-header.hbs`, `templates/sheets/partials/sheet-header.hbs`, `templates/v2/npc/npc-sheet-header.hbs`, `templates/actors/droid/droid-image-operational.hbs`, `templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs`, `templates/shell/partials/surface-home.hbs` — all render `actor.img`, the sheet subject's own portrait, not a mentor. The two **already-mistagged** progression summary-panel usages (`species-summary.hbs`, `droid-builder-summary.hbs`) need to be corrected as part of extracting a shared primitive, not newly avoided going forward.

**Recommended shared implementation point (for Phase 5, not Phase 0):** one dedicated CSS class (e.g. `swse-mentor-hologram`) applying a re-scoped version of the `holo-theme.css` filter chain, paired with **one** consolidated portrait-resolution function (promoting either `mentor-dialogues.js`'s resolver, which is the one actually in production use, or unifying everything into `mentor-portrait-registry.js`, which is the more discoverable name — a decision for Phase 5, not Phase 0) exposed through a small shared partial or markup helper that Garage/Shipyard, Workbench, Progression, and the Holonet mentor surface can all opt into without each owning a copy of the CSS.

---

## 8. Responsive Findings

**Conflicting/absent selectors, verified directly:**

- `shell-responsive-observer.js`'s `observeAllShellResponsive()` target-selector list (`scripts/ui/shell/shell-responsive-observer.js:221-309`) does **not** contain `.swse-customization-bay`, `.swse-customization-bay-app`, or `.swse-shell-surface--customization` — only unrelated tokens (`.swse-customization-stage`, `.swse-customization-workarea`, `.item-customization-workbench`, `.swse-customization-workbench`). This app is never `ResizeObserver`-classified.
- `styles/apps/customization-bay.css` contains **zero** references to `.is-shell-compact/-narrow/-tiny/-short/-tier-*` anywhere in its 823 lines. Its only responsive behavior is:
  ```css
  @media (max-width: 1100px) { .bay-workgrid { grid-template-columns: 1fr; } ... }
  @media (max-width: 760px)  { .bay-header { flex-direction: column; } ... }
  ```
  (lines 752-784) — both keyed on the **browser viewport**, not the Foundry app/shell element, and neither has any height component. `.swse-customization-bay { max-height: calc(100vh - 96px); }` (line 790) is likewise an unconditional raw-viewport bound.
- Two other files that *look* relevant contain dead code w.r.t. this feature: `app-responsive-assets.css`'s `is-shell-*` rules key off `.swse-vehicle-shipyard-panel`/`-groups`, which belong to a completely different, vehicle-sheet-embedded panel (`templates/actors/vehicle/v2/partials/vehicle-shipyard-systems-panel.hbs`), not `customization-bay.hbs`. `app-responsive-contracts.css`'s `is-shell-compact` "workbench/customization family" block keys off `.customization-bay` (no `swse-` prefix) and workbench-only classes (`.workbench-layout`, `.preview-rail`, etc.) that never appear in `customization-bay.hbs`.

**Consequence for the "width decides structural stacking, height decides density" contract:** currently *neither* half is implemented correctly. Structural stacking (3-col → 1-col) responds only to raw browser viewport width — meaningless when the Bay is a resizable floating window or a fixed-size inline Holopad surface. No height-based density rule exists anywhere, so a short shell gets no compaction and risks clipping (Audit 12). A short-but-wide shell is *not* protected from unwanted single-column collapse by any existing mechanism, because the only collapse trigger that exists is width-based and viewport-scoped, not shell-scoped.

---

## 9. Scroll Ownership Map

| Selector | overflow-x | overflow-y | Bounded by | Role | Risk |
|---|---|---|---|---|---|
| `.swse-customization-bay` | hidden | hidden | `max-height: calc(100vh - 96px)` (raw viewport) | Outer boundary | Uses viewport, not shell size (Audit 11) |
| `.bay-workgrid` | — | hidden | `flex:1 1 auto; min-height:0` | Pass-through layout container | None — correctly delegates scroll to children |
| `.bay-left-rail` / `.bay-main` / `.bay-right-rail` | hidden | **auto** | `min-height:0` | Three independent scroll lanes | None internally — correct 3-lane ownership |
| `.bay-system-groups` / `.bay-card-grid` | — | not set | `min-height:0` only | Relies on `.bay-main`'s scroll | None |
| `.bay-summary` | — | — | `position: sticky; top:0` | Sticks inside `.bay-right-rail` | None — toggled to `static` under the (viewport, not shell) 1100px query |
| `.bay-header` / `.bay-context-strip` / `.bay-mentor` / `.bay-runtime-note` / `.bay-footer` / `.bay-implementation-notes` | not set | not set | No `min-height:0`/flex-grow declared | Fixed chrome above/below the workgrid | **Potential clip risk** — no scroll fallback if combined content exceeds the outer `max-height` (structural inference from CSS, not empirically reproduced) |

**Recommended future contract:** keep the existing 3-lane independent-scroll model (left rail / main / right rail) — it is already sound and does not need to be replaced with Workbench's model. Consolidate the currently-triplicated layout rules (duplicated across `shell-host.css` ×2 and `customization-bay.css` ×1) into one canonical location, add explicit height protection for the header/mentor/footer chrome, and replace the raw `100vh` bound with a shell-relative one once Audit 11's responsive-authority gap is closed. No JavaScript wheel-bridging is needed or recommended.

---

## 10. Routing Findings

**Asset Bay → Garage vs. Asset Bay → Shipyard diverge for a structural reason, not a deliberate design choice (INFERRED intent, but the divergence itself is directly verified code):** Garage calls `this.setSurface('customization', ...)` directly on the owner's own already-open `ShellHost` — an inline surface swap, same window, throughout. Shipyard instead calls `_openShipyardForAsset()` → `VehicleCustomizationRouter.openVehicleCustomization(vehicle, ...)` → `ShellRouter.openSurface(vehicle, 'customization', ...)`, which looks up (or opens) a shell **keyed to the vehicle's own actor id** — i.e., the vehicle's own actor sheet, a second window. This asymmetry appears to exist because `VehicleCustomizationRouter` was built as a general-purpose "open Shipyard for this vehicle" entry point (also used by the vehicle's own sheet and the Store), and the Asset-Bay caller was routed through it rather than being given its own inline path the way Garage was.

**Recommended future contract**, matching the phase-0 prompt's target shape:
```text
Owner Holopad
  ↓
Asset Bay
  ├─ Droid   → Garage in same Holopad     (already true today)
  └─ Vehicle → Shipyard in same Holopad   (NOT true today — needs the fix below)
while still retaining direct Shipyard access from a vehicle's own sheet.
```

**Files/functions that would need to change to adopt this direction** (not implemented in Phase 0):
- `ShellHost._openShipyardForAsset` (`ShellHost.js:782-800`) — replace the `VehicleCustomizationRouter` detour with a direct inline `this.setSurface('customization', {bayMode:'shipyard', targetActorId, ownerActorId, ...})` call mirroring Garage's existing branch, when called *from the Asset Bay specifically*.
- `VehicleCustomizationRouter.openVehicleCustomization` (`vehicle-customization-router.js:27-50`) — would need to remain as-is for its other callers (vehicle's own sheet, Store), i.e. the fix is about *not* routing the Asset-Bay case through it, not about changing the router itself.
- `CustomizationSurfaceAdapter` and `ShellSurfaceRegistry._buildCustomizationSurfaceVm` — already actor-agnostic (they take whatever `targetActor`/`shellHost` they're given); no changes needed if the caller is fixed.
- The `ownerActor` drop at `ShellHost.js:790-793` needs to be fixed regardless — `ownerActorId` should propagate the same way it already does for Garage.

---

## 11. Wallet / Transaction Findings

**This is unambiguous, not a judgment call: for standard (non-follower) owned droids and vehicles, the asset pays for itself. The owning character's wallet is never charged**, whether Garage/Shipyard is opened from that owner's own Asset Bay, from the droid/vehicle's own actor sheet, or anywhere else in the mainline flow.

- `TransactionEngine.executeAssetCustomizationTransaction` (`scripts/engine/store/transaction-engine.js:782-997`) is explicitly designed to support `walletActor !== assetActor` — separate parameters, independent snapshot/mutate/rollback for each leg, and its own docstring says it is "the cross-actor commerce boundary used by Shipyard modify-existing."
- But both `DroidCustomizationEngine.applyDroidCustomization` (`droid-customization-engine.js:404-406`) and `VehicleCustomizationEngine.applyVehicleCustomization` (`vehicle-customization-engine.js:253-255`) call it with `actor: actor, assetActor: actor` — the **same** droid/vehicle passed for both roles, with an explicit code comment: *"Wallet and asset are the same droid/vehicle actor."* Neither method's signature accepts a separate wallet-actor parameter at all.
- `CustomizationBayApp.#applyBuild()` (`customization-bay-app.js:818-843`) passes only `this.actor` (the droid/vehicle) into these engines — it never resolves or forwards an owner wallet for the main purchase flow.
- **The fix pattern already exists in the same file**, unused for this purpose: `CustomizationBayApp.#getWalletActor()` (`customization-bay-app.js:779-781`) calls `TechSpecialistModificationService.resolveWalletActor()`, which correctly resolves an owner via `ownedByActorId` flags, falling back to `game.user.character` — and this *is* correctly wired into the sibling Tech Specialist sub-flow (`#openTechSpecialist`, `#designateSignatureDevice`, `#toggleTechSignatureTrait`), just not into `#applyBuild()`.
- A narrower fix already exists for one case: `scripts/patches/follower-droid-garage-hotfix.js` monkeypatches `DroidCustomizationEngine` and `TransactionEngine.executeAssetCustomizationTransaction` to correctly charge the owner — but **only** for `type:'npc'` follower-flagged droids, not ordinary `type:'droid'` actors reached from the standard Asset Bay, and **with no vehicle equivalent at all.** This proves the team already knows the base engines charge the asset itself.
- A dead method, `ShellHost._resolveAssetOwnerActor` (`ShellHost.js:752-780`), implements the same owner-lookup logic for vehicles but is never called anywhere.

**Recommended future authority (not implemented in Phase 0):** give `applyDroidCustomization`/`applyVehicleCustomization` an explicit `walletActor` parameter (or resolve it internally using the same `resolveWalletActor` pattern already proven in `TechSpecialistModificationService`), and have `CustomizationBayApp.#applyBuild()` resolve and pass it — consolidating with, not replacing, the existing follower-droid hotfix and the Tech Specialist pattern. Per the hard project contract, **`TransactionEngine` remains the sole credit-movement authority** — this fix is purely about which actor gets passed into it, not a new ledger.

**Mutation authority is not affected by this bug** — see Audit 15 below; every mutation still routes through `TransactionEngine`/`ActorEngine`.

---

## 12. Prototype UI Findings

| Control/region | Displayed to player? | Actual behavior | Real functional authority? | Prototype/future hook? | Recommendation |
|---|---|---|---|---|---|
| Save Draft | Yes | `ui.notifications.info(...)`, no state change | No | Yes (explicit "future persistence hook" comment) | Remove or implement in a later phase — do not leave silently inert |
| Request GM Approval | Yes | `ui.notifications.info(...)` only | No | Yes | Same |
| Send to Store Quote | Yes | Sets `contextMode`, notifies; no store/transaction call | No | Yes | Same |
| Validate Build | Yes | Notifies + re-renders; preview is already recomputed on every render regardless | Effectively no-op | Cosmetic re-render | Remove — the button implies a distinct action that doesn't exist |
| Build New / Modify / Store Quote / Chargen Draft context pills | Yes | Toggle a highlighted pill + label text only | No functional gating anywhere | Yes | Either wire real behavior or remove the pills; currently misleading |
| Browse Systems button | Yes | Shallow real effect (focus note + resort); no new panel | Partial | Placeholder for a real filter/search UI | Build into a real filter step (Audit 6) |
| Implementation Notes `<details>` | Yes, always rendered | Static developer documentation text | N/A | N/A | Remove from player-facing template; this content belongs in a doc, not the DOM |
| "Authority: Existing Engine" / "UI Contract: No Direct Mutation" | Yes | Hardcoded template strings | N/A | N/A | Remove — internal architecture assertions, not player information |
| Readiness placeholder rows ("Engine: Not Bound", "V2 Boundary: Preserved") | Yes, only in the no-actor concept state | Hardcoded strings | N/A | N/A | Fine to keep in a genuine "no actor bound" state, but reword away from engineering jargon |
| Runtime Lane (Live/Concept) | Yes | Real, state-driven | N/A | N/A | Keep — this is the one "meta" indicator that's actually functional |

---

## 13. Historical Content Worth Recovering

- **Seraphim:** `scripts/apps/seraphim-narrator.js`'s reactive, step-aware dialogue-generation pattern (live today, but wired to `DroidBuilderApp`, a separate stock-conversion flow) is a good structural template for a real Garage mentor generator — its shape, not its exact content, is what's worth reusing.
- **Marl Skindar:** no recoverable historical content exists beyond what's already in `skindar_dialogue.json`. The premise of an old Vehicle Modification application with contextual commentary reacting to vessel type/price/hyperdrives/etc. was searched for (filesystem, grep, git history) and **not found** — `vehicle-modification-manager.js`/`vehicle-modification-factory.js` are pure calculation logic with zero narrative strings.
- **Neither mentor's Garage/Shipyard dialogue file has a "workshop"/UI-contextual key** the way `delta_dialogue.json` does — this is a real content gap to fill during implementation, not a migration task.

---

## 14. Test Coverage Matrix

| Contract | Existing test | Strength | Missing coverage |
|---|---|---|---|
| `DroidCustomizationEngine` preview/apply dedup & exploit closure | `tests/droid-customization-exploit.test.mjs` | Strong for its narrow scope | Compatibility/backup-processor branching; genuine transaction rollback (only pre-validation-reject is tested, not a mid-transaction failure) |
| `VehicleCustomizationEngine` | None | None | Everything — slot governance rejection, type compatibility, duplicate add/remove handling (note: no dedup step exists in this engine at all, unlike the droid engine — itself unverified by any test) |
| `CustomizationBayApp` | None | None | `_prepareContext`, mode switching, staged-set toggling, `#applyBuild`, `#focusSort`, `#buildBudget`, `#buildSlotMeter`, `legalityFromPreview`, `summarizePreview` |
| `CustomizationSurfaceAdapter` | None | None | `buildViewModel`, `handleAction`, registry key/get/destroy semantics |
| Asset Bay routing (Garage vs. Shipyard divergence) | None | None | The entire divergence documented in Audit 2/13 is unexercised by any test |
| Wallet ownership / `resolveWalletActor` (both implementations) | None | None | Neither `TechSpecialistModificationService.resolveWalletActor` nor `follower-droid-garage-hotfix.js`'s `resolveWalletActor` has a test |
| Transaction atomicity for these engines specifically | Indirect, via the droid exploit test | Weak | No test proves rollback on a genuine mid-transaction failure; no vehicle-side test at all |
| Responsive behavior of the Bay | None (Workbench has 4 dedicated files; none apply here) | None | Everything in Audit 8/11 |
| Mentor presentation/portraits (Seraphim/Marl) | None | None | Everything in Audit 6/7 |

---

## 15. Recommended Implementation Phases

The audit supports the rough shape proposed in the brief, with the wallet/routing bugs pulled to the front since they are correctness issues, not polish:

```text
Phase 1 — Foundation: wallet authority, Shipyard routing parity, mentor identity wiring, test seed
Phase 2 — Structural flattening: chrome-stripped content partial (Workbench pattern), shared standalone/inline split
Phase 3 — Responsive + scroll ownership: register the Bay with shell-responsive-observer, replace raw @media/100vh
Phase 4 — Information hierarchy / system browser: dedupe credits/legality/slots, add inspect step, resale/prereqs, search/filter
Phase 5 — Mentor hologram + visual polish + accessibility: shared portrait/hologram primitive, focus-visible states, remove dev-facing strings/stub buttons
Phase 6 — Foundry runtime smoke / hardening
```

If a simpler sequence is preferred, Phases 1 and 2 could be merged (both are "make the shell integration correct" work), but the wallet-authority fix in particular should land before any visual work, since it's the one item in this audit that is a gameplay-correctness bug rather than a UX defect.

---

## 16. Exact Phase 1 Scope

**Do not implement this in Phase 0.** The following is the precise, bounded scope for the next command:

1. **Wallet authority fix.**
   - Add an explicit wallet-actor resolution step to `CustomizationBayApp.#applyBuild()`, reusing `#getWalletActor()` (already present and already correctly wired for Tech Specialist) instead of passing only `this.actor`.
   - Extend `DroidCustomizationEngine.applyDroidCustomization` and `VehicleCustomizationEngine.applyVehicleCustomization` to accept an explicit wallet actor (parameter or options field) and thread it into `TransactionEngine.executeAssetCustomizationTransaction` as `actor`, keeping `assetActor` as the droid/vehicle.
   - Reconcile with `follower-droid-garage-hotfix.js` — either fold its owner-resolution logic into the general path (retiring the monkeypatch) or confirm it can coexist without double-patching once the general path is fixed.
   - Add the equivalent wallet resolution for vehicles (no hotfix currently exists for them at all).
   - `TransactionEngine` remains the sole credit-movement authority throughout — no parallel ledger.

2. **Shipyard/Asset-Bay routing parity with Garage.**
   - Change `ShellHost._openShipyardForAsset` (or its caller) so that Shipyard opened from the owner's Asset Bay uses the same inline `setSurface('customization', ...)` pattern Garage already uses, instead of detouring through `VehicleCustomizationRouter`/`ShellRouter.openSurface` into a second window.
   - Preserve `VehicleCustomizationRouter` as-is for its other legitimate callers (vehicle's own sheet, Store).
   - Fix the dropped `ownerActor`/`ownerActorId` propagation so "return to Asset Bay" always lands back on the owner's dashboard, not the vehicle's own shell.

3. **Mentor identity wiring for Seraphim and Marl Skindar (data/dialogue plumbing only — no hologram CSS yet, that's Phase 5).**
   - Wire a real portrait `<img>` for both mentors (choosing one canonical resolver — this can be `mentor-portrait-registry.js`, promoted to actual use, or the already-more-used `mentor-dialogues.js` resolver; either is acceptable for Phase 1, the important part is picking one and stopping the glyph-only rendering).
   - Replace the single static `mentorFallback` string with a small reactive generator (structurally modeled on `seraphim-narrator.js`, reading `seraphim_dialogue.json`/`skindar_dialogue.json`) that reacts to staged additions/removals, legality, and cost — matching the "should dialogue react to staged changes and transaction cost" question raised in the brief with a "yes."
   - Wire `MentorTranslationIntegration` using the existing `translation-presets.js` entries for both mentors.

4. **Test coverage seed.**
   - Add a `VehicleCustomizationEngine` test suite mirroring `droid-customization-exploit.test.mjs`'s rigor (dedup, compatibility, slot governance, transaction call-count proof).
   - Add wallet-resolution tests covering both the general (post-fix) path and the existing follower-droid hotfix, so the two don't silently diverge again.
   - Add a minimal `CustomizationBayApp`/`CustomizationSurfaceAdapter` smoke test covering the Asset-Bay routing fix from item 2.

**Explicitly out of scope for Phase 1** (deferred to later phases per the sequence above): nested-chrome flattening, responsive-observer registration, scroll consolidation, information-hierarchy dedup, system-browser inspect step, hologram CSS, stub-button removal, accessibility pass.

---

## Validation

- `git status` and `git diff` confirm the working tree is clean except for this new file — no production source file was changed to produce this report.
- Audited branch head equals `origin/main` (`f651ec6eff9efe091131f03eb4e120af02a1448f`) at audit start; only this document is new.

**No production code was changed during Phase 0.**
