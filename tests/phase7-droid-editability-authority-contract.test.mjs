import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 7 — Droid Context Convergence + Editability Authority.
//
// This test protects two things:
//
//  1. The AUTHORITY DEFINITION itself: `canUseActorSheetEditControls`
//     (scripts/sheets/v2/actor-sheet-base.js), the function that resolves
//     `sheetEditable` for every Character/NPC/Droid render. Rather than
//     re-implementing its logic in the test (which could silently drift
//     from the real function), this test extracts the actual, current
//     function body from the committed source and executes it via
//     `new Function(...)` against constructed `sheet`/`actor`/`game` inputs
//     covering the required permission matrix (owner, non-owner player, GM,
//     read-only sheet). `actor-sheet-base.js` itself cannot be imported
//     under this repo's Node/Foundry-shim harness — its class body extends
//     `foundry.applications.sheets.ActorSheetV2` through a long chain of
//     shell-controller imports (same documented limitation as
//     phase4/5/6's sheet-architecture contract tests) — so this is the
//     strongest available way to test the *real* function rather than a
//     source-text regex alone.
//
//  2. The WIRING: DroidSheetContextBuilder (scripts/sheets/v2/droid-sheet/
//     context-builder.js) and its one call site (scripts/sheets/v2/
//     droid-actor-sheet.js) consume that authoritative value instead of
//     reconstructing their own `actor?.isOwner === true` guess. This half
//     is a source-contract check (same established pattern as
//     tests/phase6-subtype-context-ownership-contract.test.mjs) because the
//     wiring itself is structural, not a computation worth re-executing.

const ROOT_URL = new URL('../', import.meta.url);
const actorSheetBaseSrc = await readFile(new URL('scripts/sheets/v2/actor-sheet-base.js', ROOT_URL), 'utf8');
const contextBuilderSrc = await readFile(new URL('scripts/sheets/v2/droid-sheet/context-builder.js', ROOT_URL), 'utf8');
const droidSheetSrc = await readFile(new URL('scripts/sheets/v2/droid-actor-sheet.js', ROOT_URL), 'utf8');

// ─── 1. Extract and execute the real canUseActorSheetEditControls body ────

const fnMatch = actorSheetBaseSrc.match(
  /export function canUseActorSheetEditControls\(sheet, actor\) \{([\s\S]*?)\n\}/
);
assert.ok(fnMatch, 'actor-sheet-base.js must still export canUseActorSheetEditControls(sheet, actor)');

// eslint-disable-next-line no-new-func -- executing the real, just-extracted
// function body against constructed inputs, not a reimplementation.
const canUseActorSheetEditControls = new Function('sheet', 'actor', 'game', fnMatch[1]);

function resolve({ isGM = false, isOwner = false, testUserPermission = false, sheetIsEditable } = {}) {
  const game = { user: { isGM } };
  const actor = {
    isOwner,
    testUserPermission: () => testUserPermission
  };
  const sheet = { isEditable: sheetIsEditable };
  return canUseActorSheetEditControls(sheet, actor, game);
}

// Required permission matrix (7J):
assert.equal(
  resolve({ isOwner: true, sheetIsEditable: true }),
  true,
  'OWNER + normal editable sheet must resolve editable'
);
assert.equal(
  resolve({ isOwner: false, testUserPermission: false, sheetIsEditable: false, isGM: false }),
  false,
  'NONOWNER PLAYER on a sheet whose own isEditable is false must resolve non-editable'
);
assert.equal(
  resolve({ isOwner: false, isGM: true, sheetIsEditable: false }),
  true,
  'GM must resolve editable even when not the raw actor owner and even when sheet.isEditable is false — ' +
  'this is the exact divergence Phase 6 identified between the shared panel path and the old Droid-only guess'
);
assert.equal(
  resolve({ isOwner: false, isGM: false, testUserPermission: false, sheetIsEditable: false }),
  false,
  'a read-only sheet (editable: false) for a non-owner, non-GM user must resolve non-editable'
);

console.log('  [1/2] canUseActorSheetEditControls permission matrix OK (real function, not reimplemented)');

// ─── 2. DroidSheetContextBuilder consumes the authoritative value ─────────

assert.match(
  contextBuilderSrc,
  /constructor\(actor, \{ isEditable = false \} = \{\}\) \{/,
  'DroidSheetContextBuilder must accept an explicit { isEditable } contract instead of guessing from the actor'
);
assert.match(
  contextBuilderSrc,
  /this\.isEditable = isEditable === true;/,
  'DroidSheetContextBuilder must store the passed-in isEditable value'
);
// Phase 7 keeps exactly one literal-ownership read (buildStockStatblockControlsPanel's
// display-only `isOwner` field — genuine ownership info, not a permission gate).
// Every *permission-gating* field must have moved off actor.isOwner onto this.isEditable.
const codeLines = contextBuilderSrc.split('\n').filter((line) => !/^\s*(\*|\/\/)/.test(line));
const isOwnerReadCount = codeLines.filter((line) => line.includes('actor?.isOwner === true')).length;
assert.equal(
  isOwnerReadCount,
  1,
  'DroidSheetContextBuilder should read actor?.isOwner === true exactly once now (the literal-ownership ' +
  'display field in buildStockStatblockControlsPanel) — every permission-gating field must consume the ' +
  'authoritative this.isEditable instead (Phase 7 §4/§9)'
);
for (const gate of ['canEdit: this.isEditable', 'canAct = this.isEditable', 'canEditSheet = this.isEditable', 'this.isEditable &&\n      !isFinalized']) {
  assert.ok(
    contextBuilderSrc.includes(gate),
    `DroidSheetContextBuilder must gate a real permission field on this.isEditable ("${gate}")`
  );
}
const contextBuilderCodeText = codeLines.join('\n');
assert.ok(
  !/import\s*\{\s*PanelContextBuilder\s*\}/.test(contextBuilderCodeText) && !contextBuilderCodeText.includes('new PanelContextBuilder('),
  'DroidSheetContextBuilder must not construct its own second PanelContextBuilder — the shared ' +
  'panelContexts.healthPanel/defensePanel/secondWindPanel built once in character-like-sheet.js were proven ' +
  'to be the only ones any live Droid template reads (see docs/audits/v2-phase-7-droid-context-convergence.md §5)'
);

// ─── 3. The one call site passes the authoritative sheet value through ────

assert.match(
  droidSheetSrc,
  /new DroidSheetContextBuilder\(actor, \{ isEditable: this\.isEditable === true \}\)/,
  'SWSEV2DroidSheet._buildDroidSheetContext must pass its own real ApplicationV2 isEditable getter into ' +
  'DroidSheetContextBuilder, not reconstruct ownership itself'
);

// ─── 4. Fallback-path consistency (7H) ─────────────────────────────────────

assert.match(
  droidSheetSrc,
  /garage: \{ canOpenGarage: this\.isEditable === true, systemsLocked: false \}/,
  'the catch-path fallback context must use the same authoritative isEditable value as the success path, ' +
  'not a separate actor.isOwner guess'
);

console.log('  [2/2] DroidSheetContextBuilder wiring contract OK');
console.log('phase7-droid-editability-authority-contract.test.mjs: all assertions passed');
