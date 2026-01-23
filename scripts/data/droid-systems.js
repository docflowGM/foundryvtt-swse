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
  // Cost formulas are per SWSE rules:
  // Walking: 10 x Cost Factor x (Base Speed Squared)
  // Wheeled: 5 x Cost Factor x (Base Speed Squared)
  // Tracked: 20 x Cost Factor x (Base Speed Squared)
  // Hovering: 100 x Cost Factor x (Base Speed Squared)
  // Flying: 200 x Cost Factor x (Base Speed Squared)
  // Burrower Drive: 200 x Cost Factor x (Speed squared)
  // Underwater Drive: 20 x Cost Factor x (Speed Squared)
  //
  // Costs for enhancements (Extra Legs, Jump Servos, etc.) are handled elsewhere.
  // ======================================================================
  locomotion: [
    {
      id: "walking",
      name: "Walking",
      description: "Versatile legged locomotion system (bipedal, quadrupedal, or multi-legged). Most common for humanoid droids. Suffers usual penalties in difficult terrain.",
      baseSpeed: { small: 4, medium: 6, large: 8 },
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(10 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 5 * costFactor,
      availability: "-",
      features: ["Versatile movement", "Can climb with Climb skill"],
      restrictions: ["Difficult terrain penalties apply"]
    },
    {
      id: "wheeled",
      name: "Wheeled",
      description: "One or more powered wheels for movement on smooth surfaces. Generally faster than walking but less versatile. Cannot use Climb skill; difficult terrain penalties are doubled.",
      baseSpeed: { small: 6, medium: 8, large: 10 },
      speeds: { tiny: 6, small: 6, medium: 8, large: 10, huge: 10, gargantuan: 10, colossal: 10 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(5 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 4 * costFactor,
      availability: "-",
      features: ["High speed on flat terrain"],
      restrictions: ["Cannot use Climb skill", "Double penalties in difficult terrain"]
    },
    {
      id: "tracked",
      name: "Tracked",
      description: "Rigid treads providing improved traction over wheeled systems. Better off-road capability. Ignores difficult terrain penalties but suffers -5 penalty on all Climb checks.",
      baseSpeed: { small: 4, medium: 6, large: 8 },
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(20 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 6 * costFactor,
      availability: "-",
      features: ["Ignores difficult terrain", "Good traction"],
      restrictions: ["-5 penalty on all Climb checks"]
    },
    {
      id: "stationary",
      name: "Stationary",
      description: "Droid cannot move from its fixed position. Used for defensive emplacements, turrets, and other stationary installations.",
      baseSpeed: { small: 0, medium: 0, large: 0 },
      speeds: { tiny: 0, small: 0, medium: 0, large: 0, huge: 0, gargantuan: 0, colossal: 0 },
      costFormula: (baseSpeed, costFactor) => 0,
      weightFormula: (costFactor) => 0,
      availability: "-",
      features: ["No movement capability"],
      restrictions: ["Cannot move from fixed position"]
    },
    {
      id: "hovering",
      name: "Hovering",
      description: "Repulsorlift technology floats the droid slowly above ground (within 3 meters). Ignores difficult terrain penalties. Fixed speed of 6 squares regardless of size.",
      baseSpeed: { small: 6, medium: 6, large: 6 },
      speeds: { tiny: 6, small: 6, medium: 6, large: 6, huge: 6, gargantuan: 6, colossal: 6 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(100 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 3 * costFactor,
      availability: "-",
      features: ["Ignores difficult terrain", "Hovers above ground", "Fixed speed"],
      restrictions: ["Fixed 6-square speed", "Hovers within 3 meters of ground"]
    },
    {
      id: "flying",
      name: "Flying",
      description: "Engine-based flight system for unrestricted movement. Not hampered by any terrain type but significantly more expensive than other locomotion systems.",
      baseSpeed: { small: 9, medium: 12, large: 12 },
      speeds: { tiny: 9, small: 9, medium: 12, large: 12, huge: 12, gargantuan: 12, colossal: 12 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(200 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 3 * costFactor,
      availability: "-",
      features: ["Unrestricted movement", "No terrain penalties", "High speed"],
      restrictions: ["Very expensive"]
    },
    {
      id: "burrower",
      name: "Burrower Drive",
      description: "Drilling system for mining and underground movement. Moves at half-speed underground and can move vertically at same rate. Can be used as weapon dealing self-destruct damage but damages droid with each use.",
      baseSpeed: { small: 4, medium: 6, large: 8 },
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(200 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 50 * costFactor,
      availability: "Restricted",
      features: ["Underground burrowing at half-speed", "Vertical movement", "Can be used as weapon"],
      restrictions: ["Can damage droid with each weapon use", "Restricted availability"]
    },
    {
      id: "underwater",
      name: "Underwater Drive",
      description: "Water propulsion system for aquatic movement. Grants swim speed equal to base land speed. Standard option on water world droids.",
      baseSpeed: { small: 4, medium: 6, large: 8 },
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(20 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 10 * costFactor,
      availability: "Licensed",
      features: ["Aquatic movement", "Swim speed equal to base speed"],
      restrictions: ["Licensed availability"]
    }
  ],

  // ======================================================================
  // LOCOMOTION ENHANCEMENTS
  // ======================================================================
  // Enhancements that modify existing locomotion systems.
  // These are additions to base locomotion systems, not standalone options.
  // All enhancements cost 2x the base locomotion system cost.
  // ======================================================================
  locomotionEnhancements: [
    {
      id: "extra-legs",
      name: "Extra Legs",
      description: "Three or more legs instead of bipedal. Grants 50% higher carrying capacity and +5 stability bonus to resist being knocked prone.",
      requiresLocomtion: "walking",
      costMultiplier: 2,
      effects: ["Carrying capacity +50%", "Stability bonus +5"],
      restrictions: ["Requires Walking locomotion system"]
    },
    {
      id: "jump-servos",
      name: "Jump Servos",
      description: "Repulsorlift-assisted jumping system. Treat all jumps as running jumps without head start; reroll failed jumps; take 10 on Jump checks even when rushed or threatened.",
      requiredLocomotion: "walking",
      costMultiplier: 2,
      effects: ["All jumps as running jumps", "Reroll failed jumps", "Take 10 on Jump checks"],
      restrictions: ["Requires Walking locomotion system"]
    },
    {
      id: "magnetic-feet",
      name: "Magnetic Feet",
      description: "Magnetic grippers allow clinging to metal surfaces, even on high-speed vehicles. Can be added to walking, wheeled, or tracked systems.",
      requiredLocomotion: ["walking", "wheeled", "tracked"],
      costMultiplier: 2,
      effects: ["Cling to metal surfaces", "Function at high speeds"],
      restrictions: ["Requires walking, wheeled, or tracked locomotion"]
    },
    {
      id: "gyroscopic-stabilizers",
      name: "Gyroscopic Stabilizers",
      description: "Integrated gyroscope and hydraulic system grants +5 stability bonus to resist being knocked prone. Stacks with Extra Legs bonus.",
      requiredLocomotion: "any",
      costFormula: (baseSpeed, costFactor) => Math.ceil(2 * costFactor * (baseSpeed * baseSpeed)),
      effects: ["Stability bonus +5 (stacks with Extra Legs)"],
      restrictions: ["None"]
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