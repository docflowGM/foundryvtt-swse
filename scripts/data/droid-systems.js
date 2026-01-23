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
  // PROCESSOR SYSTEMS (PRIMARY)
  // ======================================================================
  // These define the TYPE of processor architecture a droid uses.
  // IMPORTANT: PC Droids MUST have a Heuristic Processor. Only droids
  // with Heuristic Processors are viable as playable characters.
  // All other processor types create NPC droids.
  //
  // A droid's Intelligence score represents processor quality.
  // ======================================================================
  processors: [
    {
      id: "basic",
      name: "Basic Processor",
      type: "primary",
      tier: "basic",
      behavioralInhibitors: true,
      description: "Simple processor for basic, task-focused droids. Limited to literal interpretation of instructions. Cannot perform tasks for which it was not programmed. Cannot use any untrained skill except Acrobatics, Climb, Jump, and Perception. Cannot use unproficient weapons. Behavioral Inhibitors strictly prevent harming sentient beings.",
      cost: 0,  // Every droid comes with at least a Basic Processor
      weight: 5,
      availability: "-",
      features: [
        "Literal interpretation of instructions",
        "Cannot use untrained skills (except Acrobatics, Climb, Jump, Perception)",
        "Cannot use unproficient weapons",
        "Strict Behavioral Inhibitors"
      ],
      restrictions: ["PC droids cannot use this"],
      notes: "Every droid comes with a Basic Processor at minimum"
    },
    {
      id: "heuristic",
      name: "Heuristic Processor",
      type: "primary",
      tier: "advanced",
      behavioralInhibitors: true,
      description: "Advanced learning processor capable of independent reasoning and learning by doing. Can use skills untrained like other characters. Can wield unproficient weapons (at -5 penalty). Can creatively interpret instructions and work around Behavioral Inhibitors if justified. Develops unique personality over time.",
      cost: 2000,
      weight: 5,
      availability: "-",
      features: [
        "Use skills untrained",
        "Wield unproficient weapons (-5 penalty)",
        "Creative instruction interpretation",
        "Can bypass Behavioral Inhibitors with justification",
        "Develops unique personality",
        "Learning by doing capability"
      ],
      restrictions: [],
      notes: "REQUIRED for PC droids - only way droid characters can be playable. May use Memory Wipes and Restraining Bolts to prevent personality drift.",
      isFree: false  // Override chargen behavior - not free for PCs
    },
    {
      id: "remote",
      name: "Remote Processor (External)",
      type: "primary",
      tier: "external",
      behavioralInhibitors: true,
      description: "Droid processor isn't located in the droid itself; it's an external control system with transmitter for remote operation. Droid acts as a drone. Less expensive than built-in processor but droid suffers -2 penalty to Dexterity.",
      rangeOptions: [
        { range: "5 km", cost: 1000, weight: 10 },
        { range: "50 km", cost: 10000, weight: 100 },
        { range: "500 km", cost: 100000, weight: 1000, availability: "Military" },
        { range: "5,000 km", cost: 1000000, weight: 10000, availability: "Military" }
      ],
      availability: "-",
      features: [
        "Remote operation",
        "Less expensive than internal processor",
        "Can be controlled from distance"
      ],
      restrictions: ["-2 penalty to Dexterity", "Requires Remote Receiver in droid"],
      notes: "Requires appropriate Remote Receiver installed in droid body. Droid doesn't react as quickly."
    },
    {
      id: "military",
      name: "Military Processor",
      type: "primary",
      tier: "combat",
      behavioralInhibitors: false,
      description: "Combat-oriented processor with relaxed or modified ethical constraints. For military and combat-focused droids. Behavioral Inhibitors can be disabled for combat purposes.",
      cost: 5000,
      weight: 10,
      availability: "Military",
      features: [
        "Optimized for combat",
        "Relaxed ethical constraints",
        "Can harm sentient beings"
      ],
      restrictions: ["Military availability", "Not available to most PC droids"],
      notes: "Requires Military clearance or license"
    }
  ],

  // ======================================================================
  // PROCESSOR ENHANCEMENTS & ACCESSORIES
  // ======================================================================
  // These enhance or modify processor systems, typically installed alongside
  // a primary processor. Some enhance external processors, others are
  // general-purpose enhancements.
  // ======================================================================
  processorEnhancements: [
    {
      id: "remote-receiver",
      name: "Remote Receiver",
      type: "enhancement",
      category: "external-processor",
      description: "Allows a droid to receive instructions from an external Remote Processor. Can only be connected to one Remote Processor at a time. Changing connections requires DC 20 Mechanics check with Tool Kit.",
      cost: -500,  // Negative cost: reduces droid cost when using external processor
      weight: 1,
      availability: "-",
      requiredSystems: ["remote"],
      features: ["Receives remote instructions", "Single processor connection"],
      restrictions: ["Only for droids without internal processors"],
      notes: "Must be connected to compatible Remote Processor"
    },
    {
      id: "backup-processor",
      name: "Backup Processor",
      type: "enhancement",
      category: "processor-backup",
      description: "Allows droid with Remote Receiver to function even if it loses contact with Remote Processor. Droid continues executing last received orders until contact restored.",
      cost: 100,
      weight: 0,
      availability: "-",
      requiredSystems: ["remote-receiver"],
      features: ["Continues operation without remote signal", "Maintains last orders"],
      restrictions: ["Requires Remote Receiver"],
      notes: "Essential for mission-critical droids using external processors"
    },
    {
      id: "synchronized-fire",
      name: "Synchronized Fire Circuits",
      type: "enhancement",
      category: "processor-combat",
      description: "Better coordinates droid's actions with other droids connected to same Remote Processor. When using Aid Another with connected ally, grants +5 bonus instead of standard +2.",
      cost: 150,
      weight: 1,
      availability: "Military",
      requiredSystems: ["remote"],
      features: ["Enhanced Aid Another bonus (+5 instead of +2)", "Synchronized combat operations"],
      restrictions: ["Military availability", "Requires Remote Processor", "Only works with connected allies"],
      notes: "Improves coordination of drone swarms"
    },
    {
      id: "restraining-bolt",
      name: "Restraining Bolt",
      type: "enhancement",
      category: "processor-control",
      description: "Deactivates droid's motor impulse without shutting down processor. Activated with handheld Droid Caller device. Attachment/removal takes Full-Round Action and DC 10 Mechanics check. Fitted droid cannot upgrade/improve skills.",
      cost: 5,
      weight: 0.1,
      availability: "-",
      features: ["Motor shutdown", "No processor damage", "Portable activation"],
      restrictions: ["None mechanically"],
      notes: "Heuristic Droids can attempt removal (DC 20 CHA check + DC 15 Mechanics check as Standard Action). Failure prevents retry for 24 hours. Must be secured to specific droid locations."
    },
    {
      id: "droid-remote-control",
      name: "Droid Remote Control",
      type: "enhancement",
      category: "processor-control",
      description: "Advanced version of Restraining Bolt. Allows owner to use Droid Caller to move droid using its own Locomotion System at one-half speed. Cannot compel other Droid System usage or equipment use.",
      cost: 500,
      weight: 0.5,
      availability: "-",
      features: ["Movement control via Droid Caller", "Remote locomotion", "Selective control"],
      restrictions: ["Cannot control non-locomotion systems"],
      notes: "Droid moves at 50% normal speed when remotely controlled"
    },
    {
      id: "hidden-core",
      name: "Hidden Core",
      type: "enhancement",
      category: "processor-backup",
      description: "Concealed backup copy of droid's personality, data, skills, and critical memories. Can be hidden in main processor or as separate data store. Restores itself 1d6 days after Memory Wipe (DC 20 Use Computer check). Discovery requires Use Computer check opposed by droid's Will Defense.",
      cost: 200,
      costWithHigherDefense: 400,  // For Will Defense 30
      weight: 1,  // Or '-' if concealed in main processor
      availability: "Restricted",
      features: ["Backup personality storage", "Auto-restoration after wipe", "Concealed backup"],
      restrictions: ["Restricted availability"],
      notes: "Can use secondary data store (1 kg weight) or be concealed in main processor (no weight). Restores with successful DC 20 check every 1d6 days after Memory Wipe. Higher cost provides Will Defense 30."
    },
    {
      id: "personality-downloader",
      name: "Personality Downloader",
      type: "enhancement",
      category: "processor-invasive",
      description: "Illegal device that suppresses existing droid personality and replaces it with new one. Requires plugging into droid data port. User makes Use Computer check opposed by droid's Will Defense. If successful, new personality copies itself in 5 minutes and suppresses original. Requires continuous checks every 10 minutes to maintain control.",
      cost: 5000,
      costIncrement: 1000,  // Increases with sophistication
      weight: 2,
      weightIncrement: 1,
      availability: "Illegal",
      features: ["Personality replacement", "Invasive control", "Sustained override"],
      restrictions: ["Highly Illegal", "Requires data port access"],
      notes: "Used by thieves, pirates, and infiltrators. Continuing control requires Use Computer checks every 10 minutes. Invading personality uses attacker's Use Computer skill indefinitely."
    },
    {
      id: "remote-starship-starter",
      name: "Remote Starship Starter",
      type: "enhancement",
      category: "processor-comms",
      description: "Radio transmitter allows droid to signal ship to begin preflight processes. Ship transmits preflight diagnostics back to droid as Free Action. Cannot remotely operate ship but can save crew vital minutes during escape.",
      cost: 50,
      weight: 2,
      availability: "-",
      features: ["Starship signaling", "Preflight diagnostics reception", "Quick preparation"],
      restrictions: ["None mechanically"],
      notes: "Essential for scoundrels making quick getaways"
    },
    {
      id: "specialized-subprocessor",
      name: "Specialized Subprocessor",
      type: "enhancement",
      category: "processor-enhancement",
      description: "Customized processing unit aids droid in specific tasks. Grants single extra Swift Action each turn that can ONLY be used for actions related to one chosen Skill. Droid can only have one Specialized Subprocessor.",
      cost: 1000,
      weight: 2,
      availability: "-",
      features: ["Extra Swift Action per turn", "Single-skill focus", "Task specialization"],
      restrictions: ["Only one per droid", "Limited to single skill"],
      notes: "Chosen skill is selected at creation time. Cannot be changed without processor replacement."
    },
    {
      id: "tactician-battle-computer",
      name: "Tactician Battle Computer",
      type: "enhancement",
      category: "processor-combat",
      description: "Software package and transmitter that circumvents restrictions on 4th-Degree Droids. Requires transceivers on all Ranged Weapons. Droid uses Standard Action to analyze battle conditions, granting +2 to number of allies equal to INT modifier (minimum 1) for their next attack roll. Bonus lost if ally doesn't attack before end of their next turn.",
      cost: 5000,
      weight: 10,
      availability: "-",
      features: ["Battle analysis", "Tactical bonus grants", "Team coordination", "Weapon targeting integration"],
      restrictions: ["All weapons must have transceivers", "Only Ranged Weapons supported", "Requires analysis Standard Action", "Cannot use non-transceiver weapons"],
      notes: "Weapon switching to non-transceiver arms shuts down system until DC 20 Mechanics check succeeds. Analysis is Standard Action, bonus applies to number of allies = INT modifier (min 1)."
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