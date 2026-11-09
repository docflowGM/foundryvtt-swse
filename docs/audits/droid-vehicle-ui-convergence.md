# Droid & Vehicle UI convergence

**Date:** 2026-11-09 · **Branch:** `claude/droid-vehicle-ui-convergence` · **Not certified.** Nothing here is `FOUNDRY_TESTED`; browser-harness results are not live Foundry.

## 0. Baseline and dependency
- Based on `claude/zealous-brown-4f6hge` @ `84a2f6a` (draft PR #1137, **not merged**) which already contains `main` @ `28771e0`. This branch is a **stacked** change: it reuses the equipment workspace's Holopad CSS classes and the `equipment-art` partial, and it corrects the Droid Draw gate that PR #1137 documented. It must be reviewed and merged after #1137 (or rebased onto `main` once #1137 lands). It copies none of #1137's code.
- The Vehicle/Droid V2 schema work (including #1109 and the Droid U-0..Gate C-1 convergence) is on `main`; where older planning documents still call installation job presentation "unwired", the current code was used as the source (the job view models and Shipyard actions already exist and were not touched).

## 1. Authority map (what owns what; unchanged by this work)
| Fact | Owner |
|---|---|
| Does an actor follow Droid rules (incl. NPC-type Droid Follower) | `resolveDroidRulesProfile` |
| Droid installed components / installed state / source | `resolveInstalledDroidComponents` (installation ledger first) |
| Physical appendage identity + capability | `projectActorDroidAppendages` -> `resolveEffectiveAnatomy` |
| Weapon posture (Draw/Stow/Ready) | `equipment-state-coordinator` over `equipment-state-reader` |
| Droid paid install/removal/modify | Garage (`customize-droid` surface handoff) |
| Vehicle published identity / effective stats | universal vehicle runtime projection + `buildVehicleSchemaViewModel` |
| Vehicle installations | sealed installation ledger (`schemaView.installed`) |
| Vehicle executable weapons | `resolveVehicleWeaponAuthority` (stock source group or certified installed weapon) |
| Vehicle construction / EP / jobs | Shipyard services + `shipyardView` |
| Droid/Vehicle possession | Asset Bay association (stable identity) |

## 2. Shared interaction surface (new, presentation only)
`templates/actors/shared/partials/browse-inspect.hbs` + `scripts/sheets/v2/shared/browse-inspect-ui.js`: one list, search, category tabs, status filter, sort, direction, Reset, "N of M"; a collapsible inspector (nothing selected: `hidden`, zero width; selected: two columns ~33%; X clears only the selection and keeps category/search/filter/sort/scroll; Escape closes and returns focus; keyboard open focuses the heading; roving-tab rails; invalid-selection cleanup on render; bounded drawer when narrow). It reuses the equipment workspace's Holopad classes. State lives on the sheet instance; **every operation is an existing `data-action`** handled by the sheet; the controller writes nothing. It is consumed by two adapters (Droid, Vehicle); the equipment workspace's own controller is untouched (its inspector is coupled to placement).

## 3. Droid Systems (Phase 3)
`droid-component-browser.js` maps the existing authorities to the shared model:
- **Status vocabulary** (presentation of the resolver's own source kinds): Confirmed installed (ledger-primary and installed), Installed - disabled, Configured (draft) (`droidSystems` record only), Item present (embedded Item only), Not established. A draft or item-only record is labelled and never shown as installed hardware.
- **Appendages:** one entry per physical instance with its own instance/location identity; capabilities come from the appendage projection and unknown stays **Not established**; a part-keyed record with no instance+location is *unresolved* (not a confirmed appendage); unresolved appendage evidence is listed, never promoted.
- **Inspector:** Details (identity, source, quoted price with the note that a quote is not installation eligibility, capabilities), Operations (existing Open item / Roll / Use handlers and **Open Garage** carrying `garage-region` / `garage-slot` through the existing `customize-droid` handoff), Mods (components the evidence says are hosted by that instance).
- **Resolver defects fixed:** ledger-only appendage instances collapsed into one entry (the instance id was dropped when projecting ledger-only components); installed-but-disabled ledger components were invisible; and presentation assumptions were retired: the implied "Heuristic Processor", "Walking" and "2 x Standard Droid Arms" defaults, the invented Left Arm / Right Arm slots, and the `appendage-N` location fallback. An empty droid now says **Not established**.
- Ordinary possessions stay on the Gear tab; installed hardware stays here; nothing is converted between them.

## 4. Droid weapon Draw authority (Phase 4)
**Findings.** (1) `anatomy-resolver` keys its droid path on the raw `actorType`, so an NPC-type Droid Follower was treated as biological; (2) the reader exempted `actor.type === 'droid'` from species evidence but the coordinator did not (it refused every non-stowed posture without species evidence, for droids too); (3) **no production code supplied installed components to the reader** (only tests did), so a droid had zero manipulators regardless of the coordinator gate.
**Correction.** The reader classifies through `resolveDroidRulesProfile` and, for Droid-rules actors, defaults to the existing installed-component resolver; the coordinator requires species evidence only for non-Droid actors; **contradictory classification fails closed** (positive postures withheld, coordinator refuses with no write). No fake species records; biological actors still need species evidence; the authorization gate and action costs are untouched.
**Tests** (`tests/equipment-droid-draw-authority.test.mjs`): biological Character draws; biological NPC without species refused; standard Droid with certified appendages draws; four-appendage Droid holds three weapons in three appendages; NPC-type Droid Follower draws; contradictory classification refused; unresolved appendages, disabled appendage and unknown capability refused (no write, no spend); two-handed occupancy and collisions; integrated weapon with uncertified binding never drawn; Draw/Stow priced by the cost authority; non-GM refused. Two pinned import-set tests were updated deliberately for the two new existing-authority dependencies. Fail-before confirmed.
**Exact remaining evidence gap (not resolved, not guessed):** in the real droid-part catalog the `hand` appendage records `canHold` and `canWield` as **unknown** (`null`). Anatomy for a real catalog droid is therefore `partial` and a drawn posture is correctly refused ("unknown is never permission"). Drawing with a real droid needs published/owner-approved evidence of hold/wield capability per appendage type; once the catalog records explicit booleans the same code path works (proved with explicit-capability components).

## 5. Vehicle Command Deck (Phase 5)
`vehicle-systems-browser.js` (Stats tab) classifies, never from text:
- **Certified weapons:** `resolveVehicleWeaponAuthority` ok (Certified - stock / Certified - installed; GM-configured launcher capability is marked "GM-configured (not canonical)"), with arc/attack/damage/range/operator station/ammunition from the existing mount panel and the existing crew-action and ammunition handlers as operations.
- **Blocked / unresolved weapons:** an Item the authority refuses or does not claim (reason shown, no fire control), an installed weapon "not authorized to fire", and a legacy `system.weapons` record (listed, non-canonical; on a published vehicle the existing authority already invalidates the source).
- **Published attack references:** printed armament, reference only, no control.
- **Installed systems:** the sealed ledger with EP, price, standard/nonstandard, certification, source, mount and effect certification; operational state is shown as "Not tracked by the installation record" (none is invented). Open Shipyard uses the existing handler.
- **EP:** used / total / remaining / shortfall / reserved / nonstandard chips; unknown stays "Unresolved".
Already present and kept (not rebuilt): the Base/Modification/Effective/Current statistics comparison and Shipyard job panel in the schema panel, crew, cargo, maneuvers, operations. **Not changed:** the printed-armament panel, installed-list and weapon-mount panels remain (the existing tests pin them, e.g. that the reference panel has no Fire control); the new browser is the inspection surface over the same authorities, so some information is shown twice until live acceptance decides which compact panels to retire.

## 6. Asset Bay ownership (Phase 6)
`vehicleOwnerMatchesActor` fell back to matching display names. Acquisition (`system.ownedByActorId`), grants (`primaryOwnerActorId`, `recipientActorIds`) and store approval already write stable ids, so the fallback only served legacy or hand-edited records. It is removed: name-only evidence reports `OWNER_IDENTITY_UNRESOLVED` (never ownership, never Modify); a record with a stable id belonging to someone else is a definite "not this owner" (`NOT_LINKED_AS_PROPERTY`); asset entries carry `ownerIdentityUnresolved`. Tests (`tests/asset-bay-ownership-hardening.test.mjs`): two same-named characters, name-only record, visible but unlinked droid/vehicle, genuine id/uuid/grant links, deleted owner and stale reference, non-GM with document permission but no relationship, link without document permission, GM. Not changed: `ownedActors` relationship records are still how relationship-linked droids/vehicles appear (that is the Asset Bay's own association semantics) and `system.owner` string values are still read as ids only. The Droid Garage handoff requires `actor.type === 'droid'`, so an NPC-type Droid Follower cannot open it from the sheet (existing behavior, noted).

## 7. Legacy accounting (Phase 8)
- **Pruned:** `droid/v2/partials/{droid-processor-panel, droid-appendages-panel, tabs/systems-tab}.hbs` (unreachable from any rendered template, script or test; they rendered `slot.defaultName` / implied-default arms) and their registry entries.
- **Candidates, not deleted (class F: runtime validation first):** an automated reachability pass (inbound references from templates, scripts, helpers and tests, excluding the preload/registry lists) found **36 of 38** `templates/actors/droid/**` files with no inbound reference: the tree of the retired standalone Droid sheet (`droid/v2/partials/frame/*`, `tabs/*`, `*-panel.hbs`, `droid-callouts-blueprint.hbs`, ...). The pass cannot see dynamically composed partial names; prune together after a live Droid-sheet check.
- **Retained on purpose:** the vehicle printed-armament / installed / weapon-mount panels (pinned by tests), `ownedActors` association semantics.

## 8. Verification
`tests/equipment-droid-draw-authority` 9 groups (14 required cases), `tests/droid-component-browser` 5, `tests/vehicle-systems-browser` 4 (real source-backed vehicle + real install service), `tests/asset-bay-ownership-hardening` 6; all existing droid, vehicle, Asset Bay and equipment tests pass by exit code. Chromium harness over the real shared partial and controller (Foundry stubbed): 17 checks (zero-width collapsed inspector, ~33% open, category/status/search/sort, X preserves context, Open Garage identity, Mods for host instances, keyboard open/Escape focus return, arrow-key tabs, invalid-selection cleanup, bounded narrow drawer, no horizontal overflow). **Not live Foundry.**

## 9. Remaining gates
Live Foundry V13: real Droid, NPC-type Droid Follower, multi-appendage Droid, Garage handoff with component focus, Vehicle (published, custom, ground), reference-only vs certified weapons, aftermarket install, crew, cargo, Shipyard job, EP, source-invalid vehicle, Asset Bay controls, theming of the shared surface on the Droid and Vehicle sheets. Blocked by evidence: droid appendage hold/wield capability in the part catalog. Unchanged: player-to-GM route disabled; EQ-001/002/003 and EQ-W-001 deferred. No `main` merge.
