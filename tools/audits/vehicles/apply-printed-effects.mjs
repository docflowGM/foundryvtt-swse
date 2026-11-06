#!/usr/bin/env node
/**
 * Replaces invented effect text in data/vehicle-modifications/*.json with a paraphrase of the printed
 * prose of Starships of the Galaxy, Chapter III (printed pp. 40-53), for every row whose prose is
 * readable in the OCR. The original text is kept in `legacy`. Rows without readable prose are marked
 * effectVerification "UNVERIFIED" (their effect text is not a published rule). Idempotent.
 *
 *   node tools/audits/vehicles/apply-printed-effects.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BOOK = 'Starships of the Galaxy';
const P = { movement: [40, 42], defense: [43, 44], weapon: [44, 48], accessory: [48, 53] };
const E = (page, text) => ({ page, text });

const map = {};
const set = (ids, page, text) => { for (const id of [].concat(ids)) map[id] = E(page, typeof text === 'function' ? text(id) : text); };

// ---- movement systems ----
set('atmospheric-thrusters', 'movement', 'Raises maximum velocity and character-scale fly speed by 10% while flying in an atmosphere (rounded down to the nearest square and 10 km/h). No effect on starship-scale movement.');
set('atmospheric-thrusters-advanced', 'movement', 'Raises maximum velocity and character-scale fly speed by 25% while flying in an atmosphere (rounded down to the nearest square and 10 km/h). No effect on starship-scale movement.');
set('combat-thrusters', 'movement', "A space transport is treated as one size category smaller for being targeted by capital-ship weapons, and as a starfighter for dogfighting and starship combat maneuvers. Its size modifier to Reflex Defense does not change.");
set(['hyperdrive-075', 'hyperdrive-1', 'hyperdrive-15', 'hyperdrive-2', 'hyperdrive-3', 'hyperdrive-4', 'hyperdrive-5', 'hyperdrive-6', 'hyperdrive-8', 'hyperdrive-10', 'hyperdrive-15-class'], 'movement',
  id => `Hyperdrive of the listed class (a smaller class number is a better drive). Hyperdrives are always nonstandard modifications for starfighters; hyperdrive sleds and rings are the alternatives.`);
set(['maneuvering-jets-2', 'maneuvering-jets-4', 'maneuvering-jets-6'], 'movement', id => `+${id.slice(-1)} equipment bonus to the starship's Dexterity score.`);
set('navicomputer-limited', 'movement', "Stores only two jumps' worth of information: enough to reach a destination and return.");
set('navicomputer', 'movement', 'Gives a +5 equipment bonus on Use Computer checks made for astrogation, and a character aboard need not be trained in Use Computer to astrogate. Most navicomputers are nonstandard for starfighters.');
set('navicomputer-advanced', 'movement', 'Gives a +10 equipment bonus on Use Computer checks made for astrogation (instead of the usual +5), and a character aboard need not be trained in Use Computer to astrogate.');
set('sublight-accelerator', 'movement', "Gives a +5 bonus on Pilot checks to increase the vehicle's speed (+10 if the pilot is using all-out movement). It draws power from systems not in use.");
set(['sublight-drive-1', 'sublight-drive-2', 'sublight-drive-3', 'sublight-drive-4', 'sublight-drive-5', 'sublight-drive-6'], 'movement',
  id => `Determines the ship's speed in realspace: ${id.slice(-1)} square(s) at starship scale. Only military vessels may use the fastest ion drives.`);
// ---- defense systems ----
set(['armor-1', 'armor-2', 'armor-3', 'armor-4'], 'defense', id => `+${id.slice(-1)} equipment bonus to the armor bonus the starship adds to its Reflex Defense. Skilled pilots may use their character level in place of the ship's armor bonus.`);
set('jamming-suite', 'defense', "Swift action: choose one target starship within 6 squares (starship scale). The target takes a -4 (starfighter) or -2 (space transport) penalty on Use Computer checks for communications or sensors, and the same penalty applies to its fire control (which cannot reduce its Intelligence modifier on attack rolls below +0). Effective only against small craft and space transports; the target's system operator may oppose it with a Use Computer check.");
set('jamming-array', 'defense', "Affects all enemy starships within 6 squares regardless of size: -6 (starfighters), -4 (space transports) or -2 (capital ships) on Use Computer checks for communications or sensors and on fire control (not below a +0 Intelligence modifier). A system operator may oppose it with a Use Computer check.");
set('regenerating-shields', 'defense', "When the recharge shields action is used, the current shield rating increases by 10 (up to the ship's maximum shield rating) instead of the normal 5.");
set(['reinforced-bulkheads-10', 'reinforced-bulkheads-20', 'reinforced-bulkheads-30'], 'defense', id => `Increases the starship's hit points by ${id.slice(-2)}%. These improvements do not stack.`);
for (const sr of [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 125, 150, 175, 200]) set(`shields-${sr}`, 'defense', `Deflector shields with a shield rating of ${sr}.`);
// ---- accessories ----
set('cargo-jettison', 'accessory', 'A pilot or system operator can dump any single cargo bay, or all cargo, as a swift action. Noticing it from another starship takes a DC 30 Perception or Use Computer check made as a reaction.');
set(['cargo-pod-light', 'cargo-pod-medium', 'cargo-pod-heavy'], 'accessory', id => `Adds (the starship's cost modifier) x ${{ light: 1, medium: 5, heavy: 10 }[id.split('-').pop()]} tons of cargo. Each pod added reduces the starship's Dexterity by 2 (a pod cannot be added if it would drop Dexterity below 1). A pod can be made detachable, to act as an escape pod, for five times the cost.`);
set('cloaking-hibridium', 'accessory', 'The starship has total concealment and may always make a Stealth check to sneak (a -10 penalty applies to notice it). While active it also treats all other targets as having total concealment, and those aboard cannot see out.');
set('cloaking-stygium', 'accessory', 'The starship has total concealment and may always make a Stealth check to sneak (a -10 penalty applies to notice it). Noticing it does not negate the concealment but allows attacks against it with the normal concealment penalty.');
set('cryogenic-chambers', 'accessory', "Each unit carries (the starship's cost modifier)/5 Medium or smaller creatures in stasis; Large creatures take five times as much space and Huge creatures twenty times.");
set('docking-clamps', 'accessory', 'Lets the starship dock with other starships in space; smaller ships can stay clamped through maneuvers, combat and hyperspace. If the ship takes damage exceeding its damage threshold, every starship attached by a docking clamp is shaken off.');
set('droid-repair-team', 'accessory', 'Deploys automatically when the starship moves -1 or more steps down the condition track, making one Mechanics check (modifier +13) to jury-rig it up 1 step. If damage gets past SR while the team is active there is a 25% chance it is destroyed.');
set('escape-pod-small', 'accessory', "Small lifeboats (ships of Colossal (frigate) size or larger): life support for fifteen Medium creatures for up to 1 week. One bay holds (the starship's cost modifier)/50 lifeboats; multiple bays may be installed.");
set('escape-pod-large', 'accessory', "Large lifeboats (ships of Colossal (cruiser) size or larger): life support for up to 50 Medium creatures for up to 2 months, with a class x15 hyperdrive for one jump. One bay holds (the starship's cost modifier)/100 lifeboats; multiple bays may be installed.");
set('extended-range', 'accessory', "Improves the starship's consumables by 10% of the original value (rounded down, minimum 1 day) for each time it is installed.");
set('hangar-bay', 'accessory', "Ships of Colossal (frigate) size or larger. Each bay has (the starship's cost modifier)/50 units of hangar space (Huge craft take 1 unit, Gargantuan 5, Colossal 20); a vehicle enters or exits with two move actions.");
set('hangar-bay-concealed', 'accessory', 'As a hangar bay, but recognizing a concealed bay from outside takes a DC 30 Perception check (a thorough internal search finds it), and entering or exiting takes two full rounds.');
set('holonet-transceiver', 'accessory', 'Real-time audio, visual and holographic communication over unlimited range, and (with a hypertransceiver) the only way to contact a ship in hyperspace. Use Computer checks to gain information with it get a +5 equipment bonus. During the Galactic Empire its availability is Military.');
set('hyper-transceiver', 'accessory', 'Effectively unlimited-range communication (with time lag) and access to HoloNet information in reduced detail; one of the only means of contacting a ship in hyperspace.');
set(['luxury-basic', 'luxury-advanced', 'luxury-extreme'], 'accessory', id => `Shipwide accommodation upgrade. Maintaining it costs 1/50 of its price each month, or the luxury level drops one step.${id === 'luxury-extreme' ? ' An extreme upgrade raises the ship\'s crew quality by one step (maximum expert), with no effect on a crew of heroes.' : ''}`);
set('medical-suite', 'accessory', "Ships of Colossal (frigate) size or larger. Includes (the starship's size modifier)/5 medical beds and (the starship's size modifier)/50 bacta tanks; a medical bed counts as a medpac (10 uses), a medical kit and a surgical kit.");
set(['passenger-seating', 'passenger-quarters'], 'accessory', id => `One section holds a number of passengers equal to the ship's size modifier, with ${id.endsWith('seating') ? 'seats (typically for voyages of a day or less)' : 'quarters'}; steerage-quality accommodations.`);
set(['sensor-array-2', 'sensor-array-4', 'sensor-array-6'], 'accessory', id => `+${id.slice(-1)} equipment bonus to the starship's Intelligence score.`);
set('sensor-enhancement', 'accessory', "Gives a system operator a +5 bonus on Perception and Use Computer checks made to operate the ship's sensors.");
set('slave-circuits-basic', 'accessory', "Reduces the starship's crew requirement by 1/3 (never below 1). Crew quality is still based on the remaining crew.");
set('slave-circuits-advanced', 'accessory', "Reduces the starship's crew requirement by 2/3 (never below 1). Crew quality is still based on the remaining crew.");
set('slave-circuits-recall', 'accessory', 'Requires advanced slave circuits. The starship can be summoned by comlink and will lift off, fly to the comlink and land, taking no other actions. Crew quality under recall control is untrained, and anyone at the pilot position can disable it as a swift action.');
set('smuggler-compartments', 'accessory', "Hidden cargo space found only by a detailed inspection and a DC 30 Perception check. One section holds up to (the starship's cost modifier) x 200 kg; no more than 5% of the original cargo capacity may be hidden.");
set('transponder-iff', 'accessory', 'A blank IFF transponder that can be switched on or off as a swift action. With the right codes the ship appears as a friend; without them a Use Computer check can be tried against the enemy ship (Will Defense 15 + its Intelligence modifier, starting attitude unfriendly, DC +10).');
set('transponder-masked', 'accessory', "Makes the ship's transponder code unreadable. If the Mechanics check to install it fails by 10 or more, the sublight engines are destroyed as well; a masked transponder is immediately apparent and attracts the authorities.");
set(['transponder-disguised-1', 'transponder-disguised-2', 'transponder-disguised-3'], 'accessory', id => `Broadcasts a second signal that makes the ship appear to be a different ship; switching it on or off is a swift action. Installation needs a Use Computer check to find a similar ship's code and a Deception check to forge the signal, with a -5 penalty for every disguised transponder already installed (this is disguised transponder ${id.slice(-1)}).`);
// ---- weapons whose prose contradicts the catalog ----
set('point-defense', 'weapon', 'Only blaster cannons, laser cannons and light ion cannons can be point-defense weapons. The modification costs 4,000 credits per weapon with no emplacement point requirement beyond mounting the weapon; a point-defense weapon takes no penalty for attacking targets smaller than Colossal.');
set('docking-gun', 'weapon', "Any character-scale ranged weapon can be added as a docking gun; it counts as a heavy weapon, draws power from the ship, and has no effect on starship-scale combat. The cost is for the mount only; the gun is bought normally.");
set('droid-jammer', 'weapon', 'While employed, attacks from the starship gain a +2 equipment bonus to hit automated craft (droid starfighters and tri-fighters) within a 5-square radius.');
set('gravity-well-projector', 'weapon', 'Treated as an area attack: choose a 4x4-square (starship scale) area within range and make an attack roll against Reflex Defense 10. On a hit it creates a hyperspace interdiction field; a starship starting its turn in it may not activate its hyperdrive that turn.');
set('shieldbuster-torpedo', 'weapon', "Against anything but shields it deals half damage. If an attack exceeds the target's SR, the target loses 10 points of SR (instead of the normal 5). Shields damaged this way can be recharged normally.");
set('tractor-beam', 'weapon', 'Rules for tractor beams are on page 174 of the Core Rulebook. Tractor beams are nonstandard modifications for space transports and starfighters.');

const files = ['accessories', 'defense-systems', 'movement-systems', 'weapon-systems'];
let changed = 0, unverified = 0, stale = false;
const check = process.argv.includes('--check');
for (const f of files) {
  const file = path.join(root, 'data/vehicle-modifications', f + '.json');
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const row of rows) {
    const printed = map[row.id];
    if (printed) {
      if (row.effectVerification !== 'PRINTED_PROSE' || row.effect !== printed.text) {
        if (!row.legacy) row.legacy = { description: row.description, effect: row.effect };
        row.description = printed.text; row.effect = printed.text;
        row.effectVerification = 'PRINTED_PROSE';
        row.effectSource = { book: BOOK, printedPageRange: P[printed.page], basis: 'paraphrase of the printed prose' };
        changed++; stale = true;
      }
    } else if (row.effectVerification !== 'UNVERIFIED') {
      row.effectVerification = 'UNVERIFIED'; unverified++; stale = true;
    }
  }
  if (!check) fs.writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
}
if (check && stale) { console.error('catalog effect text is stale: run without --check'); process.exit(1); }
console.log(check ? 'catalog effect text up to date' : `corrected ${changed} rows; ${unverified} marked UNVERIFIED`);
