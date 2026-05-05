/**
 * Mentor Language Mapper
 *
 * Maps bias tags → semantic meaning fragments
 * Does NOT generate dialogue
 * Does NOT compute or invent data
 * Does NOT let mentor voice leak in
 *
 * Contract:
 * - Input: roleBias, mechanicalBias, attributeBias from archetypes
 * - Output: semantic descriptor arrays and theme summaries
 * - Mentor voice layer uses these descriptors to compose dialogue
 * - Never generates full sentences
 * - Safe to ignore unknown tags
 */

const ROLE_TAG_MAP = {
  striker: {
    label: "precision striker",
    themes: ["precision", "offense"],
    descriptors: ["precise", "aggressive", "focused"]
  },
  defender: {
    label: "steadfast defender",
    themes: ["defense", "durability"],
    descriptors: ["durable", "protective", "steady"]
  },
  controller: {
    label: "battlefield controller",
    themes: ["control", "disruption"],
    descriptors: ["controlling", "tactical", "disruptive"]
  },
  support: {
    label: "support specialist",
    themes: ["support", "teamplay"],
    descriptors: ["supportive", "enabling", "stabilizing"]
  },
  leader: {
    label: "field leader",
    themes: ["leadership", "support"],
    descriptors: ["commanding", "coordinating", "inspiring"]
  },
  skirmisher: {
    label: "mobile skirmisher",
    themes: ["mobility", "pressure"],
    descriptors: ["mobile", "elusive", "opportunistic"]
  },
  flex: {
    label: "flexible combatant",
    themes: ["adaptability"],
    descriptors: ["adaptable", "versatile", "unpredictable"]
  },
  offense: {
    label: "offensive specialist",
    themes: ["offense"],
    descriptors: ["aggressive", "dangerous", "assertive"]
  }
};

const MECHANICAL_TAG_MAP = {
  accuracy: {
    label: "high accuracy",
    themes: ["precision"],
    descriptors: ["precise", "reliable"]
  },
  critRange: {
    label: "critical precision",
    themes: ["precision", "burst"],
    descriptors: ["sharp", "decisive"]
  },
  burstDamage: {
    label: "burst damage",
    themes: ["burst", "offense"],
    descriptors: ["explosive", "hard-hitting"]
  },
  sustainedDamage: {
    label: "sustained pressure",
    themes: ["pressure", "offense"],
    descriptors: ["relentless", "consistent"]
  },
  damageReduction: {
    label: "damage mitigation",
    themes: ["durability", "defense"],
    descriptors: ["resilient", "hard to break"]
  },
  reactionDefense: {
    label: "reactive defense",
    themes: ["defense", "awareness"],
    descriptors: ["alert", "responsive"]
  },
  evasion: {
    label: "evasive defense",
    themes: ["mobility", "survivability"],
    descriptors: ["evasive", "slippery"]
  },
  areaControl: {
    label: "area control",
    themes: ["control"],
    descriptors: ["controlling", "space-denying"]
  },
  battlefieldControl: {
    label: "battlefield control",
    themes: ["control", "tactics"],
    descriptors: ["commanding", "disruptive"]
  },
  forceDC: {
    label: "potent Force technique",
    themes: ["force", "control"],
    descriptors: ["potent", "forceful"]
  },
  forceUtility: {
    label: "Force utility",
    themes: ["force", "utility"],
    descriptors: ["versatile", "resourceful"]
  },
  healing: {
    label: "restorative support",
    themes: ["support", "recovery"],
    descriptors: ["restorative", "stabilizing"]
  },
  survivability: {
    label: "survivability",
    themes: ["durability", "survival"],
    descriptors: ["durable", "tenacious"]
  },
  mobility: {
    label: "mobility",
    themes: ["mobility"],
    descriptors: ["mobile", "fluid"]
  },
  initiative: {
    label: "initiative pressure",
    themes: ["tempo"],
    descriptors: ["quick", "proactive"]
  },
  utility: {
    label: "utility",
    themes: ["utility", "adaptability"],
    descriptors: ["adaptable", "resourceful"]
  },
  skillUtility: {
    label: "skill utility",
    themes: ["utility", "versatility"],
    descriptors: ["versatile", "competent"]
  },
  conditionTrack: {
    label: "condition effects",
    themes: ["control", "disruption"],
    descriptors: ["disruptive", "debilitating"]
  },
  forceSecret: {
    label: "Force potential",
    themes: ["force", "offense"],
    descriptors: ["potent", "powerful"]
  },
  forceRecovery: {
    label: "Force sustainability",
    themes: ["force", "durability"],
    descriptors: ["sustainable", "enduring"]
  }
};

const ATTRIBUTE_TAG_MAP = {
  str: {
    label: "strength-led",
    themes: ["power"],
    descriptors: ["powerful", "direct"]
  },
  dex: {
    label: "dexterity-led",
    themes: ["precision", "mobility"],
    descriptors: ["precise", "agile"]
  },
  con: {
    label: "constitution-backed",
    themes: ["durability"],
    descriptors: ["durable", "stubborn"]
  },
  int: {
    label: "intellect-driven",
    themes: ["planning", "technical"],
    descriptors: ["analytical", "deliberate"]
  },
  wis: {
    label: "wisdom-guided",
    themes: ["awareness", "discipline"],
    descriptors: ["aware", "measured"]
  },
  cha: {
    label: "charisma-shaped",
    themes: ["influence", "leadership"],
    descriptors: ["commanding", "persuasive"]
  }
};

/**
 * Sort bias object entries by value descending, filter out zeros
 * @private
 */
function sortBiasEntries(biasObject = {}) {
  return Object.entries(biasObject)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
}

/**
 * Collect mapped entries and deduplicate
 * @private
 */
function collectMapped(entries, map) {
  const labels = [];
  const descriptors = [];
  const themes = [];

  for (const [tag] of entries) {
    const mapped = map[tag];
    if (!mapped) continue; // Safely ignore unknown tags
    labels.push(mapped.label);
    descriptors.push(...mapped.descriptors);
    themes.push(...mapped.themes);
  }

  return {
    labels: unique(labels),
    descriptors: unique(descriptors),
    themes: unique(themes)
  };
}

/**
 * Get unique values from array
 * @private
 */
function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Get top N values from array
 * @private
 */
function topN(values = [], count = 3) {
  return values.slice(0, count);
}

/**
 * Map an archetype's bias profile to semantic language fragments.
 *
 * @param {Object} profile - { roleBias, mechanicalBias, attributeBias }
 * @returns {Object} Semantic descriptors and themes (no full sentences)
 *   {
 *     roleDescriptors: ["precision striker", ...],
 *     mechanicalDescriptors: ["high accuracy", ...],
 *     attributeDescriptors: ["dexterity-led", ...],
 *     summaryDescriptors: ["precise", "mobile", ...],
 *     dominantThemes: ["precision", "mobility", ...]
 *   }
 */
export function mapBiasProfileToLanguage({
  roleBias = {},
  mechanicalBias = {},
  attributeBias = {}
} = {}) {
  const roleEntries = sortBiasEntries(roleBias);
  const mechanicalEntries = sortBiasEntries(mechanicalBias);
  const attributeEntries = sortBiasEntries(attributeBias);

  const role = collectMapped(roleEntries, ROLE_TAG_MAP);
  const mechanical = collectMapped(mechanicalEntries, MECHANICAL_TAG_MAP);
  const attributes = collectMapped(attributeEntries, ATTRIBUTE_TAG_MAP);

  // Summary descriptors: top adjectives from each category
  const summaryDescriptors = unique([
    ...topN(role.descriptors, 2),
    ...topN(mechanical.descriptors, 2),
    ...topN(attributes.descriptors, 1)
  ]);

  // Dominant themes: top conceptual themes from each category
  const dominantThemes = unique([
    ...topN(role.themes, 2),
    ...topN(mechanical.themes, 2),
    ...topN(attributes.themes, 1)
  ]);

  return {
    roleDescriptors: topN(role.labels, 2),
    mechanicalDescriptors: topN(mechanical.labels, 3),
    attributeDescriptors: topN(attributes.labels, 2),
    summaryDescriptors: topN(summaryDescriptors, 4),
    dominantThemes: topN(dominantThemes, 4)
  };
}

/**
 * Get path disposition based on mentor memory state.
 * Used to label paths in UI without changing language mapper itself.
 *
 * @param {string} pathName - Archetype/path name
 * @param {Object} memory - Mentor memory state
 * @returns {string} "favored" | "rejected" | "neutral"
 */
export function getPathDisposition(pathName, memory) {
  if (memory?.committedPath === pathName) return "favored";
  if (memory?.rejectedPaths?.[pathName] > 0.35) return "rejected";
  return "neutral";
}

export default {
  mapBiasProfileToLanguage,
  getPathDisposition
};
