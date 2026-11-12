# Reconciliation V2 — Acquisition & Loss Pathway Audit (addendum 2)

Scope: every way a character gains or loses a class, feat or talent, and what each pathway records, validates and triggers. Principle adopted: **acquisition validation** (may this be added now?) and **character reconciliation** (does current state agree with verified history and rules?) share the same rules authorities but are separate responsibilities. A successful *committed actor change* is the authoritative event; the UI gesture is not. Date 2026-11-12. Evidence: **[S]** static · **[T]** executed test.

## 1. Pathway matrix (before this change)

| Pathway | Entry point | Validation before commit | Evidence recorded | Notes |
|---|---|---|---|---|
| Chargen / level-up | `ProgressionFinalizer.finalize` | prerequisites re-check, required selections, post-apply audit (level-up) | item stamps + latest-only receipt | certification added in the previous addendum |
| Recovery from sheet "!" | reconcile-mode level-up shell | same finalizer | item stamps with class/level context | now certified (mode `reconcile`) |
| **Drag-and-drop feat/talent (live)** | `character-like-sheet.js` `_onDrop` → `DropResolutionEngine` | **none** (only duplicate/repeatable) | **none** | players and GMs alike [S] |
| **Drag-and-drop class (live)** | `DropResolutionEngine.handleClass` | **none** | none | silently adds a class level: no HP record, starting feats, choices, or prerequisites [S] |
| "Add feat/talent" buttons | `_showAddAbilityDialog` | not audited in depth | not audited | residual |
| GM grant prompt | `drop-ui.js` → `GMGrantDialog` (records `grantedBy`, `reason`, `countsAgainstSlot`) | n/a | explicit GM provenance | **unreachable**: `drop-ui.js` has no importers (only a test comment cites it) [S] |
| Duplicate drop implementations | `drop-ui.js` `onDrop`, `drop-service.js` `DropService.onDrop` | — | — | both unreferenced dead code; the live handler is `_onDrop` [S] |
| Reconciler "Classify" action | `_classifyProgressionSlot` | confirms item type vs slot | writes acquisition metadata | player/GM asserted, not engine-verified |
| Delete feat/talent | `InventoryEngine.removeItem` | equipment-transaction guard only | none | deletion left no trace; reconciler memo keyed on actor stamp + progression-item stamps so deletions DO invalidate [S/T] |
| Class item deleted / ledger edited | direct document ops | none | none | surfaces as ledger-vs-item conflict (GM diagnostic) |
| Foundry document hooks | `createItem`/`deleteItem` in several unrelated hook files | not used for reconciliation | — | not needed: the memo key already changes with progression items |

Consequence found: a player could drag a talent they were not entitled to, it would be accepted silently, and reconciliation would later have to guess whether it was "extra"; a GM's deliberate reward carried no provenance (the prompt that records it was dead code), so it was indistinguishable from a manual add and could even be counted against an open slot.

## 2. Evidence hierarchy now implemented

1. Canonical `ClassModel` / rules → entitlements (unchanged).
2. Trusted progression certification (finalizer, recovery, and now acquisition drops) → exact, item-instance evidence.
3. Item acquisition stamps → "stamped" evidence (weaker; evidence gap if uncertified).
4. **Explicit GM exception** (`countsAgainstSlot:false` + `grantedBy`) → `external`: outside slot accounting entirely; neither fills a slot nor hides a missing choice nor becomes "extra". (A GM "slot" grant — `countsAgainstSlot:true` — stays an unattributed item, because the dialog records no slot identity.)
5. Current items/levels and raw counts → cross-check only; counts never decide legality.

## 3. Shared acquisition gate (`engine/progression/utils/acquisition-authority.js`)

Thin; owns no rules. Prerequisites → the existing `AbilityEngine.evaluateAcquisition`; entitlement → the reconciliation report; evidence → `progression-evidence.js`.

* **Block only on a proven problem**: prerequisites demonstrably unmet (and no unresolved terms), or demonstrably **no open entitlement** (every slot satisfied; nothing unverifiable, unattributed, deferred, or engine-failed).
* Anything undeterminable → **allow**, stamped `player-drop` (unattributed), never certified into a slot.
* Slot context is stamped **only when every open slot is general-kind**; class-kind slots need class-list/tree eligibility this gate does not decide, so such a drop is allowed unattributed rather than claimed for a class slot.
* Player + proven problem → refused **before any actor change**. GM + proven problem → the existing `GMGrantDialog` (explicit, recorded provenance). GM + allowed → no prompt.
* After a committed drop that was proven to satisfy a slot, a `mode:'drop'` certification is recorded (best effort; never fails the drop).
* **Class drops** no longer add a level silently for players: they are redirected to Level Up. A GM must explicitly confirm a direct add (documented as bypassing HP records, starting feats and choices).

Foundry V13 note followed: cancellable pre-document hooks are synchronous, so the asynchronous check runs in the controlled drop workflow (`_onDrop` → `_gateItemAcquisition`) before mutation; document-change invalidation is handled by the memo key, not by a pre-create hook.

## 4. When reconciliation runs

Lazy and memoized (key: actor stamp + progression-item stamps + registry + house rules). It is not run per created item inside a multi-item transaction (the finalizer applies one plan; reports are computed when the sheet next builds its context). Nothing deletes an item because reconciliation calls it extra.

## 5. Tests (executed)

`tests/acquisition-authority.test.mjs` (11 checks): open general slot allowed + stamped; satisfied character → player blocked, GM routed to override; proven-unmet prerequisites block but unresolved terms never do; undeterminable cases allowed unattributed; class slots never claimed; non-gated types untouched; drop evidence honoured by reconciliation; evidence write never throws; GM exception stays outside slot accounting; deletion invalidates the memo; live-handler wiring order (gate before resolve; players never silently get a class level).

## 6. Residuals (not done)

* `_showAddAbilityDialog` ("Add feat/talent" buttons), compendium-add and importers are not yet routed through the gate.
* Dead duplicates `drop-ui.js` and `drop-service.js` remain (only a test header cites `drop-ui.js`); recommend deleting them in a cleanup change once the owner confirms no macro uses them.
* The gate trusts the report's entitlement for feats/talents granted by other talents, species or Force Training; those legitimate extras will be refused for players until a GM grants them (override is recorded). If this proves noisy in play, a rules-owner decision on which grant sources count as entitlements is needed — not guessed here.
* Force powers/secrets/techniques, medical secrets, maneuvers are not gated.
* Deleted class items are only detected as a ledger/item conflict (GM diagnostic); there is no class-removal workflow.
* In-Foundry [F]: drop flow end to end, GM dialog, certification write via real `ActorEngine.updateActor`.
