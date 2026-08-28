import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 6 — subtype context ownership + render performance hardening.
//
// This is a source-text contract test (character-like-sheet.js and its
// subclasses cannot be imported under this repo's Node/Foundry-shim harness
// — same limitation phase4/phase5 contract tests document), following the
// same pattern as tests/phase4-sheet-architecture-contract.test.mjs and
// tests/npc-concept-layout-skip.test.mjs.
//
// It locks in the two Phase 6 extension hooks established in
// docs/audits/v2-phase-6-context-render-performance.md (§6B-6D):
//   - _buildDroidSheetContext(actor): no-op default on
//     SWSEV2CharacterLikeSheet, real DroidSheetContextBuilder-invoking body
//     on SWSEV2DroidSheet.
//   - _buildNpcConceptSheetContext(actor, opts): no-op default on
//     SWSEV2CharacterLikeSheet, real buildNpcConceptSheetContext-invoking
//     body on SWSEV2NpcSheet.
//
// The point of both hooks is that Character/NPC renders never construct
// DroidSheetContextBuilder, and Character/Droid renders never construct
// buildNpcConceptSheetContext — i.e. the shared file should not even
// *import* either subtype-only builder any more.

const characterLikeSheet = await readFile(new URL('../scripts/sheets/v2/character-like-sheet.js', import.meta.url), 'utf8');
const npcSheet = await readFile(new URL('../scripts/sheets/v2/npc-actor-sheet.js', import.meta.url), 'utf8');
const droidSheet = await readFile(new URL('../scripts/sheets/v2/droid-actor-sheet.js', import.meta.url), 'utf8');
const characterSheet = await readFile(new URL('../scripts/sheets/v2/character-sheet.js', import.meta.url), 'utf8');
const vehicleSheet = await readFile(new URL('../scripts/sheets/v2/vehicle-actor-sheet.js', import.meta.url), 'utf8');

// ─── 1. Shared file no longer imports/constructs either subtype builder ───

assert.ok(
  !/^import .*DroidSheetContextBuilder/m.test(characterLikeSheet) && !characterLikeSheet.includes('new DroidSheetContextBuilder('),
  'SWSEV2CharacterLikeSheet (shared Character/NPC/Droid file) must not import or construct ' +
  'DroidSheetContextBuilder — that construction is owned by SWSEV2DroidSheet._buildDroidSheetContext'
);
assert.ok(
  !/^import .*buildNpcConceptSheetContext/m.test(characterLikeSheet) && !/(?<!_)buildNpcConceptSheetContext\(actor,/.test(characterLikeSheet),
  'SWSEV2CharacterLikeSheet (shared Character/NPC/Droid file) must not import or directly call ' +
  'buildNpcConceptSheetContext — that construction is owned by SWSEV2NpcSheet._buildNpcConceptSheetContext'
);

// ─── 2. Shared file declares the two no-op extension hooks ───

assert.match(
  characterLikeSheet,
  /_buildDroidSheetContext\s*\(\s*_actor\s*\)\s*\{\s*\n\s*return null;/,
  'SWSEV2CharacterLikeSheet must declare a no-op _buildDroidSheetContext(actor) default returning null'
);
assert.match(
  characterLikeSheet,
  /_buildNpcConceptSheetContext\s*\(\s*_actor,\s*_opts\s*\)\s*\{\s*\n\s*return null;/,
  'SWSEV2CharacterLikeSheet must declare a no-op _buildNpcConceptSheetContext(actor, opts) default returning null'
);

// ─── 3. Shared file still calls both hooks from _prepareContextForActorSheet ───

assert.match(
  characterLikeSheet,
  /const droidSheetContext = isDroidActor \? this\._buildDroidSheetContext\(actor\) : null;/,
  'the isDroidActor guard must still call the hook, unchanged in shape'
);
assert.match(
  characterLikeSheet,
  /context\.npcConcept = this\._buildNpcConceptSheetContext\(actor, \{/,
  'the useNpcConceptSheet guard must still call the hook, unchanged in shape'
);

// ─── 4. Only the owning subtype controller imports/overrides its builder ───

assert.match(
  droidSheet,
  /import \{ DroidSheetContextBuilder \} from/,
  'SWSEV2DroidSheet must own the DroidSheetContextBuilder import'
);
assert.match(
  droidSheet,
  /_buildDroidSheetContext\s*\(\s*actor\s*\)\s*\{/,
  'SWSEV2DroidSheet must override _buildDroidSheetContext with a real implementation'
);
assert.ok(
  !npcSheet.includes('DroidSheetContextBuilder'),
  'SWSEV2NpcSheet must not import or reference DroidSheetContextBuilder'
);
assert.ok(
  !characterSheet.includes('DroidSheetContextBuilder'),
  'SWSEV2CharacterSheet must not import or reference DroidSheetContextBuilder'
);
assert.ok(
  !vehicleSheet.includes('DroidSheetContextBuilder'),
  'SWSEV2VehicleSheet must not import or reference DroidSheetContextBuilder'
);

assert.match(
  npcSheet,
  /import \{ buildNpcConceptAbilities, buildNpcConceptSheetContext,/,
  'SWSEV2NpcSheet must own the buildNpcConceptSheetContext import'
);
assert.match(
  npcSheet,
  /_buildNpcConceptSheetContext\s*\(actor, \{ context, derived, conceptLayout, actionEconomy \} = \{\}\)\s*\{/,
  'SWSEV2NpcSheet must override _buildNpcConceptSheetContext with a real implementation taking one options object'
);
assert.ok(
  !droidSheet.includes('buildNpcConceptSheetContext'),
  'SWSEV2DroidSheet must not import or reference buildNpcConceptSheetContext'
);
assert.ok(
  !characterSheet.includes('buildNpcConceptSheetContext'),
  'SWSEV2CharacterSheet must not import or reference buildNpcConceptSheetContext'
);
assert.ok(
  !vehicleSheet.includes('buildNpcConceptSheetContext'),
  'SWSEV2VehicleSheet must not import or reference buildNpcConceptSheetContext'
);

// ─── 5. Vehicle remains fully independent of the Character-like hook contract ───

assert.ok(
  !vehicleSheet.includes('_buildDroidSheetContext') && !vehicleSheet.includes('_buildNpcConceptSheetContext'),
  'SWSEV2VehicleSheet extends SWSEV2ActorSheetBase directly and must not reference either ' +
  'Character-like-only context hook'
);

console.log('phase6-subtype-context-ownership-contract.test.mjs: all assertions passed');
