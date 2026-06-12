/**
 * SWSE Force Power Category System
 *
 * Authoritative categorization of the official SWSE Force power selector inventory.
 * Powers are tagged with their mechanical and philosophical intent,
 * enabling context-aware suggestion and mentor guidance.
 *
 * Categories:
 * - vitality: Healing, endurance, preservation
 * - defense: Protection, barriers, resistance
 * - control: Manipulation, positioning, denial
 * - awareness: Insight, foresight, detection
 * - precision: Focused strikes, accuracy, enhancement
 * - aggression: Offensive, domination, pain
 * - support: Team buffs, enablement, cooperation
 * - mobility: Speed, positioning, movement
 * - risk: Powers that endanger the user
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

// ──────────────────────────────────────────────────────────────
// CANONICAL FORCE POWER CATEGORIES
// ──────────────────────────────────────────────────────────────

export const FORCE_POWER_CATEGORIES = {
  ballistakinesis: {
    name: "Ballistakinesis",
    categories: ["control","precision","aggression"],
    philosophy: "You use The Force to spray an area with dangerous debris",
    moralSlant: "neutral"
  },
  battle_strike: {
    name: "Battle Strike",
    categories: ["precision","aggression"],
    philosophy: "You channel the Force to enhance your next melee attack",
    moralSlant: "neutral"
  },
  blind: {
    name: "Blind",
    categories: ["control"],
    philosophy: "You hurl dirt, dust, and debris at your foe, affecting its sight",
    moralSlant: "neutral"
  },
  cloak: {
    name: "Cloak",
    categories: ["defense","mobility"],
    philosophy: "You bend light around your body, rendering yourself invisible to anyone looking in your direction",
    moralSlant: "neutral"
  },
  combustion: {
    name: "Combustion",
    categories: ["precision","aggression"],
    philosophy: "You use The Force to agitate particles in the air to create a pyrokinetic spray of sparks",
    moralSlant: "neutral"
  },
  convection: {
    name: "Convection",
    categories: ["precision","aggression"],
    philosophy: "You alter your body chemistry, causing your skin to burn with incredible heat",
    moralSlant: "neutral"
  },
  corruption: {
    name: "Corruption",
    categories: ["aggression","risk"],
    philosophy: "You use The Force to send a bolt of pure Dark Side vilness into an enemy",
    moralSlant: "sith_favored"
  },
  crucitorn: {
    name: "Crucitorn",
    categories: ["vitality"],
    philosophy: "You ignore the debilitating effects of pain and focus through trauma",
    moralSlant: "neutral"
  },
  cryokinesis: {
    name: "Cryokinesis",
    categories: ["control","defense"],
    philosophy: "You can use The Force to draw heat away from a target, causing its temperature to drop rapidly",
    moralSlant: "neutral"
  },
  dark_rage: {
    name: "Dark Rage",
    categories: ["aggression","risk"],
    philosophy: "You become enraged as the Dark Side flows through you",
    moralSlant: "sith_favored"
  },
  dark_transfer: {
    name: "Dark Transfer",
    categories: ["aggression","risk","vitality"],
    philosophy: "You use The Dark Side of The Force to restore vitality to a living ally",
    moralSlant: "sith_favored"
  },
  detonate: {
    name: "Detonate",
    categories: ["control","precision","aggression"],
    philosophy: "You can perceive points of weakness within an object and use The Force to telekinetically press on one of those points, shattering the object",
    moralSlant: "neutral"
  },
  drain_energy: {
    name: "Drain Energy",
    categories: ["control"],
    philosophy: "You drain the energy from technological devices through the Force",
    moralSlant: "neutral"
  },
  energy_resistance: {
    name: "Energy Resistance",
    categories: ["defense","control"],
    philosophy: "You use The Force to protect you from damage caused by energy, sonic, fire, cold, and electrical sources",
    moralSlant: "neutral"
  },
  enlighten: {
    name: "Enlighten",
    categories: ["control","awareness","support","defense"],
    philosophy: "You reach out to an ally telepathically, sharing visions of the near future to give the ally an edge or to protect the ally from harm",
    moralSlant: "jedi_favored"
  },
  farseeing: {
    name: "Farseeing",
    categories: ["awareness"],
    philosophy: "You peer through the Force to see distant locations or events",
    moralSlant: "neutral"
  },
  fear: {
    name: "Fear",
    categories: ["control","awareness","aggression","risk"],
    philosophy: "You summon The Dark Side to instill fear in your enemies",
    moralSlant: "sith_favored"
  },
  fold_space: {
    name: "Fold Space",
    categories: ["control","mobility"],
    philosophy: "You can use The Force to bend space, transporting an object almost instantaneously from one place to another",
    moralSlant: "neutral"
  },
  force_blast: {
    name: "Force Blast",
    categories: ["precision","aggression"],
    philosophy: "You use The Force to create a ball of compressed air and debris that you can hurl at enemy targets",
    moralSlant: "neutral"
  },
  force_disarm: {
    name: "Force Disarm",
    categories: ["control"],
    philosophy: "You use telekinetic force to wrench a weapon or object from your target's grasp",
    moralSlant: "neutral"
  },
  force_grip: {
    name: "Force Grip",
    categories: ["control","aggression"],
    philosophy: "Chokes or crushes an opponent, and may force the opponent to lose their Standard Action",
    moralSlant: "sith_favored"
  },
  force_light: {
    name: "Force Light",
    categories: ["support","defense"],
    philosophy: "You can draw The Force into yourself, turning you into a beacon of light that purges the taint of The Dark Side",
    moralSlant: "jedi_favored"
  },
  force_lightning: {
    name: "Force Lightning",
    categories: ["aggression","risk","precision"],
    philosophy: "You unleash devastating arcs of Force Lightning from your fingertips",
    moralSlant: "sith_favored"
  },
  force_scream: {
    name: "Force Scream",
    categories: ["aggression","risk"],
    philosophy: "You unleash a Force-amplified scream that can shatter objects and stun enemies",
    moralSlant: "sith_favored"
  },
  force_shield: {
    name: "Force Shield",
    categories: ["control","defense"],
    philosophy: "You use The Force to create a bubble of telekinetic energy around yourself, protecting you from harm",
    moralSlant: "neutral"
  },
  force_slam: {
    name: "Force Slam",
    categories: ["control"],
    philosophy: "You use telekinetic force to violently slam your target against a surface",
    moralSlant: "neutral"
  },
  force_storm: {
    name: "Force Storm",
    categories: ["aggression","risk","precision"],
    philosophy: "You can create a storm that draws upon The Dark Side of The Force, focusing its malicious intent on a certain area",
    moralSlant: "sith_favored"
  },
  force_storm_fucg: {
    name: "Force Storm (FUCG)",
    categories: ["control","aggression","risk","precision"],
    philosophy: "You use The Force to create a swirling whirlwind of Dark Side energy around yourself",
    moralSlant: "sith_favored"
  },
  force_stun: {
    name: "Force Stun",
    categories: ["control"],
    philosophy: "You use the Force to overwhelm your target's mind, stunning them",
    moralSlant: "neutral"
  },
  force_thrust: {
    name: "Force Thrust",
    categories: ["control"],
    philosophy: "You violently push your target away with telekinetic force",
    moralSlant: "neutral"
  },
  force_track: {
    name: "Force Track",
    categories: ["awareness"],
    philosophy: "You place a Force 'mark' on your target, allowing you to track them through the Force",
    moralSlant: "neutral"
  },
  force_whirlwind: {
    name: "Force Whirlwind",
    categories: ["control"],
    philosophy: "You call upon The Force to surround an enemy in a swirling vortex of Force energy",
    moralSlant: "neutral"
  },
  hatred: {
    name: "Hatred",
    categories: ["aggression","risk"],
    philosophy: "You give yourself over to The Dark Side, letting your hate radiate out from your body in palpable waves",
    moralSlant: "sith_favored"
  },
  inertia: {
    name: "Inertia",
    categories: ["defense"],
    philosophy: "You can use The Force to shift your body's inertia, allowing you to perform impossible stunts",
    moralSlant: "neutral"
  },
  inspire: {
    name: "Inspire",
    categories: ["support","defense"],
    philosophy: "You inspire an ally through the Force, granting them confidence and clarity",
    moralSlant: "jedi_favored"
  },
  intercept: {
    name: "Intercept",
    categories: ["control","defense"],
    philosophy: "You use The Force to telekinetically hurl a small object in the path of an incoming projectile, preventing it from striking you",
    moralSlant: "neutral"
  },
  ionize: {
    name: "Ionize",
    categories: ["precision","aggression"],
    philosophy: "You call upon The Force to overload electrical systems and Droids, damaging or even destroying the unit",
    moralSlant: "neutral"
  },
  kinetic_combat: {
    name: "Kinetic Combat",
    categories: ["control","precision","aggression"],
    philosophy: "You use The Force to manipulate your chosen Weapon, allowing it to operate independent of your grasp",
    moralSlant: "neutral"
  },
  levitate: {
    name: "Levitate",
    categories: ["control","mobility"],
    philosophy: "You can float up or down without anything or anyone to assist you",
    moralSlant: "neutral"
  },
  lightning_burst: {
    name: "Lightning Burst",
    categories: ["aggression","risk","precision"],
    philosophy: "You call upon The Dark Side to cause lightning to arc out from your body, striking adjacent enemies",
    moralSlant: "sith_favored"
  },
  malacia: {
    name: "Malacia",
    categories: ["support","defense","control"],
    philosophy: "You disrupt your target's inner ear and equilibrium through the Force",
    moralSlant: "jedi_favored"
  },
  memory_walk: {
    name: "Memory Walk",
    categories: ["control","awareness","aggression","risk"],
    philosophy: "You torment an enemy by causing them to relive their most horrible memories",
    moralSlant: "sith_favored"
  },
  mind_shard: {
    name: "Mind Shard",
    categories: ["control","awareness"],
    philosophy: "You use The Force to splinter the mind of an opponent, wracking it with pain",
    moralSlant: "neutral"
  },
  mind_trick: {
    name: "Mind Trick",
    categories: ["control","awareness"],
    philosophy: "You influence a weak mind to believe what you tell them or follow a simple suggestion",
    moralSlant: "neutral"
  },
  morichro: {
    name: "Morichro",
    categories: ["vitality"],
    philosophy: "You slow the vital functions of a target, causing them to slip into a deep sleep or even die",
    moralSlant: "neutral"
  },
  move_object: {
    name: "Move Object",
    categories: ["control"],
    philosophy: "You move objects or creatures through the air using telekinesis",
    moralSlant: "neutral"
  },
  negate_energy: {
    name: "Negate Energy",
    categories: ["defense","control"],
    philosophy: "You use the Force to absorb or deflect energy damage",
    moralSlant: "jedi_favored"
  },
  obscure: {
    name: "Obscure",
    categories: ["control","awareness"],
    philosophy: "You use The Force to cloud an enemy's mind, making it harder for the enemy to see its target",
    moralSlant: "neutral"
  },
  phase: {
    name: "Phase",
    categories: ["control","mobility"],
    philosophy: "You can pass through solid objects, such as walls and doors",
    moralSlant: "neutral"
  },
  plant_surge: {
    name: "Plant Surge",
    categories: ["control","mobility"],
    philosophy: "You reach out with The Force to entreat the aid of plants, causing them to lash out at your opponents",
    moralSlant: "neutral"
  },
  prescience: {
    name: "Prescience",
    categories: ["awareness"],
    philosophy: "The Force grants you a flash of insight in dealing with your enemies",
    moralSlant: "neutral"
  },
  rebuke: {
    name: "Rebuke",
    categories: ["defense"],
    philosophy: "You overwhelm a Force user with a powerful Force presence",
    moralSlant: "jedi_favored"
  },
  rend: {
    name: "Rend",
    categories: ["aggression","risk","precision"],
    philosophy: "You can move a single target, whether it is a creature or object, in two different directions simultaneously",
    moralSlant: "sith_favored"
  },
  repulse: {
    name: "Repulse",
    categories: ["control"],
    philosophy: "You use The Force to clear an area around yourself",
    moralSlant: "neutral"
  },
  resist_force: {
    name: "Resist Force",
    categories: ["defense"],
    philosophy: "You use The Force to protect yourself from an opponent's Force Powers",
    moralSlant: "jedi_favored"
  },
  sever_force: {
    name: "Sever Force",
    categories: ["support","defense"],
    philosophy: "You permanently sever a Force user's connection to the Force",
    moralSlant: "jedi_favored"
  },
  shatterpoint: {
    name: "Shatterpoint",
    categories: ["awareness"],
    philosophy: "You can see the critical point of something, whether it is a person or object, that would shatter if struck at the right time",
    moralSlant: "neutral"
  },
  slow: {
    name: "Slow",
    categories: ["control"],
    philosophy: "The Force enables you to slow your targets as if they are encumbered by an extremely heavy load, making it difficult for them to move",
    moralSlant: "neutral"
  },
  stagger: {
    name: "Stagger",
    categories: ["control"],
    philosophy: "You use The Force to lash out at a nearby enemy, causing it to stumble",
    moralSlant: "neutral"
  },
  surge: {
    name: "Surge",
    categories: ["mobility"],
    philosophy: "You use the Force to push your body beyond normal limits",
    moralSlant: "neutral"
  },
  technometry: {
    name: "Technometry",
    categories: ["awareness"],
    philosophy: "You can tap into and read technological devices and, in some cases, control them",
    moralSlant: "neutral"
  },
  thought_bomb: {
    name: "Thought Bomb",
    categories: ["control","awareness","aggression","risk"],
    philosophy: "You use The Force to radiate out harmful waves of telepathy, damaging the minds of nearby foes",
    moralSlant: "sith_favored"
  },
  valor: {
    name: "Valor",
    categories: ["support","defense"],
    philosophy: "You call upon the strength of The Force, reaching out to your ally and sharing your strength with them",
    moralSlant: "jedi_favored"
  },
  vital_transfer: {
    name: "Vital Transfer",
    categories: ["support","defense","vitality"],
    philosophy: "You channel the Force to heal injuries and restore vitality",
    moralSlant: "jedi_favored"
  },
  wound: {
    name: "Wound",
    categories: ["aggression","risk","precision"],
    philosophy: "You cause spasms in the lungs of your targets, painfully injuring them",
    moralSlant: "sith_favored"
  }
};

// ──────────────────────────────────────────────────────────────
// CATEGORY → ARCHETYPE BIAS TABLE (SSOT)
// ──────────────────────────────────────────────────────────────

export const FORCE_CATEGORY_ARCHETYPE_BIAS = {
  // Defense category
  defense: {
    jedi_guardian: 1.8,
    emperors_shield: 1.9,
    jedi_healer: 1.3,
    sith_juggernaut: 1.2,
    jedi_battlemaster: 1.1,
    imperial_knight_errant: 1.0
  },

  // Control category
  control: {
    jedi_consular: 1.7,
    jedi_mentor: 1.6,
    jedi_shadow: 1.4,
    sith_mastermind: 1.8,
    imperial_knight_inquisitor: 1.5
  },

  // Awareness category
  awareness: {
    jedi_seer: 1.9,
    jedi_archivist: 1.7,
    jedi_shadow: 1.4,
    jedi_mentor: 1.5,
    imperial_knight_errant: 1.3
  },

  // Precision category
  precision: {
    jedi_weapon_master: 1.8,
    jedi_battlemaster: 1.5,
    sith_assassin: 1.6,
    sith_marauder: 1.4
  },

  // Aggression category
  aggression: {
    sith_marauder: 1.9,
    sith_juggernaut: 2.0,
    sith_assassin: 1.5,
    jedi_battlemaster: 1.2,
    jedi_weapon_master: 1.1,
    sith_acolyte: 1.4
  },

  // Vitality category
  vitality: {
    jedi_healer: 2.0,
    jedi_mentor: 1.4,
    sith_alchemist: 1.3,
    jedi_consular: 0.9
  },

  // Support category
  support: {
    jedi_healer: 1.8,
    jedi_mentor: 1.7,
    jedi_consular: 1.4,
    jedi_battlemaster: 1.2,
    sith_mastermind: 1.0
  },

  // Mobility category
  mobility: {
    jedi_sentinel: 1.6,
    jedi_ace_pilot: 1.5,
    sith_assassin: 1.4,
    imperial_knight_errant: 1.5
  },

  // Risk category (should be penalized for most, encouraged for risk-takers)
  risk: {
    sith_marauder: 1.1,
    sith_juggernaut: 1.0,
    jedi_guardian: 0.7,
    jedi_healer: 0.5,
    jedi_mentor: 0.3
  }
};

// ──────────────────────────────────────────────────────────────
// VALIDATOR: Ensure all powers are categorized
// ──────────────────────────────────────────────────────────────

/**
 * Validate Force power category coverage
 * @throws Error if validation fails
 */
export function validateForcePowerCategories() {
  const errors = [];

  for (const [powerId, powerData] of Object.entries(FORCE_POWER_CATEGORIES)) {
    // Check required fields
    if (!powerData.name) {
      errors.push(`${powerId}: missing name`);
    }
    if (!powerData.categories || !Array.isArray(powerData.categories) || powerData.categories.length === 0) {
      errors.push(`${powerId}: missing or empty categories array`);
    }
    if (!powerData.philosophy) {
      errors.push(`${powerId}: missing philosophy description`);
    }
    if (!powerData.moralSlant || !['jedi_favored', 'sith_favored', 'neutral', 'jedi_only', 'sith_only'].includes(powerData.moralSlant)) {
      errors.push(`${powerId}: invalid moralSlant value`);
    }

    // Validate categories are real
    if (powerData.categories) {
      const validCategories = ['vitality', 'defense', 'control', 'awareness', 'precision', 'aggression', 'support', 'mobility', 'risk'];
      for (const cat of powerData.categories) {
        if (!validCategories.includes(cat)) {
          errors.push(`${powerId}: unknown category "${cat}"`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('❌ Force Power Category Validation Failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error('Invalid Force power category data');
  }

  console.log(`✅ Force Power Category Validation Passed (${Object.keys(FORCE_POWER_CATEGORIES).length} powers)`);
}

// ──────────────────────────────────────────────────────────────
// AUTO-GENERATION: Create archetype weights from categories
// ──────────────────────────────────────────────────────────────

/**
 * Generate archetype weights for a Force power based on its categories
 * @param {Array} categories - Power's assigned categories
 * @returns {Object} Weights keyed by archetype ID
 */
export function generateForcePowerArchetypeWeights(categories = []) {
  const archetypes = [
    'jedi_guardian',
    'jedi_sentinel',
    'jedi_consular',
    'jedi_ace_pilot',
    'jedi_healer',
    'jedi_battlemaster',
    'jedi_shadow',
    'jedi_weapon_master',
    'jedi_mentor',
    'jedi_seer',
    'jedi_archivist',
    'sith_marauder',
    'sith_assassin',
    'sith_acolyte',
    'sith_alchemist',
    'sith_mastermind',
    'sith_juggernaut',
    'emperors_shield',
    'imperial_knight_errant',
    'imperial_knight_inquisitor'
  ];

  const weights = {};

  for (const archetype of archetypes) {
    let score = 1.0;

    for (const category of categories) {
      const categoryBias = FORCE_CATEGORY_ARCHETYPE_BIAS[category]?.[archetype] ?? 1.0;
      score *= categoryBias;
    }

    weights[archetype] = Number(score.toFixed(2));
  }

  return weights;
}

export default {
  FORCE_POWER_CATEGORIES,
  FORCE_CATEGORY_ARCHETYPE_BIAS,
  validateForcePowerCategories,
  generateForcePowerArchetypeWeights
};
