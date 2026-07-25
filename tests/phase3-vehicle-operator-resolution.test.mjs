import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 3's vehicle operator-math fix
// (docs/audits/rolling-system-alignment-phase-3.md), UPDATED by Phase 6
// (docs/audits/vehicle-crew-assignment-phase-6.md). Confirmed live-path
// finding: the vehicle weapon "Fire" button in
// templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs
// already carried data-station/data-skill/data-weapon-id, and
// scripts/sheets/v2/vehicle-sheet/crew-skill-router.js already contained a
// correct crew-aware attack router (rollVehicleCrewSkill).
//
// Phase 3 bound this button's listener directly in character-sheet.js's
// activateListeners()/_activateCombatUI() path — code that, per Phase 6's
// deeper trace, is NEVER REACHED for vehicle-type actors at all
// (_onRender returns early for document.type === 'vehicle' before
// activateListeners() runs), so that binding was itself still dead code.
// Phase 6 moved the binding into vehicle-crew-assignment-controls.js,
// called from _wireVehicleActorModeEvents — the listener path vehicles
// actually use — so this guard now points there instead.

const controls = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js', import.meta.url), 'utf8');
const characterSheet = await readFile(new URL('../scripts/sheets/v2/character-sheet.js', import.meta.url), 'utf8');
const crewSkillRouter = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/crew-skill-router.js', import.meta.url), 'utf8');
const contextBuilder = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', import.meta.url), 'utf8');
const template = await readFile(new URL('../templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs', import.meta.url), 'utf8');

// 1. The button's data-action must actually have a listener now, bound from
// the reachable vehicle-actor-mode listener path.
assert.match(template, /data-action="vehicle-crew-skill"/);
assert.match(controls, /import \{ rollVehicleCrewSkill \} from "\/systems\/foundryvtt-swse\/scripts\/sheets\/v2\/vehicle-sheet\/crew-skill-router\.js"/);
assert.match(controls, /querySelectorAll\('\[data-action="vehicle-crew-skill"\]'\)/);
assert.match(controls, /rollVehicleCrewSkill\(vehicle, station, skill, \{ weaponId \}\)/);
assert.match(characterSheet, /bindVehicleCrewAssignmentControls\(this, root, \{ signal \}\)/);
assert.match(characterSheet, /_wireVehicleActorModeEvents\(root, signal\)/);

// 2. The listener must not silently pick an operator itself — it reads
// station/skill straight from the button's own dataset and defers entirely
// to rollVehicleCrewSkill()/resolveVehicleCrewActor() for resolution.
const listenerBody = controls.slice(
  controls.indexOf('querySelectorAll(\'[data-action="vehicle-crew-skill"]\')'),
  controls.indexOf('querySelectorAll(\'[data-action="vehicle-crew-skill"]\')') + 1200
);
assert.doesNotMatch(listenerBody, /game\.user\.targets\.first\(\)/);
assert.doesNotMatch(listenerBody, /canvas\.tokens\.controlled\[0\]/);

// 3. rollVehicleCrewSkill()'s attack branch calls the canonical rollAttack()
// with the RESOLVED CREW ACTOR (not the vehicle) as the attacking actor —
// this is what actually sources BAB/ability/proficiency correctly.
assert.match(crewSkillRouter, /import \{ rollAttack \} from "\/systems\/foundryvtt-swse\/scripts\/combat\/rolls\/attacks\.js"/);
assert.match(crewSkillRouter, /await rollAttack\(actor, weapon, \{ vehicleActor: vehicle, operator: actor, crewStation: stationKey \}\)/);

// 4. resolveVehicleCrewActor() must distinguish "genuinely unassigned"
// (legitimate abstract Crew Quality) from "invalid/deleted assignment"
// (a data-integrity problem) — these used to collapse into the same silent
// fallback.
assert.match(crewSkillRouter, /source: 'unassigned'/);
assert.match(crewSkillRouter, /source: actor \? 'actor' : 'invalid'/);
assert.match(crewSkillRouter, /resolution\.source === 'invalid'/);

// 5. An invalid (not merely unassigned) crew resolution must return a
// structured failure — not proceed to roll anything.
const invalidBranch = crewSkillRouter.slice(
  crewSkillRouter.indexOf("resolution.source === 'invalid'"),
  crewSkillRouter.indexOf("resolution.source === 'invalid'") + 400
);
assert.match(invalidBranch, /return \{ actor: null, fallback: false, invalidCrew: true/);

// 6. A pilot-operated weapon mount (crewRole 'pilot') must ask the PILOT
// station for an operator, not be hard-wired to 'gunner' regardless of the
// mount's own crewRole.
assert.doesNotMatch(contextBuilder, /getStationSkillActions\('gunner'\)\.map\(\(action\) => \(\{ \.\.\.action, stationKey: 'gunner' \}\)\)/);
assert.match(contextBuilder, /getStationSkillActions\(weapon\.crewRole \|\| 'gunner'\)/);

console.log('Phase 3 vehicle operator resolution guards passed.');
