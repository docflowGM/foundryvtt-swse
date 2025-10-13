
// Optimized data loader for SWSE
const CACHE = {};
const DATA_FILES = {
  vehicles: "vehicles.json",
  feats: "feats.json",
  talents: "talents.json",
  classes: "classes-db.json",
  skills: "skills.json",
  attributes: "attributes.json",
  forcePowers: "forcepowers.json",
  combatActions: "combat-actions.json",
  conditions: "conditions.json",
  extraSkillUses: "extraskilluses.json"
};

async function loadJson(filename) {
  const url = `systems/swse/data/${filename}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data : Object.values(data);
  } catch (err) {
    console.error(`SWSE | Error loading ${filename}:`, err);
    return null;
  }
}

async function getData(key) {
  if (!CACHE[key]) CACHE[key] = await loadJson(DATA_FILES[key]);
  return CACHE[key] || [];
}

export const getVehicles = () => getData('vehicles');
export const getFeats = () => getData('feats');
export const getTalents = () => getData('talents');
export const getClasses = () => getData('classes');
export const getSkills = () => getData('skills');
export const getAttributes = () => getData('attributes');
export const getForcePowers = () => getData('forcePowers');
export const getCombatActions = () => getData('combatActions');
export const getConditions = () => getData('conditions');
export const getExtraSkillUses = () => getData('extraSkillUses');
