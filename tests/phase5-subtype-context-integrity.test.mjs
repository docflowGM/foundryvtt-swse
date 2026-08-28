import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 5G/5M — subtype context/import-boundary integrity, re-verified after
// Phase 5A/5B's action-routing fixes. Extends (does not replace) the Phase 4
// import-boundary contract in tests/phase4-sheet-architecture-contract.test.mjs
// by re-checking the same boundary specifically against every import this
// phase added, plus a light content-shape check per actor type using the
// same source-contract approach (Foundry's ApplicationV2 cannot be
// constructed under this Node harness).

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), 'utf8');

const [characterLike, npcSheet, droidSheet, vehicleSheet, npcHeaderDossier] = await Promise.all([
  read('scripts/sheets/v2/character-like-sheet.js'),
  read('scripts/sheets/v2/npc-actor-sheet.js'),
  read('scripts/sheets/v2/droid-actor-sheet.js'),
  read('scripts/sheets/v2/vehicle-actor-sheet.js'),
  read('templates/actors/npc/v2/partials/npc-header-dossier.hbs')
]);

// ─── Vehicle: no Character/NPC/Droid-progression imports ───────────────────
// (Phase 5A added SWSERoll to vehicle-actor-sheet.js for the shared Ability
// Matrix panel — SWSERoll is a combat-roll utility, not a Character/NPC/
// Droid-only subsystem, so this must NOT regress the Phase 4 boundary.)
for (const forbidden of ['npc-profile-builder', 'npc-sheet-helpers', 'droid-part-schema', 'progression-framework', 'force-alchemy']) {
  assert.doesNotMatch(vehicleSheet, new RegExp(forbidden), `vehicle-actor-sheet.js must not import Character/NPC/Droid-only subsystem "${forbidden}"`);
}
assert.match(vehicleSheet, /import\s*\{\s*SWSERoll\s*\}\s*from/, 'vehicle-actor-sheet.js should import SWSERoll for its Phase 5A ability-roll fix');

// ─── NPC: new Phase 5A imports stay NPC-scoped, no Vehicle/Droid leakage ───
for (const forbidden of ['vehicle-context-builder', 'vehicle-rules-adapter', 'droid-part-schema', 'StarshipManeuversEngine']) {
  assert.doesNotMatch(npcSheet, new RegExp(forbidden), `npc-actor-sheet.js must not import Vehicle/Droid-only subsystem "${forbidden}"`);
}
assert.match(npcSheet, /launchFollowerProgression/, 'npc-actor-sheet.js should wire the Phase 5A open-follower-advancement fix');
assert.match(npcSheet, /NpcProgressionEngine/, 'npc-actor-sheet.js should wire the Phase 5A revert-npc-progression fix');

// ─── Character-like (Character/NPC/Droid shared): no Vehicle-only imports ──
for (const forbidden of ['vehicle-context-builder', 'vehicle-rules-adapter', 'vehicle-crew-assignment-controls', 'StarshipManeuversEngine', 'SubsystemEngine']) {
  assert.doesNotMatch(characterLike, new RegExp(forbidden), `character-like-sheet.js must not import Vehicle-only subsystem "${forbidden}"`);
}
// Phase 5A additions should all be real, already-verified-live engines.
for (const expected of ['ForceRegimenExecutor', 'MetaResourceFeatResolver', 'showHolopadRollCompanion', 'getForceAlchemySuggestedRiteForItem', 'RecurringDamageEngine']) {
  assert.match(characterLike, new RegExp(expected), `character-like-sheet.js should import ${expected} for its Phase 5A action-integrity fixes`);
}

// ─── Droid: unchanged import boundary (Phase 5A made no droid-actor-sheet.js
// edits), still no Vehicle-only imports. ───────────────────────────────────
for (const forbidden of ['vehicle-context-builder', 'vehicle-rules-adapter', 'StarshipManeuversEngine']) {
  assert.doesNotMatch(droidSheet, new RegExp(forbidden), `droid-actor-sheet.js must not import Vehicle-only subsystem "${forbidden}"`);
}

// ─── NPC combat-critical header content (5C) ───────────────────────────────
// The always-visible dossier header must expose HP, Condition, Initiative,
// and (Phase 5C addition) Speed without gating them behind a tab click.
for (const marker of ['npcConcept.hpCurrent', 'npcConcept.conditionCurrent', 'npcConcept.initiative', 'npcConcept.speed']) {
  assert.match(npcHeaderDossier, new RegExp(marker.replace('.', '\\.')), `npc-header-dossier.hbs should surface ${marker} in the always-visible combat strip`);
}
// Authority mode badge (Progression/Statblock/Follower) must be present but
// GM-facing rather than raw internal jargon — checked by presence of the
// mode badge hook, not by asserting exact wording (that's context-builder's
// job, already covered by npc-concept-layout-skip.test.mjs and friends).
assert.match(npcHeaderDossier, /npcConcept\.modeLabel/, 'npc-header-dossier.hbs should surface the NPC authority/mode label');
