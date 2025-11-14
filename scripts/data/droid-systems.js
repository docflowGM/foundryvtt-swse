// ============================================
// FILE: scripts/data/droid-systems.js
// Droid Systems Data
// ============================================

export const DROID_SYSTEMS = {
  locomotion: [
    {
      id: "walking",
      name: "Walking",
      speeds: { small: 4, medium: 6, large: 8 },
      costFormula: (speed, costFactor) => 10 * costFactor * speed * speed,
      weightFormula: (costFactor) => 0,
      availability: "-"
    },
    {
      id: "wheeled",
      name: "Wheeled",
      speeds: { small: 6, medium: 8, large: 10 },
      costFormula: (speed, costFactor) => 5 * costFactor * speed * speed,
      weightFormula: (costFactor) => 0,
      availability: "-"
    },
    {
      id: "tracked",
      name: "Tracked",
      speeds: { small: 4, medium: 6, large: 8 },
      costFormula: (speed, costFactor) => 20 * costFactor * speed * speed,
      weightFormula: (costFactor) => 0,
      availability: "-"
    },
    {
      id: "hovering",
      name: "Hovering",
      speeds: { small: 6, medium: 6, large: 6 },
      costFormula: (speed, costFactor) => 100 * costFactor * speed * speed,
      weightFormula: (costFactor) => 0,
      availability: "-"
    },
    {
      id: "flying",
      name: "Flying",
      speeds: { small: 9, medium: 12, large: 12 },
      costFormula: (speed, costFactor) => 200 * costFactor * speed * speed,
      weightFormula: (costFactor) => 0,
      availability: "-"
    },
    {
      id: "burrower",
      name: "Burrower Drive",
      speeds: { small: 4, medium: 6, large: 8 },
      costFormula: (speed, costFactor) => 200 * costFactor * speed * speed,
      weightFormula: (costFactor) => 50 * costFactor,
      availability: "Restricted"
    },
    {
      id: "underwater",
      name: "Underwater Drive",
      speeds: { small: 4, medium: 6, large: 8 },
      costFormula: (speed, costFactor) => 20 * costFactor * speed * speed,
      weightFormula: (costFactor) => 10 * costFactor,
      availability: "Licensed"
    }
  ],

  processors: [
    {
      id: "basic",
      name: "Basic Processor",
      cost: 0,
      weight: 5,
      availability: "-",
      description: "Simple processor for basic tasks"
    },
    {
      id: "heuristic",
      name: "Heuristic Processor",
      cost: 2000,
      weight: 5,
      availability: "-",
      description: "Advanced learning processor (FREE for player droids)"
    },
    {
      id: "remote-5km",
      name: "Remote Processor (5km)",
      cost: 1000,
      weight: 10,
      availability: "-",
      description: "Remote control within 5km range"
    },
    {
      id: "remote-50km",
      name: "Remote Processor (50km)",
      cost: 10000,
      weight: 100,
      availability: "-",
      description: "Remote control within 50km range"
    },
    {
      id: "remote-500km",
      name: "Remote Processor (500km)",
      cost: 100000,
      weight: 1000,
      availability: "Military",
      description: "Remote control within 500km range"
    },
    {
      id: "remote-5000km",
      name: "Remote Processor (5000km)",
      cost: 1000000,
      weight: 10000,
      availability: "Military",
      description: "Remote control within 5000km range"
    },
    {
      id: "backup",
      name: "Backup Processor",
      cost: 100,
      weight: 0,
      availability: "-",
      description: "Emergency backup processor"
    },
    {
      id: "sync-fire",
      name: "Synchronized Fire Circuits",
      cost: 150,
      weight: 1,
      availability: "Military",
      description: "Coordinate fire with other droids"
    },
    {
      id: "restraining-bolt",
      name: "Restraining Bolt",
      cost: 5,
      weight: 0,
      availability: "-",
      description: "Control bolt for droid compliance"
    },
    {
      id: "specialized-subprocessor",
      name: "Specialized Subprocessor",
      cost: 1000,
      weight: 2,
      availability: "-",
      description: "Specialized processing for specific tasks"
    },
    {
      id: "tactician-computer",
      name: "Tactician Battle Computer",
      cost: 5000,
      weight: 10,
      availability: "Restricted",
      description: "Advanced tactical analysis"
    }
  ],

  appendages: [
    {
      id: "probe",
      name: "Probe",
      costFormula: (costFactor) => 2 * costFactor,
      weightFormula: (costFactor) => 0.5 * costFactor,
      availability: "-",
      description: "Delicate sensory appendage"
    },
    {
      id: "instrument",
      name: "Instrument",
      costFormula: (costFactor) => 5 * costFactor,
      weightFormula: (costFactor) => 1 * costFactor,
      availability: "-",
      description: "Precision tool appendage"
    },
    {
      id: "tool",
      name: "Tool",
      costFormula: (costFactor) => 10 * costFactor,
      weightFormula: (costFactor) => 2 * costFactor,
      availability: "-",
      description: "Versatile tool appendage"
    },
    {
      id: "claw",
      name: "Claw",
      costFormula: (costFactor) => 20 * costFactor,
      weightFormula: (costFactor) => 5 * costFactor,
      availability: "-",
      description: "Grasping claw appendage"
    },
    {
      id: "hand",
      name: "Hand",
      costFormula: (costFactor) => 50 * costFactor,
      weightFormula: (costFactor) => 5 * costFactor,
      availability: "-",
      description: "Dexterous hand appendage"
    },
    {
      id: "climbing-claws",
      name: "Climbing Claws",
      baseMultiplier: 2,
      availability: "-",
      description: "Appendage modification for climbing"
    },
    {
      id: "telescopic",
      name: "Telescopic Appendage",
      baseMultiplier: 2,
      weightMultiplier: 2,
      availability: "-",
      description: "Extending appendage"
    },
    {
      id: "stabilized-mount",
      name: "Stabilized Mount",
      baseMultiplier: 5,
      weightMultiplier: 5,
      availability: "-",
      description: "Weapon mount appendage"
    },
    {
      id: "magnetic-hands",
      name: "Magnetic Hands",
      baseMultiplier: 2,
      weightFormula: (costFactor) => 2 * costFactor,
      availability: "-",
      description: "Magnetic grip hands"
    },
    {
      id: "multifunction",
      name: "Multifunction Apparatus",
      costFormula: (costFactor) => 80 * costFactor,
      weightFormula: (costFactor) => 15 * costFactor,
      availability: "-",
      description: "Multi-purpose appendage"
    }
  ],

  accessories: {
    armor: [
      // Light Armor
      {
        id: "plasteel-shell",
        name: "Plasteel Shell",
        type: "Light Armor",
        costFormula: (costFactor) => 400 * costFactor,
        weightFormula: (costFactor) => 2 * costFactor,
        reflexBonus: 2,
        maxDex: 5,
        armorPenalty: -2,
        availability: "-"
      },
      {
        id: "quadanium-shell",
        name: "Quadanium Shell",
        type: "Light Armor",
        costFormula: (costFactor) => 900 * costFactor,
        weightFormula: (costFactor) => 3 * costFactor,
        reflexBonus: 3,
        maxDex: 4,
        armorPenalty: -2,
        availability: "-"
      },
      {
        id: "durasteel-shell",
        name: "Durasteel Shell",
        type: "Light Armor",
        costFormula: (costFactor) => 1600 * costFactor,
        weightFormula: (costFactor) => 8 * costFactor,
        reflexBonus: 4,
        maxDex: 4,
        armorPenalty: -2,
        availability: "-"
      },
      {
        id: "quadanium-plating",
        name: "Quadanium Plating",
        type: "Light Armor",
        costFormula: (costFactor) => 2500 * costFactor,
        weightFormula: (costFactor) => 10 * costFactor,
        reflexBonus: 5,
        maxDex: 3,
        armorPenalty: -2,
        availability: "Licensed"
      },
      {
        id: "durasteel-plating",
        name: "Durasteel Plating",
        type: "Light Armor",
        costFormula: (costFactor) => 3600 * costFactor,
        weightFormula: (costFactor) => 12 * costFactor,
        reflexBonus: 6,
        maxDex: 3,
        armorPenalty: -2,
        availability: "Licensed"
      },
      // Medium Armor
      {
        id: "quadanium-battle",
        name: "Quadanium Battle Armor",
        type: "Medium Armor",
        costFormula: (costFactor) => 4900 * costFactor,
        weightFormula: (costFactor) => 7 * costFactor,
        reflexBonus: 7,
        maxDex: 3,
        armorPenalty: -5,
        availability: "Restricted"
      },
      {
        id: "duranium-plating",
        name: "Duranium Plating",
        type: "Medium Armor",
        costFormula: (costFactor) => 6400 * costFactor,
        weightFormula: (costFactor) => 16 * costFactor,
        reflexBonus: 8,
        maxDex: 2,
        armorPenalty: -5,
        availability: "Restricted"
      },
      {
        id: "durasteel-battle",
        name: "Durasteel Battle Armor",
        type: "Medium Armor",
        costFormula: (costFactor) => 9600 * costFactor,
        weightFormula: (costFactor) => 8 * costFactor,
        reflexBonus: 8,
        maxDex: 3,
        armorPenalty: -5,
        availability: "Restricted"
      },
      // Heavy Armor
      {
        id: "mandalorian-steel",
        name: "Mandalorian Steel Shell",
        type: "Heavy Armor",
        costFormula: (costFactor) => 8100 * costFactor,
        weightFormula: (costFactor) => 9 * costFactor,
        reflexBonus: 9,
        maxDex: 3,
        armorPenalty: -10,
        availability: "Military, Rare"
      },
      {
        id: "duranium-battle",
        name: "Duranium Battle Armor",
        type: "Heavy Armor",
        costFormula: (costFactor) => 10000 * costFactor,
        weightFormula: (costFactor) => 10 * costFactor,
        reflexBonus: 10,
        maxDex: 2,
        armorPenalty: -10,
        availability: "Military"
      },
      {
        id: "neutronium-plating",
        name: "Neutronium Plating",
        type: "Heavy Armor",
        costFormula: (costFactor) => 12100 * costFactor,
        weightFormula: (costFactor) => 20 * costFactor,
        reflexBonus: 11,
        maxDex: 1,
        armorPenalty: -10,
        availability: "Military"
      }
    ],

    communications: [
      {
        id: "internal-comlink",
        name: "Internal Comlink",
        cost: 250,
        weight: 0.1,
        availability: "-",
        description: "Built-in communications device"
      },
      {
        id: "vocabulator",
        name: "Vocabulator",
        cost: 50,
        weight: 0.5,
        availability: "-",
        description: "Speech synthesis system"
      },
      {
        id: "droid-caller",
        name: "Droid Caller",
        cost: 10,
        weight: 0.2,
        availability: "-",
        description: "Remote activation beacon"
      },
      {
        id: "comm-countermeasures",
        name: "Communications Countermeasures",
        cost: 1000,
        weight: 3,
        availability: "Restricted",
        description: "Anti-eavesdropping systems"
      },
      {
        id: "comm-jammer",
        name: "Communications Jammer",
        cost: 5000,
        weight: 5,
        availability: "Military",
        description: "Jamming device"
      }
    ],

    sensors: [
      {
        id: "improved-sensors",
        name: "Improved Sensor Package",
        cost: 200,
        weight: 2.5,
        availability: "-",
        description: "Enhanced visual and auditory sensors"
      },
      {
        id: "darkvision",
        name: "Darkvision",
        cost: 150,
        weight: 1.5,
        availability: "-",
        description: "Low-light vision enhancement"
      },
      {
        id: "sensor-booster",
        name: "Sensor Booster",
        cost: 200,
        weight: 5,
        availability: "-",
        description: "Extended sensor range"
      },
      {
        id: "sensor-countermeasures",
        name: "Sensor Countermeasure Package",
        cost: 1000,
        weight: 2,
        availability: "-",
        description: "Anti-detection systems"
      },
      {
        id: "weapon-detector",
        name: "Weapon-Detector Package",
        cost: 1500,
        weight: 5,
        availability: "Licensed",
        description: "Detect concealed weapons"
      }
    ],

    shields: [
      {
        id: "sr5",
        name: "Shield Generator SR 5",
        costFormula: (costFactor) => 2500 * costFactor,
        weightFormula: (costFactor) => 10 * costFactor,
        shieldRating: 5,
        availability: "Military",
        description: "Personal energy shield"
      },
      {
        id: "sr10",
        name: "Shield Generator SR 10",
        costFormula: (costFactor) => 5000 * costFactor,
        weightFormula: (costFactor) => 20 * costFactor,
        shieldRating: 10,
        minSize: "small",
        availability: "Military",
        description: "Enhanced energy shield"
      },
      {
        id: "sr15",
        name: "Shield Generator SR 15",
        costFormula: (costFactor) => 7500 * costFactor,
        weightFormula: (costFactor) => 30 * costFactor,
        shieldRating: 15,
        minSize: "medium",
        availability: "Military",
        description: "Heavy energy shield"
      },
      {
        id: "sr20",
        name: "Shield Generator SR 20",
        costFormula: (costFactor) => 10000 * costFactor,
        weightFormula: (costFactor) => 40 * costFactor,
        shieldRating: 20,
        minSize: "large",
        availability: "Military",
        description: "Maximum energy shield"
      }
    ],

    translators: [
      {
        id: "translator-dc20",
        name: "Translator Unit (DC 20)",
        cost: 200,
        weight: 1,
        dc: 20,
        availability: "-",
        description: "Basic translation database"
      },
      {
        id: "translator-dc15",
        name: "Translator Unit (DC 15)",
        cost: 500,
        weight: 2,
        dc: 15,
        availability: "-",
        description: "Improved translation database"
      },
      {
        id: "translator-dc10",
        name: "Translator Unit (DC 10)",
        cost: 1000,
        weight: 4,
        dc: 10,
        availability: "-",
        description: "Advanced translation database"
      },
      {
        id: "translator-dc5",
        name: "Translator Unit (DC 5)",
        cost: 2000,
        weight: 8,
        dc: 5,
        availability: "-",
        description: "Comprehensive translation database"
      }
    ],

    misc: [
      {
        id: "compartment",
        name: "Compartment Space (per kg)",
        cost: 50,
        weight: 0,
        availability: "-",
        description: "Internal storage space"
      },
      {
        id: "diagnostics",
        name: "Diagnostics Package",
        cost: 250,
        weight: 4,
        availability: "-",
        description: "Self-diagnostic systems"
      },
      {
        id: "spring-loaded",
        name: "Spring-Loaded Mechanism",
        cost: 150,
        weight: 3,
        availability: "-",
        description: "Quick-release mechanism"
      },
      {
        id: "locked-access",
        name: "Locked Access",
        cost: 50,
        weight: 0,
        availability: "Licensed",
        description: "Security lock system"
      },
      {
        id: "secondary-battery",
        name: "Secondary Battery",
        cost: 400,
        weight: 4,
        availability: "-",
        description: "Backup power source"
      },
      {
        id: "self-destruct",
        name: "Self-Destruct System",
        costFormula: (maxDamage) => maxDamage * 20,
        weightFormula: (maxDamage) => maxDamage * 0.1,
        availability: "Restricted",
        description: "Emergency self-destruct"
      },
      {
        id: "scomp-link",
        name: "Scomp Link",
        cost: 100,
        weight: 1,
        availability: "-",
        description: "Computer interface jack"
      },
      {
        id: "holocamera",
        name: "Holographic Image Recorder",
        cost: 1000,
        weight: 2,
        availability: "-",
        description: "Records holographic images"
      },
      {
        id: "internal-grapple",
        name: "Internal Grapple Gun",
        costFormula: (costFactor) => 100 * costFactor,
        weightFormula: (costFactor) => 2 * costFactor,
        availability: "-",
        description: "Built-in grappling hook"
      },
      {
        id: "survival-kit",
        name: "Survival Kit",
        cost: 100,
        weight: 1,
        availability: "-",
        description: "Emergency supplies"
      }
    ]
  }
};
