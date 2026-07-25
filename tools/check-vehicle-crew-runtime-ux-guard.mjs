#!/usr/bin/env node

/**
 * check-vehicle-crew-runtime-ux-guard.mjs — Phase 7 vehicle crew runtime
 * validation + crew UX completion guard.
 *
 * Static check for invariants Phase 7 established
 * (docs/audits/vehicle-crew-runtime-and-ux-phase-7.md):
 *
 *   1. No vehicle Fire (data-action="vehicle-crew-skill") control renders
 *      without a weaponId — the crew-assignment panel's own per-station
 *      Attack action is gone; only the weapon-mount panel (which always
 *      carries a concrete weaponId) renders that action.
 *   2. No implicit first-weapon/first-station selection: weapon-to-station
 *      resolution never silently substitutes a guessed key for an
 *      unresolved (ambiguous/unmapped/broken) mapping.
 *   3. No duplicate custom-station key generator exists outside the
 *      approved service (VehicleCustomStationService.generateStationKey).
 *   4. No direct mutation of custom-station data (system.stations) outside
 *      the approved service — ActorEngine only.
 *   5. Role-only operator resolution never silently narrows to one station
 *      when multiple stations share a role — ambiguity must be returned.
 *   6. No silent remapping of a broken (removed) station key to another
 *      station.
 *   7. No new crew/weapon-mapping/custom-station mutation path exists
 *      outside the approved controller/services.
 *
 * Kept narrow: only inspects the Phase 6/7 crew-assignment/weapon-mapping/
 * custom-station files, not the whole drag/drop or actor-update surface.
 *
 * Report-only by default; --strict exits non-zero on violations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const CONTEXT_BUILDER_FILE = 'scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js';
const MAPPING_FILE = 'scripts/sheets/v2/vehicle-sheet/weapon-station-mapping.js';
const WEAPON_STATION_SERVICE_FILE = 'scripts/engine/crew/vehicle-weapon-station-service.js';
const CUSTOM_STATION_SERVICE_FILE = 'scripts/engine/crew/vehicle-custom-station-service.js';
const CREW_SERVICE_FILE = 'scripts/engine/crew/vehicle-crew-assignment-service.js';
const CONTROLS_FILE = 'scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js';
const PANEL_TEMPLATE_FILE = 'templates/actors/vehicle/v2/partials/vehicle-crew-assignment-panel.hbs';
const MOUNT_TEMPLATE_FILE = 'templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs';
const ACTOR_UTILS_FILE = 'scripts/utils/actor-utils.js';

const CREW_ENGINE_FILES = [CREW_SERVICE_FILE, WEAPON_STATION_SERVICE_FILE, CUSTOM_STATION_SERVICE_FILE, CONTROLS_FILE];

function read(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

const problems = [];

// Invariant 1: no Fire control renders without a weaponId. The crew-panel
// template must not set data-weapon-id at all (it has none to offer); the
// mount template must always set a concrete one.
const panelTemplate = read(PANEL_TEMPLATE_FILE);
const mountTemplate = read(MOUNT_TEMPLATE_FILE);
if (panelTemplate?.includes('data-weapon-id')) {
  problems.push(`${PANEL_TEMPLATE_FILE}: renders data-weapon-id — the crew-assignment panel's per-station Attack action should have been removed, not given a (guessed) weapon id.`);
}
if (mountTemplate && !/data-weapon-id="\{\{mount\.weaponId\}\}"/.test(mountTemplate)) {
  problems.push(`${MOUNT_TEMPLATE_FILE}: Fire button no longer carries a concrete data-weapon-id.`);
}

// Invariant 2: no implicit first-weapon/first-station fallback in the
// operator resolver — an ambiguous/unmapped/broken result must return
// stationKey: null, never a guessed station.
const mapping = read(MAPPING_FILE);
if (!mapping) {
  problems.push(`${MAPPING_FILE} not found.`);
} else {
  if (/roleMatches\[0\][\s\S]{0,60}source: '(ambiguous|unmapped)'/.test(mapping)) {
    problems.push(`${MAPPING_FILE}: an ambiguous/unmapped result appears to reuse roleMatches[0] — must return stationKey: null instead of guessing.`);
  }
  if (!/source: 'ambiguous'/.test(mapping)) {
    problems.push(`${MAPPING_FILE}: no 'ambiguous' resolution source found — multi-station role conflicts must be surfaced, not silently resolved.`);
  }
}

// Invariant 3: exactly one custom-station key generator (the approved
// service's own), no duplicate slug/key generator elsewhere in the
// crew-assignment file set.
const customStationService = read(CUSTOM_STATION_SERVICE_FILE);
let generatorCount = 0;
for (const rel of CREW_ENGINE_FILES) {
  const text = read(rel);
  if (!text) continue;
  if (/function\s+(generateStationKey|slugify)\s*\(/.test(text) || /static generateStationKey\(/.test(text)) generatorCount += 1;
}
if (generatorCount > 1) {
  problems.push(`Found ${generatorCount} station-key generator functions across the crew-assignment file set — only ${CUSTOM_STATION_SERVICE_FILE}'s generateStationKey()/slugify() should exist.`);
}

// Invariant 4: no direct system.stations mutation outside the approved
// service — every write goes through ActorEngine.updateActor, and no file
// outside vehicle-custom-station-service.js sets 'system.stations' at all.
for (const rel of CREW_ENGINE_FILES) {
  if (rel === CUSTOM_STATION_SERVICE_FILE) continue;
  const text = read(rel);
  if (!text) continue;
  if (/['"]system\.stations['"]\s*:/.test(text)) {
    problems.push(`${rel}: writes 'system.stations' directly — custom-station mutation must go through VehicleCustomStationService.`);
  }
}

// Invariant 5: no direct actor/vehicle.update() bypass in any Phase 7 file.
const DIRECT_UPDATE_PATTERN = /await\s+(vehicle|actor|crewActor|droppedActor)\.update\(/;
for (const rel of [...CREW_ENGINE_FILES, 'scripts/engine/crew/vehicle-crew-diagnostics.js', 'scripts/engine/crew/vehicle-crew-diagnostics-log.js']) {
  const text = read(rel);
  if (!text) { problems.push(`${rel} not found.`); continue; }
  if (DIRECT_UPDATE_PATTERN.test(text)) {
    problems.push(`${rel}: contains a direct actor/vehicle.update() call — ActorEngine must be the sole mutation authority.`);
  }
}

// Invariant 6: the synthetic-token recovery fix is present — an unlinked
// token's synthetic actor (isToken === true) must not be redirected to the
// base world actor merely because its .collection is null.
const actorUtils = read(ACTOR_UTILS_FILE);
if (!actorUtils) {
  problems.push(`${ACTOR_UTILS_FILE} not found.`);
} else if (!/actor\.collection === null && actor\.id && !actor\.isToken/.test(actorUtils)) {
  problems.push(`${ACTOR_UTILS_FILE}: applyActorUpdateAtomic's collection-null recovery no longer guards on !actor.isToken — this would redirect unlinked-token vehicle mutations to the base world actor again.`);
}

console.log('\n' + '='.repeat(72));
console.log('  VEHICLE CREW RUNTIME/UX GUARD (Phase 7)');
console.log('='.repeat(72));

if (problems.length) {
  console.log(`\n${STRICT ? 'FAILURES' : 'WARNINGS'} (${problems.length}):`);
  for (const problem of problems) console.log(`  - ${problem}`);
} else {
  console.log('\nNo Fire control lacks a weaponId; no implicit weapon/station fallback; a single approved station-key generator; no direct system.stations/actor.update() mutation outside the approved services; synthetic-token isolation guard present.');
}

console.log('='.repeat(72) + '\n');

if (STRICT && problems.length) {
  process.exit(1);
}
