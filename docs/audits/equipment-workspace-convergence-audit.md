# Equipment workspace — post-review convergence audit (weight, player authorization, deferrals)

**Date:** 2026-11-09 · **Branch:** `claude/zealous-brown-4f6hge` (merges `origin/claude/equipment-workspace-ui` @ `180412c`, based on `main` @ `b360a2f`)
**Not certified.** Nothing here is `FOUNDRY_TESTED`. Offline results only.

## 1. Reconciliation
The attached ZIP (6 files) is an earlier snapshot of the workspace branch. `equipment-slot.hbs` and the integration map are byte-identical to the branch; the context, template, CSS and test differ only by the later shield-label / Unarmed Strike fixes, which the branch already contains. **Nothing was imported from the ZIP**; the branch was merged unchanged. The WP3-B Gate 1 probe lives only on `origin/audit/wp3b-gate1-identity-probe`; its three files were copied onto this branch (additive, no edits).

## 2. Work package B — carried weight (implemented, `OFFLINE_TESTED`)
**Authority:** `EncumbranceEngine.calculateCarriedWeight(actor)` (kg, 2 dp). Helpers `itemUnitWeight`, `itemQuantity`, `itemCarriedWeight` are the only readers of item weight/quantity for totals.

| Defect found | Fix |
|---|---|
| Unequipped armor excluded from the total | All armor counts (worn or carried) |
| `quantity \|\| 1` turned quantity 0 into 1 (engine, inventory rows) | Absent/invalid → 1; explicit 0 → 0 |
| Weight read as raw `system.weight` | `system.weight ?? system.economics.weight`, parsed, invalid/negative → 0 (matches normalizer) |
| Three independent sums (engine, `buildInventoryPanel`, `buildEquipmentLedgerPanel`) with different item sets | Both panels call the engine |
| Ledger labelled kg data as "lbs"; Gear tab preferred the ledger string over the number | Ledger and PDF export say kg; Gear tab and inventory panel render `gear.totalWeight` only; `ledgerWeight` removed |

**Consumers now converged:** derived encumbrance (`character-actor.js`, `ModifierEngine`), inventory panel / Gear tab strip, equipment ledger. **Not converged (follow-up):** legacy NPC shell `NPCPanelContextBuilder` + `templates/actors/npc/v2/npc-gear-panel.hbs` (shows "lbs"; belongs to the standalone NPC sheet slated for retirement), vehicle cargo (separate cargo model), droid-builder `totalWeight` (installed-system build weight, a different quantity).
**Behavior change to note:** a character carrying heavy unworn armor now loads higher (correct), which can move them into a heavier load category.
**Deferred:** EQ-W-001 (installed / integrated / implanted / container / stored scope) — register entry added; behavior for those categories unchanged.
**Tests:** `tests/equipment-weight-convergence.test.mjs` (17 checks: single/multiple/qty/zero qty/worn/unworn armor/consumables/invalid weight/non-gear/encumbrance state/row/ledger/panel).

## 3. Work package C — player equipment authorization (route stays DISABLED)
Static review of route, transport, identity, lease. Existing (kept): envelope refuses any identity field; sender comes only from transport and only for mechanisms in `VERIFIED_IDENTITY_MECHANISMS` (**empty**); GM + lease + owner + intent-digest checks precede the single coordinator; lease re-checked per mutation (fence); journal dedupes by request id; client request-id continuity (G18).

| # | Finding | Status |
|---|---|---|
| 1 | Identity transport (chat author) unverified in live V13 | **BLOCKED — Gate 1 must run live** |
| 2 | Replies were unauthenticated: any player could self-whisper a forged reply flag and resolve `sendEquipmentRequest` | **Fixed**: `replyFromCreatedMessage` requires author == hook user and author is GM; `sendEquipmentRequest` ignores replies without `authenticated: true` |
| 3 | Every GM client would post a reply, so a non-lease GM's `NOT_EXECUTOR` refusal could race and mask the real outcome | **Fixed**: non-executor stays silent |
| 4 | Delivery guard `Set` grew without bound | **Fixed**: bounded (512) |
| 5 | Reply is advisory; UI must reflect actor state, not the reply | Documented; the sheet already renders from actor data |
| 6 | Lease has no compare-and-swap (world setting); brief overlap possible at hand-over | Known limit; fence + epoch narrow it; journal duplicate protection is the backstop |
| 7 | Intent digest is an integrity check, not a MAC; envelopes carry no expiry | Acceptable only if author cannot be forged/edited (Gate 1 incl. tamper case); expiry is an open design item |

Nothing enables the route or installs the transport (existing static test still passes). **Tests:** `tests/equipment-wp3b-transport-hardening.test.mjs` (11 checks); existing route test 8/8; probe logic 28/28.

### Operator procedure — Gate 1 (live Foundry V13; not performed)
Full detail: `docs/audits/equipment-ecosystem-wp3b-gate1-checkpoint.md`. World with 1 GM + 2 non-GM users, throwaway world.
1. GM client console: paste `tools/foundry-runtime-probes/wp3b-gate1-identity-probe.js` (installs listeners).
2. Non-GM player client (separate profile/machine): paste same file; it sends honest / forged-author-other-player / forged-author-gm / claim-only / manifest cases.
3. GM console: `SWSE_WP3B_GATE1.report('<userId the operator logged in as>')`, then `SWSE_WP3B_GATE1.cleanup()`.
**Evidence to keep:** both console outputs, nonces, message ids, Foundry build, world/user list, the verdict. Only `OBSERVED_SOUND` counts, and it is evidence for that one world/build. Activation additionally needs: a reviewed change adding the mechanism to `VERIFIED_IDENTITY_MECHANISMS`, a live two-client run of draw/stow through the transport, lost-reply and duplicate retries, and a GM-only lease store.

## 4. Work package D — EQ-001 / EQ-002 / EQ-003
Re-reviewed against the register's existing source evidence; no new evidence located. All remain `DEFERRED_RULES_REVIEW` and fail closed in the coordinator; the workspace placement adapter surfaces the refusal. No code change.

## 5. Work package E — capability audit (carried from the prior review, re-run offline)
Workspace tests (7), G36 GM control (3), readiness UI contract (14) pass: slot selection, inventory filtering, inspector, anatomy-derived hands, armor/shield independence, Unarmed Strike roll, Add/Edit/Sell/Delete, workshop access. **Live Foundry verification of all interactions is still outstanding.**

## 6. Validation
Full `tests/*.test.mjs`: 633 pass / 6 fail in the first parallel run. Five (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`) fail identically at baseline (pre-existing, unrelated). `rolling-ci-support-check` failed under parallel load only; passes alone. `validate-partials.mjs` OK; `system.json` valid.

## 7. Gates
- **Implemented, offline-tested:** weight authority + consumers; reply provenance, executor silence, bounded guard.
- **Awaiting live Foundry:** entire workspace interaction set; weight display on a real sheet.
- **Blocked by identity verification:** player Draw/Stow/Ready route.
- **Blocked by rules evidence:** EQ-001, EQ-002, EQ-003, EQ-W-001.
- **Missing / follow-up:** NPC-shell weight panel retirement; message expiry design; GM-only lease store.

**Next action:** run Gate 1 live, then review the evidence before any change to `VERIFIED_IDENTITY_MECHANISMS`.

## 8. Possessions browser (follow-up, presentation only)
The Gear tab's inventory region is now one possessions browser: **Weapons | Armor | Shields | Gear | Droids | Vehicles | All** (All default and last; the viewer's last manual choice is remembered per browser). One list, one toolbar (search, status filter, sort field, direction, Reset, "N of M" count). Only the selected tab's rows are visible.

| Rule | Implementation |
|---|---|
| Categories from resolved row flags | `categoryOfRow` unchanged; implants map to the Gear tab (`tabOfCategory`); shields stay out of Armor; a row repeated across sheet groups is listed once |
| Droids / Vehicles = established association only | `listOwnedAssets()` (new thin export over the Asset Bay's own `collectOwnedEntries`); a world actor the user can merely see or own is not included; unresolved links show "Link unresolved" and cannot be opened |
| Assets are not Items | actor references keyed `droid:<uuid>` / `vehicle:<uuid>`; no weight, no quantity, never in carried weight, no inspector entry |
| Open | existing actor sheet via `actor.sheet.render(true)` (Foundry enforces permission) |
| Status filter | options are the status labels the authorities already produced for the tab's entries (items: weapon-readiness / worn / implant labels; assets: Linked) |
| Sort | name, category, status, weight, quantity; missing values always last; assets leave weight/quantity empty |
| Slot context | hand -> Weapons with the coordinator's placement preview (unchanged); Armor / Personal Shield / Implants positions -> Armor / Shields / Gear; choosing a tab by hand clears the slot context without touching equipment state |

**Verification:** `tests/equipment-possessions-browser.test.mjs` (6 checks: tab order, mapping, dedupe, asset references, unlinked-actor exclusion, static guarantees). A Chromium harness (real templates rendered with Handlebars, real UI module, Foundry globals stubbed) ran 34 checks: all seven tabs, per-category contents, search within/across tabs, status filter, combined search+status, sort asc/desc incl. missing-last, Reset, slot-driven tab switch and manual clear, station-to-tab mapping, asset open, empty states, no write/render requests while browsing, 420 px tab rail without page overflow. **That harness is not live Foundry**: FontAwesome icons, real sheet theming, permissions and the Asset Bay data on a real world were not exercised.

**Legacy surfaces pruned (section 10).** The Gear tab contains no duplicate inventory.

## 9. Contextual Item Inspector (collapsible; UI state only)
**Layout.** No selection: the inspector is `hidden` (`display:none !important`), occupies zero space, and no placeholder or "overview" panel exists; loadout and possessions use 100% width. Selection of an Item (list row, held slot, implant chip) or a linked droid/vehicle adds `.has-selection` to the workspace: grid `2fr : 1fr` (about 33% inspector, 280px minimum). At 860px container width it narrows to a 250-280px column; at 700px and below it becomes a bottom drawer (max 55vh, bounded) that is `hidden` again, releasing all space, when closed. The X sits in the header corner (30px, bordered, focus ring) on both item and actor inspectors and clears only the inspected selection: category, search, status filter, sort, direction and list scroll are untouched. Selecting another entry swaps the inspector content without closing it. The Details | Operations | Mods tabs, placement panel (coordinator read-only plan) and detail footer are unchanged.
**Quick actions.** A row above the tabs repeats the frequent controls (weapon Draw/Stow, Draw & Ignite, Reload, Attack; equip/wear/remove, implant install, activate) as the same `data-action` / `data-eqw-action` buttons the Operations tab uses; the sheet's existing delegated handlers execute them. Nothing new executes. Draw/stow remain GM-authoritative; EQ-001/002/003 and the disabled player route are untouched.
**Droids / vehicles.** Selecting one opens an actor summary (identity art, kind, status, model, "linked property, not carried gear") with a single **Open sheet** control (`actor.sheet.render(true)`; disabled for an unresolved link or without LIMITED permission). No item operations are offered.
**Invalid-selection cleanup.** The selection is held as UI state (`item id` or `asset:<actorId>`). On every render it survives only if its target is still in the view model, i.e. the owned Item still exists, or the droid/vehicle is still a linked asset of this character. Otherwise the selection (and any placement message) is dropped, the inspector collapses, and category, search, filters and sort are kept; focus that was inside the vanished inspector moves to the first visible list entry. The same rule already applied to a slot that no longer exists. A selection that is merely filtered out of the current tab/search is kept (the inspector is independent of list filtering).
**Keyboard / accessibility.**
- Row, slot and implant selection buttons carry `aria-pressed` and `aria-controls="eqw-inspector"`; the inspector is an `aside` labelled "Item inspector".
- A keyboard activation (Enter/Space, `click` with `detail === 0`) moves focus to the inspector heading (`tabindex=-1`); pointer selection does not steal focus.
- `Escape` (inside the workspace) closes the inspector and leaves slot-driven filtering, then returns focus to the control that opened it (or the first visible list entry if it is gone). The X button does the same for the inspector only.
- Both tab rails (possession categories, inspector sections) use roving `tabindex`; Left/Right/Home/End move and activate (wrapping). Tabs keep their text labels at narrow widths (the rail scrolls) and expose `aria-label="<name> (<count>)"` on possession tabs; the "N of M possessions" count is a polite live region.
- No focus trap: the drawer is non-modal, so the rest of the sheet stays reachable.
**Known limits.** After a full sheet re-render the DOM is rebuilt, so keyboard focus that was on a list row is not restored (search focus and list scroll are); the drawer floats over the lower part of the page while open; icons, theme and permissions were not exercised in a real Foundry session.
**Verification.** `tests/equipment-possessions-browser.test.mjs` 7 checks (new: static inspector guarantees). Chromium harness (real templates + UI module, Foundry stubbed): 49 checks incl. zero-width collapsed state, ~33% open width, switch-without-close, X restore with category/search/sort/direction preserved, no write/render requests, keyboard open/Escape focus return, arrow-key tabs, asset inspector, disabled open for unresolved link, vanished-actor cleanup, 420px drawer open/close. Not live Foundry.

## 10. Focused correction pass (equipped selection, CI, weight contract, prune)
**Equipped-item selection.** The occupied Armor and Personal Shield cards were wired to `data-eqw-station` (category switch) and never inspected the item. They now carry `data-eqw-select` + `aria-controls` when occupied and keep `data-eqw-station` only when empty. Matrix (browser harness): occupied hand opens the held weapon; empty hand switches to Weapons with placement context; worn armor / equipped shield / installed implant open the inspector; empty Armor/Shield switch category and open nothing; possession rows and linked actors open the inspector; X collapses it. Armor/shield mechanics untouched. A selection-pressed state is now applied to every `[data-eqw-select]` control.
**Drawer defect found and fixed.** The narrow drawer measured over its 55vh bound because padding was added on top of `max-height`; it is now `box-sizing: border-box`.
**CI on `c69a29a`.** Rolling System Validation (run 42671795890), Universal Vehicles QA (42671795511) and Droid V2 Gate A (42671795371) each report `failure` with **zero jobs**: no job was created, so no test executed. All three were created in the same second (18:11:18Z) and ended within ~3 s of one another (~55 s run), across three different workflow files; the same three workflows produced jobs and passed on `7ec19b8` (16:48Z) and `3f513ce`. `git diff 7ec19b8..c69a29a` touches five files and none under `.github/`; all six workflow files parse as YAML. A failure that starts three unrelated workflows simultaneously with no job, with no workflow change, points to GitHub Actions/runner provisioning at that moment rather than to this PR's code; the run logs expose no per-job output, so the exact platform cause could not be read. The corrective push triggers fresh runs; that result is the confirmation (reported below).
**Weight contract.** Compared `system.weight`, `system.economics.weight` and canonical weapon `canonicalStats.weightKg`. Pack scan: all 415 shipped weapon/armor/equipment (non-vehicle) records carry an explicit numeric `system.weight` (3 weapons and 35 equipment items are explicit source-recorded zeros; none missing or blank); 199 weapon records comparable to the registry have identical `system.weight` and `weightKg` (0 mismatches); the registry has 4 identities with no `weightKg` (unrecorded, not assumed zero). `quantity` is absent on all weapon/armor records (schema default 1) and present on equipment. `economics.weight` is a normalizer fallback only. Change: `EncumbranceEngine.itemWeightVerified` / `carriedWeightReport` now distinguish a verified zero from absent/blank/invalid/negative weight; the latter still contributes 0 but the Gear strip shows "+N unweighed" instead of presenting a verified total. No fallback to the registry was added (single source: item `system.weight`, which matches it). EQ-W-001 (installed/integrated/container/stored scope) remains deferred; no category rule was added.
**Prune.** Removed the seven unreferenced legacy templates `v2-concept/partials/panels/{inventory-panel, equipment-ledger-panel, armor-summary-panel, inventory-weapon-card, inventory-armor-card, inventory-item-card, inventory-item-row}.hbs`, their 11 `load-templates.js` preload entries and 4 `partials-auto.js` entries. Grep confirms zero remaining references to those concept paths in scripts/helpers/templates/tests/styles/system.json; one obsolete assertion in `equipment-g36-gm-control.test.mjs` (read the retired weapon card for the Resolve button) now checks only the workspace template, which still carries it. Not touched: the older `templates/actors/character/v2/partials/*` copies, the panel context builders (`buildInventoryPanel` still feeds the Gear strip; `buildEquipmentLedgerPanel`/`armorSummaryPanel` hydration is now render-less and is a follow-up), CSS, and the historical manifest doc.
**Authorization.** Untouched: route disabled, verified-mechanism list empty, GM requirements intact.

**Weight parser correction.** `itemWeightVerified`/`itemUnitWeight` used `parseFloat`, which reads "2kg" as 2. Both now call one strict full-value parser, `EncumbranceEngine.parseWeightKg`: a finite non-negative number, or a string that is entirely a plain decimal (optionally with well-formed thousands commas). Unit suffixes, mixed text, misplaced commas, exponent/hex forms, signs, booleans, objects, NaN/Infinity, negatives and blanks return null: not verified, contribute 0, and are listed by `carriedWeightReport`. The unit weight and the verified flag cannot disagree. Shipped data is unaffected (the pack-contract test still passes for all 415 records). The equipment normalizer's own `parseEquipmentNumber` (which strips "kg") is deliberately not reused here because it would accept unit-suffixed strings as verified.

## 11. Actor-type parity (Character, NPC, Follower, Droid): separate stage
**Audit of what renders what.** `SWSEV2CharacterSheet`, `SWSEV2NpcSheet` and `SWSEV2DroidSheet` all extend `SWSEV2CharacterLikeSheet`, and `activateEquipmentWorkspace` is wired once in the shared sheet, but the *template* differs. Actor mode (`actor-sheet-mode.js`): `useNpcConceptSheet` is true for `type: npc` (Followers are NPC-type actors, so they take the same path); those render `npc-concept-content.hbs` with `conceptLayout = null`, so the workspace was never built for them and their Gear tab was a flat list (`npcConcept.gear`). Droids render the character template with `conceptLayout.gear.workspace`, so they already used the workspace.
**Change (one presentation, per-actor authorities).**
- `buildActorEquipmentWorkspace(actor, {inventoryPanel|groups, attacks|attackViews, unarmed, readiness})` (concept-context.js) is now the single assembly for every actor type. The attack-view closure was lifted to a top-level factory; the Character path uses it with its prebuilt groups; the low-level `buildEquipmentWorkspace` has exactly one call site.
- NPC/Follower: the shared sheet passes the already-hydrated `panelContexts` and `combat` rows to the NPC hook; `SWSEV2NpcSheet` attaches `npcConcept.workspace` (try/catch, null on failure). `npc-concept-content.hbs` Gear tab now renders the shared partial `equipment-workspace.hbs workspace=npcConcept.workspace` (the partial takes its view model as an argument; the Character gear tab passes `conceptLayout.gear.workspace`). The card header (credits badge and the follower "Store" injection point) is kept. The flat NPC list is removed, nothing is rendered beneath the workspace.
- The NPC Gear tab is reachable for any user who owns the actor, not only the GM or when gear/credits exist (`showGearTab`).
- Droids: unchanged path; anatomy comes from the installed-component authority (`readCombatReadiness`), so unresolved anatomy yields zero slots plus a notice, and ledger-confirmed manipulators become real slots. Installed droid components (`droid-system` items, `system.droidSystems`) are not ordinary possessions and stay in the Droid Systems tab. The Droids/Vehicles categories list *other* linked assets via the Asset Bay association, never the open actor.
- Followers: no new sheet, no new follower state; write controls follow the sheet's `isEditable` (a read-only view offers no edit/delete/customize regardless of the owner link).
**Statblock / combat preserved.** Combat tab, statblock attack workflow, GM tab, progression, relationship and beast/mount panels are untouched; no weapon Item is fabricated for statblock-only attacks.
**Verification.** `tests/equipment-actor-parity.test.mjs` (6 checks): identical inventories give identical seven-tab view models for character/npc/droid; standard and empty NPC; Follower permissions follow the sheet; Droid with unresolved anatomy (no invented manipulators, components kept out of possessions); multi-armed droid (four ledger-confirmed appendages -> four slots, using the real anatomy resolver); static template/builder/single-call-site/tab-access assertions. Scratch checks (not in the repo): the real `npc-concept-content.hbs` rendered with Handlebars yields the workspace (7 tabs, inspector hidden, header kept, no legacy rows), and that fragment in Chromium opens/closes the inspector from a row and from the worn-armor card with no render or write request. **Not live Foundry**: NPC-sheet theming of the workspace (its CSS reads the sheet's tokens with fallbacks and was only checked in a stub page), real follower Store flow, real NPC actors and permissions.
**Accounted legacy (not deleted).** `templates/actors/npc/v2/partials/npc-gear-panel.hbs` has no rendering consumer (only preload/registry lists) but still shows "lbs"; the follower hotfix (`scripts/patches/follower-npc-sheet-parity-hotfix.js`) maps `concept.gear` and injects a per-row Equip button into `.swse-npc-gear-row`: with the list gone that row injection is inert, while its header "Store" injection still applies. `npcConcept.gear`/`hasGear` still feed `showGearTab`. Prune together in a follow-up once the live NPC sheet is confirmed.
