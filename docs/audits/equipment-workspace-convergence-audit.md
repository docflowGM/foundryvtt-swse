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

**Legacy surfaces still on disk, unreferenced by any rendered template (follow-up prune, needs `helpers/handlebars/partials-auto.js`, `scripts/load-templates.js` and one test updated):** `v2-concept/partials/panels/{inventory-panel, equipment-ledger-panel, armor-summary-panel, inventory-weapon-card, inventory-armor-card, inventory-item-card, inventory-item-row}.hbs`. The Gear tab itself contains no duplicate inventory.
