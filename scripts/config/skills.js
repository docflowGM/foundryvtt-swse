/**
 * SWSE Skills Configuration
 * Canonical skill reads route through SkillRegistry.
 */

import SkillRegistry from "/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js";

let skillsCache = null;
let loadingPromise = null;

async function loadSkillsFromCompendium() {
  if (skillsCache) return skillsCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    if (!game.ready) {
      await new Promise(resolve => Hooks.once('ready', resolve));
    }

    const cache = new Map();
    try {
      await SkillRegistry.build();
      for (const entry of SkillRegistry.list()) {
        cache.set(entry.key, {
          label: entry.name,
          ability: String(entry.ability || 'int').toLowerCase(),
          untrained: entry.system?.untrained ?? true,
          description: entry.system?.description || ''
        });
      }
    } catch (err) {
      console.error('SWSE Skills: registry load failure', err);
    }

    skillsCache = cache;
    return cache;
  })();

  return loadingPromise;
}

export async function getSkillConfig(skillKey) {
  const skills = await loadSkillsFromCompendium();
  return skills.get(skillKey) || null;
}

export async function getSkillsArray() {
  const skills = await loadSkillsFromCompendium();
  return Array.from(skills.entries()).map(([key, config]) => ({ key, ...config }));
}

export async function getSkillsByAbility() {
  const grouped = { str: [], dex: [], con: [], int: [], wis: [], cha: [] };
  const all = await getSkillsArray();
  for (const { key, ...conf } of all) {
    if (grouped[conf.ability]) grouped[conf.ability].push({ key, ...conf });
  }
  return grouped;
}

export async function getSkillsByTrainability() {
  const all = await getSkillsArray();
  return {
    trainable: all.filter(s => !s.untrained),
    untrained: all.filter(s => s.untrained)
  };
}
