/**
 * Certified mechanical effects of vehicle modifications (Starships of the Galaxy, pp. 40-44).
 *
 * A catalog row becomes MECHANIC_SPECIFIED only when it has an entry in EFFECTS below, the effect text is
 * unambiguous, and tests cover it. Effects contribute to EFFECTIVE statistics; the published baseline
 * (flags.swse.universalVehicleSource) is never rewritten, and removing an installation restores the
 * baseline because effective values are always recomputed from baseline + the sealed ledger.
 *
 * Deliberately NOT encoded (see docs/audits/swse-rules-decisions-pending.md, V-P6-*, and
 * docs/audits/vehicles/p6b-deferred-work.md): hit-point percentage rounding (Reinforced Bulkheads),
 * sublight-drive replacement, jammers, combat thrusters, the limited navicomputer, and replacement-vs-addition
 * when a hull already has the system. Those rows stay SOURCE_VERIFIED and cannot be installed.
 * P6B-2 added sensor arrays (Intelligence), cargo pods, the sensor enhancement package, extended range (printed
 * consumables, converted under owner policy V-P6B-02) and per-bay capacities (cryogenic chambers, hangar bays).
 * P6B-1 added regenerating shields (recharge action), SLAM and navicomputers (check equipment bonuses).
 *
 * No Foundry globals: Node-testable.
 */
import { getVehiclePublishedFieldState } from './vehicle-runtime-contract.js';
import { costModifierForSize, cargoToKilograms, consumablesToDays } from './vehicle-modification-rules.js';
import { launcherStandardCapacity } from './vehicle-launcher-capacity.js';

const finite = v => typeof v === 'number' && Number.isFinite(v);
const abilityMod = score => Math.floor((score - 10) / 2);

const CITE = Object.freeze({
  armor: 'Starships of the Galaxy, Armor: armor is bought as an equipment bonus to the armor a starship adds to its Reflex Defense',
  shields: 'Starships of the Galaxy, Starship Shields table and Shields section: deflector shields with the listed shield rating',
  jets: 'Starships of the Galaxy, Movement Systems: maneuvering jets give an equipment bonus to the starship\'s Dexterity score',
  hyperdrive: 'Starships of the Galaxy, Table 3-3 Movement Systems: hyperdrive of the listed class',
  atmospheric: 'Starships of the Galaxy, Atmospheric Thrusters: raises maximum velocity and character-scale fly speed while in an atmosphere'
});

const CITE2 = Object.freeze({
  recharge: 'Starships of the Galaxy, Regenerating Shields: the current shield rating increases by 10 (up to the maximum) when the recharge shields action is used; normal shields increase by only 5',
  slam: 'Starships of the Galaxy, SubLight Accelerator Motor: +5 bonus on Pilot checks to increase a vehicle\'s speed, +10 if the pilot is using all-out movement',
  navicomputer: 'Starships of the Galaxy, Navicomputer: +5 bonus on Use Computer checks made for astrogation (advanced navicomputer +10 instead of +5)'
});

const CITE3 = Object.freeze({
  sensorArray: 'Starships of the Galaxy, Accessories, Sensor Array Computers: equipment bonus to the starship\'s Intelligence score',
  cargoPod: 'Starships of the Galaxy, Accessories, Cargo Pods: adds (cost modifier) x 1/5/10 tons of cargo; each pod reduces Dexterity by 2 and cannot drop it below 1',
  sensorEnhancement: 'Starships of the Galaxy, Accessories, Sensor Enhancement Package: +5 bonus on Perception and Use Computer checks made to operate the ship\'s sensors',
  extendedRange: 'Starships of the Galaxy, Accessories, Extended Range: consumables improve by 10% of the original value (rounded down, minimum 1 day) for each installation',
  cryogenic: 'Starships of the Galaxy, Accessories, Cryogenic Chambers: each unit carries (cost modifier)/5 Medium or smaller creatures in stasis',
  hangar: 'Starships of the Galaxy, Accessories, Hangar Bay: each bay has (cost modifier)/50 units of hangar space'
});

// P6B weapon slice (V-P2-04 resolved): a weapon row is MECHANIC_SPECIFIED when its printed table row is PDF-verified
// (damage, EP, cost, availability, size) and the Core vehicle-weapon rules cover it without special behaviour: attack =
// gunner BAB + vehicle Int + range (Core Vehicle Combat), damage = weapon dice x multiplier (Core Damage). It is
// executed only through the sealed ledger + GM/printed mount + owned Item + attack preflight.
//
// WE-1 (Complete Weapon Ecosystem): the same path carries the plain blaster cannons, ion cannons and turbolasers of
// Table 3-5. They differ from the laser cannons only in their printed dice, EP, cost and size footnote (all PDF-verified in
// data/audits/vehicles/p6a/print-verified-components-v2.json) and, for the ion cannons, in the printed damage TYPE (Ion,
// Core pp. 159-160), which travels in the damage string itself ("3d10x2 (Ion)") so the damage type is never guessed from a
// name. `family` names the printed weapon family; `rangeSlug` names its row of Core Table 10-2 (data/vehicle-weapon-ranges.json).
// Configurations (double / quad / fire-linked / enhancements / point-defense / autofire) are NOT here: they modify one of
// these base weapons and are separate, individually sourced rows.
const CITE_WEAPON = 'Starships of the Galaxy, Table 3-5 Starship Weapons (p. 47, PDF-verified row); Core Rulebook, Vehicle Combat: attack and damage of vehicle weapons';
const WE1_TEST = 'tests/vehicle-universal-phase4e-p31-aftermarket-energy-weapons.test.mjs';
const PLAIN_WEAPONS = Object.freeze({
  'laser-cannon-light': { family: 'laser', rangeSlug: 'laser-cannons', damage: '3d10x2' },
  'laser-cannon-medium': { family: 'laser', rangeSlug: 'laser-cannons', damage: '4d10x2' },
  'laser-cannon-heavy': { family: 'laser', rangeSlug: 'laser-cannons', damage: '5d10x2' },
  'blaster-cannon-light': { family: 'blaster', rangeSlug: 'blaster-cannons', damage: '3d10x2', testFile: WE1_TEST },
  'blaster-cannon-medium': { family: 'blaster', rangeSlug: 'blaster-cannons', damage: '4d10x2', testFile: WE1_TEST },
  'blaster-cannon-heavy': { family: 'blaster', rangeSlug: 'blaster-cannons', damage: '5d10x2', testFile: WE1_TEST },
  'ion-cannon-light': { family: 'ion', rangeSlug: 'ion-cannons', damage: '3d10x2 (Ion)', testFile: WE1_TEST },
  'ion-cannon-medium': { family: 'ion', rangeSlug: 'ion-cannons', damage: '5d10x2 (Ion)', testFile: WE1_TEST },
  'ion-cannon-heavy': { family: 'ion', rangeSlug: 'ion-cannons', damage: '3d10x5 (Ion)', testFile: WE1_TEST },
  'turbolaser-light': { family: 'turbolaser', rangeSlug: 'turbolasers', damage: '3d10x5', testFile: WE1_TEST },
  'turbolaser-medium': { family: 'turbolaser', rangeSlug: 'turbolasers', damage: '5d10x5', testFile: WE1_TEST },
  'turbolaser-heavy': { family: 'turbolaser', rangeSlug: 'turbolasers', damage: '7d10x5', testFile: WE1_TEST }
});
// WE-L1 (Complete Weapon Ecosystem): aftermarket MISSILE / TORPEDO LAUNCHERS. A launcher's damage is its AMMUNITION's printed damage
// (Table 3-5 prints no damage for a launcher: "See Ammunition"), its magazine is the printed standard capacity (SotG pp. 45-46), a hit
// has a 4-square splash radius (SotG: "All concussion missiles have a 4-square splash radius"; "All proton torpedoes have a 4-square
// splash radius") which resolves as a single-target attack at starship scale (Core, Vehicle Combat: Scale), and both are guided
// projectile weapons (Core, Missiles and Torpedoes). The ammunition is a CONSUMABLE bought per unit at its printed price (V-P6A-06);
// it is tracked in the ammunition ledger of the installation (vehicle-ammunition-ledger.js). Capacity EXPANSION (V-P6A-03), the
// shieldbuster launcher (its shield rule is not implemented), mine launchers and every other launcher are NOT promoted here.
const CITE_LAUNCHER = 'Starships of the Galaxy, Table 3-5 (p. 47, PDF-verified launcher and ammunition rows) and Weapon Systems: Concussion Missiles / Proton Torpedoes (launcher capacity pp. 45-46, 4-square splash); Core Rulebook, Missiles and Torpedoes (guided projectiles)';
const WE_L1_TEST = 'tests/vehicle-universal-phase4e-p33-aftermarket-launchers.test.mjs';
// Control weapons deal no damage (Core, Tractor Beams; Starships of the Galaxy, Gravity Well Projectors): the catalog prints damage "Special". They
// are certified as weapons whose damage is empty and whose `control` names the shared mechanic that runs after a hit (the weapon-control
// engines for a tractor beam; the interdiction field for a gravity well projector).
const CONTROL_TEST = 'tests/vehicle-universal-phase4e-p44-gravity-well.test.mjs';
const CONTROL_WEAPONS = Object.freeze({
  'tractor-beam': { control: 'tractor-beam', rangeSlug: 'tractor-beams' },
  'gravity-well-projector': { control: 'gravity-well', rangeSlug: 'gravity-well-projectors' }
});
const LAUNCHERS = Object.freeze({
  'proton-torpedo-launcher': { family: 'torpedo', ammunition: { id: 'proton-torpedo', damage: '9d10x2', price: 800 } },
  'concussion-missile-launcher-light': { family: 'missile', ammunition: { id: 'concussion-missile-light', damage: '7d10x2', price: 500 } },
  'concussion-missile-launcher-medium': { family: 'missile', ammunition: { id: 'concussion-missile-medium', damage: '9d10x2', price: 750 } },
  'concussion-missile-launcher-heavy': { family: 'missile', ammunition: { id: 'concussion-missile-heavy', damage: '9d10x5', price: 2000 } },
  // Starships of the Galaxy, Shieldbuster Torpedoes: 10d10x2 (Table 3-5), 1,000 credits each. The text prints NO splash radius, so none is applied.
  // V-P6C-13 (owner interpretation): shields take the full damage, SR drops by 10 instead of 5, and what reaches the hull is halved.
  // Space mines (Starships of the Galaxy, Space Mines): a mine launcher DEPLOYS (swift action) rather than fires; "All mine launchers hold six
  // mines". Standard and heavy mines only (the advanced mine has no launcher row). Deployment and detonation: vehicle-space-mine.js / VehicleMineService.
  'space-mine-launcher': { family: 'mine', mine: 'standard', guided: false, area: null, ammunition: { id: 'space-mine-standard', damage: '7d10x2', price: 1000 } },
  'space-mine-launcher-heavy': { family: 'mine', mine: 'heavy', guided: false, area: null, ammunition: { id: 'space-mine-heavy', damage: '6d10x5', price: 5000 } },
  'shieldbuster-torpedo-launcher': { family: 'torpedo', shieldbuster: true, area: null, ammunition: { id: 'shieldbuster-torpedo', damage: '10d10x2', price: 1000 } }
});
// WE-PD (Complete Weapon Ecosystem): the POINT-DEFENSE weapon modification. It is an OPTION of a weapon installation, never a weapon and
// never a separate engine: "Normally, only blaster cannons, laser cannons, and light ion cannons can be point-defense weapons. Modifying a
// weapon to be a point-defense weapon costs 4,000 credits per weapon but has no emplacement point requirement (other than what is
// required to mount the weapon itself). A point-defense weapon takes no penalty for attacking targets of smaller than Colossal size"
// (Starships of the Galaxy, Weapon Systems: Point-Defense Weapon; Table 3-5: Restricted, +4,000, Colossal or larger starships only; Core
// Rulebook p. 170). The price is PRINTED as an addition per weapon, so unlike the x2 / x3 / x5 multiplier rows it needs no ruling. The
// Table 10-2 point-defense range row is recorded for the range-band slice (P6B-D-053). GM exceptions to "normally" are not implemented.
const WE_PD_TEST = 'tests/vehicle-universal-phase4e-p34-point-defense.test.mjs';
export const POINT_DEFENSE_BASE_WEAPONS = Object.freeze(['blaster-cannon-light', 'blaster-cannon-medium', 'blaster-cannon-heavy',
  'laser-cannon-light', 'laser-cannon-medium', 'laser-cannon-heavy', 'ion-cannon-light']);
// WE-4 (accelerated completion; owner rulings V-P6C-10/11, 2026-11-04): the published weapon CONFIGURATIONS of Table 3-5 are options of a weapon purchase
// (the same carrier as point defense), never separate combat engines. The configured weapon's price is the base price x the printed multiplier (a TOTAL,
// not a surcharge), emplacement points add as printed, and the printed extra damage dice join the weapon's dice BEFORE the vehicle damage multiplier
// (4d10x2 as a double cannon is 5d10x2). Double/quad (multibarrel), fire-linked 2/4, and the standard/advanced enhancements are alternatives within
// their group; one option per weapon (no automatic stacking). Cannon enhancements never apply to turbolasers. Triple cannons are mechanically a
// double cannon (no catalog row: stock statblocks print them). Fire-linked LAUNCHERS (one shot per linked launcher, launcher count) and the optional
// fire link need their own launcher rule and are bucketed. Autofire eligibility: the printed list (blaster, laser, light ion cannon, light turbolaser).
const CFG_TEST = 'tests/vehicle-universal-phase4e-p37-weapon-configurations.test.mjs';
const WE_CFG_TEST = CFG_TEST;
const CITE_CONFIG = 'Starships of the Galaxy, Weapon Systems (Cannon Double/Quad, Cannon Enhancements, Fire-Linked Weapons, Autoblaster) and Table 3-5 (p. 47, PDF-verified rows)';
const BLASTER = ['blaster-cannon-light', 'blaster-cannon-medium', 'blaster-cannon-heavy'], LASER = ['laser-cannon-light', 'laser-cannon-medium', 'laser-cannon-heavy'];
const ION = ['ion-cannon-light', 'ion-cannon-medium', 'ion-cannon-heavy'], TURBO = ['turbolaser-light', 'turbolaser-medium', 'turbolaser-heavy'];
const AUTOFIRE_BASES = Object.freeze([...BLASTER, ...LASER, 'ion-cannon-light', 'turbolaser-light']);
const CONFIGURATIONS = Object.freeze({
  'cannon-double': { option: 'multibarrel', label: 'Double', group: 'multibarrel', bases: [...BLASTER, ...LASER, ...ION, ...TURBO], priceMultiplier: 3, extraDice: 1, ep: 0, autofireBases: AUTOFIRE_BASES },
  'cannon-quad': { option: 'multibarrel', label: 'Quad', group: 'multibarrel', bases: [...BLASTER, ...LASER, ...ION, ...TURBO], priceMultiplier: 5, extraDice: 2, ep: 1, autofireBases: AUTOFIRE_BASES },
  'fire-linked-2': { option: 'fire-link', label: 'Fire-Linked (2)', group: 'fire-link', bases: [...BLASTER, ...LASER, ...ION, ...TURBO], priceMultiplier: 2, extraDice: 1, ep: 1, autofireBases: AUTOFIRE_BASES },
  'fire-linked-4': { option: 'fire-link', label: 'Fire-Linked (4)', group: 'fire-link', bases: [...BLASTER, ...LASER, ...ION, ...TURBO], priceMultiplier: 4, extraDice: 2, ep: 2, autofireBases: AUTOFIRE_BASES },
  'cannon-enhancement': { option: 'enhancement', label: 'Enhanced', group: 'enhancement', bases: [...BLASTER, ...LASER, ...ION], priceMultiplier: 2, extraDice: 1, ep: 1, autofireBases: [] },
  'cannon-enhancement-advanced': { option: 'enhancement', label: 'Advanced Enhanced', group: 'enhancement', bases: [...BLASTER, ...LASER, ...ION], priceMultiplier: 5, extraDice: 2, ep: 2, autofireBases: [] },
  // V-P6C-09 (project interpretation): the autoblaster grants autofire capability to a single-mounted blaster cannon; the base dice are unchanged
  'autoblaster': { option: 'autoblaster', label: 'Autoblaster', group: 'autoblaster', bases: [...BLASTER], priceMultiplier: 2, extraDice: 0, ep: 0, autofireBases: [...BLASTER] }
});

/** The weapon's certified damage string with a configuration's extra dice added to its dice (before the printed multiplier). */
export function composeWeaponDamage(damage, extraDice = 0) {
  if (!extraDice) return damage;
  const m = /^(\d+)d(\d+)((?:x\d+)?)((?: \(Ion\))?)$/.exec(String(damage ?? '').trim());
  return m ? `${Number(m[1]) + extraDice}d${m[2]}${m[3]}${m[4]}` : null;
}
/** The damage a sealed installation entry calls for: the certified specification plus the dice of its certified option. */
export function effectiveWeaponDamage(spec, entry) {
  const o = entry?.option ? EFFECTS[entry.option.catalogId] : null;
  return composeWeaponDamage(spec?.damage, o?.kind === 'weapon-option' ? o.extraDice ?? 0 : 0);
}
// Capital ships (Colossal (frigate) or larger) take the Core -20 against targets smaller than Colossal in the vehicle attack
// math (vehicle-capital-penalty.js); weapons may be installed on those hulls.

const SHIELD_RATINGS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 125, 150, 175, 200];
const HYPERDRIVES = { 'hyperdrive-075': 0.75, 'hyperdrive-1': 1, 'hyperdrive-15': 1.5, 'hyperdrive-2': 2, 'hyperdrive-3': 3, 'hyperdrive-4': 4,
  'hyperdrive-5': 5, 'hyperdrive-6': 6, 'hyperdrive-8': 8, 'hyperdrive-10': 10, 'hyperdrive-15-class': 15 };

export const EFFECTS = Object.freeze({
  ...Object.fromEntries([1, 2, 3, 4].map(n => [`armor-${n}`, { kind: 'armor', value: n, group: 'armor', citation: CITE.armor }])),
  ...Object.fromEntries(SHIELD_RATINGS.map(n => [`shields-${n}`, { kind: 'shield', value: n, group: 'shields', citation: CITE.shields }])),
  ...Object.fromEntries([2, 4, 6].map(n => [`maneuvering-jets-${n}`, { kind: 'dexterity', value: n, group: 'jets', citation: CITE.jets }])),
  ...Object.fromEntries(Object.entries(HYPERDRIVES).map(([id, cls]) => [id, { kind: 'hyperdrive', value: cls, group: 'hyperdrive', citation: CITE.hyperdrive }])),
  'regenerating-shields': { kind: 'recharge', value: 10, group: 'recharge-shields', citation: CITE2.recharge },
  'sublight-accelerator': { kind: 'skill-bonus', skill: 'pilot', purpose: 'increase-speed', value: 5, allOutValue: 10, group: 'slam', citation: CITE2.slam },
  'navicomputer': { kind: 'skill-bonus', skill: 'useComputer', use: 'astrogate', value: 5, group: 'navicomputer', citation: CITE2.navicomputer },
  'navicomputer-advanced': { kind: 'skill-bonus', skill: 'useComputer', use: 'astrogate', value: 10, group: 'navicomputer', citation: CITE2.navicomputer },
  ...Object.fromEntries([2, 4, 6].map(n => [`sensor-array-${n}`, { kind: 'intelligence', value: n, group: 'sensor-array', citation: CITE3.sensorArray }])),
  ...Object.fromEntries([['light', 1], ['medium', 5], ['heavy', 10]].map(([k, t]) => [`cargo-pod-${k}`, { kind: 'cargo-pod', tonsPerCostModifier: t, dexterity: -2, stackable: true, group: 'cargo-pod', citation: CITE3.cargoPod }])),
  'sensor-enhancement': { kind: 'skill-bonus', bonuses: [{ skill: 'perception', use: 'sensors', value: 5 }, { skill: 'useComputer', use: 'sensors', value: 5 }], group: 'sensor-enhancement', citation: CITE3.sensorEnhancement },
  'extended-range': { kind: 'consumables', percent: 10, minimumDays: 1, stackable: true, group: 'extended-range', citation: CITE3.extendedRange },
  'cryogenic-chambers': { kind: 'capacity', capacity: 'cryogenic', divisor: 5, unit: 'Medium or smaller creatures in stasis', stackable: true, group: 'cryogenic', citation: CITE3.cryogenic },
  'hangar-bay': { kind: 'capacity', capacity: 'hangar', divisor: 50, unit: 'hangar units', stackable: true, group: 'hangar', citation: CITE3.hangar },
  'hangar-bay-concealed': { kind: 'capacity', capacity: 'hangar', divisor: 50, unit: 'hangar units (concealed)', stackable: true, group: 'hangar', citation: CITE3.hangar },
  ...Object.fromEntries(Object.entries(PLAIN_WEAPONS).map(([id, w]) => [id, { kind: 'weapon', family: w.family, rangeSlug: w.rangeSlug, damage: w.damage, ...(w.testFile ? { testFile: w.testFile } : {}), stackable: true, group: `weapon:${id}`, citation: CITE_WEAPON }])),
  ...Object.fromEntries(Object.entries(CONTROL_WEAPONS).map(([id, w]) => [id, { kind: 'weapon', family: 'control', control: w.control, rangeSlug: w.rangeSlug, damage: '', noDamage: true, testFile: CONTROL_TEST, stackable: true, group: `weapon:${id}`, citation: CITE_WEAPON }])),
  ...Object.fromEntries(Object.entries(LAUNCHERS).map(([id, l]) => [id, { kind: 'weapon', family: l.family, rangeSlug: 'missiles-torpedoes', damage: l.ammunition.damage,
    ammunition: { ...l.ammunition, capacity: launcherStandardCapacity(id).standard }, guided: l.guided !== false, ...(l.mine ? { mine: l.mine, rangeSlug: null } : {}), ...(l.area === null ? {} : { area: { kind: 'splash', squares: 4 } }), ...(l.shieldbuster ? { shieldbuster: true } : {}), testFile: l.mine ? 'tests/vehicle-universal-phase4e-p45-space-mines.test.mjs' : WE_L1_TEST, stackable: true, group: `weapon:${id}`, citation: CITE_LAUNCHER }])),
  'point-defense': { kind: 'weapon-option', option: 'point-defense', label: 'Point-Defense', pointDefense: true, eligibleBases: POINT_DEFENSE_BASE_WEAPONS, extraCredits: 4000, extraEmplacementPoints: 0,
    rangeSlug: 'point-defense', testFile: WE_PD_TEST, stackable: true, group: 'weapon-option:point-defense',
    citation: 'Starships of the Galaxy, Weapon Systems: Point-Defense Weapon and Table 3-5 (p. 47, PDF-verified row); Core Rulebook p. 170' },
  ...Object.fromEntries(Object.entries(CONFIGURATIONS).map(([id, c]) => [id, { kind: 'weapon-option', option: c.option, label: c.label, pointDefense: false, eligibleBases: c.bases, priceMultiplier: c.priceMultiplier,
    extraDice: c.extraDice, extraEmplacementPoints: c.ep, autofireBases: c.autofireBases, rangeSlug: null, testFile: WE_CFG_TEST, alternativesGroup: c.group, stackable: true, group: `weapon-option:${id}`, citation: CITE_CONFIG }])),
  'atmospheric-thrusters': { kind: 'atmospheric', percent: 10, group: 'atmospheric', citation: CITE.atmospheric },
  'atmospheric-thrusters-advanced': { kind: 'atmospheric', percent: 25, group: 'atmospheric', citation: CITE.atmospheric }
});

export const IMPLEMENTED_EFFECT_IDS = Object.freeze(Object.keys(EFFECTS));
export const hasEffect = catalogId => Object.prototype.hasOwnProperty.call(EFFECTS, catalogId);

const FLY_MODES = new Set(['fly', 'flying']);
const flyModes = record => (record?.movement?.speedModes ?? []).filter(m => m.scale === 'character' && FLY_MODES.has(m.mode));

/**
 * Hull-specific limits of a registered effect. Anything the book does not rule (a second system of the same
 * kind; a hull that already has shields or a hyperdrive) is denied, never guessed.
 * @returns {string[]} denial reasons (empty = installable)
 */
export function effectInstallability({ catalogEntry, record, entries = [] }) {
  const effect = EFFECTS[catalogEntry?.id];
  if (!effect) return [];
  const reasons = [];
  // Printed "for each"/"each pod/bay/unit" components stack; everything else denies a second system of the same group.
  if (!effect.stackable && entries.some(e => EFFECTS[e.catalogId]?.group === effect.group)) reasons.push('EFFECT_STACKING_UNRULED');
  switch (effect.kind) {
    case 'armor': if (!finite(record?.defenses?.reflex)) reasons.push('REFLEX_DEFENSE_UNKNOWN'); break;
    case 'shield': {
      const sr = record?.defenses?.shieldRating;
      const state = getVehiclePublishedFieldState(sr, (record?.fieldStates ?? {})['defenses.shieldRating']);
      if (state !== 'explicit-zero') reasons.push('SHIELD_REPLACEMENT_OR_ADDITION_UNRULED');
      break;
    }
    case 'dexterity': if (!finite(record?.abilities?.dex) || !finite(record?.defenses?.reflex) || !finite(record?.abilities?.initiativePrinted)) reasons.push('DEXTERITY_BASIS_UNKNOWN'); break;
    case 'hyperdrive': if (record?.hyperspace?.capability !== 'unavailable') reasons.push('HYPERDRIVE_REPLACEMENT_UNRULED'); break;
    case 'atmospheric': if (!flyModes(record).length) reasons.push('NO_ATMOSPHERIC_FLIGHT_MODE'); break;
    case 'recharge': break;
    case 'weapon':
      // the printed damage must be what the effect certifies (a changed catalog row is not silently trusted); a launcher prints no
      // damage ("See Ammunition"), so its catalog link to the certified ammunition row is what must agree
      if (effect.ammunition) { if (catalogEntry.ammunition !== effect.ammunition.id) reasons.push('LAUNCHER_AMMUNITION_DIFFERS_FROM_CERTIFIED_ROW'); }
      else if (effect.control) { if (catalogEntry.damage !== 'Special') reasons.push('WEAPON_DAMAGE_DIFFERS_FROM_CERTIFIED_ROW'); }
      else if (catalogEntry.damage !== effect.damage) reasons.push('WEAPON_DAMAGE_DIFFERS_FROM_CERTIFIED_ROW');
      break;
    case 'weapon-option': reasons.push('WEAPON_OPTION_REQUIRES_A_BASE_WEAPON'); break;
    case 'intelligence': if (!finite(record?.abilities?.int)) reasons.push('INTELLIGENCE_UNKNOWN'); break;
    case 'cargo-pod': {
      if (!finite(record?.abilities?.dex) || !finite(record?.defenses?.reflex) || !finite(record?.abilities?.initiativePrinted)) { reasons.push('DEXTERITY_BASIS_UNKNOWN'); break; }
      if (costModifierForSize(record?.classification?.printedSize) === null) reasons.push('HULL_SIZE_HAS_NO_PUBLISHED_COST_MODIFIER');
      const dexAfter = record.abilities.dex + installedDexterityChange(entries) + effect.dexterity;
      if (dexAfter < 1) reasons.push('CARGO_POD_DEXTERITY_BELOW_1');
      { const c = cargoToKilograms(record?.capacity?.cargo); if (!c.ok) reasons.push(c.reason); }
      break;
    }
    case 'consumables': { const c = consumablesToDays(record?.capacity?.consumables); if (!c.ok) reasons.push(c.reason); break; }
    case 'capacity': {
      const m = costModifierForSize(record?.classification?.printedSize);
      if (m === null) reasons.push('HULL_SIZE_HAS_NO_PUBLISHED_COST_MODIFIER');
      else if (!Number.isInteger(m / effect.divisor) || m / effect.divisor < 1) reasons.push('CAPACITY_FRACTIONAL_FOR_HULL_SIZE');
      break;
    }
    case 'skill-bonus':
      // a hull printed with an installed navicomputer already has the standard one: a second is a duplicate (stacking unruled)
      if (catalogEntry.id === 'navicomputer' && record?.hyperspace?.navComputer === 'installed') reasons.push('NAVICOMPUTER_ALREADY_PRESENT');
      break;
    default: reasons.push('EFFECT_KIND_UNKNOWN');
  }
  return reasons;
}

/** Dexterity score change already made by installed entries (jets add, cargo pods subtract). */
function installedDexterityChange(entries) {
  let d = 0;
  for (const e of entries) { const fx = EFFECTS[e.catalogId]; if (fx?.kind === 'dexterity') d += fx.value; else if (fx?.kind === 'cargo-pod') d += fx.dexterity; }
  return d;
}
const stat = (base) => ({ base: finite(base) ? base : null, effective: finite(base) ? base : null, delta: 0, sources: [] });

/**
 * Effective statistics = published baseline + the contribution of every sealed ledger entry that has a
 * registered effect. Entries without one are listed in `unimplemented` and contribute nothing.
 * @param {{record: object, entries: object[]}} p record is the published source record (or a construction-derived equivalent)
 */
export function computeEffectiveStatistics({ record, entries = [], environment = 'unknown' }) {
  const out = {
    reflex: stat(record?.defenses?.reflex), initiative: stat(record?.abilities?.initiativePrinted),
    shield: stat(record?.defenses?.shieldRating),
    hyperdrive: { base: record?.hyperspace?.capability ?? null, effectiveClass: null, sources: [] },
    movement: flyModes(record).map(m => ({ mode: m.mode, scale: m.scale, baseSquares: m.squaresPerMove ?? null, effectiveSquares: m.squaresPerMove ?? null,
      baseKmh: m.maxVelocityKmh ?? null, effectiveKmh: m.maxVelocityKmh ?? null, conditional: null, sources: [] })),
    rechargeShields: { base: 5, effective: 5, sources: [] },
    skillBonuses: [],
    intelligence: { base: finite(record?.abilities?.int) ? record.abilities.int : null, effective: finite(record?.abilities?.int) ? record.abilities.int : null, modifierDelta: 0, sources: [] },
    dexterity: { base: finite(record?.abilities?.dex) ? record.abilities.dex : null, effective: finite(record?.abilities?.dex) ? record.abilities.dex : null, sources: [] },
    cargo: { base: record?.capacity?.cargo ?? null, addedTons: 0, baseKg: null, effectiveKg: null, effective: null, sources: [] },
    consumables: { base: record?.capacity?.consumables ?? null, baseDays: null, basis: null, addedDays: 0, effectiveDays: null, sources: [] },
    capacities: {},
    unimplemented: []
  };
  // A hull printed with an installed navicomputer carries the standard +5 (SotG Navicomputer).
  if (record?.hyperspace?.navComputer === 'installed')
    out.skillBonuses.push({ skill: 'useComputer', use: 'astrogate', value: 5, sources: [{ name: 'Navicomputer (printed with the hull)', published: true }] });
  for (const e of entries) {
    const fx = EFFECTS[e.catalogId];
    if (!fx) { out.unimplemented.push({ installId: e.installId, name: e.name }); continue; }
    const src = { installId: e.installId, name: e.name, citation: fx.citation };
    switch (fx.kind) {
      case 'armor':
        if (finite(out.reflex.base)) { out.reflex.delta += fx.value; out.reflex.sources.push({ ...src, delta: fx.value }); }
        break;
      case 'shield':
        out.shield.effective = fx.value; out.shield.delta = fx.value - (out.shield.base ?? 0); out.shield.sources.push({ ...src, delta: fx.value });
        break;
      case 'dexterity':
      case 'cargo-pod': {
        // Dexterity changes accumulate on the score; each source is credited with the modifier change it adds in order.
        const change = fx.kind === 'dexterity' ? fx.value : fx.dexterity;
        const before = out.dexterity.effective;
        if (!finite(before)) { out.unimplemented.push({ installId: e.installId, name: e.name }); break; }
        const d = abilityMod(before + change) - abilityMod(before);
        out.dexterity.effective = before + change; out.dexterity.sources.push({ ...src, delta: change });
        out.reflex.delta += d; out.initiative.delta += d;
        out.reflex.sources.push({ ...src, delta: d }); out.initiative.sources.push({ ...src, delta: d });
        if (fx.kind === 'cargo-pod') {
          const tons = fx.tonsPerCostModifier * (costModifierForSize(record?.classification?.printedSize) ?? 0);
          out.cargo.addedTons += tons; out.cargo.sources.push({ ...src, tons });
        }
        break;
      }
      case 'intelligence': {
        const before = out.intelligence.effective;
        if (finite(before)) { out.intelligence.effective = before + fx.value; out.intelligence.sources.push({ ...src, delta: fx.value }); }
        break;
      }
      case 'consumables': {
        // V-P6B-02: 10% of the ORIGINAL printed duration converted to days, rounded down, minimum 1 day; never compounded.
        const c = consumablesToDays(record?.capacity?.consumables);
        if (c.ok) { const add = Math.max(fx.minimumDays, Math.floor(c.days * fx.percent / 100)); out.consumables.addedDays += add; out.consumables.sources.push({ ...src, days: add }); }
        else out.unimplemented.push({ installId: e.installId, name: e.name });
        break;
      }
      case 'capacity': {
        const m = costModifierForSize(record?.classification?.printedSize);
        if (m === null) break;
        const c = out.capacities[fx.capacity] ??= { unit: fx.unit, total: 0, sources: [] };
        c.total += m / fx.divisor; c.sources.push({ ...src, amount: m / fx.divisor, unit: fx.unit });
        break;
      }
      case 'hyperdrive': out.hyperdrive.effectiveClass = fx.value; out.hyperdrive.sources.push(src); break;
      case 'recharge': out.rechargeShields.effective = fx.value; out.rechargeShields.sources.push(src); break;
      case 'weapon': break; // no statistic change: executed through the attack path (sealed mount + owned Item + preflight)
      case 'skill-bonus':
        for (const b of fx.bonuses ?? [fx]) out.skillBonuses.push({ skill: b.skill, use: b.use ?? null, purpose: b.purpose ?? null, value: b.value, allOutValue: b.allOutValue ?? null, sources: [src] });
        break;
      case 'atmospheric':
        for (const m of out.movement) {
          if (finite(m.baseSquares)) m.effectiveSquares = Math.floor(m.baseSquares * (100 + fx.percent) / 100);
          if (finite(m.baseKmh)) m.effectiveKmh = Math.floor(m.baseKmh * (100 + fx.percent) / 100 / 10) * 10;
          m.conditional = 'while flying in an atmosphere'; m.sources.push(src);
        }
        break;
      default: out.unimplemented.push({ installId: e.installId, name: e.name });
    }
  }
  {
    const best = new Map();
    for (const b of out.skillBonuses) {
      const k = `${b.skill}|${b.use ?? ''}|${b.purpose ?? ''}`, cur = best.get(k);
      if (!cur || b.value > cur.value) best.set(k, b);
    }
    out.skillBonuses = [...best.values()];
  }
  for (const s of [out.reflex, out.initiative]) if (finite(s.base)) s.effective = s.base + s.delta;
  if (finite(out.intelligence.base)) out.intelligence.modifierDelta = abilityMod(out.intelligence.effective) - abilityMod(out.intelligence.base);
  if (out.cargo.sources.length) {
    const c = cargoToKilograms(record?.capacity?.cargo);
    if (c.ok) {
      out.cargo.baseKg = c.kg; out.cargo.effectiveKg = c.kg + out.cargo.addedTons * 1000;
      out.cargo.effective = { value: out.cargo.effectiveKg / 1000, unit: 'tons' };
    }
  }
  if (out.consumables.sources.length) {
    const c = consumablesToDays(record?.capacity?.consumables);
    if (c.ok) { out.consumables.baseDays = c.days; out.consumables.basis = c.basis; out.consumables.effectiveDays = c.days + out.consumables.addedDays; }
  }
  // Atmosphere-only effects apply only in an explicit 'atmosphere' environment (unknown never activates them).
  for (const m of out.movement) m.applies = m.sources.length > 0 && environment === 'atmosphere';
  out.environment = environment;
  return out;
}
