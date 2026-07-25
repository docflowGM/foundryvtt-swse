import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 4 conclusion (docs/audits/rolling-system-alignment-phase-4.md,
// "Vehicle size rule conclusion" / "Fire-control rule/data conclusion"):
// no vehicle size or fire-control ATTACK modifier exists anywhere in the
// codebase, wired or unwired, beyond an unused `system.size` string on
// vehicle actors/compendium data and an always-null `fireControl` field on
// vehicle weapon mounts (display-only). Neither should be added to the
// attack formula without a verified SWSE rule citation (none was supplied
// or found this phase).
//
// This is a regression guard, not a feature test: it fails loudly if a
// future change starts folding a size or fire-control value into
// vehicle-attack-math.js without deliberately updating this file and the
// audit's conclusion alongside it.

const math = await readFile(new URL('../scripts/engine/combat/vehicle-attack-math.js', import.meta.url), 'utf8');

// No size-modifier arithmetic of any kind in the vehicle attack formula
// module — confirms the Phase 3 conclusion still holds after Phase 4's
// abstract-crew formula was added alongside the named-gunner formula.
assert.doesNotMatch(math, /size/i, 'vehicle-attack-math.js must not reference vehicle/weapon size — no verified SWSE rule for a vehicle attack-roll size modifier was found this phase (see Phase 4 audit).');

// No fire-control arithmetic either — vehicleMount.fireControl is
// display-only (vehicle-context-builder.js) and always null in shipped
// compendium data; folding it into the formula would either always add 0
// (dead weight) or require inventing values that don't exist in any data.
assert.doesNotMatch(math, /firecontrol/i, 'vehicle-attack-math.js must not reference fireControl — the field is display-only and always null in shipped data (see Phase 4 audit).');

console.log('Phase 4 vehicle size/fire-control non-implementation regression guard passed.');
