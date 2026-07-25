import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 6 (vehicle crew assignment + drag-and-drop repair,
// docs/audits/vehicle-crew-assignment-phase-6.md). Same convention as
// Phases 1-5: the production files under test use absolute
// /systems/foundryvtt-swse/... imports that only resolve inside Foundry's
// module loader, so these are readFile + regex/assert.match source-text
// guards, not executed logic.
//
// Root cause traced this phase: _onRender() in character-sheet.js returns
// early for document.type === 'vehicle' BEFORE activateListeners() runs —
// so vehicles never reach the character-mode listener/drop wiring at all.
// That made the crew-assignment panel's buttons, station drop zones, and
// even the Phase 3 vehicle-crew-skill Fire button dead on arrival. This
// phase adds a controller bound from the listener path vehicles actually
// use (_wireVehicleActorModeEvents), unifies the station model so
// multi-gunner/custom stations are assignable, and hardens the assignment
// service's mutation/permission contract.

const sheet = await readFile(new URL('../scripts/sheets/v2/character-sheet.js', import.meta.url), 'utf8');
const controls = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js', import.meta.url), 'utf8');
const service = await readFile(new URL('../scripts/engine/crew/vehicle-crew-assignment-service.js', import.meta.url), 'utf8');
const dropEngine = await readFile(new URL('../scripts/engine/interactions/vehicle-drop-engine.js', import.meta.url), 'utf8');
const resolver = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/crew-resolver.js', import.meta.url), 'utf8');
const contextBuilder = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', import.meta.url), 'utf8');
const panelTemplate = await readFile(new URL('../templates/actors/vehicle/v2/partials/vehicle-crew-assignment-panel.hbs', import.meta.url), 'utf8');
const skillRouter = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/crew-skill-router.js', import.meta.url), 'utf8');

// --- Root cause: reachability ---------------------------------------------

// 1/34. The controller is bound exactly once, from the vehicle-actor-mode
// listener path — not from the (unreachable-for-vehicles) character-mode
// activateListeners()/_activateCombatUI() path, and the old dead
// vehicle-crew-skill binding that used to live there is gone (no duplicate
// listener across the two lifecycle paths).
assert.match(sheet, /import \{ bindVehicleCrewAssignmentControls \} from "\/systems\/foundryvtt-swse\/scripts\/sheets\/v2\/vehicle-sheet\/vehicle-crew-assignment-controls\.js"/);
const wireVehicleStart = sheet.indexOf('_wireVehicleActorModeEvents(root, signal) {');
const wireVehicleFn = sheet.slice(wireVehicleStart, wireVehicleStart + 1500);
assert.match(wireVehicleFn, /bindVehicleCrewAssignmentControls\(this, root, \{ signal \}\)/);
assert.equal((sheet.match(/bindVehicleCrewAssignmentControls\(/g) || []).length, 1, 'bindVehicleCrewAssignmentControls must be called exactly once');
assert.equal((sheet.match(/rollVehicleCrewSkill\(/g) || []).length, 0, 'the old vehicle-crew-skill binding (calling rollVehicleCrewSkill directly from character-sheet.js) must be removed, not duplicated');

// The vehicle branch of _onRender still returns early before
// activateListeners() — documenting that this is why the controller has to
// be bound from _wireVehicleActorModeEvents rather than the generic path.
const onRenderVehicleBranch = sheet.slice(sheet.indexOf("if (this.document?.type === 'vehicle') {"), sheet.indexOf('this.activateListeners(root, { signal });'));
assert.match(onRenderVehicleBranch, /this\._wireVehicleActorModeEvents\(root, signal\);/);
assert.match(onRenderVehicleBranch, /return;/);

// --- Button wiring (spec section 2) ----------------------------------------

// 1. Assign button invokes the picker.
assert.match(controls, /'\[data-action="vehicle-assign-crew"\]'/);
assert.match(controls, /VehicleCrewAssignmentService\.openCrewPicker\(vehicle, station\)/);

// 4. Open-sheet opens the assigned actor.
assert.match(controls, /'\[data-action="vehicle-open-crew"\]'/);
assert.match(controls, /VehicleCrewAssignmentService\.openCrewSheet\(vehicle, station\)/);

// Remove button.
assert.match(controls, /'\[data-action="vehicle-remove-crew"\]'/);
assert.match(controls, /VehicleCrewAssignmentService\.removeCrew\(vehicle, station, \{ source: 'vehicle-crew-remove-button' \}\)/);

// Buttons are disabled while pending and restored in `finally` (prevents
// double execution / duplicate dialogs on double-click).
assert.match(controls, /function withPendingButton\(button, handler\) \{/);
assert.match(controls, /if \(button\.disabled\) return;/);
assert.match(controls, /button\.disabled = true;/);
assert.match(controls, /\} finally \{\s*\n\s*button\.disabled = false;/);

// --- Station-level drag and drop (spec section 3) ---------------------------

// 6. dragover calls preventDefault (required for drop to fire at all).
assert.match(controls, /row\.addEventListener\('dragover', \(event\) => \{\s*\n\s*event\.preventDefault\(\);/);

// Hover state is applied on dragenter and cleared on drop/leave.
assert.match(controls, /row\.classList\.add\(HOVER_CLASS\)/);
assert.match(controls, /function clearHover\(row\) \{/);

// 7. A valid actor drop assigns to the EXACT targeted station — `station`
// comes from this row's own dataset, not a first-empty/pilot fallback.
assert.match(controls, /const station = row\.dataset\.crewStation;/);
assert.match(controls, /VehicleCrewAssignmentService\.assignCrew\(vehicle, station, crewActor, \{ source: 'vehicle-crew-drop' \}\)/);

// 8/9/10. Invalid drops (Item/unsupported document/vehicle/wrong actor type)
// are rejected with a reason, not silently assigned.
assert.match(controls, /const crewActor = await VehicleCrewAssignmentService\.resolveCrewActorFromDropData\(dropData\);/);
assert.match(controls, /if \(!crewActor\) \{\s*\n\s*ui\?\.notifications\?\.warn\?\.\(await VehicleCrewAssignmentService\.describeDropRejection\(dropData\)\);/);

// 11/12. Exactly one mutation per drop, and the station handler stops
// propagation so the generic sheet-level handler never double-processes
// the same drop.
assert.match(controls, /event\.stopPropagation\(\);\s*\n\s*event\.stopImmediatePropagation\?\.\(\);\s*\n\s*clearHover\(row\);/);
const stationDropBody = controls.slice(controls.indexOf("row.addEventListener('drop'"), controls.indexOf("function bindGenericVehicleDrop"));
assert.equal((stationDropBody.match(/VehicleCrewAssignmentService\.assignCrew\(/g) || []).length, 1);

// --- Generic (non-station) vehicle drop routing (spec section 4) -----------

// VehicleDropEngine gets its first live caller here (previously confirmed
// via repo-wide grep to have zero callers outside its own definition).
assert.match(controls, /import \{ VehicleDropEngine \} from "\/systems\/foundryvtt-swse\/scripts\/engine\/interactions\/vehicle-drop-engine\.js"/);
assert.match(controls, /VehicleDropEngine\.resolve\(\{ actor: vehicle, dropData, station: null \}\)/);
assert.match(controls, /ActorEngine\.apply\(vehicle, result\.mutationPlan, \{ source: 'vehicle-drop-engine' \}\)/);

// 12. Generic handler explicitly skips drops already claimed by a station
// row (guards against double-processing the same drop event).
assert.match(controls, /if \(event\.target\?\.closest\?\.\(STATION_ROW_SELECTOR\)\) return;/);

// An Actor dropped with no station target is rejected with instructions,
// never silently assigned to pilot/first-empty.
assert.match(dropEngine, /if \(!station\) \{/);
assert.match(dropEngine, /console\.debug\('Drop rejected: actor was not dropped on a specific crew station'\);/);
assert.match(controls, /Drop the crew member directly onto a station row to assign them\./);

// --- Station model unification (spec section 5) -----------------------------

// crew-resolver.js's sourceKey/key hyphenation bug (gunner-2 vs gunner2) is
// fixed — sourceKey is derived from key, not independently formatted.
assert.doesNotMatch(resolver, /gunner\$\{index \+ 1\}/);
assert.match(resolver, /const key = index === 0 \? "gunner" : `gunner-\$\{index \+ 1\}`;/);
assert.match(resolver, /sourceKey: key,/);

// Station descriptors carry storageKey (spec's suggested descriptor shape).
assert.match(resolver, /storageKey: station\.key,/);

// Custom stations (system.stations) are still supported.
assert.match(resolver, /function customStations\(system\) \{/);
assert.match(resolver, /array\(system\?\.stations\)/);

// The live panel builder uses THIS resolver instead of its own hard-coded
// six-station array — the actual fix for "multi-gunner and custom stations
// are unreliable."
assert.match(contextBuilder, /import \{ resolveVehicleCrewStations \} from "\/systems\/foundryvtt-swse\/scripts\/sheets\/v2\/vehicle-sheet\/crew-resolver\.js"/);
assert.doesNotMatch(contextBuilder, /const stationKeys = \['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'\];/);
assert.match(contextBuilder, /const resolved = resolveVehicleCrewStations\(\{ system, weapons: \{ count: weaponCount \} \}\);/);

// VehicleCrewAssignmentService validates against the SAME dynamic resolver
// rather than its own independent hard-coded station list — one
// authoritative station model, not three.
assert.match(service, /import \{ resolveVehicleCrewStations \} from "\/systems\/foundryvtt-swse\/scripts\/sheets\/v2\/vehicle-sheet\/crew-resolver\.js"/);
assert.match(service, /static resolveStations\(vehicle\) \{/);
assert.match(service, /return resolveVehicleCrewStations\(\{ system, weapons: \{ count: countCrewWeapons\(vehicle\) \} \}\);/);

// 16/17. An unrecognized station key resolves to null — never coerced to
// pilot, and never silently redirected to the first empty station.
assert.match(service, /static canonicalStationKey\(vehicle, value\) \{/);
const canonicalFn = service.slice(service.indexOf('static canonicalStationKey'), service.indexOf('static canBeCrew'));
assert.doesNotMatch(canonicalFn, /firstEmptyStation/);
assert.doesNotMatch(canonicalFn, /\|\| 'pilot'/);
assert.match(canonicalFn, /return null;/);
assert.doesNotMatch(service, /function firstEmptyStation/);
assert.doesNotMatch(service, /this\.firstEmptyStation/);

// --- Assignment data authority (spec section 6) -----------------------------

// Removing one station only ever touches that exact
// system.crewPositions.<station> path (gunner-2 removal cannot clear
// gunner, a custom station cannot clear pilot).
const buildRemovalFn = service.slice(service.indexOf('static buildRemovalUpdate'), service.indexOf('static async assignCrew'));
assert.match(buildRemovalFn, /\[`system\.crewPositions\.\$\{targetStation\}`\]: null,/);
assert.equal((buildRemovalFn.match(/system\.crewPositions\./g) || []).length, 1, 'buildRemovalUpdate must only ever write ONE crewPositions path');

// Reassignment / moving an actor between stations clears only the actor's
// PRIOR station(s) — it does not touch stations that actor does not occupy.
const buildAssignmentFn = service.slice(service.indexOf('static buildAssignmentUpdate'), service.indexOf('static buildAssignmentMutationPlan'));
assert.match(buildAssignmentFn, /if \(key !== targetStation && crewRefMatches\(current, crewActor\)\) update\[`system\.crewPositions\.\$\{key\}`\] = null;/);

// --- ActorEngine-only mutation (spec section 7) -----------------------------

// 25. No direct vehicle.update()/actor.update() fallback remains anywhere
// in the assignment service — ActorEngine is the sole mutation authority.
assert.doesNotMatch(service, /await vehicle\.update\(/);
assert.doesNotMatch(service, /await actor\.update\(/);
assert.match(service, /import \{ ActorEngine \} from "\/systems\/foundryvtt-swse\/scripts\/governance\/actor-engine\/actor-engine\.js"/);

// 24. assignCrew/removeCrew both go through ActorEngine.updateActor.
assert.match(service, /const mutationReceipt = await ActorEngine\.updateActor\(vehicle, update, \{\s*\n\s*source: options\.source \|\| 'vehicle-crew-assignment'/);
assert.match(service, /const mutationReceipt = await ActorEngine\.updateActor\(vehicle, update, \{\s*\n\s*source: options\.source \|\| 'vehicle-crew-removal'/);

// 26. structured { ok, station, crewActorUuid, mutationReceipt, warnings,
// error } result — not a bare boolean — and a caught ActorEngine failure
// still reports ok:false with the real error message (not a silent
// swallow, not a fallback write).
assert.match(service, /function structuredResult\(\{ ok, station = null, crewActorUuid = null, mutationReceipt = null, warnings = \[\], error = null \}\) \{/);
const assignCrewFn = service.slice(service.indexOf('static async assignCrew'), service.indexOf('static async removeCrew'));
assert.match(assignCrewFn, /\} catch \(err\) \{/);
assert.match(assignCrewFn, /return structuredResult\(\{ ok: false, station: targetStation, crewActorUuid: crewActor\.uuid \?\? null, error \}\);/);
assert.match(assignCrewFn, /return structuredResult\(\{ ok: true, station: targetStation, crewActorUuid: crewActor\.uuid \?\? null, mutationReceipt \}\);/);

// --- Permissions (spec section 8) -------------------------------------------

// 22/23. Only vehicle owners can assign/remove crew.
assert.match(service, /static canEdit\(vehicle\) \{\s*\n\s*return vehicle\?\.isOwner === true;/);
assert.match(assignCrewFn, /if \(!this\.canEdit\(vehicle\)\) \{/);
const removeCrewFn = service.slice(service.indexOf('static async removeCrew'), service.indexOf('static async openCrewPicker'));
assert.match(removeCrewFn, /if \(!this\.canEdit\(vehicle\)\) \{/);

// Compendium actors are rejected (never silently cloned into the world).
assert.match(service, /function isCompendiumActor\(actor\) \{/);
assert.match(assignCrewFn, /if \(isCompendiumActor\(crewActor\)\) \{/);

// Non-editable stations render without mutation controls, and without an
// interactive drop target (the panel builder computes `editable` from
// actor.isOwner and the template gates on it).
assert.match(contextBuilder, /const editable = actor\?\.isOwner === true;/);
assert.match(contextBuilder, /dropzone: editable,/);
assert.match(panelTemplate, /\{\{#if station\.dropzone\}\}data-drop-zone="crew-station"\{\{\/if\}\}/);
assert.match(panelTemplate, /\{\{#if station\.editable\}\}/);

// --- Picker reliability (spec section 9) ------------------------------------

// A cancelled picker (chosenUuid falsy) performs no mutation.
const pickerFn = service.slice(service.indexOf('static async openCrewPicker'), service.indexOf('static async openCrewSheet'));
assert.match(pickerFn, /if \(!chosenUuid\) return null;/);
const cancelIndex = pickerFn.indexOf('if (!chosenUuid) return null;');
const assignCallIndex = pickerFn.indexOf('this.assignCrew(');
assert.ok(cancelIndex >= 0 && cancelIndex < assignCallIndex, 'cancel check must precede the assignCrew call');

// --- Removal / reassignment (spec section 10) -------------------------------

// Opening a stale/broken reference reports it clearly rather than throwing
// or silently doing nothing.
const openSheetFn = service.slice(service.indexOf('static async openCrewSheet'), service.indexOf('static labelForStation'));
assert.match(openSheetFn, /no longer exists\. Remove this station assignment and reassign\./);

// --- Attack integration (spec section 11) -----------------------------------

// Attack routing reads crewPositions[stationKey] directly — the exact same
// field/keying the assignment service writes to (canonicalStationKey's
// resolved `targetStation` IS the crewPositions key). No second,
// independent crew-lookup implementation for attack routing.
assert.match(skillRouter, /const positions = system\.crewPositions \?\? \{\};/);
assert.match(skillRouter, /const entry = positions\?\.\[stationKey\];/);

// --- Static station-list duplication check ----------------------------------

// The only remaining hard-coded 6-key list is VehicleCrewAssignmentService's
// documented legacy-diagnostics getter (stationKeys) — resolveStations()
// still defers to the dynamic resolver for anything that actually gates
// assignment.
assert.match(service, /return \['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'\];/);
assert.equal((service.match(/\['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'\]/g) || []).length, 1);

console.log('Phase 6 vehicle crew assignment + drag-and-drop guards passed.');
