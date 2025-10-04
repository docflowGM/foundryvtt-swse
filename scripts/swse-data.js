/**
 * scripts/swse-data.js
 * 
 * Exposes async getters for SWSE JSON data files:
 * - vehicles.json
 * - feats.json
 * - talents.json
 * - classes.json
 * 
 * Caches each dataset after the first load.
 */

const MODULE_NAME = "foundryvtt-swse";

// Resolve the module’s data folder path
function getModuleDataPath() {
  const mod = game.modules.get(MODULE_NAME);
  if (!mod) throw new Error(`Module ${MODULE_NAME} not found`);
  return `modules/${mod.path}/data`;
}

// Internal cache
let _vehicles = null;
let _feats    = null;
let _talents  = null;
let _classes  = null;

/**
 * Load and parse a JSON file from this module’s data directory.
 * @param {string} filename
 * @returns {Promise<any>}
 */
async function loadJson(filename) {
  const base = getModuleDataPath();
  const url  = `${base}/${filename}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load ${filename}: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * Get all vehicle templates.
 * @returns {Promise<Array>}
 */
export async function getVehicles() {
  if (!_vehicles) {
    _vehicles = await loadJson("vehicles.json");
  }
  return _vehicles;
}

/**
 * Get all feats.
 * @returns {Promise<Array>}
 */
export async function getFeats() {
  if (!_feats) {
    _feats = await loadJson("feats.json");
  }
  return _feats;
}

/**
 * Get all talents.
 * @returns {Promise<Array>}
 */
export async function getTalents() {
  if (!_talents) {
    _talents = await loadJson("talents.json");
  }
  return _talents;
}

/**
 * Get all class definitions.
 * @returns {Promise<Array>}
 */
export async function getClasses() {
  if (!_classes) {
    _classes = await loadJson("classes.json");
  }
  return _classes;
}

/**
 * Get a single class’s data by its name.
 * @param {string} className
 * @returns {Promise<Object|undefined>}
 */
export async function getClassData(className) {
  const classes = await getClasses();
  return classes.find(c => c.class_name === className);
}
