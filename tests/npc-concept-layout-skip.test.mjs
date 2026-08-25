import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 3B — static closure follow-up. The Phase 3 audit identified
// buildConceptSheetViewModel() (scripts/sheets/v2/character-sheet/
// concept-context.js, ~1,971 lines) as unconditionally invoked in
// character-sheet.js's _prepareContext() even for NPC actors, whose
// rendered content never reads its output. This was reclassified from
// "deferred, needs live Foundry" to "STATICALLY SAFE TO IMPLEMENT" after
// tracing the actual template control flow rather than relying on timing:
//
//   1. character-sheet.hbs's root {{#if actorSheetMode.useVehicleSheet}}
//      ...{{else if actorSheetMode.useNpcConceptSheet}}...{{else}}...{{/if}}
//      chain is mutually exclusive — every `conceptLayout.*` Handlebars
//      reference lives inside the trailing {{else}} branch, which cannot
//      evaluate when useNpcConceptSheet is true.
//   2. useNpcConceptSheet = actor.type === 'npc' && !isPromotedHeroicNpcActor
//      (actor-sheet-mode.js) — independent of calculationMode
//      (progression/statblock/follower), so this covers every standard NPC.
//   3. buildNpcConceptSheetContext() (npc-sheet-helpers.js) — the function
//      that actually produces context.npcConcept, which npc-concept-content
//      templates DO consume — receives `conceptLayout` as an input option
//      but never reads it.
//
// character-like-sheet.js cannot be imported under this repo's Node/Foundry-shim
// harness (ApplicationV2 + heavy Foundry globals), so this locks in the
// guard and its safety invariants as source-text contracts, following the
// established pattern for this file (see tests/dsp-engine-consolidation.test.mjs).
//
// This guard's code used to live in character-sheet.js; it moved to the
// shared SWSEV2CharacterLikeSheet base in
// scripts/sheets/v2/character-like-sheet.js during the Character/NPC/Droid
// sheet-class split (character-sheet.js is now a thin SWSEV2CharacterSheet
// subclass with no body of its own).

const characterSheet = await readFile(new URL('../scripts/sheets/v2/character-like-sheet.js', import.meta.url), 'utf8');
const npcSheetHelpers = await readFile(new URL('../scripts/sheets/v2/npc/npc-sheet-helpers.js', import.meta.url), 'utf8');
const rootTemplate = await readFile(new URL('../templates/actors/character/v2-concept/character-sheet.hbs', import.meta.url), 'utf8');
const npcConceptContent = await readFile(new URL('../templates/actors/npc/v2/partials/npc-concept-content.hbs', import.meta.url), 'utf8');

// 1. The guard: buildConceptSheetViewModel() must be skipped (conceptLayout
//    set to null) when useNpcConceptSheet is true, not invoked unconditionally.
assert.match(
  characterSheet,
  /const conceptLayout = useNpcConceptSheet \? null : ActorPerfDiagnostics\.time\(/,
  'buildConceptSheetViewModel() must be guarded behind !useNpcConceptSheet'
);

// 2. buildNpcConceptSheetContext still receives a `conceptLayout` key (call
//    shape unchanged) — this test's safety argument (skipping is invisible)
//    depends on that function never reading it. If a future change makes it
//    read `conceptLayout`, this guard must be revisited before this
//    assertion may be relaxed.
assert.match(
  characterSheet,
  /buildNpcConceptSheetContext\(actor, \{\s*\n\s*\.\.\.context,\s*\n\s*derived,\s*\n\s*conceptLayout,/,
  'buildNpcConceptSheetContext call site must still pass conceptLayout through unchanged'
);
assert.doesNotMatch(
  npcSheetHelpers,
  /conceptLayout/,
  'buildNpcConceptSheetContext (npc-sheet-helpers.js) must not read conceptLayout — ' +
  'if this starts failing, the NPC concept-layout skip in character-sheet.js is no longer safe'
);

// 3. The root template's actor-mode branches remain mutually exclusive, and
//    npc-concept-content.hbs (rendered instead of the conceptLayout-reading
//    branch) never references conceptLayout itself.
assert.match(
  rootTemplate,
  /\{\{#if actorSheetMode\.useVehicleSheet\}\}[\s\S]*?\{\{else if actorSheetMode\.useNpcConceptSheet\}\}[\s\S]*?npc-concept-content\.hbs[\s\S]*?\{\{else\}\}/,
  'character-sheet.hbs must keep the useVehicleSheet/useNpcConceptSheet/else chain mutually exclusive'
);
assert.doesNotMatch(
  npcConceptContent,
  /conceptLayout/,
  'npc-concept-content.hbs must not reference conceptLayout — if it starts to, the skip must be reverted'
);

console.log('npc-concept-layout-skip.test.mjs: all assertions passed');
