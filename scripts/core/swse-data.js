
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
// Optimized data loader for SWSE
// NOTE: This module provides legacy data access. Most data loading now goes through WorldDataLoader.
// These exports are retained only for backward compatibility with in-world data access.
const CACHE = {};
const DATA_FILES = {
  skills: 'skills.json',
  combatActions: 'combat-actions.json',
  extraSkillUses: 'extraskilluses.json'
};

async function loadJson(filename) {
  const url = `systems/foundryvtt-swse/data/${filename}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {return null;}
    const data = await response.json();
    return Array.isArray(data) ? data : Object.values(data);
  } catch (err) {
    SWSELogger.error(`SWSE | Error loading ${filename}:`, err);
    return null;
  }
}

async function getData(key) {
  if (!CACHE[key]) {CACHE[key] = await loadJson(DATA_FILES[key]);}
  return CACHE[key] || [];
}

export const getSkills = () => getData('skills');
export const getCombatActions = () => getData('combatActions');
export const getExtraSkillUses = () => getData('extraSkillUses');
