# SWSE Beta Hardening Report

**System:** Star Wars Saga Edition (`foundryvtt-swse`) v1.2.2 · Foundry v13 (verified 14)
**Audit date:** 2026-06-03 · **Scope:** First-session player/GM experience
**Verdict:** **Beta can proceed.** No P0 blockers found. One certain P1 (theme picker) is fixed. The remaining risks are a small set of dialogs that share the same broken shape but ship with templates — they need a 5-minute smoke test, not a guess-patch.

---

## Executive summary

The init/load chain is solid. Every static import reachable from `index.js` resolves, all 345 preloaded Handlebars templates exist, all 111 CSS files, 58 packs, and 5 language files referenced by `system.json` exist, and the boot checks required Handlebars helpers. The world will load.

The Holopad/Datapad shell is defensively built: every surface builder in `ShellSurfaceRegistry` is wrapped in try/catch and returns an error view-model instead of throwing, so a failed surface degrades to an error card rather than crashing the sheet. Home-launcher tiles route only to handled surfaces; the one unhandled route (`faction`) is gated behind `visible: false`. Garage/Shipyard route to the handled `asset-bay`/`customization` surfaces. The System Manual (journey G) is present as inline data. The primary onboarding prompt (player opens an incomplete sheet) is live and self-suppressing.

### Top 5 risks

1. **(P1 — FIXED) First-run theme picker threw an error toast for every client.** `ThemePickerDialog` used a Foundry v1 `template` option with no `static PARTS` and the template file was missing. On a `HandlebarsApplicationMixin` app this renders empty, which trips the base-class render contract and surfaces a red "Error in ThemePickerDialog" notification on every user's first load; the picker never appeared. Fixed by converting to the canonical `PARTS` pattern and creating the template.
2. **(P1-RISK — verify by smoke test) 8 other dialogs share the same v1-`template`-without-`PARTS` shape.** They ship with existing templates, so they may render fine in your Foundry build — but they are structurally identical to the bug above. Includes player/GM-facing ones: weapon config, House Rules, follower adopt/add. Must be eyeballed before players arrive (checklist below).
3. **(P2) First-run GM welcome and canvas-entry onboarding are dead code.** `hardening-init.js` (which wires `registerHardeningHooks`) is never imported — its only reference is a string literal. Effect: the GM never sees the first-run welcome window, and players only get the onboarding prompt when they manually open their sheet, not automatically on canvas entry. No crash results (the settings it would register are not read anywhere). The GM datapad is still reachable via scene controls, so this is degraded polish, not a blocker.
4. **(P3) Diagnostic registries point at a few stale template paths.** `PANEL_REGISTRY` (character + NPC) references three or four panel templates that don't exist at the listed paths. These registries drive validation/Sentinel diagnostics, not rendering — the real render path uses the preload list + partial includes, all present. Risk is noisy diagnostic warnings, not a broken sheet.
5. **(P3) Broad `console` logging.** ~200 non-test files emit `console.log/info/debug`, and the AppV2 probe logs on every render. Against the "no console spam in beta" goal, but too broad to refactor safely tonight.

---

## Prioritized issue table

| Sev | Area | Symptom | Suspected cause | Files | Recommended fix |
|-----|------|---------|-----------------|-------|-----------------|
| **P1 ✅ fixed** | First-run UX / theme | Red error toast on every client's first load; theme picker never shows | v1 `template` option, no `static PARTS`, template file missing → empty render trips `BaseSWSEAppV2` render contract | `scripts/ui/ui-manager.js`, `templates/apps/theme-picker-dialog.hbs` (new) | Converted to `PARTS` + created template (done) |
| **P1-risk** | Dialogs (GM + player) | Possible empty/error render when opened | Same v1-`template`-without-`PARTS` shape; templates exist so may work in your build | `adopt-or-add-dialog.js`, `house-rules-app.js`, `weapon-config-dialog.js`, `levelup/debug-panel.js`, `levelup/prestige-roadmap.js`, `mentor-notes/mentor-notes-app.js`, `progression-framework/dialogs/custom-language-dialog.js`, `progression-framework/dialogs/recovery-session-dialog.js` | Smoke-test each (checklist). If any render empty, apply the same `PARTS` conversion |
| **P2** | First-run / onboarding | No GM welcome window; player onboarding only fires on manual sheet-open, not on canvas entry / sheet grant | `hardening-init.js` `registerHardeningHooks()` never called (only a string-literal reference) | `scripts/core/hardening-init.js`, `scripts/sheets/v2/character-sheet/chargen-onboarding.js` | Optional: call `initializeDatapadRegistrationOnboarding()` from a `ready` hook to restore canvas-entry prompts (function is self-guarded). Do **not** wire the whole hardening module tonight — it also runs sidebar DOM mutation |
| **P3** | Char/NPC sheet diagnostics | Possible false Sentinel/validator warnings in console | `PANEL_REGISTRY` template paths stale (`v2/partials/maneuvers-panel.hbs`, `v2/character/panels/{portrait,health,defense}-panel.hbs`) — render path is unaffected | `scripts/sheets/v2/context/PANEL_REGISTRY.js`, `scripts/sheets/v2/npc/PANEL_REGISTRY.js` | Update the registry paths to the real files (`starship-maneuvers-known-panel.hbs`, `v2-concept/.../panels/*`) post-beta |
| **P3** | Dead chargen sub-paths | None at runtime (unwired) | Deprecated `apps/progression/force-*-picker.js` and `progression-framework/steps/droid-{degree,model}-step.js` reference missing templates but aren't imported by the live flow | as listed | Delete after beta to reduce confusion |
| **P3** | Logging | Console noise during normal play | Direct `console.*` across ~200 files; `appv2-probe` logs per render | repo-wide; `scripts/debug/appv2-probe.js` | Gate behind the existing `debugMode` setting (model: `SWSEApplicationV2._log`) in a later cleanup pass |

---

## Beta journey results

| # | Journey | Result | Notes |
|---|---------|--------|-------|
| A | Fresh GM launches new world | **Pass** | Init chain clean; `WorldDataLoader.autoLoad()` runs for GM on ready |
| B | GM sees first-run window / opens GM window | **Risk** | First-run welcome window does not fire (P2, dead `hardening-init`). GM datapad **is** reachable via the scene-control button (`initializeSceneControls` is wired) |
| C | GM creates/assigns a character to a player | **Pass** | Sheet registration for character/droid/npc/vehicle all map to `SWSEV2CharacterSheet` |
| D | Player enters canvas, gets onboarding prompt | **Risk** | Auto canvas-entry prompt not wired (P2). Prompt **does** fire when the player opens the incomplete sheet (`character-sheet.js` → `maybePromptForDatapadRegistration`) |
| E | Player clicks Yes → chargen/training splash | **Pass** | `launchProgression(actor, …)` exists and is invoked from the prompt |
| F | Player clicks No → not nagged again | **Pass** | "No" persists per user/actor via a flag; session set + lock prevent re-prompts |
| G | Player opens Holopad Settings → reads System Manual | **Pass** | `SettingsSurfaceService` builds `SYSTEM_MANUAL_PAGES` into `surface-settings.hbs` |
| H | Player runs character creation without soft-lock | **Pass (spot-check)** | Progression-framework steps/templates referenced by the live resolver all resolve; recommend a full run in smoke test |
| I | Player opens character sheet, core tabs hold | **Pass** | All preloaded panel templates exist; PANEL_REGISTRY mismatches are diagnostic-only |
| J | GM opens GM datapad, no obvious dead-ends | **Pass** | `gm-datapad.hbs` and surface templates present; surfaces guarded |
| K | Owned droid/ship management entry points | **Pass** | Garage/Shipyard/Asset Bay tiles route to handled `asset-bay`/`customization` surfaces; tiles hidden when the player owns no such assets |

---

## Safe patches applied

**1. `scripts/ui/ui-manager.js`** — `ThemePickerDialog` converted from the broken v1 `defaultOptions.template` shape to the canonical AppV2 pattern used by working dialogs (`character-import-wizard`, `miraj-attunement`): `static DEFAULT_OPTIONS` + `static PARTS`. `_prepareContext` now passes the full `{value, label}` theme options. `wireEvents` unchanged (still binds `button[data-theme]`).

**2. `templates/apps/theme-picker-dialog.hbs`** (new) — renders one button per theme with `data-theme="{{value}}"` and a label, plus intro copy. Always renders non-empty content, so the base render contract is satisfied even if the theme list is empty.

Both changes are isolated to the first-run theme picker; no shared/public APIs were touched. `node --check` passes on the edited file.

> **Note on the working tree:** the repo already had **238 pre-existing uncommitted modified files** (largely whitespace/line-ending churn) before this audit. None were touched here. Review and commit those deliberately — the volume of churn can mask real changes in review.

---

## Defer until after beta

- Decide whether to revive `hardening-init.js` (first-run welcome + canvas onboarding + tooltip/feature-flag settings) or delete it. If reviving, do it in isolation and re-test the sidebar normalization it performs.
- Fix the stale `PANEL_REGISTRY` template paths (character + NPC) so Sentinel/validator diagnostics stop warning.
- Delete deprecated dead paths: `scripts/apps/progression/force-*-picker.js`, `progression-framework/steps/droid-{degree,model}-step.js`, and the duplicated source trees under `scripts/scripts/`, `scripts/holonet/scripts/`, `styles/scripts/`, and `assets/Concept/uploads/` (none are loaded, but they pollute search and audits).
- Gate `console.*` debug output behind the `debugMode` setting; quiet the `appv2-probe` per-render logging.

---

## Pre-session smoke-test checklist (run in Foundry before players arrive)

**Boot & first run**
- [ ] Launch the world as GM. Console shows `SWSE | System initialization complete.` and `SWSE | System ready.` with **no red errors**.
- [ ] **Theme picker:** in a fresh client profile (or reset the `themePromptShown` client setting), reload — the "Choose Your Theme" dialog should appear with clickable theme buttons and **no error toast**. Click one; the theme applies and the dialog closes.

**Dialogs sharing the at-risk pattern (open each; confirm it renders content, not an empty window or error toast)**
- [ ] Drop a duplicate-type actor onto another actor → **Adopt or Add** dialog.
- [ ] Open a weapon's attack configuration → **weapon config** dialog.
- [ ] Open the **House Rules** app (GM settings).
- [ ] Trigger a **custom language** entry and a **recovery session** dialog in chargen/progression.
- [ ] Open **Mentor Notes** and the **prestige roadmap** from level-up.
- (If any render empty/error, apply the same `PARTS` conversion as the theme-picker fix.)

**Core player journey**
- [ ] As a player, open a freshly granted, incomplete character → the **New Datapad Granted** onboarding prompt appears.
- [ ] Click **Yes** → chargen/training splash launches; complete a full character without a dead step.
- [ ] Click **No** on a second test actor → reload → confirm you are **not** prompted again.
- [ ] Open the completed sheet → cycle every tab (abilities, combat, inventory, force, bio) → no broken panels.
- [ ] Open **Holopad Settings → System Manual** → pages render.

**GM tools & owned assets**
- [ ] Open the **GM Datapad** from the scene-control button → switch between its surfaces (approvals, healing, trade, jobs) → no dead-ends.
- [ ] As a player owning a droid and a ship, open **Garage** and **Shipyard** tiles → customization surface loads.
- [ ] Open the **Store** → browse and run one test purchase.
