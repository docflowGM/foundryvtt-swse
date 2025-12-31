// ============================================
// FILE: scripts/data/droid-systems.js
// Droid Structural Systems (Blueprint-Level)
// ============================================
//
// This file defines NON-INVENTORY, structural droid systems.
// These systems describe how a droid is BUILT, not what it equips.
//
// Installable equipment (armor, shields, sensors, translators,
// communications, misc systems, etc.) MUST be defined as Items
// and stored in compendiums.
//
// This file is safe to reference from:
// - Blueprint mode UI
// - Droid creation workflows
// - Validation logic
// - Derived data (movement model, appendage capabilities)
//
// This file should NEVER mutate actor data directly.
// ============================================

export const DROID_SYSTEMS = {

  // ======================================================================
  // LOCOMOTION SYSTEMS
  // ======================================================================
  // A droid may have multiple locomotion systems, but only one
  // may be active at a time (resolved in derived data).
  //
  // Costs for additional locomotion systems are handled elsewhere.
  // ======================================================================
  locomotion: [
    {
      id: "walking",
      name: "Walking",
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (speed, costFactor) => Math.ceil(speed * 10 * costFactor),
      weightFormula: (costFactor) => 5 * costFactor,
      availability: "-"
    },
    {
      id: "wheeled",
      name: "Wheeled",
      speeds: { tiny: 6, small: 6, medium: 8, large: 10, huge: 10, gargantuan: 10, colossal: 10 },
      costFormula: (speed, costFactor) => Math.ceil(speed * 15 * costFactor),
      weightFormula: (costFactor) => 4 * costFactor,
      availability: "-"
    },
    {
      id: "tracked",
      name: "Tracked",
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (speed, costFactor) => Math.ceil(speed * 12 * costFactor),
      weightFormula: (costFactor) => 6 * costFactor,
      availability: "-"
    },
    {
      id: "hovering",
      name: "Hovering",
      speeds: { tiny: 6, small: 6, medium: 6, large: 6, huge: 6, gargantuan: 6, colossal: 6 },
      costFormula: (speed, costFactor) => Math.ceil(speed * 20 * costFactor),
      weightFormula: (costFactor) => 3 * costFactor,
      availability: "-"
    },
    {
      id: "flying",
      name: "Flying",
      speeds: { tiny: 9, small: 9, medium: 12, large: 12, huge: 12, gargantuan: 12, colossal: 12 },
      costFormula: (speed, costFactor) => Math.ceil(speed * 25 * costFactor),
      weightFormula: (costFactor) => 3 * costFactor,
      availability: "-"
    },
    {
      id: "burrower",
      name: "Burrower Drive",
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (speed, costFactor) => Math.ceil(speed * 18 * costFactor),
      weightFormula: (costFactor) => 7 * costFactor,
      availability: "Restricted"
    },
    {
      id: "underwater",
      name: "Underwater Drive",
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (speed, costFactor) => Math.ceil(speed * 16 * costFactor),
      weightFormula: (costFactor) => 5 * costFactor,
      availability: "Licensed"
    }
  ],

  // ======================================================================
  // PROCESSOR CATEGORIES
  // ======================================================================
  // These define the TYPE of processor architecture a droid uses.
  // Specific processor hardware (remote processors, backup processors,
  // tactician computers, restraining bolts, etc.) are ITEMS.
  //
  // A droid's Intelligence score represents processor quality.
  // ======================================================================
  processors: [
    {
      id: "basic",
      name: "Basic Processor",
      behavioralInhibitors: true,
      description: "Simple processor for basic, task-focused droids.",
      cost: 100,
      weight: 3,
      availability: "-"
    },
    {
      id: "heuristic",
      name: "Heuristic Processor",
      behavioralInhibitors: true,
      description: "Advanced learning processor capable of independent reasoning.",
      cost: 0,
      weight: 5,
      availability: "-"
    },
    {
      id: "remote",
      name: "Remote-Control Processor",
      behavioralInhibitors: true,
      description: "Processor designed to be controlled remotely.",
      costFormula: (costFactor) => Math.ceil(200 * costFactor),
      weightFormula: (costFactor) => 2 * costFactor,
      availability: "Restricted"
    },
    {
      id: "military",
      name: "Military Processor",
      behavioralInhibitors: false,
      description: "Combat-oriented processor with relaxed ethical constraints.",
      costFormula: (costFactor) => Math.ceil(300 * costFactor),
      weightFormula: (costFactor) => 4 * costFactor,
      availability: "Military"
    }
  ],

  // ======================================================================
  // APPENDAGE TEMPLATES
  // ======================================================================
  // Appendages define WHAT a droid can manipulate, not how many
  // actions it gains. A droid may have any number of appendages.
  //
  // Unarmed damage, attack resolution, and STR modifiers are handled
  // in derived data, not here.
  // ======================================================================
  appendages: [
    {
      id: "probe",
      name: "Probe",
      role: "sensory",
      canManipulate: false,
      canAttack: false,
      description: "Delicate sensory appendage.",
      cost: 50,
      weight: 0.5,
      availability: "-"
    },
    {
      id: "instrument",
      name: "Instrument",
      role: "precision",
      canManipulate: true,
      canAttack: false,
      description: "Precision instrument for fine tasks.",
      cost: 75,
      weight: 0.5,
      availability: "-"
    },
    {
      id: "tool",
      name: "Tool",
      role: "utility",
      canManipulate: true,
      canAttack: false,
      description: "General-purpose tool appendage.",
      cost: 100,
      weight: 1,
      availability: "-"
    },
    {
      id: "claw",
      name: "Claw",
      role: "combat",
      canManipulate: true,
      canAttack: true,
      description: "Grasping claw capable of unarmed attacks.",
      cost: 150,
      weight: 1.5,
      availability: "-"
    },
    {
      id: "hand",
      name: "Hand",
      role: "manipulation",
      canManipulate: true,
      canAttack: true,
      description: "Dexterous humanoid-style hand.",
      cost: 200,
      weight: 1.5,
      availability: "-"
    },
    {
      id: "mount",
      name: "Stabilized Mount",
      role: "weapon",
      canManipulate: false,
      canAttack: false,
      description: "Weapon mount; does not grant additional attacks.",
      cost: 125,
      weight: 2,
      availability: "-"
    }
  ],

  // ======================================================================
  // ACCESSORIES
  // ======================================================================
  // Installable accessories and equipment for droids.
  // These are defined inline for quick reference in droid builders.
  // ======================================================================
  accessories: {
    armor: [
      {
        id: "light-plating",
        name: "Light Plating",
        type: "Light",
        description: "Lightweight armor plating.",
        armorBonus: 2,
        maxDex: null,
        armorCheckPenalty: 0,
        cost: 150,
        weight: 5,
        availability: "-"
      },
      {
        id: "medium-plating",
        name: "Medium Plating",
        type: "Medium",
        description: "Standard armor plating.",
        armorBonus: 4,
        maxDex: 2,
        armorCheckPenalty: -1,
        cost: 300,
        weight: 10,
        availability: "-"
      },
      {
        id: "heavy-plating",
        name: "Heavy Plating",
        type: "Heavy",
        description: "Reinforced armor plating.",
        armorBonus: 6,
        maxDex: 1,
        armorCheckPenalty: -3,
        cost: 500,
        weight: 20,
        availability: "-"
      }
    ],
    communications: [
      {
        id: "basic-comlink",
        name: "Basic Comlink",
        description: "Standard short-range communication device.",
        cost: 50,
        weight: 0.5,
        availability: "-"
      },
      {
        id: "encrypted-comlink",
        name: "Encrypted Comlink",
        description: "Secure communication with encryption.",
        cost: 150,
        weight: 0.5,
        availability: "Restricted"
      },
      {
        id: "hologram-projector",
        name: "Hologram Projector",
        description: "Projects small holographic images.",
        cost: 250,
        weight: 2,
        availability: "-"
      }
    ],
    sensors: [
      {
        id: "basic-sensors",
        name: "Basic Sensors",
        description: "Standard visual and auditory sensors.",
        bonus: "+2 Perception",
        cost: 100,
        weight: 1,
        availability: "-"
      },
      {
        id: "enhanced-sensors",
        name: "Enhanced Sensors",
        description: "Advanced sensory package with thermal and motion detection.",
        bonus: "+4 Perception",
        cost: 250,
        weight: 2,
        availability: "-"
      },
      {
        id: "scanner-array",
        name: "Scanner Array",
        description: "Full-spectrum scanning capabilities.",
        bonus: "+6 Perception, Scan",
        cost: 400,
        weight: 3,
        availability: "-"
      }
    ],
    shields: [
      {
        id: "light-shield",
        name: "Light Shield Generator",
        description: "Basic energy shield protection.",
        sr: 5,
        sizeMinimum: "medium",
        cost: 200,
        weight: 2,
        availability: "-"
      },
      {
        id: "medium-shield",
        name: "Medium Shield Generator",
        description: "Standard energy shield.",
        sr: 10,
        sizeMinimum: "large",
        cost: 500,
        weight: 5,
        availability: "-"
      },
      {
        id: "heavy-shield",
        name: "Heavy Shield Generator",
        description: "Heavy-duty energy shield.",
        sr: 15,
        sizeMinimum: "huge",
        cost: 1000,
        weight: 10,
        availability: "Restricted"
      }
    ],
    translators: [
      {
        id: "basic-translator",
        name: "Basic Translator",
        description: "Communicates in common languages.",
        dc: 10,
        cost: 100,
        weight: 1,
        availability: "-"
      },
      {
        id: "advanced-translator",
        name: "Advanced Translator",
        description: "Extended language database.",
        dc: 15,
        cost: 250,
        weight: 1,
        availability: "-"
      },
      {
        id: "universal-translator",
        name: "Universal Translator",
        description: "Learns and adapts to any language.",
        dc: 20,
        cost: 500,
        weight: 2,
        availability: "Restricted"
      }
    ],
    miscellaneous: [
      {
        id: "manipulator-arm",
        name: "Manipulator Arm",
        description: "Additional articulated limb for fine work.",
        cost: 150,
        weight: 2,
        availability: "-"
      },
      {
        id: "repulsor-lift",
        name: "Repulsor Lift",
        description: "Anti-gravity lift system.",
        cost: 300,
        weight: 3,
        availability: "Restricted"
      },
      {
        id: "battery-backup",
        name: "Battery Backup System",
        description: "Redundant power supply.",
        cost: 100,
        weight: 2,
        availability: "-"
      },
      {
        id: "self-repair-kit",
        name: "Self-Repair Kit",
        description: "Integrated repair automation.",
        cost: 200,
        weight: 1.5,
        availability: "-"
      }
    ]
  }
};