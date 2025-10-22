// ============================================
// FILE: scripts/swse-data.js (UPDATED)
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
  forcePowers: null,
  skills: null,
  attributes: null,
  combatActions: null,
  conditions: null,
  extraSkillUses: null
};

async function loadJson(filename) {
  const url = `systems/swse/data/${filename}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`SWSE | Could not load ${filename}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    
    // Handle different JSON structures
    if (data.classes) return data.classes;
    if (data.skills) return data.skills;
    if (data.actions) return data.actions;
    if (data.conditions) return data.conditions;
    if (data.extraSkillUses) return data.extraSkillUses;
    if (Array.isArray(data)) return data;
    
    return data;
  } catch (err) {
    console.error(`SWSE | Error loading ${filename}:`, err);
    return null;
  }
}

export async function getVehicles() {
  if (!CACHE.vehicles) CACHE.vehicles = await loadJson("vehicles.json");
  return CACHE.vehicles || [];
}

export async function getFeats() {
  if (!CACHE.feats) CACHE.feats = await loadJson("feats.json");
  return CACHE.feats || [];
}

export async function getTalents() {
  if (!CACHE.talents) CACHE.talents = await loadJson("talents.json");
  return CACHE.talents || [];
}

export async function getClasses() {
  if (!CACHE.classes) CACHE.classes = await loadJson("classes-db.json");
  return CACHE.classes || [];
}

export async function getSkills() {
  if (!CACHE.skills) CACHE.skills = await loadJson("skills.json");
  return CACHE.skills || [];
}

export async function getAttributes() {
  if (!CACHE.attributes) CACHE.attributes = await loadJson("attributes.json");
  return CACHE.attributes || [];
}

export async function getForcePowers() {
  if (!CACHE.forcePowers) CACHE.forcePowers = await loadJson("forcepowers.json");
  return CACHE.forcePowers || [];
}

export async function getCombatActions() {
  if (!CACHE.combatActions) CACHE.combatActions = await loadJson("combat-actions.json");
  return CACHE.combatActions || [];
}

export async function getConditions() {
  if (!CACHE.conditions) CACHE.conditions = await loadJson("conditions.json");
  return CACHE.conditions || [];
}

export async function getExtraSkillUses() {
  if (!CACHE.extraSkillUses) CACHE.extraSkillUses = await loadJson("extraskilluses.json");
  return CACHE.extraSkillUses || [];
}

export async function getClassData(className) {
  const classes = await getClasses();
  return classes.find(c => 
    c.name === className || 
    c.class_name === className
  );
}

export function clearCache() {
  for (const key in CACHE) {
    CACHE[key] = null;
  }
}
