/**
 * store-taxonomy.js
 * -----------------
 * Pure (no Foundry globals) classification for Store listings.
 *
 * Authority: the canonical record's OWN classification fields and the pack that owns the record.
 *   weapons   -> system.subcategory (+ system.weaponCategory), pack default only when the record carries none
 *   armor     -> system.armorType
 *   equipment -> system.equipmentBucket (EQUIPMENT_BUCKETS is the equipment domain's authority)
 *   droids    -> system.degree
 *   vehicles  -> the universal vehicle pack registry (pack owns the publication category)
 * Never the item name, never regular expressions over prose. A record whose canonical field is
 * missing or unknown is classified `Unclassified` / `classified:false` and is shown as such.
 */
import { EQUIPMENT_BUCKETS } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-normalizer.js';
import { UNIVERSAL_VEHICLE_PACKS, getUniversalVehiclePack } from '/systems/foundryvtt-swse/scripts/domain/vehicles/universal-vehicle-pack-registry.js';

export const UNCLASSIFIED = 'Unclassified';

const WEAPON_SUBCATEGORY = Object.freeze({
  simple: 'Simple Weapons', advanced: 'Advanced Melee', lightsaber: 'Lightsabers', pistol: 'Pistols',
  rifle: 'Rifles', heavy: 'Heavy Weapons', grenade: 'Grenades', exotic: 'Exotic Weapons'
});
/** Pack membership is registered in system.json; used only when a record carries no subcategory of its own. */
const WEAPON_PACK_DEFAULT = Object.freeze({
  'weapons-lightsabers': 'lightsaber'
});
const ARMOR_TYPES = Object.freeze({ light: 1, medium: 1, heavy: 1, shield: 1 });
const DEGREE_LABELS = Object.freeze({
  1: '1st-Degree: Medical & Analytical', 2: '2nd-Degree: Mechanical & Technical', 3: '3rd-Degree: Protocol & Domestic',
  4: '4th-Degree: Security & Battle', 5: '5th-Degree: Labor & Utility'
});

const shortPack = pack => String(pack ?? '').replace(/^[^.]+\./, '');

export function classifyWeapon({ system = {}, pack = '' } = {}) {
  const key = String(system.subcategory ?? WEAPON_PACK_DEFAULT[shortPack(pack)] ?? '').toLowerCase();
  const base = WEAPON_SUBCATEGORY[key];
  if (!base) return { category: 'Weapons', subcategory: UNCLASSIFIED, classified: false };
  const family = String(system.weaponCategory ?? '').toLowerCase();
  let subcategory = base;
  if (key === 'simple') subcategory = family === 'melee' ? 'Simple Melee' : family === 'ranged' ? 'Simple Ranged' : base;
  if (key === 'exotic') subcategory = family === 'melee' ? 'Exotic Melee' : family === 'ranged' ? 'Exotic Ranged' : base;
  return { category: 'Weapons', subcategory, classified: true };
}

export function classifyArmor({ system = {} } = {}) {
  const type = String(system.armorType ?? '').toLowerCase();
  return ARMOR_TYPES[type]
    ? { category: 'Armor', subcategory: 'Armor', classified: true }
    : { category: 'Armor', subcategory: UNCLASSIFIED, classified: false };
}

export function classifyEquipment({ system = {} } = {}) {
  const cfg = EQUIPMENT_BUCKETS[String(system.equipmentBucket ?? '')];
  if (!cfg) return { category: 'Equipment', subcategory: UNCLASSIFIED, classified: false };
  const sub = String(system.equipmentStoreSubcategory ?? system.equipmentTypeLabel ?? '').trim();
  return { category: cfg.storeCategory, subcategory: sub || cfg.storeSubcategory, classified: true };
}

export function classifyDroid({ system = {} } = {}) {
  const m = /^([1-5])(?:st|nd|rd|th)-degree$/i.exec(String(system.degree ?? '').trim());
  return m
    ? { category: 'Droids', subcategory: DEGREE_LABELS[m[1]], classified: true }
    : { category: 'Droids', subcategory: UNCLASSIFIED, classified: false };
}

export function classifyVehicle({ packName = '' } = {}) {
  const spec = getUniversalVehiclePack(shortPack(packName));
  return spec
    ? { category: 'Vehicles', subcategory: spec.label.replace(/^Vehicles [—-] /, ''), classified: true }
    : { category: 'Vehicles', subcategory: UNCLASSIFIED, classified: false };
}

export function classifyListing(domain, ctx) {
  switch (domain) {
    case 'weapon': return classifyWeapon(ctx);
    case 'armor': return classifyArmor(ctx);
    case 'equipment': return classifyEquipment(ctx);
    case 'droid': return classifyDroid(ctx);
    case 'vehicle': return classifyVehicle(ctx);
    default: return { category: 'Other', subcategory: UNCLASSIFIED, classified: false };
  }
}

export { UNIVERSAL_VEHICLE_PACKS };
