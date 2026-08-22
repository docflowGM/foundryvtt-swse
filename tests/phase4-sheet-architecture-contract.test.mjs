import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 4 — V2 actor sheet architecture separation. character-sheet.js and
// its siblings cannot be imported under this repo's Node/Foundry-shim test
// harness (ApplicationV2 + heavy Foundry globals), so — following the
// established pattern for this file family (see
// tests/dsp-engine-consolidation.test.mjs, tests/npc-concept-layout-skip.test.mjs)
// — this locks in the split's structural guarantees as source-text contracts.
//
// What this file proves, per actor type:
//   1. Registration — each of character/npc/droid/vehicle registers its own
//      dedicated controller class in index.js, all makeDefault: true.
//   2. Inheritance — the intended 2-tier hierarchy (SWSEV2ActorSheetBase at
//      the top; SWSEV2CharacterLikeSheet shared by Character/NPC/Droid;
//      SWSEV2VehicleSheet separate) is exactly what the source declares.
//   3. Template contract — only the base class declares DEFAULT_OPTIONS/PARTS,
//      so every subtype still renders the same root template it did before
//      the split (an architecture split must not silently change which
//      template an actor type renders).
//   4. Import-boundary contract — Vehicle's file never statically imports
//      Character/NPC/Droid-only subsystems (progression, talents, lightsaber,
//      NPC statblock helpers, droid part schema) and vice versa, matching the
//      Phase 4A reachability audit's classification.
//   5. No shared-listener duplication — the ~130-listener chain
//      (activateListeners/_activateListenersInternal) exists exactly once,
//      on SWSEV2CharacterLikeSheet, not copied into SWSEV2NpcSheet/
//      SWSEV2DroidSheet/SWSEV2CharacterSheet.

const indexJs = await readFile(new URL('../index.js', import.meta.url), 'utf8');
const actorSheetBase = await readFile(new URL('../scripts/sheets/v2/actor-sheet-base.js', import.meta.url), 'utf8');
const characterLikeSheet = await readFile(new URL('../scripts/sheets/v2/character-like-sheet.js', import.meta.url), 'utf8');
const characterSheet = await readFile(new URL('../scripts/sheets/v2/character-sheet.js', import.meta.url), 'utf8');
const npcSheet = await readFile(new URL('../scripts/sheets/v2/npc-actor-sheet.js', import.meta.url), 'utf8');
const droidSheet = await readFile(new URL('../scripts/sheets/v2/droid-actor-sheet.js', import.meta.url), 'utf8');
const vehicleSheet = await readFile(new URL('../scripts/sheets/v2/vehicle-actor-sheet.js', import.meta.url), 'utf8');

// ─── 1. Registration contract ──────────────────────────────────────────────

const registrationCases = [
  { type: 'character', className: 'SWSEV2CharacterSheet' },
  { type: 'npc', className: 'SWSEV2NpcSheet' },
  { type: 'droid', className: 'SWSEV2DroidSheet' },
  { type: 'vehicle', className: 'SWSEV2VehicleSheet' }
];

for (const { type, className } of registrationCases) {
  const importRe = new RegExp(`import\\s*\\{\\s*${className}\\s*\\}\\s*from`);
  assert.match(indexJs, importRe, `index.js must import ${className}`);

  const registerRe = new RegExp(
    `Actors\\.registerSheet\\("swse",\\s*${className},\\s*\\{[^}]*types:\\s*\\[\\s*"${type}"\\s*\\][^}]*makeDefault:\\s*true`,
    's'
  );
  assert.match(
    indexJs,
    registerRe,
    `index.js must register ${className} as the makeDefault sheet for actor type "${type}"`
  );
}

// Exactly one registerSheet call per actor type keeps each type on a single
// dedicated controller (no accidental double-registration of two classes for
// the same type, which would make the winner order-dependent).
for (const { type } of registrationCases) {
  const perTypeRe = new RegExp(`types:\\s*\\[\\s*"${type}"\\s*\\]`, 'g');
  const matches = indexJs.match(perTypeRe) ?? [];
  assert.equal(
    matches.length,
    1,
    `index.js must register exactly one sheet class for actor type "${type}" (found ${matches.length})`
  );
}

console.log('  [1/5] registration contract OK');

// ─── 2. Inheritance contract ────────────────────────────────────────────────

assert.match(
  characterLikeSheet,
  /export class SWSEV2CharacterLikeSheet extends SWSEV2ActorSheetBase\s*\{/,
  'SWSEV2CharacterLikeSheet must extend SWSEV2ActorSheetBase'
);
assert.match(
  characterSheet,
  /export class SWSEV2CharacterSheet extends SWSEV2CharacterLikeSheet\s*\{/,
  'SWSEV2CharacterSheet must extend SWSEV2CharacterLikeSheet'
);
assert.match(
  npcSheet,
  /export class SWSEV2NpcSheet extends SWSEV2CharacterLikeSheet\s*\{/,
  'SWSEV2NpcSheet must extend SWSEV2CharacterLikeSheet'
);
assert.match(
  droidSheet,
  /export class SWSEV2DroidSheet extends SWSEV2CharacterLikeSheet\s*\{/,
  'SWSEV2DroidSheet must extend SWSEV2CharacterLikeSheet'
);
assert.match(
  vehicleSheet,
  /export class SWSEV2VehicleSheet extends SWSEV2ActorSheetBase\s*\{/,
  'SWSEV2VehicleSheet must extend SWSEV2ActorSheetBase directly (not via SWSEV2CharacterLikeSheet)'
);

console.log('  [2/5] inheritance contract OK');

// ─── 3. Template/PARTS contract ────────────────────────────────────────────

// Only SWSEV2ActorSheetBase may declare DEFAULT_OPTIONS/PARTS. If any
// subclass introduced its own, subtypes could silently diverge onto
// different root templates without anyone noticing during the split.
assert.match(
  actorSheetBase,
  /static DEFAULT_OPTIONS = \{/,
  'SWSEV2ActorSheetBase must declare DEFAULT_OPTIONS'
);
assert.match(
  actorSheetBase,
  /static PARTS = \{[\s\S]*?template:\s*"systems\/foundryvtt-swse\/templates\/actors\/character\/v2-concept\/character-sheet\.hbs"/,
  'SWSEV2ActorSheetBase must declare the shared root template'
);

for (const [name, source] of [
  ['SWSEV2CharacterLikeSheet', characterLikeSheet],
  ['SWSEV2CharacterSheet', characterSheet],
  ['SWSEV2NpcSheet', npcSheet],
  ['SWSEV2DroidSheet', droidSheet],
  ['SWSEV2VehicleSheet', vehicleSheet]
]) {
  assert.doesNotMatch(
    source,
    /static\s+(DEFAULT_OPTIONS|PARTS)\s*=/,
    `${name} must not redeclare DEFAULT_OPTIONS/PARTS — every actor type must keep inheriting ` +
    `the same root template from SWSEV2ActorSheetBase it rendered before the Phase 4 split`
  );
}

console.log('  [3/5] template/PARTS contract OK');

// ─── 4. Import-boundary contract ───────────────────────────────────────────

// Vehicle must not statically import Character/NPC/Droid-only subsystems it
// has no reachable use for (Phase 4A audit: Vehicle's context/event code is
// fully self-contained and never calls into these).
const vehicleForbiddenImports = [
  'lightsaber-construction-engine',
  'droid-part-schema',
  'npc-sheet-helpers',
  'npc-profile-builder',
  'DroidSheetContextBuilder',
  'progression-framework',
  'feat-choice-dialog',
  'talent-registry'
];
for (const forbidden of vehicleForbiddenImports) {
  assert.ok(
    !vehicleSheet.includes(forbidden),
    `SWSEV2VehicleSheet must not import "${forbidden}" — that subsystem belongs to Character/NPC/Droid only`
  );
}

// NPC/Droid controller files must only carry their own proven-exclusive
// imports, not each other's or Vehicle's.
const npcForbiddenImports = [
  'droid-part-schema',
  'DroidSheetContextBuilder',
  'vehicle-context-builder',
  'vehicle-rules-adapter',
  'StarshipManeuversEngine'
];
for (const forbidden of npcForbiddenImports) {
  assert.ok(
    !npcSheet.includes(forbidden),
    `SWSEV2NpcSheet must not import "${forbidden}" — that subsystem belongs to Droid/Vehicle only`
  );
}

const droidForbiddenImports = [
  'npc-sheet-helpers',
  'npc-profile-builder',
  'vehicle-context-builder',
  'vehicle-rules-adapter',
  'StarshipManeuversEngine'
];
for (const forbidden of droidForbiddenImports) {
  assert.ok(
    !droidSheet.includes(forbidden),
    `SWSEV2DroidSheet must not import "${forbidden}" — that subsystem belongs to NPC/Vehicle only`
  );
}

// The Character controller is intentionally near-empty — it must not
// accumulate its own imports (that would mean Character-exclusive behavior
// was found and should live in a real override, which as of this pass it is
// not) and must delegate entirely to SWSEV2CharacterLikeSheet.
const characterSheetImports = characterSheet.match(/^import .+$/gm) ?? [];
assert.equal(
  characterSheetImports.length,
  1,
  `SWSEV2CharacterSheet should have exactly one import (SWSEV2CharacterLikeSheet) while it remains an ` +
  `empty subclass; found ${characterSheetImports.length} — if Character-exclusive behavior was added, ` +
  `update this test deliberately rather than let it silently regrow into a second god-class`
);

console.log('  [4/5] import-boundary contract OK');

// ─── 5. No shared-listener duplication ─────────────────────────────────────

// The ~130-listener chain must exist exactly once, on SWSEV2CharacterLikeSheet.
// If a future change copies activateListeners/_activateListenersInternal
// into SWSEV2NpcSheet or SWSEV2DroidSheet "for symmetry", this must fail —
// that's precisely the duplication the approved Phase 4 architecture rejects.
assert.match(
  characterLikeSheet,
  /_activateListenersInternal\s*\(/,
  'SWSEV2CharacterLikeSheet must own _activateListenersInternal'
);
for (const [name, source] of [
  ['SWSEV2NpcSheet', npcSheet],
  ['SWSEV2DroidSheet', droidSheet],
  ['SWSEV2CharacterSheet', characterSheet],
  ['SWSEV2VehicleSheet', vehicleSheet]
]) {
  assert.ok(
    !source.includes('_activateListenersInternal'),
    `${name} must not define its own _activateListenersInternal — the shared listener chain ` +
    `must not be duplicated per actor type`
  );
}

// NPC/Droid-exclusive methods must exist exactly once each, on their own
// dedicated controller — not copied onto the shared base or onto each other.
const npcOnlyMethods = [
  '_wireNpcConceptSheetEvents',
  '_wireNpcConceptFieldPersistence',
  '_updateNpcConceptStatblockAuthority',
  '_rollNpcSheetFlatFormula'
];
for (const method of npcOnlyMethods) {
  assert.match(npcSheet, new RegExp(`${method}\\s*\\(`), `SWSEV2NpcSheet must define ${method}`);
  for (const [name, source] of [
    ['SWSEV2CharacterLikeSheet', characterLikeSheet],
    ['SWSEV2DroidSheet', droidSheet],
    ['SWSEV2VehicleSheet', vehicleSheet]
  ]) {
    assert.ok(!source.includes(`${method}(`) || name === 'SWSEV2CharacterLikeSheet' && source.includes(`this.${method}(`),
      `${name} must not define ${method} itself (a bare call site like this.${method}(...) is fine on the shared base)`);
  }
}

const droidOnlyMethods = [
  '_useDroidPartFromButton',
  '_inspectDroidConversion',
  '_reconcileDroidSystems',
  '_rollbackDroidReconciliation'
];
for (const method of droidOnlyMethods) {
  assert.match(droidSheet, new RegExp(`${method}\\s*\\(`), `SWSEV2DroidSheet must define ${method}`);
}

console.log('  [5/5] no shared-listener-duplication contract OK');

console.log('phase4-sheet-architecture-contract.test.mjs: all assertions passed');
