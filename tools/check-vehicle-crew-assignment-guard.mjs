#!/usr/bin/env node

/**
 * check-vehicle-crew-assignment-guard.mjs — Phase 6 vehicle crew
 * assignment + drag-and-drop guard.
 *
 * Static check for invariants Phase 6 established
 * (docs/audits/vehicle-crew-assignment-phase-6.md):
 *
 *   1. Every vehicle-assign-crew/vehicle-open-crew/vehicle-remove-crew
 *      data-action rendered by the vehicle templates has a live handler
 *      binding it (vehicle-crew-assignment-controls.js).
 *   2. Every crew-station drop zone (data-drop-zone="crew-station") has a
 *      live drop binder — not just the template attribute.
 *   3. No direct actor.update()/vehicle.update() call exists inside the
 *      crew-assignment engine files — ActorEngine is the sole mutation
 *      authority.
 *   4. No second, independently hard-coded 6-station array exists outside
 *      VehicleCrewAssignmentService's documented legacy-diagnostics getter
 *      — the live panel builder and the assignment service both defer to
 *      crew-resolver.js's dynamic resolver.
 *   5. Station-key resolution never falls back to 'pilot' or a
 *      first-empty-station default for an unrecognized key.
 *   6. The attack-operator lookup (crew-skill-router.js) reads the same
 *      system.crewPositions field the assignment service writes — not a
 *      second, independent crew-lookup implementation.
 *
 * Kept narrow: this guard only inspects the crew-assignment-specific files
 * below, not the whole drag/drop or actor-update surface.
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

const SERVICE_FILE = 'scripts/engine/crew/vehicle-crew-assignment-service.js';
const DROP_ENGINE_FILE = 'scripts/engine/interactions/vehicle-drop-engine.js';
const CONTROLS_FILE = 'scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js';
const RESOLVER_FILE = 'scripts/sheets/v2/vehicle-sheet/crew-resolver.js';
const CONTEXT_BUILDER_FILE = 'scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js';
const CREW_ROUTER_FILE = 'scripts/sheets/v2/vehicle-sheet/crew-skill-router.js';
const PANEL_TEMPLATE_FILE = 'templates/actors/vehicle/v2/partials/vehicle-crew-assignment-panel.hbs';
const MOUNT_TEMPLATE_FILE = 'templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs';

const CREW_ENGINE_FILES = [SERVICE_FILE, DROP_ENGINE_FILE, CONTROLS_FILE];

function read(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

const problems = [];

// Invariant 1: every crew-action data-action in the templates has a live
// handler in the controls module.
const panelTemplate = read(PANEL_TEMPLATE_FILE);
const mountTemplate = read(MOUNT_TEMPLATE_FILE);
const controls = read(CONTROLS_FILE);

if (!panelTemplate) {
  problems.push(`${PANEL_TEMPLATE_FILE} not found.`);
} else if (!controls) {
  problems.push(`${CONTROLS_FILE} not found.`);
} else {
  for (const action of ['vehicle-assign-crew', 'vehicle-open-crew', 'vehicle-remove-crew']) {
    if (panelTemplate.includes(`data-action="${action}"`) && !controls.includes(`[data-action="${action}"]`)) {
      problems.push(`${PANEL_TEMPLATE_FILE} renders data-action="${action}" but ${CONTROLS_FILE} has no matching handler binding.`);
    }
  }
  if (mountTemplate?.includes('data-action="vehicle-crew-skill"') && !controls.includes('[data-action="vehicle-crew-skill"]')) {
    problems.push(`${MOUNT_TEMPLATE_FILE} renders data-action="vehicle-crew-skill" but ${CONTROLS_FILE} has no matching handler binding.`);
  }
}

// Invariant 2: every crew-station drop zone has a live drop binder.
if (panelTemplate && !panelTemplate.includes('data-drop-zone="crew-station"')) {
  problems.push(`${PANEL_TEMPLATE_FILE}: expected at least one data-drop-zone="crew-station" row.`);
}
if (controls && !/STATION_ROW_SELECTOR[\s\S]{0,200}addEventListener\('drop'/.test(controls) && !controls.includes("row.addEventListener('drop'")) {
  problems.push(`${CONTROLS_FILE}: no live 'drop' listener found bound to crew-station rows.`);
}

// Invariant 3: no direct actor.update()/vehicle.update() mutation inside
// the crew-assignment engine files.
const DIRECT_UPDATE_PATTERN = /await\s+(vehicle|actor|crewActor|droppedActor)\.update\(/;
for (const rel of CREW_ENGINE_FILES) {
  const text = read(rel);
  if (!text) { problems.push(`${rel} not found.`); continue; }
  if (DIRECT_UPDATE_PATTERN.test(text)) {
    problems.push(`${rel}: contains a direct actor/vehicle.update() call — ActorEngine must be the sole mutation authority for crew assignment.`);
  }
}

// Invariant 4: no second, independently hard-coded 6-station array outside
// VehicleCrewAssignmentService's documented legacy getter.
const SIX_STATION_ARRAY_PATTERN = /\[\s*['"]pilot['"]\s*,\s*['"]copilot['"]\s*,\s*['"]gunner['"]\s*,\s*['"]engineer['"]\s*,\s*['"]shields['"]\s*,\s*['"]commander['"]\s*\]/;
const contextBuilder = read(CONTEXT_BUILDER_FILE);
if (contextBuilder && SIX_STATION_ARRAY_PATTERN.test(contextBuilder)) {
  problems.push(`${CONTEXT_BUILDER_FILE}: contains an independent hard-coded 6-station array — the live panel must derive its station set from crew-resolver.js#resolveVehicleCrewStations instead.`);
}
const serviceText = read(SERVICE_FILE);
if (serviceText) {
  const matches = serviceText.match(new RegExp(SIX_STATION_ARRAY_PATTERN, 'g')) || [];
  if (matches.length > 1) {
    problems.push(`${SERVICE_FILE}: more than one hard-coded 6-station array literal found — only the documented legacy stationKeys getter may contain one.`);
  }
}

// Invariant 5: station-key resolution never falls back to 'pilot' or
// first-empty for an unrecognized key.
if (serviceText) {
  const canonicalStart = serviceText.indexOf('static canonicalStationKey');
  const canonicalEnd = serviceText.indexOf('static canBeCrew');
  const canonicalFn = canonicalStart >= 0 && canonicalEnd > canonicalStart ? serviceText.slice(canonicalStart, canonicalEnd) : '';
  if (!canonicalFn) {
    problems.push(`${SERVICE_FILE}: could not locate canonicalStationKey() — guard pattern may need updating.`);
  } else {
    if (/\|\|\s*['"]pilot['"]/.test(canonicalFn)) {
      problems.push(`${SERVICE_FILE}: canonicalStationKey() falls back to 'pilot' for an unrecognized station — unknown stations must fail clearly instead.`);
    }
    if (/firstEmptyStation/.test(canonicalFn)) {
      problems.push(`${SERVICE_FILE}: canonicalStationKey() falls back to a first-empty-station helper for an unrecognized station — unknown stations must fail clearly instead.`);
    }
  }
}

// Invariant 6: attack-operator lookup reads the SAME crewPositions field the
// assignment service writes — not a second, independent crew-lookup
// implementation.
const crewRouter = read(CREW_ROUTER_FILE);
if (!crewRouter) {
  problems.push(`${CREW_ROUTER_FILE} not found.`);
} else if (!/positions\s*=\s*system\.crewPositions/.test(crewRouter)) {
  problems.push(`${CREW_ROUTER_FILE}: does not read system.crewPositions directly — attack-operator resolution must read the same field VehicleCrewAssignmentService writes.`);
}
if (serviceText && !/system\.crewPositions\.\$\{targetStation\}/.test(serviceText)) {
  problems.push(`${SERVICE_FILE}: does not write system.crewPositions.\${targetStation} — assignment writes and attack-operator reads must target the same field.`);
}

console.log('\n' + '='.repeat(72));
console.log('  VEHICLE CREW ASSIGNMENT GUARD (Phase 6)');
console.log('='.repeat(72));

if (problems.length) {
  console.log(`\n${STRICT ? 'FAILURES' : 'WARNINGS'} (${problems.length}):`);
  for (const problem of problems) console.log(`  - ${problem}`);
} else {
  console.log('\nAll crew-action buttons and station drop zones have live handlers; no direct actor/vehicle.update() mutation, duplicate station lists, or unknown-station fallback found; attack-operator lookup shares the assignment service\'s crewPositions field.');
}

console.log('='.repeat(72) + '\n');

if (STRICT && problems.length) {
  process.exit(1);
}
