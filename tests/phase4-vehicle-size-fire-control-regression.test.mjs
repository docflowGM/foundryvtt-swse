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

// Size: the ONLY size-dependent attack rule is the published Core capital-ship penalty (Core Rulebook printed p. 171,
// owner-verified: a vehicle of Colossal (frigate) size or larger takes -20 against targets smaller than Colossal;
// point-defense weapons exempt). It lives in one clearly delimited block (capital-ship penalty helpers) of the
// vehicle attack math and emits one ledger entry. Everything else in the module must stay size-free: there is still no
// verified rule for a general vehicle/weapon attack-roll size modifier.
const START = '/** Size of a vehicle (verified record / construction frame)';
const END = '/**\n * Core Vehicle Combat: "If you are trained in the Pilot skill';
assert.ok(math.includes(START) && math.includes(END), 'the capital-ship penalty block markers must exist');
const outside = math.slice(0, math.indexOf(START)) + math.slice(math.indexOf(END));
assert.doesNotMatch(outside, /size/i, 'vehicle-attack-math.js must not reference vehicle/weapon size outside the Core capital-ship penalty block — no other verified SWSE vehicle attack-roll size modifier exists.');
const sizeEntries = [...math.matchAll(/id: '([a-z-]+)'/g)].map((m) => m[1]).filter((id) => /size|capital/.test(id));
assert.deepEqual(sizeEntries, ['capital-ship-attack-penalty'], 'the capital-ship penalty is the only size-driven attack ledger entry');
const block = math.slice(math.indexOf(START), math.indexOf(END));
assert.match(block, /capitalShipAttackPenalty\(/, 'the block delegates the rule to the pure domain module');
assert.match(block, /-20/, 'the rule text cites the -20');

// No fire-control arithmetic either — vehicleMount.fireControl is
// display-only (vehicle-context-builder.js) and always null in shipped
// compendium data; folding it into the formula would either always add 0
// (dead weight) or require inventing values that don't exist in any data.
assert.doesNotMatch(math, /firecontrol/i, 'vehicle-attack-math.js must not reference fireControl — the field is display-only and always null in shipped data (see Phase 4 audit).');

console.log('Phase 4 vehicle size/fire-control non-implementation regression guard passed.');
