/**
 * Houserules Reference Data (Upgraded for Foundry V13–V15)
 * Provides structured & immutable data for mechanics, menus, and presets.
 * Includes normalized accessors and safety checks for all houserule lookups.
 */

import { SWSELogger } from "../utils/logger.js";

/* -------------------------------------------------------------------------- */
/*                               IMMUTABLE DATA                               */
/* -------------------------------------------------------------------------- */

export const HouserulesData = Object.freeze({
  combatActions: Object.freeze({
    feint: Object.freeze({
      id: "combat-actions-feint",
      name: "Feint",
      description:
        "Make a Deception check as a Standard Action to set the DC of your opponent's Initiative check. If you beat their roll, they are treated as Flat-Footed against the first attack you make against them in the next round. Trained in Deception: Can target multiple foes as a Full-Round Action (-5 per extra target).",
      standardSkill: "deception",
      alternateSkill: "persuasion"
    }),
    secondWind: Object.freeze({
      id: "combat-actions-second-wind",
      name: "Second Wind",
      description:
        "Spend a standard action to regain HP and potentially improve condition track.",
      action: "standard",
      usesPerDay: "once"
    }),
    aim: Object.freeze({
      id: "combat-actions-aim",
      name: "Aim",
      description: "Gain bonus to next attack, ignore cover.",
      action: "standard"
    }),
    charge: Object.freeze({
      id: "combat-actions-charge",
      name: "Charge",
      description: "Move and attack with a bonus.",
      action: "full-round"
    })
  }),

  force: Object.freeze({
    talents: Object.freeze({
      block: Object.freeze({
        id: "talent-block",
        name: "Block",
        description: "Deflect melee attacks with lightsabers.",
        prereq: "Force Sensitive"
      }),
      deflect: Object.freeze({
        id: "talent-deflect",
        name: "Deflect",
        description: "Deflect ranged attacks with lightsabers.",
        prereq: "Force Sensitive"
      }),
      blockDeflectCombined: Object.freeze({
        id: "talent-block-deflect-combined",
        name: "Block & Deflect",
        description:
          "Combined talent: Deflect both melee and ranged attacks with a lightsaber.",
        prereq: "Force Sensitive"
      })
    }),

    attributes: Object.freeze({
      wisdom: Object.freeze({
        key: "wis",
        name: "Wisdom",
        abbreviation: "WIS",
        description: "Standard Force Training attribute."
      }),
      charisma: Object.freeze({
        key: "cha",
        name: "Charisma",
        abbreviation: "CHA",
        description: "Alternate Force Training attribute."
      })
    }),

    feats: Object.freeze({
      forceSensitive: Object.freeze({
        id: "feat-force-sensitive",
        name: "Force Sensitive",
        description: "Grants Use the Force and access to Force powers.",
        restriction: Object.freeze({
          standard: "any",
          restricted: "jedi-only"
        })
      })
    })
  }),

  combatConditions: Object.freeze({
    concealment: Object.freeze({
      id: "special-combat-condition-concealment",
      name: "Concealment",
      missChance: 20,
      description: "Target has concealment."
    }),
    totalConcealment: Object.freeze({
      id: "special-combat-condition-total-concealment",
      name: "Total Concealment",
      missChance: 50,
      description: "Target has total concealment."
    }),
    cover: Object.freeze({
      id: "special-combat-condition-cover-5",
      name: "Cover",
      bonus: 5,
      defense: "Reflex",
      description: "+5 to Reflex Defense."
    }),
    improvedCover: Object.freeze({
      id: "special-combat-condition-improved-cover-10",
      name: "Improved Cover",
      bonus: 10,
      defense: "Reflex",
      description: "+10 to Reflex Defense."
    }),
    flanking: Object.freeze({
      id: "special-combat-condition-flanking-2",
      name: "Flanking",
      bonus: 2,
      description: "+2 to melee attacks when flanking."
    }),
    suppression: Object.freeze({
      id: "special-combat-condition-suppressive-fire",
      name: "Suppressive Fire",
      description: "Area denial using automatic weapons."
    })
  }),

  skillUses: Object.freeze({
    feint: Object.freeze({
      standard: Object.freeze({
        id: "extraskilluses-feint-standard",
        name: "Feint (standard)",
        action: "standard",
        skill: "deception",
        dc: "opposed",
        opposedBy: "Will Defense",
        description: "Make opponent flat-footed vs. next attack."
      }),
      group: Object.freeze({
        id: "extraskilluses-group-feint-full-round",
        name: "Group Feint",
        action: "full-round",
        skill: "deception",
        dc: "opposed",
        description: "Feint against multiple opponents."
      })
    }),
    persuasion: Object.freeze({
      changeAttitude: Object.freeze({
        id: "extraskilluses-persuasion-change-attitude-full-round",
        name: "Persuasion (Change Attitude)",
        action: "full-round",
        skill: "persuasion",
        description: "Attempt to change a character's attitude."
      })
    })
  }),

  feats: Object.freeze({
    weaponFinesse: Object.freeze({
      id: "feat-weapon-finesse",
      name: "Weapon Finesse",
      description: "Use DEX modifier for melee attack rolls with light weapons."
    }),
    skillFocus: Object.freeze({
      id: "feat-skill-focus",
      name: "Skill Focus",
      description: "Gain a bonus to a single skill.",
      variants: Object.freeze({
        normal: Object.freeze({
          bonus: 5,
          description: "+5 bonus to chosen skill."
        }),
        scaled: Object.freeze({
          formula: "floor(level / 2)",
          max: 5,
          description: "+1 per 2 levels (max +5)."
        }),
        delayed: Object.freeze({
          bonus: 5,
          activationLevel: 7,
          description: "+5 bonus activated at chosen level."
        })
      })
    })
  }),

  spaceCombat: Object.freeze({
    roles: Object.freeze({
      pilot: Object.freeze({
        id: "role-pilot",
        name: "Pilot",
        description: "Controls ship movement and maneuvers.",
        primarySkill: "pilot",
        defaultPriority: 1
      }),
      shields: Object.freeze({
        id: "role-shields",
        name: "Shield Operator",
        description: "Manages defensive systems.",
        primarySkill: "mechanics",
        defaultPriority: 2
      }),
      weapons: Object.freeze({
        id: "role-weapons",
        name: "Weapons Operator",
        description: "Fires ship weapons.",
        primarySkill: "gunnery",
        defaultPriority: 3
      }),
      engineering: Object.freeze({
        id: "role-engineering",
        name: "Engineer",
        description: "Repairs and maintains ship systems.",
        primarySkill: "mechanics",
        defaultPriority: 4
      }),
      other: Object.freeze({
        id: "role-other",
        name: "Other Crew",
        description: "Miscellaneous crew operations.",
        defaultPriority: 5
      })
    })
  })
});

/* -------------------------------------------------------------------------- */
/*                               UTILITY ACCESSORS                             */
/* -------------------------------------------------------------------------- */

/**
 * Safe wrapper for pulling world houserule settings.
 */
function getSafe(setting, fallback) {
  try {
    const val = game.settings.get("foundryvtt-swse", setting);
    return val ?? fallback;
  } catch (err) {
    SWSELogger.warn(`HouserulesData: Failed to get setting "${setting}"`, err);
    return fallback;
  }
}

/* -------------------------------------------------------------------------- */
/*                             HOUSERULED FUNCTIONS                             */
/* -------------------------------------------------------------------------- */

/** 
 * Which skill Feint uses.
 */
export function getFeintSkill() {
  const setting = getSafe("feintSkill", "deception");
  return setting === "persuasion" ? "persuasion" : "deception";
}

/**
 * Skill Focus bonus (variant-based).
 */
export function getSkillFocusBonus(level) {
  const variant = getSafe("skillFocusVariant", "normal");

  switch (variant) {
    case "scaled":
      return Math.min(5, Math.trunc(level / 2));

    case "delayed": {
      const activation = getSafe("skillFocusActivationLevel", 7);
      return level >= activation ? 5 : 0;
    }

    case "normal":
    default:
      return 5;
  }
}

/**
 * Force Sensitive feat restriction.
 */
export function canTakeForceSensitive(actor) {
  const restricted = getSafe("forceSensitiveJediOnly", false);
  if (!restricted) return true;

  const jediClassNames = [
    "jedi",
    "jedi knight",
    "jedi master",
    "jedi guardian",
    "jedi consular",
    "jedi sentinel"
  ];

  const actorClasses = actor.items
    ?.filter((i) => i.type === "class")
    .map((c) => c.name.toLowerCase()) ?? [];

  return actorClasses.some((cls) => jediClassNames.includes(cls));
}

/**
 * Force Training attribute (wisdom or charisma).
 */
export function getForceTrainingAttribute() {
  const setting = getSafe("forceTrainingAttribute", "wisdom");
  return setting === "charisma"
    ? HouserulesData.force.attributes.charisma.key
    : HouserulesData.force.attributes.wisdom.key;
}

/**
 * Combined Block/Deflect?
 */
export function hasBlockDeflectCombined() {
  return getSafe("blockDeflectTalents", "separate") === "combined";
}

/**
 * Default Weapon Finesse granted?
 */
export function hasDefaultWeaponFinesse() {
  return !!getSafe("weaponFinesseDefault", false);
}

/**
 * Retrieve initiative role priority order.
 */
export function getRolePriorityOrder() {
  return (
    getSafe("initiativeRolePriority", null) ??
    ["pilot", "shields", "weapons", "engineering", "other"]
  );
}

/**
 * Is Block Mechanic Alternative enabled?
 */
export function isBlockMechanicalAlternativeEnabled() {
  return !!getSafe("blockMechanicalAlternative", false);
}
