import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 7 — Droid Context Convergence + Editability Authority.
//
// Unlike phase7-droid-editability-authority-contract.test.mjs (which
// extracts and executes the sheet-level authority function, plus checks the
// wiring by source contract), this test actually imports and constructs
// DroidSheetContextBuilder — its import graph is small enough to load under
// the existing narrow Foundry-shim harness (unlike the full ApplicationV2
// sheet classes) — and exercises the real `.build()` output.
//
// Two things are protected:
//
//  1. PANEL REUSE / DUPLICATE-BUILD ELIMINATION (7E/7K): the object
//     `.build()` returns must never again contain a second, independently-
//     built healthPanel/defensePanel/secondWindPanel/biographyPanel/
//     abilitiesPanel/quickGlance — Phase 7 proved (see docs/audits/
//     v2-phase-7-droid-context-convergence.md §5) that every live Droid
//     template reads those exclusively from the shared panelContexts.*
//     built once in character-like-sheet.js, so DroidSheetContextBuilder
//     re-building them was dead, duplicate work using a divergent
//     authority. If someone reintroduces a second `PanelContextBuilder`
//     call here for one of these panels, this test must fail.
//
//  2. EDITABILITY AUTHORITY, not raw ownership (7C/7D): the live-consumed
//     Droid-specific permission fields (droid.garage.canOpenGarage, etc.)
//     must track the `isEditable` option passed into the constructor, not
//     `actor.isOwner` — this is the actual GM-viewing-an-unowned-droid case
//     Phase 6 flagged as unresolved.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = globalThis.foundry.utils.deepClone ?? ((v) => JSON.parse(JSON.stringify(v)));
globalThis.game = globalThis.game ?? {};
globalThis.game.user = globalThis.game.user ?? { id: 'test-user', name: 'Tester', role: 1, isGM: false };
globalThis.game.actors = globalThis.game.actors ?? { get: () => null };

const { DroidSheetContextBuilder } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/context-builder.js'
);

function makeDroidActor(overrides = {}) {
  return {
    id: 'droid-1',
    name: 'Test Droid',
    type: 'droid',
    isOwner: false,
    items: [],
    flags: { swse: {} },
    system: {
      level: 1,
      droidSystems: {
        degree: '3',
        size: 'medium',
        credits: { spent: 0, total: 0 }
      }
    },
    ...overrides
  };
}

// ─── 1. No duplicate panel keys reach the return value ─────────────────────

const actor = makeDroidActor();
const result = new DroidSheetContextBuilder(actor, { isEditable: true }).build();

const forbiddenDuplicatePanelKeys = [
  'healthPanel',
  'defensePanel',
  'secondWindPanel',
  'biographyPanel',
  'abilitiesPanel',
  'quickGlance'
];
for (const key of forbiddenDuplicatePanelKeys) {
  assert.ok(
    !(key in result),
    `DroidSheetContextBuilder.build() must not return "${key}" — that panel is owned exclusively by the ` +
    'shared panelContexts.* built once in character-like-sheet.js (Phase 7 duplicate-build elimination)'
  );
}

console.log('  [1/3] no duplicate panel keys in build() output OK');

// ─── 2. Genuinely Droid-specific context survives ───────────────────────────

assert.ok(result.droid && typeof result.droid === 'object', 'build() must still return the droid namespace');
assert.ok(result.droidPanels && typeof result.droidPanels === 'object', 'build() must still return droidPanels');
assert.ok(result.combatWeapons && typeof result.combatWeapons === 'object', 'build() must still return combatWeapons');
assert.equal(result.droid.degree.value, 3, 'droid.degree must still reflect the actor\'s configured degree');
assert.ok(result.droid.resolvedSystems, 'droid.resolvedSystems must still be populated (DroidSystemsResolver output)');
assert.ok(result.droid.sourceStatus, 'droid.sourceStatus must still be populated');

console.log('  [2/3] Droid-specific panels preserved OK');

// ─── 3. Presentation permission fields follow isEditable, not actor.isOwner ─

// The exact case Phase 6 flagged as unresolved: a GM viewing a droid it does
// not personally own. actor.isOwner is false in both branches below; only
// the authoritative isEditable input differs.
const nonOwnedActor = makeDroidActor({ isOwner: false });

const asGmViewingUnownedDroid = new DroidSheetContextBuilder(nonOwnedActor, { isEditable: true }).build();
assert.equal(
  asGmViewingUnownedDroid.droid.garage.canOpenGarage,
  true,
  'a GM (isEditable: true) viewing a droid it does not own must still see the Garage-open control — ' +
  'this is the exact divergence between the old actor.isOwner guess and the real sheet.isEditable getter'
);
assert.equal(asGmViewingUnownedDroid.droid.garage.canEdit, true);
assert.equal(asGmViewingUnownedDroid.droid.garage.canManageSystems, true);

const asNonOwnerPlayer = new DroidSheetContextBuilder(nonOwnedActor, { isEditable: false }).build();
assert.equal(
  asNonOwnerPlayer.droid.garage.canOpenGarage,
  false,
  'a non-owner, non-GM player (isEditable: false) must not see the Garage-open control'
);
assert.equal(asNonOwnerPlayer.droid.garage.canEdit, false);
assert.equal(asNonOwnerPlayer.droid.garage.canManageSystems, false);

// Owning player, normal editable sheet: still editable.
const ownedActor = makeDroidActor({ isOwner: true });
const asOwner = new DroidSheetContextBuilder(ownedActor, { isEditable: true }).build();
assert.equal(asOwner.droid.garage.canOpenGarage, true, 'the owning player on a normal editable sheet must see the control');

// Constructor default: no options object at all must not throw and must
// resolve to non-editable (safe default), matching { isEditable = false }.
const defaulted = new DroidSheetContextBuilder(nonOwnedActor).build();
assert.equal(defaulted.droid.garage.canOpenGarage, false, 'omitting the options object must default to non-editable, not throw or guess ownership');

console.log('  [3/3] presentation permission fields follow isEditable across the full matrix OK');
console.log('phase7-droid-panel-reuse-contract.test.mjs: all assertions passed');
