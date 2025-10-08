// ============================================
// FILE: scripts/swse-data.js
// ============================================
const CACHE = {
  vehicles: null,
  feats: null,
  talents: null,
  classes: null,
  species: null,
  weapons: null,
  armor: null,
  equipment: null,
  forcePowers: null
};

async function loadJson(filename) {
  const url = `systems/swse/data/${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}: ${response.status}`);
  }
  return response.json();
}

export async function getVehicles() {
  if (!CACHE.vehicles) CACHE.vehicles = await loadJson("vehicles.json");
  return CACHE.vehicles;
}

export async function getFeats() {
  if (!CACHE.feats) CACHE.feats = await loadJson("feats.json");
  return CACHE.feats;
}

export async function getTalents() {
  if (!CACHE.talents) CACHE.talents = await loadJson("talents.json");
  return CACHE.talents;
}

export async function getClasses() {
  if (!CACHE.classes) CACHE.classes = await loadJson("classes.json");
  return CACHE.classes;
}

export async function getSpecies() {
  if (!CACHE.species) CACHE.species = await loadJson("species.json");
  return CACHE.species;
}

export async function getWeapons() {
  if (!CACHE.weapons) CACHE.weapons = await loadJson("weapons.json");
  return CACHE.weapons;
}

export async function getArmor() {
  if (!CACHE.armor) CACHE.armor = await loadJson("armor.json");
  return CACHE.armor;
}

export async function getEquipment() {
  if (!CACHE.equipment) CACHE.equipment = await loadJson("equipment.json");
  return CACHE.equipment;
}

export async function getForcePowers() {
  if (!CACHE.forcePowers) CACHE.forcePowers = await loadJson("forcepowers.json");
  return CACHE.forcePowers;
}

export async function getClassData(className) {
  const classes = await getClasses();
  return classes.find(c => c.class_name === className || c.name === className);
}

export function clearCache() {
  for (const key in CACHE) {
    CACHE[key] = null;
  }
}
