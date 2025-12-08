#!/usr/bin/env node

/**
 * Force Powers Population Script
 * Migrates and populates forcepowers.db with complete data including DC charts
 */

const fs = require('fs');
const path = require('path');

const FORCE_POWERS_DB_PATH = path.join(__dirname, '../packs/forcepowers.db');
const BACKUP_PATH = path.join(__dirname, '../packs/forcepowers.db.backup');

/**
 * Force Power complete data definitions
 * Based on Saga Edition Core Rulebook and supplements
 */
const FORCE_POWER_DATA = {
  "Battle Meditation": {
    powerLevel: 2,
    discipline: "telepathic",
    useTheForce: 20,
    time: "Standard Action",
    range: "12 squares",
    target: "Allies within range",
    duration: "Concentration (up to 1 minute)",
    effect: "<p>You bolster the morale and combat effectiveness of your allies through the Force. All allies within range gain a +2 morale bonus to attack rolls, damage rolls, and Will Defense.</p>",
    special: "<p>You must maintain concentration as a Swift Action each round to keep this power active.</p>",
    descriptor: ["Mind-Affecting", "Light Side"],
    dcChart: [],
    maintainable: true,
    sourcebook: "Saga Edition Core Rulebook",
    page: 94,
    tags: ["buff", "support", "light-side"]
  },

  "Battle Strike": {
    powerLevel: 1,
    discipline: "telekinetic",
    useTheForce: 15,
    time: "Swift Action",
    range: "Personal",
    target: "You",
    duration: "1 round",
    effect: "<p>You channel the Force to enhance your next melee attack. Your next melee attack this round gains a +1d6 bonus to damage.</p>",
    special: "<p>This bonus damage is Force damage and bypasses Damage Reduction.</p>",
    descriptor: ["Telekinetic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 94,
    tags: ["enhancement", "damage", "melee"]
  },

  "Battlemind": {
    powerLevel: 1,
    discipline: "telepathic",
    useTheForce: 15,
    time: "Swift Action",
    range: "Personal",
    target: "You",
    duration: "1 round",
    effect: "<p>You focus your mind through the Force, gaining tactical clarity. You gain a +2 insight bonus to Reflex Defense until the start of your next turn.</p>",
    special: "",
    descriptor: ["Mind-Affecting"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 94,
    tags: ["defense", "buff"]
  },

  "Drain Energy": {
    powerLevel: 3,
    discipline: "dark-side",
    useTheForce: 15,
    time: "Standard Action",
    range: "6 squares",
    target: "One droid or electronic device",
    duration: "Instantaneous",
    effect: "<p>You drain the energy from technological devices through the Force. The target takes energy damage based on your Use the Force check result.</p>",
    special: "<p>This power only affects droids, vehicles, and electronic devices. This is a Dark Side power.</p>",
    descriptor: ["Dark Side"],
    dcChart: [
      {
        dc: 15,
        effect: "2d6 energy damage",
        description: "Target takes 2d6 energy damage"
      },
      {
        dc: 20,
        effect: "4d6 energy damage",
        description: "Target takes 4d6 energy damage"
      },
      {
        dc: 25,
        effect: "6d6 energy damage + disabled",
        description: "Target takes 6d6 energy damage and is disabled for 1 round"
      },
      {
        dc: 30,
        effect: "8d6 energy damage + shutdown",
        description: "Target takes 8d6 energy damage and shuts down for 1d4 rounds"
      }
    ],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 95,
    tags: ["attack", "damage", "dark-side", "anti-tech"]
  },

  "Drain Life": {
    powerLevel: 4,
    discipline: "dark-side",
    useTheForce: 15,
    time: "Standard Action",
    range: "6 squares",
    target: "One living creature",
    duration: "Instantaneous",
    effect: "<p>You drain the life force from your target, transferring their vitality to yourself. The target takes damage and you heal an equal amount.</p>",
    special: "<p>This is a Dark Side power. Using it gains you a Dark Side Point.</p>",
    descriptor: ["Dark Side", "Life Drain"],
    dcChart: [
      {
        dc: 15,
        effect: "2d6 damage/heal",
        description: "Target takes 2d6 damage; you heal 2d6 hit points"
      },
      {
        dc: 20,
        effect: "4d6 damage/heal",
        description: "Target takes 4d6 damage; you heal 4d6 hit points"
      },
      {
        dc: 25,
        effect: "6d6 damage/heal + weakened",
        description: "Target takes 6d6 damage and is weakened; you heal 6d6 hit points"
      },
      {
        dc: 30,
        effect: "8d6 damage/heal + exhausted",
        description: "Target takes 8d6 damage and is exhausted; you heal 8d6 hit points"
      }
    ],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 95,
    tags: ["attack", "healing", "dark-side", "drain"]
  },

  "Farseeing": {
    powerLevel: 2,
    discipline: "telepathic",
    useTheForce: 20,
    time: "1 minute",
    range: "Unlimited",
    target: "Special",
    duration: "Concentration",
    effect: "<p>You peer through the Force to see distant locations or events. You can observe a place you've been before or a person you know, regardless of distance.</p>",
    special: "<p>The GM may require additional checks for very distant or obscured visions.</p>",
    descriptor: ["Mind-Affecting", "Scrying"],
    dcChart: [],
    maintainable: true,
    sourcebook: "Saga Edition Core Rulebook",
    page: 95,
    tags: ["utility", "divination", "scrying"]
  },

  "Force Body": {
    powerLevel: 3,
    discipline: "vital",
    useTheForce: 25,
    time: "Reaction",
    range: "Personal",
    target: "You",
    duration: "1 round",
    effect: "<p>You use the Force to push your body beyond its normal limits. You gain Damage Reduction 10 and a +4 bonus to Strength until the start of your next turn.</p>",
    special: "<p>You can activate this power as a Reaction when you take damage.</p>",
    descriptor: ["Vital"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 95,
    tags: ["defense", "enhancement", "vital"]
  },

  "Force Cloak": {
    powerLevel: 2,
    discipline: "telepathic",
    useTheForce: 20,
    time: "Standard Action",
    range: "Personal",
    target: "You",
    duration: "Concentration",
    effect: "<p>You bend light and perceptions around yourself, becoming invisible. You gain total concealment and a +10 bonus to Stealth checks.</p>",
    special: "<p>The invisibility ends if you attack or use another Force power.</p>",
    descriptor: ["Mind-Affecting"],
    dcChart: [],
    maintainable: true,
    sourcebook: "Saga Edition Core Rulebook",
    page: 95,
    tags: ["stealth", "invisibility", "concealment"]
  },

  "Force Defense": {
    powerLevel: 1,
    discipline: "telekinetic",
    useTheForce: 15,
    time: "Reaction",
    range: "Personal",
    target: "You",
    duration: "Instantaneous",
    effect: "<p>You use the Force to deflect an incoming attack. You gain a +5 Force bonus to your Reflex Defense against one attack.</p>",
    special: "<p>You must use this power before the attack roll is made.</p>",
    descriptor: ["Telekinetic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 96,
    tags: ["defense", "reaction", "deflection"]
  },

  "Force Disarm": {
    powerLevel: 1,
    discipline: "telekinetic",
    useTheForce: 15,
    time: "Standard Action",
    range: "6 squares",
    target: "One creature",
    duration: "Instantaneous",
    effect: "<p>You use telekinetic force to wrench a weapon or object from your target's grasp. Make a Use the Force check opposed by the target's Strength check or Will Defense (whichever is higher).</p>",
    special: "<p>On success, the target drops one held object of your choice.</p>",
    descriptor: ["Telekinetic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 96,
    tags: ["combat", "disarm", "telekinetic"]
  },

  "Force Grip": {
    powerLevel: 3,
    discipline: "dark-side",
    useTheForce: 15,
    time: "Standard Action",
    range: "6 squares",
    target: "One creature",
    duration: "Concentration",
    effect: "<p>You use the Force to telekinetically choke or crush your target. The target takes damage each round based on your Use the Force check result.</p>",
    special: "<p>This is a Dark Side power. The target is immobilized while gripped.</p>",
    descriptor: ["Dark Side", "Telekinetic"],
    dcChart: [
      {
        dc: 15,
        effect: "2d6 damage/round",
        description: "Target takes 2d6 damage per round and is immobilized"
      },
      {
        dc: 20,
        effect: "4d6 damage/round",
        description: "Target takes 4d6 damage per round and is immobilized"
      },
      {
        dc: 25,
        effect: "6d6 damage/round + lift",
        description: "Target takes 6d6 damage per round, is immobilized, and lifted off ground"
      },
      {
        dc: 30,
        effect: "8d6 damage/round + crush",
        description: "Target takes 8d6 damage per round and is being crushed (fort save or die)"
      }
    ],
    maintainable: true,
    sourcebook: "Saga Edition Core Rulebook",
    page: 96,
    tags: ["attack", "damage", "dark-side", "telekinetic", "immobilize"]
  },

  "Force Lightning": {
    powerLevel: 4,
    discipline: "dark-side",
    useTheForce: 15,
    time: "Standard Action",
    range: "6 squares",
    target: "One creature",
    duration: "Instantaneous",
    effect: "<p>You unleash devastating arcs of Force Lightning from your fingertips. The target takes lightning damage based on your Use the Force check result.</p>",
    special: "<p>This is a Dark Side power. Using it gains you a Dark Side Point.</p>",
    descriptor: ["Dark Side", "Force Lightning"],
    dcChart: [
      {
        dc: 15,
        effect: "2d6 lightning damage",
        description: "Target takes 2d6 lightning damage"
      },
      {
        dc: 20,
        effect: "4d6 lightning damage",
        description: "Target takes 4d6 lightning damage"
      },
      {
        dc: 25,
        effect: "6d6 lightning damage + stun",
        description: "Target takes 6d6 lightning damage and is stunned for 1 round"
      },
      {
        dc: 30,
        effect: "8d6 lightning damage + stun 1d4",
        description: "Target takes 8d6 lightning damage and is stunned for 1d4 rounds"
      }
    ],
    maintainable: true,
    sourcebook: "Saga Edition Core Rulebook",
    page: 96,
    tags: ["attack", "damage", "dark-side", "lightning"]
  },

  "Force Scream": {
    powerLevel: 3,
    discipline: "dark-side",
    useTheForce: 20,
    time: "Standard Action",
    range: "6-square cone",
    target: "All creatures in area",
    duration: "Instantaneous",
    effect: "<p>You unleash a Force-amplified scream that can shatter objects and stun enemies. All creatures in the area must make a Fortitude save (DC = your Use the Force check) or be stunned for 1 round.</p>",
    special: "<p>This is a Dark Side power.</p>",
    descriptor: ["Dark Side", "Sonic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Force Unleashed Campaign Guide",
    page: 88,
    tags: ["area", "stun", "dark-side", "sonic"]
  },

  "Force Sense": {
    powerLevel: 1,
    discipline: "telepathic",
    useTheForce: 15,
    time: "Swift Action",
    range: "Personal",
    target: "You",
    duration: "1 round",
    effect: "<p>You open yourself to the Force, sensing danger and gaining heightened awareness. You cannot be surprised and gain a +5 bonus to Perception checks until the start of your next turn.</p>",
    special: "",
    descriptor: ["Mind-Affecting"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 96,
    tags: ["awareness", "perception", "defense"]
  },

  "Force Slam": {
    powerLevel: 2,
    discipline: "telekinetic",
    useTheForce: 20,
    time: "Standard Action",
    range: "6 squares",
    target: "One creature or object",
    duration: "Instantaneous",
    effect: "<p>You use telekinetic force to violently slam your target against a surface. The target takes 4d6 damage and is knocked prone.</p>",
    special: "<p>The target must be within 6 squares of a solid surface (wall, floor, ceiling).</p>",
    descriptor: ["Telekinetic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 97,
    tags: ["attack", "damage", "telekinetic", "prone"]
  },

  "Force Storm": {
    powerLevel: 6,
    discipline: "dark-side",
    useTheForce: 30,
    time: "Standard Action",
    range: "12 squares",
    target: "20-square radius",
    duration: "Concentration",
    effect: "<p>You create a massive Force storm of lightning and violent energy. All creatures in the area take 10d6 lightning damage each round (Reflex half, DC = your UTF check).</p>",
    special: "<p>This is a powerful Dark Side power. Using it gains you 2 Dark Side Points. Master-level power.</p>",
    descriptor: ["Dark Side", "Force Lightning", "Area"],
    dcChart: [
      {
        dc: 30,
        effect: "10d6 to all in area",
        description: "All creatures in 20-square radius take 10d6 lightning damage (Reflex half)"
      },
      {
        dc: 35,
        effect: "12d6 to all + stun",
        description: "All creatures take 12d6 damage (Reflex half) and are stunned 1 round (Fort negates)"
      },
      {
        dc: 40,
        effect: "15d6 to all + disintegrate",
        description: "All creatures take 15d6 damage; those reduced to 0 HP are disintegrated"
      }
    ],
    maintainable: true,
    sourcebook: "Saga Edition Core Rulebook",
    page: 97,
    tags: ["area", "damage", "dark-side", "master", "lightning"]
  },

  "Force Strike": {
    powerLevel: 1,
    discipline: "telekinetic",
    useTheForce: 15,
    time: "Standard Action",
    range: "6 squares",
    target: "One creature",
    duration: "Instantaneous",
    effect: "<p>You strike your target with a telekinetic blow. The target takes 2d6 Force damage and must make a Fortitude save (DC = your UTF check) or be knocked prone.</p>",
    special: "",
    descriptor: ["Telekinetic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 97,
    tags: ["attack", "damage", "telekinetic"]
  },

  "Force Stun": {
    powerLevel: 2,
    discipline: "telepathic",
    useTheForce: 20,
    time: "Standard Action",
    range: "6 squares",
    target: "One creature",
    duration: "1 round",
    effect: "<p>You use the Force to overwhelm your target's mind, stunning them. The target must make a Will save (DC = your UTF check) or be stunned for 1 round.</p>",
    special: "",
    descriptor: ["Mind-Affecting"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 97,
    tags: ["attack", "stun", "mind-affecting"]
  },

  "Force Thrust": {
    powerLevel: 2,
    discipline: "telekinetic",
    useTheForce: 20,
    time: "Standard Action",
    range: "6 squares",
    target: "One creature or object",
    duration: "Instantaneous",
    effect: "<p>You violently push your target away with telekinetic force. The target is pushed 6 squares away from you and knocked prone, taking 2d6 damage.</p>",
    special: "<p>If the target hits an obstacle during the push, they take an additional 1d6 damage per 2 squares not traveled.</p>",
    descriptor: ["Telekinetic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 97,
    tags: ["attack", "movement", "telekinetic", "forced-movement"]
  },

  "Force Track": {
    powerLevel: 1,
    discipline: "telepathic",
    useTheForce: 15,
    time: "1 minute",
    range: "Touch",
    target: "One creature",
    duration: "24 hours",
    effect: "<p>You place a Force 'mark' on your target, allowing you to track them through the Force. You always know the target's direction and approximate distance for the duration.</p>",
    special: "<p>The target can attempt a Will save (DC = your UTF check) to notice the mark.</p>",
    descriptor: ["Mind-Affecting"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 97,
    tags: ["utility", "tracking", "detection"]
  },

  "Force Weapon": {
    powerLevel: 1,
    discipline: "telekinetic",
    useTheForce: 15,
    time: "Swift Action",
    range: "Touch",
    target: "One weapon",
    duration: "1 minute",
    effect: "<p>You imbue a weapon with the Force, allowing it to bypass damage reduction and strike incorporeal creatures normally.</p>",
    special: "<p>The weapon is treated as a Force weapon for the duration.</p>",
    descriptor: ["Telekinetic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 98,
    tags: ["enhancement", "weapon", "telekinetic"]
  },

  "Inspire": {
    powerLevel: 1,
    discipline: "telepathic",
    useTheForce: 15,
    time: "Swift Action",
    range: "6 squares",
    target: "One ally",
    duration: "1 round",
    effect: "<p>You inspire an ally through the Force, granting them confidence and clarity. The target gains a +2 morale bonus to their next attack roll or skill check.</p>",
    special: "",
    descriptor: ["Mind-Affecting"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 98,
    tags: ["buff", "support", "morale"]
  },

  "Malacia": {
    powerLevel: 2,
    discipline: "vital",
    useTheForce: 20,
    time: "Standard Action",
    range: "6 squares",
    target: "One living creature",
    duration: "1 round/level",
    effect: "<p>You disrupt your target's inner ear and equilibrium through the Force. The target must make a Fortitude save (DC = your UTF check) or become nauseated for the duration.</p>",
    special: "<p>This is a non-lethal Light Side power favored by Jedi.</p>",
    descriptor: ["Vital", "Mind-Affecting", "Light Side"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 98,
    tags: ["debuff", "nausea", "non-lethal", "light-side"]
  },

  "Mind Trick": {
    powerLevel: 1,
    discipline: "telepathic",
    useTheForce: 15,
    time: "Standard Action",
    range: "6 squares",
    target: "One creature",
    duration: "1 minute or until completed",
    effect: "<p>You influence a weak mind to believe what you tell them or follow a simple suggestion. The target must make a Will save (DC = your UTF check) or be affected.</p>",
    special: "<p>The suggestion must be reasonable and the target must be able to understand you.</p>",
    descriptor: ["Mind-Affecting"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 98,
    tags: ["mind-control", "suggestion", "social"]
  },

  "Move Object": {
    powerLevel: 2,
    discipline: "telekinetic",
    useTheForce: 15,
    time: "Standard Action",
    range: "12 squares",
    target: "One object or creature",
    duration: "Concentration",
    effect: "<p>You move objects or creatures through the air using telekinesis. The maximum size/weight you can move depends on your Use the Force check result.</p>",
    special: "<p>Unwilling creatures can make a Will save (DC = your UTF check) to resist being moved.</p>",
    descriptor: ["Telekinetic"],
    dcChart: [
      {
        dc: 15,
        effect: "Medium (50 kg)",
        description: "Move objects up to Medium size or 50 kg"
      },
      {
        dc: 20,
        effect: "Large (250 kg)",
        description: "Move objects up to Large size or 250 kg"
      },
      {
        dc: 25,
        effect: "Huge (1 ton)",
        description: "Move objects up to Huge size or 1 metric ton"
      },
      {
        dc: 30,
        effect: "Gargantuan (5 tons)",
        description: "Move objects up to Gargantuan size or 5 metric tons"
      },
      {
        dc: 35,
        effect: "Colossal (20 tons)",
        description: "Move objects up to Colossal size or 20 metric tons (starfighter-sized)"
      }
    ],
    maintainable: true,
    sourcebook: "Saga Edition Core Rulebook",
    page: 98,
    tags: ["telekinetic", "movement", "utility"]
  },

  "Negate Energy": {
    powerLevel: 2,
    discipline: "telekinetic",
    useTheForce: 20,
    time: "Reaction",
    range: "Personal or touch",
    target: "You or one creature",
    duration: "Instantaneous",
    effect: "<p>You use the Force to absorb or deflect energy damage. The target gains energy resistance 20 against one energy attack.</p>",
    special: "<p>This power can be used as a Reaction when you or an ally is targeted by an energy attack.</p>",
    descriptor: ["Telekinetic"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 99,
    tags: ["defense", "energy-resistance", "protection"]
  },

  "Rebuke": {
    powerLevel: 2,
    discipline: "telepathic",
    useTheForce: 20,
    time: "Standard Action",
    range: "6 squares",
    target: "One Force-sensitive creature",
    duration: "1 round",
    effect: "<p>You overwhelm a Force user with a powerful Force presence. If the target is Force-sensitive, they must make a Will save (DC = your UTF check) or be dazed for 1 round.</p>",
    special: "<p>This power only affects Force-sensitive creatures.</p>",
    descriptor: ["Mind-Affecting"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 99,
    tags: ["debuff", "force-user", "daze"]
  },

  "Sever Force (Lesser)": {
    powerLevel: 3,
    discipline: "dark-side",
    useTheForce: 25,
    time: "Standard Action",
    range: "6 squares",
    target: "One Force-sensitive creature",
    duration: "1 encounter",
    effect: "<p>You temporarily sever your target's connection to the Force. The target cannot use Force Powers or Force Talents for the duration.</p>",
    special: "<p>This is a Dark Side power. The target can make a Will save (DC = your UTF check) to resist.</p>",
    descriptor: ["Dark Side", "Force Drain"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 99,
    tags: ["debuff", "dark-side", "force-drain"]
  },

  "Sever Force": {
    powerLevel: 6,
    discipline: "dark-side",
    useTheForce: 30,
    time: "1 minute",
    range: "Touch",
    target: "One Force-sensitive creature",
    duration: "Permanent",
    effect: "<p>You permanently sever a Force user's connection to the Force. The target loses all Force abilities permanently.</p>",
    special: "<p>This is an extremely powerful and cruel Dark Side power. Using it gains you 3 Dark Side Points. The target can make a Will save (DC = your UTF check) to resist. Master-level power.</p>",
    descriptor: ["Dark Side", "Force Drain"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 99,
    tags: ["debuff", "dark-side", "permanent", "master"]
  },

  "Surge": {
    powerLevel: 1,
    discipline: "vital",
    useTheForce: 15,
    time: "Swift Action",
    range: "Personal",
    target: "You",
    duration: "1 round",
    effect: "<p>You use the Force to push your body beyond normal limits. You gain an additional move action this turn.</p>",
    special: "<p>This extra move action can be used to move or perform other move-action tasks.</p>",
    descriptor: ["Vital"],
    dcChart: [],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 99,
    tags: ["enhancement", "action-economy", "movement"]
  },

  "Vital Transfer": {
    powerLevel: 3,
    discipline: "vital",
    useTheForce: 15,
    time: "Standard Action",
    range: "Touch",
    target: "One living creature",
    duration: "Instantaneous",
    effect: "<p>You channel the Force to heal injuries and restore vitality. The target recovers hit points based on your Use the Force check result.</p>",
    special: "<p>You cannot heal yourself with this power.</p>",
    descriptor: ["Vital", "Healing"],
    dcChart: [
      {
        dc: 15,
        effect: "2d6 healing",
        description: "Target heals 2d6 hit points"
      },
      {
        dc: 20,
        effect: "4d6 healing",
        description: "Target heals 4d6 hit points"
      },
      {
        dc: 25,
        effect: "6d6 healing + condition",
        description: "Target heals 6d6 hit points and removes one ongoing condition"
      },
      {
        dc: 30,
        effect: "8d6 healing + all conditions",
        description: "Target heals 8d6 hit points and removes all ongoing conditions"
      }
    ],
    maintainable: false,
    sourcebook: "Saga Edition Core Rulebook",
    page: 99,
    tags: ["healing", "vital", "support"]
  }
};

/**
 * Migrate and populate a force power
 */
function populateForcePower(power) {
  const powerData = FORCE_POWER_DATA[power.name];

  if (!powerData) {
    swseLogger.log(`⚠️  No data for ${power.name} - keeping as-is`);
    return power;
  }

  return {
    _id: power._id,
    name: power.name,
    type: "forcepower",
    img: power.img || "icons/svg/item-bag.svg",
    system: {
      powerLevel: powerData.powerLevel,
      discipline: powerData.discipline,
      useTheForce: powerData.useTheForce,
      time: powerData.time,
      range: powerData.range,
      target: powerData.target,
      duration: powerData.duration,
      effect: powerData.effect,
      special: powerData.special,
      descriptor: powerData.descriptor,
      dcChart: powerData.dcChart,
      maintainable: powerData.maintainable,
      sourcebook: powerData.sourcebook,
      page: powerData.page,
      tags: powerData.tags,
      inSuite: power.system?.inSuite || false,
      uses: power.system?.uses || { current: 0, max: 0 }
    },
    effects: power.effects || [],
    folder: power.folder || null,
    sort: power.sort || 0,
    ownership: power.ownership || { default: 0 },
    flags: power.flags || {}
  };
}

/**
 * Main migration function
 */
async function populateForcePowers() {
  swseLogger.log('🔮 Starting Force Powers population...\n');

  // 1. Backup original file
  swseLogger.log('📦 Creating backup...');
  fs.copyFileSync(FORCE_POWERS_DB_PATH, BACKUP_PATH);
  swseLogger.log(`✅ Backup created: ${BACKUP_PATH}\n`);

  // 2. Read all powers
  swseLogger.log('📖 Reading forcepowers.db...');
  const content = fs.readFileSync(FORCE_POWERS_DB_PATH, 'utf8');
  const lines = content.trim().split('\n');
  swseLogger.log(`✅ Found ${lines.length} force powers\n`);

  // 3. Parse and populate each power
  swseLogger.log('🔄 Populating force powers...');
  const populatedPowers = [];
  let successCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    try {
      const power = JSON.parse(line);
      const populated = populateForcePower(power);
      populatedPowers.push(populated);

      if (FORCE_POWER_DATA[power.name]) {
        successCount++;
        swseLogger.log(`  ✓ ${power.name}`);
      } else {
        skippedCount++;
        swseLogger.log(`  ⊘ ${power.name} (no data)`);
      }
    } catch (error) {
      swseLogger.error(`❌ Error processing power:`, error.message);
    }
  }

  swseLogger.log(`\n✅ Population complete: ${successCount} populated, ${skippedCount} skipped\n`);

  // 4. Write populated data back to file
  swseLogger.log('💾 Writing populated data...');
  const output = populatedPowers.map(p => JSON.stringify(p)).join('\n') + '\n';
  fs.writeFileSync(FORCE_POWERS_DB_PATH, output, 'utf8');
  swseLogger.log(`✅ Wrote ${populatedPowers.length} powers to ${FORCE_POWERS_DB_PATH}\n`);

  // 5. Generate report
  swseLogger.log('📊 Population Report:');
  swseLogger.log('═══════════════════════════════════════');
  swseLogger.log(`Total powers: ${lines.length}`);
  swseLogger.log(`Successfully populated: ${successCount}`);
  swseLogger.log(`Skipped (no data): ${skippedCount}`);
  swseLogger.log(`Backup location: ${BACKUP_PATH}`);
  swseLogger.log('═══════════════════════════════════════\n');

  // 6. DC Chart statistics
  const powersWithDC = populatedPowers.filter(p => p.system.dcChart && p.system.dcChart.length > 0);
  swseLogger.log('🎲 DC Chart Statistics:');
  swseLogger.log(`Powers with DC charts: ${powersWithDC.length}`);
  swseLogger.log('Powers:');
  powersWithDC.forEach(p => {
    swseLogger.log(`  - ${p.name} (${p.system.dcChart.length} tiers)`);
  });
  swseLogger.log();

  // 7. Sample populated power
  const samplePower = populatedPowers.find(p => p.name === "Force Lightning");
  if (samplePower) {
    swseLogger.log('🔍 Sample: Force Lightning');
    swseLogger.log(JSON.stringify(samplePower, null, 2).substring(0, 1500) + '...\n');
  }

  swseLogger.log('✨ Force Powers population complete!\n');
}

// Run population
populateForcePowers().catch(error => {
  swseLogger.error('❌ Population failed:', error);
  process.exit(1);
});
