/**
 * LIGHTSABER CRYSTALS
 *
 * Complete mapping of Saga Edition lightsaber crystals
 * to weaponUpgrade items with modifiers
 *
 * Structure:
 * - Crystal name → ID
 * - Effect → Modifier(s)
 * - Build DC modifier
 * - Rarity
 * - Color(s)
 */

export const LIGHTSABER_CRYSTALS = {
  // TRADITIONAL JEWELS
  "bondar-crystal": {
    name: "Bondar Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "Lightsaber deals Stun damage instead of normal damage.",
    modifiers: [
      {
        type: "DAMAGE_TYPE_CHANGE",
        value: "stun",
        description: "Changes damage type to Stun"
      }
    ]
  },

  "corusca-gem": {
    name: "Corusca Gem",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+1 die of damage against a target with Damage Reduction.",
    modifiers: [
      {
        type: "CONDITIONAL_DAMAGE",
        value: "+1d",
        condition: "vs damage reduction",
        description: "+1 damage die vs DR"
      }
    ]
  },

  "dragite-crystal": {
    name: "Dragite Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 5,
    rarity: "common",
    cost: 0,
    effect: "+1 die of Sonic damage on critical hits.",
    modifiers: [
      {
        type: "CRITICAL_BONUS",
        value: "+1d sonic",
        description: "+1d sonic on crit"
      }
    ]
  },

  "durindfire-crystal": {
    name: "Durindfire Crystal",
    category: "Traditional Jewels",
    color: "Silver",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "Casts a glow as bright as a Fusion Lantern.",
    modifiers: [
      {
        type: "LIGHT_EMISSION",
        value: "bright (30ft)",
        description: "Emits bright light"
      }
    ]
  },

  "firkraan-crystal": {
    name: "Firkraan Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "Lightsaber deals Ion damage instead of normal damage.",
    modifiers: [
      {
        type: "DAMAGE_TYPE_CHANGE",
        value: "ion",
        description: "Changes damage type to Ion"
      }
    ]
  },

  "jenraux-crystal": {
    name: "Jenraux Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+2 Force bonus on Block attempts.",
    modifiers: [
      {
        type: "DEFENSE_BONUS",
        target: "block",
        value: 2,
        bonusType: "force",
        description: "+2 Force to Block"
      }
    ]
  },

  "kasha-crystal": {
    name: "Kasha Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+2 Force bonus to Will Defense.",
    modifiers: [
      {
        type: "DEFENSE_BONUS",
        target: "will",
        value: 2,
        bonusType: "force",
        description: "+2 Force to Will Defense"
      }
    ]
  },

  "opila-crystal": {
    name: "Opila Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+1 die of damage on critical hits.",
    modifiers: [
      {
        type: "CRITICAL_BONUS",
        value: "+1d",
        description: "+1d damage on crit"
      }
    ]
  },

  "phond-crystal": {
    name: "Phond Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+1 die of damage against targets with a Shield Rating.",
    modifiers: [
      {
        type: "CONDITIONAL_DAMAGE",
        value: "+1d",
        condition: "vs shield rating",
        description: "+1d vs shielded"
      }
    ]
  },

  "rubat-crystal": {
    name: "Rubat Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "Reroll one damage roll per encounter.",
    modifiers: [
      {
        type: "REROLL_ABILITY",
        uses: "1/encounter",
        target: "damage",
        description: "Reroll 1 damage/encounter"
      }
    ]
  },

  "sigil-crystal": {
    name: "Sigil Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+2 Force bonus on damage rolls.",
    modifiers: [
      {
        type: "DAMAGE_BONUS",
        value: 2,
        bonusType: "force",
        target: "damage",
        description: "+2 Force to damage"
      }
    ]
  },

  "solari-crystal": {
    name: "Solari Crystal",
    category: "Traditional Jewels",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+2 Force bonus to Deflect attempts.",
    modifiers: [
      {
        type: "DEFENSE_BONUS",
        target: "deflect",
        value: 2,
        bonusType: "force",
        description: "+2 Force to Deflect"
      }
    ]
  },

  // ADEGAN CRYSTALS
  "kathracite-crystal": {
    name: "Kathracite Crystal",
    category: "Adegan Crystals",
    color: "Varies",
    buildDcMod: -5,
    rarity: "common",
    cost: 0,
    effect: "Reduces the weapon's damage die by one step; +1 bonus on attack rolls.",
    modifiers: [
      {
        type: "DAMAGE_REDUCTION",
        value: "-1d",
        description: "Damage die -1 step"
      },
      {
        type: "ATTACK_BONUS",
        value: 1,
        target: "attack",
        description: "+1 attack"
      }
    ]
  },

  "mephite-crystal": {
    name: "Mephite Crystal",
    category: "Adegan Crystals",
    color: "Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+1 bonus on attack rolls.",
    modifiers: [
      {
        type: "ATTACK_BONUS",
        value: 1,
        target: "attack",
        description: "+1 attack"
      }
    ]
  },

  "pontite-crystal": {
    name: "Pontite Crystal",
    category: "Adegan Crystals",
    color: "Blue or Green",
    buildDcMod: 5,
    rarity: "common",
    cost: 0,
    effect: "Take no penalty on Persuasion check against Unfriendly or Indifferent creatures.",
    modifiers: [
      {
        type: "SKILL_BONUS",
        skill: "persuasion",
        value: 0,
        condition: "vs unfriendly/indifferent",
        description: "No penalty on Persuasion vs unfriendly"
      }
    ]
  },

  // ILUM CRYSTALS
  "ilum-crystal": {
    name: "Ilum Crystal",
    category: "Ilum Crystals",
    color: "Blue or Green",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+1 bonus on attack rolls.",
    modifiers: [
      {
        type: "ATTACK_BONUS",
        value: 1,
        target: "attack",
        description: "+1 attack"
      }
    ]
  },

  // SYNTHETIC CRYSTALS
  "compressed-crystal": {
    name: "Compressed Crystal",
    category: "Synthetic Crystals",
    color: "Red or Varies",
    buildDcMod: 5,
    rarity: "common",
    cost: 0,
    effect: "Increases difficulty of Block attempts.",
    modifiers: [
      {
        type: "ENEMY_PENALTY",
        target: "block",
        value: -2,
        description: "-2 to enemy Block attempts"
      }
    ]
  },

  "standard-synthetic-crystal": {
    name: "Standard Synthetic Crystal",
    category: "Synthetic Crystals",
    color: "Red or Varies",
    buildDcMod: 0,
    rarity: "common",
    cost: 0,
    effect: "+1 bonus on attack rolls.",
    modifiers: [
      {
        type: "ATTACK_BONUS",
        value: 1,
        target: "attack",
        description: "+1 attack"
      }
    ]
  },

  "unstable-crystal": {
    name: "Unstable Crystal",
    category: "Synthetic Crystals",
    color: "Red or Varies",
    buildDcMod: 5,
    rarity: "common",
    cost: 0,
    effect: "+1 die of damage on critical hits; deactivates on a Natural 1.",
    modifiers: [
      {
        type: "CRITICAL_BONUS",
        value: "+1d",
        description: "+1d on crit"
      },
      {
        type: "CRITICAL_FAILURE",
        trigger: "natural 1",
        effect: "deactivates",
        description: "Deactivates on natural 1"
      }
    ]
  },

  // RARE CRYSTALS
  "ankarres-sapphire": {
    name: "Ankarres Sapphire",
    category: "Rare Crystals",
    color: "Blue",
    buildDcMod: 5,
    rarity: "rare",
    cost: 0,
    effect: "Improves one's healing ability while wielding the Lightsaber.",
    modifiers: [
      {
        type: "HEALING_BONUS",
        value: "+2",
        description: "+2 to healing received"
      }
    ]
  },

  "barab-ingot": {
    name: "Barab Ingot",
    category: "Rare Crystals",
    color: "Varies",
    buildDcMod: 5,
    rarity: "rare",
    cost: 0,
    effect: "Lightsaber deals Fire damage instead of normal damage.",
    modifiers: [
      {
        type: "DAMAGE_TYPE_CHANGE",
        value: "fire",
        description: "Changes damage type to Fire"
      }
    ]
  },

  "dantari-crystal": {
    name: "Dantari Crystal",
    category: "Rare Crystals",
    color: "Varies",
    buildDcMod: 0,
    rarity: "rare",
    cost: 0,
    effect: "Reflects the light or darkness within the wielder.",
    modifiers: [
      {
        type: "ALIGNMENT_REFLECTION",
        description: "Reflects wielder alignment"
      }
    ]
  },

  "heart-of-the-guardian": {
    name: "Heart of the Guardian",
    category: "Rare Crystals",
    color: "Orange",
    buildDcMod: 10,
    rarity: "rare",
    cost: 0,
    effect: "+2 Force bonus on attack rolls against Lightsaber-wielders.",
    modifiers: [
      {
        type: "CONDITIONAL_ATTACK",
        value: 2,
        bonusType: "force",
        condition: "vs lightsaber wielders",
        description: "+2 Force attack vs saber"
      }
    ]
  },

  "hurikane-crystal": {
    name: "Hurikane Crystal",
    category: "Rare Crystals",
    color: "Blue or Violet",
    buildDcMod: 5,
    rarity: "rare",
    cost: 0,
    effect: "+2 Force bonus on attack rolls against targets in armor.",
    modifiers: [
      {
        type: "CONDITIONAL_ATTACK",
        value: 2,
        bonusType: "force",
        condition: "vs armored targets",
        description: "+2 Force attack vs armor"
      }
    ]
  },

  "kaiburr-crystal-shard": {
    name: "Kaiburr Crystal Shard",
    category: "Rare Crystals",
    color: "Crimson",
    buildDcMod: 5,
    rarity: "rare",
    cost: 0,
    effect: "Increases Force Point die type by one step when adding to attack rolls.",
    modifiers: [
      {
        type: "FORCE_POINT_DIE_UPGRADE",
        description: "Force Point die +1 step on attack"
      }
    ]
  },

  "krayt-dragon-pearl": {
    name: "Krayt Dragon Pearl",
    category: "Rare Crystals",
    color: "Varies",
    buildDcMod: 10,
    rarity: "rare",
    cost: 0,
    effect: "+3 Force bonus on damage rolls.",
    modifiers: [
      {
        type: "DAMAGE_BONUS",
        value: 3,
        bonusType: "force",
        target: "damage",
        description: "+3 Force to damage"
      }
    ]
  },

  "lambent-crystal": {
    name: "Lambent Crystal",
    category: "Rare Crystals",
    color: "Varies",
    buildDcMod: 10,
    rarity: "rare",
    cost: 0,
    effect: "Ignore restrictions on sensing Yuuzhan Vong.",
    modifiers: [
      {
        type: "SENSE_OVERRIDE",
        target: "yuuzhan-vong",
        description: "Sense Yuuzhan Vong normally"
      }
    ]
  },

  "mantle-of-the-force": {
    name: "Mantle of the Force",
    category: "Rare Crystals",
    color: "Cyan",
    buildDcMod: 10,
    rarity: "rare",
    cost: 0,
    effect: "+2 Force bonus on Use the Force checks to activate personal Force Powers.",
    modifiers: [
      {
        type: "SKILL_BONUS",
        skill: "use-the-force",
        value: 2,
        bonusType: "force",
        condition: "personal force powers",
        description: "+2 Force to Use Force for powers"
      }
    ]
  }
};

export default LIGHTSABER_CRYSTALS;
