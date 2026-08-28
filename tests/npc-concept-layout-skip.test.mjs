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
//
// Phase 6 (context ownership): the actual buildNpcConceptSheetContext() call
// site moved again, from character-like-sheet.js into a
// SWSEV2NpcSheet._buildNpcConceptSheetContext() override in
// scripts/sheets/v2/npc-actor-sheet.js, behind a shared no-op default hook
// (see docs/audits/v2-phase-6-context-render-performance.md §6C/6B).
// character-like-sheet.js still computes conceptLayout and still calls the
// hook under the same `if (useNpcConceptSheet)` guard (assertion 1 below is
// unaffected); assertion 2 now reads the relocated call site.

const characterSheet = await readFile(new URL('../scripts/sheets/v2/character-like-sheet.js', import.meta.url), 'utf8');
const npcActorSheet = await readFile(new URL('../scripts/sheets/v2/npc-actor-sheet.js', import.meta.url), 'utf8');
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
  npcActorSheet,
  /buildNpcConceptSheetContext\(actor, \{\s*\n\s*\.\.\.context,\s*\n\s*derived,\s*\n\s*conceptLayout,/,
  'SWSEV2NpcSheet._buildNpcConceptSheetContext must still pass conceptLayout through unchanged'
);
assert.match(
  characterSheet,
  /this\._buildNpcConceptSheetContext\(actor, \{/,
  'character-like-sheet.js must still invoke the NPC concept-context hook behind the useNpcConceptSheet guard'
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
