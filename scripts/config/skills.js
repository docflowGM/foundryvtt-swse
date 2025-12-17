/**
 * SWSE Skills Configuration
 * Loads from foundryvtt-swse.skills compendium AFTER Foundry is ready.
 * Provides fallback hardcoded data when pack unavailable.
 */

/** Skill cache */
let skillsCache = null;
let loadingPromise = null;

/**
 * Ensure skill data loads ONLY after Foundry is ready.
 * Calling this before ready will safely wait.
 */
async function loadSkillsFromCompendium() {
  // If already loaded → return immediately
  if (skillsCache) return skillsCache;
  if (loadingPromise) return loadingPromise;

  // Wrap full loading in a safe ready gate
  loadingPromise = (async () => {
    // Wait for Foundry to be fully ready
    if (!game.ready) {
      console.warn("SWSE Skills: load requested before ready — deferring until ready…");
      await new Promise(resolve => Hooks.once("ready", resolve));
    }

    const cache = new Map();

    try {
      if (!game?.packs) {
        console.warn("SWSE Skills: game.packs unavailable even after ready — using fallback");
        skillsCache = cache;
        return cache;
      }

      const pack = game.packs.get("foundryvtt-swse.skills");
      if (!pack) {
        console.warn("SWSE Skills: Compendium 'foundryvtt-swse.skills' not found — using fallback");
        skillsCache = cache;
        return cache;
      }

      // Ensure pack index is loaded
      await pack.getIndex();

      const docs = await pack.getDocuments();

      if (!docs || docs.length === 0) {
        console.warn("SWSE Skills: Compendium contains no documents — using fallback");
      } else {
        for (const doc of docs) {
          const key = doc.name.toLowerCase().replace(/\s+/g, "-");

          cache.set(key, {
            label: doc.name,
            ability: doc.system?.ability?.toLowerCase() || "int",
            untrained: doc.system?.untrained ?? true,
            description: doc.system?.description || ""
          });
        }

        console.log(`SWSE Skills: Successfully loaded ${cache.size} skills from compendium`);
      }
    } catch (err) {
      console.error("SWSE Skills: Compendium load failure — using fallback", err);
    }

    skillsCache = cache;
    return cache;
  })();

  return loadingPromise;
}

/**
 * HARD FALLBACK SKILL DEFINITIONS
 * Only used when pack missing or empty.
 */
export const SWSE_SKILLS = {
  acrobatics: { label: "Acrobatics", ability: "dex", untrained: true, description: "Balance, tumble, and perform acrobatic stunts" },
  climb: { label: "Climb", ability: "str", untrained: true, description: "Scale vertical surfaces" },
  deception: { label: "Deception", ability: "cha", untrained: true, description: "Lie, disguise, feint" },
  endurance: { label: "Endurance", ability: "con", untrained: true, description: "Resist fatigue and hazards" },
  "gather-information": { label: "Gather Information", ability: "cha", untrained: true, description: "Collect rumors and intelligence" },
  initiative: { label: "Initiative", ability: "dex", untrained: true, description: "Act quickly in combat" },
  jump: { label: "Jump", ability: "str", untrained: true, description: "Leap over obstacles" },
  "knowledge-bureaucracy": { label: "Knowledge (Bureaucracy)", ability: "int", untrained: false },
  "knowledge-galactic-lore": { label: "Knowledge (Galactic Lore)", ability: "int", untrained: false },
  "knowledge-life-sciences": { label: "Knowledge (Life Sciences)", ability: "int", untrained: false },
  "knowledge-physical-sciences": { label: "Knowledge (Physical Sciences)", ability: "int", untrained: false },
  "knowledge-social-sciences": { label: "Knowledge (Social Sciences)", ability: "int", untrained: false },
  "knowledge-tactics": { label: "Knowledge (Tactics)", ability: "int", untrained: false },
  "knowledge-technology": { label: "Knowledge (Technology)", ability: "int", untrained: false },
  mechanics: { label: "Mechanics", ability: "int", untrained: true },
  perception: { label: "Perception", ability: "wis", untrained: true },
  persuasion: { label: "Persuasion", ability: "cha", untrained: true },
  pilot: { label: "Pilot", ability: "dex", untrained: true },
  ride: { label: "Ride", ability: "dex", untrained: true },
  stealth: { label: "Stealth", ability: "dex", untrained: true },
  survival: { label: "Survival", ability: "wis", untrained: true },
  swim: { label: "Swim", ability: "str", untrained: true },
  "treat-injury": { label: "Treat Injury", ability: "wis", untrained: false },
  "use-computer": { label: "Use Computer", ability: "int", untrained: true },
  "use-the-force": { label: "Use the Force", ability: "cha", untrained: false }
};

/**
 * Return a skill config (async)
 */
export async function getSkillConfig(skillKey) {
  const skills = await loadSkillsFromCompendium();
  if (skills.size > 0) return skills.get(skillKey) || null;
  return SWSE_SKILLS[skillKey] || null;
}

/**
 * Return ordered list of all skills (async)
 */
export async function getSkillsArray() {
  const skills = await loadSkillsFromCompendium();
  if (skills.size > 0) {
    return Array.from(skills.entries()).map(([key, config]) => ({ key, ...config }));
  }
  return Object.entries(SWSE_SKILLS).map(([key, config]) => ({ key, ...config }));
}

/**
 * Group skills by ability
 */
export async function getSkillsByAbility() {
  const grouped = { str: [], dex: [], con: [], int: [], wis: [], cha: [] };
  const all = await getSkillsArray();

  for (const { key, ...conf } of all) {
    if (grouped[conf.ability]) grouped[conf.ability].push({ key, ...conf });
  }

  return grouped;
}

/**
 * Trainable vs untrained
 */
export async function getSkillsByTrainability() {
  const all = await getSkillsArray();
  return {
    trainable: all.filter(s => !s.untrained),
    untrained: all.filter(s => s.untrained)
  };
}

/**
 * Ability for a skill
 */
export async function getSkillAbility(skillKey) {
  const skill = await getSkillConfig(skillKey);
  return skill ? skill.ability : "";
}

/**
 * Sync fallback for Handlebars
 */
function getSkillConfigSync(skillKey) {
  if (skillsCache && skillsCache.size > 0) return skillsCache.get(skillKey) || null;
  return SWSE_SKILLS[skillKey] || null;
}

/**
 * Register Handlebars helpers
 * Note: These helpers ONLY rely on sync fallback OR cached async results.
 * THIS IS SAFE TO DO IN init — async loading happens later.
 */
Hooks.once("init", () => {

  Handlebars.registerHelper("skillAbility", skillKey => {
    const skill = getSkillConfigSync(skillKey);
    return skill ? skill.ability.toUpperCase() : "";
  });

  Handlebars.registerHelper("skillLabel", skillKey => {
    const skill = getSkillConfigSync(skillKey);
    return skill ? skill.label : skillKey;
  });

  Handlebars.registerHelper("canUseUntrained", skillKey => {
    const skill = getSkillConfigSync(skillKey);
    return skill ? skill.untrained : false;
  });
});

/**
 * Load skills AFTER Foundry is fully ready and compendiums are available.
 */
Hooks.once("ready", () => {
  loadSkillsFromCompendium()
    .then(() => console.log("SWSE Skills: Ready phase completed"))
    .catch(err => console.error("SWSE Skills: Ready load error", err));
});
