import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 7 (vehicle crew runtime validation + crew UX
// completion, docs/audits/vehicle-crew-runtime-and-ux-phase-7.md). Same
// convention as Phases 1-6: the production files under test use absolute
// /systems/foundryvtt-swse/... imports and Foundry globals (game, ui,
// fromUuid, foundry.utils) that only resolve inside Foundry's module
// loader, so these are readFile + regex/assert.match source-text guards,
// not executed logic.
//
// No Foundry VTT v13 instance was available in this environment — the
// runtime matrix in the Phase 7 audit is entirely pending. These guards
// verify the code-level fixes/additions this phase made: the redundant
// crew-panel Attack action, deterministic weapon-to-station mapping, the
// custom-station editor, the synthetic-token base-actor mutation fix, and
// the read-only diagnostics command.

const contextBuilder = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', import.meta.url), 'utf8');
const mapping = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/weapon-station-mapping.js', import.meta.url), 'utf8');
const weaponStationService = await readFile(new URL('../scripts/engine/crew/vehicle-weapon-station-service.js', import.meta.url), 'utf8');
const customStationService = await readFile(new URL('../scripts/engine/crew/vehicle-custom-station-service.js', import.meta.url), 'utf8');
const controls = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js', import.meta.url), 'utf8');
const actorUtils = await readFile(new URL('../scripts/utils/actor-utils.js', import.meta.url), 'utf8');
const diagnostics = await readFile(new URL('../scripts/engine/crew/vehicle-crew-diagnostics.js', import.meta.url), 'utf8');
const diagnosticsLog = await readFile(new URL('../scripts/engine/crew/vehicle-crew-diagnostics-log.js', import.meta.url), 'utf8');
const crewResolver = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/crew-resolver.js', import.meta.url), 'utf8');
const panelTemplate = await readFile(new URL('../templates/actors/vehicle/v2/partials/vehicle-crew-assignment-panel.hbs', import.meta.url), 'utf8');
const mountTemplate = await readFile(new URL('../templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs', import.meta.url), 'utf8');
const editorTemplate = await readFile(new URL('../templates/actors/vehicle/v2/partials/vehicle-custom-station-editor-panel.hbs', import.meta.url), 'utf8');
const characterSheet = await readFile(new URL('../scripts/sheets/v2/character-sheet.js', import.meta.url), 'utf8');

// --- 1-4: Redundant crew-panel Attack action resolved -----------------------

// 1. Crew-panel Attack action is removed (filtered out), not merely hidden
// with a broken weaponId.
assert.match(contextBuilder, /getStationSkillActions\(station\.role\)\s*\n\s*\.filter\(\(action\) => action\.key !== 'attack'\)/);
assert.doesNotMatch(panelTemplate, /data-weapon-id/);

// 2. Every weapon-mount Fire action includes weapon identity.
assert.match(mountTemplate, /data-weapon-id="\{\{mount\.weaponId\}\}"/);

// 3/4. Missing/unresolved weaponId prevents an attack: a mount only gets a
// Fire action when operator resolution actually succeeded — no implicit
// first-weapon or first-station fallback.
assert.match(contextBuilder, /mount\.actions = \(mount\.operatorResolved && mount\.fireAction\)/);
assert.match(contextBuilder, /: \[\];/);

// --- 5-24: Weapon-to-station operator mapping -------------------------------

// Deterministic precedence: explicit > legacy > role-unique > ambiguous/unmapped/broken.
// 16/19. Explicit mapping wins over role fallback.
assert.match(mapping, /if \(explicitStationKey\) \{/);
const explicitBranch = mapping.slice(mapping.indexOf('if (explicitStationKey)'), mapping.indexOf('if (legacyStationKey)'));
assert.match(explicitBranch, /return \{ stationKey: match\.storageKey, source: 'explicit' \};/);

// 17/18. gunner and gunner-2 remain independent; ambiguous role-only
// mapping (2+ stations share a role, no explicit key) fails clearly rather
// than guessing.
const roleBranch = mapping.slice(mapping.indexOf('const roleMatches'));
assert.match(roleBranch, /if \(roleMatches\.length === 1\) return \{ stationKey: roleMatches\[0\]\.storageKey, source: 'role-unique' \};/);
// The ambiguous case returns null + a candidates list, never a guessed pick
// (e.g. roleMatches[0]) from the 2+ matches.
const ambiguousReturn = roleBranch.slice(roleBranch.indexOf("source: 'ambiguous'") - 40);
assert.match(ambiguousReturn, /stationKey: null,/);
assert.match(ambiguousReturn, /candidates: roleMatches\.map\(\(station\) => station\.storageKey\)/);

// 20. Pilot-operated mapping remains correct: role-unique resolution works
// identically regardless of role name (pilot has exactly one station
// under normal conditions, same code path as gunner).
assert.match(mapping, /role = 'gunner'/);

// 21/22. A removed/renamed station produces a 'broken' mapping result —
// never a silent fallback to another station.
assert.match(mapping, /source: 'broken'/);
assert.doesNotMatch(mapping, /source: 'broken'[\s\S]{0,80}roleMatches/);

// 23. Mapping repair (setOperatorStation) immediately updates the stored
// mapping that resolveOperatorStation reads.
assert.match(weaponStationService, /static resolveOperatorStation\(vehicle, mount\) \{/);
assert.match(weaponStationService, /static async setOperatorStation\(vehicle, mount, stationKey\) \{/);

// 24. Non-owner cannot edit weapon mapping.
assert.match(weaponStationService, /static canEdit\(vehicle\) \{\s*\n\s*return vehicle\?\.isOwner === true;/);
const setOperatorFn = weaponStationService.slice(weaponStationService.indexOf('static async setOperatorStation'));
assert.match(setOperatorFn, /if \(!this\.canEdit\(vehicle\)\) \{/);

// 40. ActorEngine only — no direct actor/vehicle/item.update() bypass.
assert.doesNotMatch(weaponStationService, /await vehicle\.update\(/);
assert.doesNotMatch(weaponStationService, /await actor\.update\(/);
assert.match(weaponStationService, /ActorEngine\.updateOwnedItems\(vehicle,/);
assert.match(weaponStationService, /ActorEngine\.updateActor\(vehicle,/);

// Editable-gated UI: station-select control only rendered for editable
// owners; non-editable users get a read-only chip, not the control.
assert.match(mountTemplate, /\{\{#if mount\.editable\}\}/);
assert.match(mountTemplate, /data-action="vehicle-weapon-station-select"/);
assert.match(controls, /'\[data-action="vehicle-weapon-station-select"\]'/);
assert.match(controls, /VehicleWeaponStationService\.setOperatorStation\(vehicle, mount, stationKey\)/);

// Ambiguous/broken/unmapped mounts render a warning, not a silent Fire button.
assert.match(mountTemplate, /mount\.operatorAmbiguous/);
assert.match(mountTemplate, /mount\.operatorBroken/);
assert.match(mountTemplate, /mount\.operatorUnmapped/);

// --- 5-15: Custom station management ----------------------------------------

// 5. Custom station can be created.
assert.match(customStationService, /static async createCustomStation\(vehicle, \{ label, role = 'custom', description = '' \} = \{\}\) \{/);

// 6. Station key is generated once at creation and never re-derived from
// the label afterward — renameCustomStation only ever patches `label`.
assert.match(customStationService, /static generateStationKey\(vehicle, label\)/);
const renameFn = customStationService.slice(customStationService.indexOf('static async renameCustomStation'), customStationService.indexOf('static async setCustomStationRole'));
assert.doesNotMatch(renameFn, /generateStationKey/);
assert.match(renameFn, /return \{ \.\.\.record, label: trimmedLabel \};/);

// 7. Reserved keys (base roles + current dynamic gunner/custom keys) are
// rejected — generateStationKey only ever returns a key NOT in reservedKeys().
assert.match(customStationService, /static reservedKeys\(vehicle\) \{/);
assert.match(customStationService, /if \(!reserved\.has\(base\)\) return base;/);

// 8. Duplicate keys are rejected: generateStationKey appends -2/-3/... until
// the candidate is not already reserved (which includes existing custom
// station keys, since reservedKeys() reads the full resolved station set).
assert.match(customStationService, /let candidate = `\$\{base\}-\$\{n\}`;\s*\n\s*while \(reserved\.has\(candidate\)\) \{/);

// 9. Custom station order persists: reorderCustomStations rewrites each
// record's `order` field from the caller-supplied id sequence.
assert.match(customStationService, /static async reorderCustomStations\(vehicle, orderedIds\)/);
assert.match(customStationService, /const next = orderedIds\.map\(\(id, order\) => \(\{ \.\.\.byId\.get\(id\), order \}\)\);/);

// 10/11/12. Occupied removal requires explicit confirmation; confirmed
// removal clears crew mirrors atomically; cancelled removal changes nothing.
const removeFn = customStationService.slice(customStationService.indexOf('static async removeCustomStation'));
assert.match(removeFn, /if \(occupied && !unassignCrew\) \{\s*\n\s*return structuredResult\(\{ ok: false, requiresConfirmation: true, occupied: true, station: record \}\);/);
assert.match(removeFn, /const removal = VehicleCrewAssignmentService\.buildRemovalUpdate\(vehicle, key\);/);
assert.match(controls, /const confirmed = await confirmRemoveOccupiedStation\(result\.station\?\.label\);/);
assert.match(controls, /if \(confirmed\) \{\s*\n\s*await VehicleCustomStationService\.removeCustomStation\(vehicle, stationId, \{ unassignCrew: true \}\);/);

// 13/14. Custom station create/removal (and every other CRUD op) uses
// ActorEngine — no direct vehicle.update().
assert.doesNotMatch(customStationService, /await vehicle\.update\(/);
assert.match(customStationService, /import \{ ActorEngine \} from/);
// create, _patchStation (shared by rename/role/description), reorder, remove.
assert.equal((customStationService.match(/await ActorEngine\.updateActor\(/g) || []).length >= 4, true, 'every custom-station mutation should go through ActorEngine.updateActor');

// 15. No direct vehicle.update() introduced anywhere in this phase's new files.
for (const [name, source] of [
  ['vehicle-weapon-station-service.js', weaponStationService],
  ['vehicle-custom-station-service.js', customStationService],
  ['vehicle-crew-assignment-controls.js', controls],
  ['vehicle-crew-diagnostics.js', diagnostics]
]) {
  assert.doesNotMatch(source, /await vehicle\.update\(/, `${name} must not call vehicle.update() directly`);
}

// New stations survive rerender/reload/token reopen by construction: they
// are read directly from system.stations via crew-resolver.js on every
// context rebuild — no separate cache.
assert.match(crewResolver, /array\(system\?\.stations\)/);

// Reserved-key / duplicate-key UI: the add-station form and rename input
// route through the service's own validation (no separate, weaker
// client-side check that could diverge from it).
assert.match(editorTemplate, /data-action="vehicle-custom-station-add-form"/);
assert.match(controls, /VehicleCustomStationService\.createCustomStation\(vehicle, \{ label, role \}\)/);

// --- Permissions (spec section 8) -------------------------------------------

// Non-editable users get a read-only custom-station panel (not rendered at
// all) — hidden controls are never bound in the first place, and the
// service itself still checks canEdit() as a second line of defense.
assert.match(contextBuilder, /export function buildVehicleCustomStationEditorPanel\(actor\) \{/);
const editorPanelFn = contextBuilder.slice(contextBuilder.indexOf('export function buildVehicleCustomStationEditorPanel'));
assert.match(editorPanelFn, /const editable = actor\?\.isOwner === true;/);

// --- Synthetic token persistence (spec section 9) ---------------------------

// 25. A "recover from world" heuristic that treated EVERY collection-null
// actor as corrupted used to redirect ANY unlinked-token vehicle mutation
// to the base world actor. The fix: skip recovery for legitimate synthetic
// token actors (actor.isToken === true) — they call actor.update() on
// themselves, which Foundry correctly scopes to the token's actor delta.
assert.match(actorUtils, /if \(actor\.collection === null && actor\.id && !actor\.isToken\) \{/);

console.log('Phase 7 vehicle crew runtime/UX guards passed.');
