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
      id: 'walking',
      name: 'Walking',
      description: 'Versatile legged locomotion system (bipedal, quadrupedal, or multi-legged). Most common for humanoid droids. Suffers usual penalties in difficult terrain.',
      baseSpeed: { small: 4, medium: 6, large: 8 },
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(10 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 5 * costFactor,
      availability: '-',
      features: ['Versatile movement', 'Can climb with Climb skill'],
      restrictions: ['Difficult terrain penalties apply']
    },
    {
      id: 'wheeled',
      name: 'Wheeled',
      description: 'One or more powered wheels for movement on smooth surfaces. Generally faster than walking but less versatile. Cannot use Climb skill; difficult terrain penalties are doubled.',
      baseSpeed: { small: 6, medium: 8, large: 10 },
      speeds: { tiny: 6, small: 6, medium: 8, large: 10, huge: 10, gargantuan: 10, colossal: 10 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(5 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 4 * costFactor,
      availability: '-',
      features: ['High speed on flat terrain'],
      restrictions: ['Cannot use Climb skill', 'Double penalties in difficult terrain']
    },
    {
      id: 'tracked',
      name: 'Tracked',
      description: 'Rigid treads providing improved traction over wheeled systems. Better off-road capability. Ignores difficult terrain penalties but suffers -5 penalty on all Climb checks.',
      baseSpeed: { small: 4, medium: 6, large: 8 },
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(20 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 6 * costFactor,
      availability: '-',
      features: ['Ignores difficult terrain', 'Good traction'],
      restrictions: ['-5 penalty on all Climb checks']
    },
    {
      id: 'stationary',
      name: 'Stationary',
      description: 'Droid cannot move from its fixed position. Used for defensive emplacements, turrets, and other stationary installations.',
      baseSpeed: { small: 0, medium: 0, large: 0 },
      speeds: { tiny: 0, small: 0, medium: 0, large: 0, huge: 0, gargantuan: 0, colossal: 0 },
      costFormula: (baseSpeed, costFactor) => 0,
      weightFormula: (costFactor) => 0,
      availability: '-',
      features: ['No movement capability'],
      restrictions: ['Cannot move from fixed position']
    },
    {
      id: 'hovering',
      name: 'Hovering',
      description: 'Repulsorlift technology floats the droid slowly above ground (within 3 meters). Ignores difficult terrain penalties. Fixed speed of 6 squares regardless of size.',
      baseSpeed: { small: 6, medium: 6, large: 6 },
      speeds: { tiny: 6, small: 6, medium: 6, large: 6, huge: 6, gargantuan: 6, colossal: 6 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(100 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 3 * costFactor,
      availability: '-',
      features: ['Ignores difficult terrain', 'Hovers above ground', 'Fixed speed'],
      restrictions: ['Fixed 6-square speed', 'Hovers within 3 meters of ground']
    },
    {
      id: 'flying',
      name: 'Flying',
      description: 'Engine-based flight system for unrestricted movement. Not hampered by any terrain type but significantly more expensive than other locomotion systems.',
      baseSpeed: { small: 9, medium: 12, large: 12 },
      speeds: { tiny: 9, small: 9, medium: 12, large: 12, huge: 12, gargantuan: 12, colossal: 12 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(200 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 3 * costFactor,
      availability: '-',
      features: ['Unrestricted movement', 'No terrain penalties', 'High speed'],
      restrictions: ['Very expensive']
    },
    {
      id: 'burrower',
      name: 'Burrower Drive',
      description: 'Drilling system for mining and underground movement. Moves at half-speed underground and can move vertically at same rate. Can be used as weapon dealing self-destruct damage but damages droid with each use.',
      baseSpeed: { small: 4, medium: 6, large: 8 },
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(200 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 50 * costFactor,
      availability: 'Restricted',
      features: ['Underground burrowing at half-speed', 'Vertical movement', 'Can be used as weapon'],
      restrictions: ['Can damage droid with each weapon use', 'Restricted availability']
    },
    {
      id: 'underwater',
      name: 'Underwater Drive',
      description: 'Water propulsion system for aquatic movement. Grants swim speed equal to base land speed. Standard option on water world droids.',
      baseSpeed: { small: 4, medium: 6, large: 8 },
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8, gargantuan: 8, colossal: 8 },
      costFormula: (baseSpeed, costFactor) => Math.ceil(20 * costFactor * (baseSpeed * baseSpeed)),
      weightFormula: (costFactor) => 10 * costFactor,
      availability: 'Licensed',
      features: ['Aquatic movement', 'Swim speed equal to base speed'],
      restrictions: ['Licensed availability']
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
      id: 'extra-legs',
      name: 'Extra Legs',
      description: 'Three or more legs instead of bipedal. Grants 50% higher carrying capacity and +5 stability bonus to resist being knocked prone.',
      requiresLocomtion: 'walking',
      costMultiplier: 2,
      effects: ['Carrying capacity +50%', 'Stability bonus +5'],
      restrictions: ['Requires Walking locomotion system']
    },
    {
      id: 'jump-servos',
      name: 'Jump Servos',
      description: 'Repulsorlift-assisted jumping system. Treat all jumps as running jumps without head start; reroll failed jumps; take 10 on Jump checks even when rushed or threatened.',
      requiredLocomotion: 'walking',
      costMultiplier: 2,
      effects: ['All jumps as running jumps', 'Reroll failed jumps', 'Take 10 on Jump checks'],
      restrictions: ['Requires Walking locomotion system']
    },
    {
      id: 'magnetic-feet',
      name: 'Magnetic Feet',
      description: 'Magnetic grippers allow clinging to metal surfaces, even on high-speed vehicles. Can be added to walking, wheeled, or tracked systems.',
      requiredLocomotion: ['walking', 'wheeled', 'tracked'],
      costMultiplier: 2,
      effects: ['Cling to metal surfaces', 'Function at high speeds'],
      restrictions: ['Requires walking, wheeled, or tracked locomotion']
    },
    {
      id: 'gyroscopic-stabilizers',
      name: 'Gyroscopic Stabilizers',
      description: 'Integrated gyroscope and hydraulic system grants +5 stability bonus to resist being knocked prone. Stacks with Extra Legs bonus.',
      requiredLocomotion: 'any',
      costFormula: (baseSpeed, costFactor) => Math.ceil(2 * costFactor * (baseSpeed * baseSpeed)),
      effects: ['Stability bonus +5 (stacks with Extra Legs)'],
      restrictions: ['None']
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
      id: 'basic',
      name: 'Basic Processor',
      type: 'primary',
      tier: 'basic',
      behavioralInhibitors: true,
      description: 'Simple processor for basic, task-focused droids. Limited to literal interpretation of instructions. Cannot perform tasks for which it was not programmed. Cannot use any untrained skill except Acrobatics, Climb, Jump, and Perception. Cannot use unproficient weapons. Behavioral Inhibitors strictly prevent harming sentient beings.',
      cost: 0,  // Every droid comes with at least a Basic Processor
      weight: 5,
      availability: '-',
      features: [
        'Literal interpretation of instructions',
        'Cannot use untrained skills (except Acrobatics, Climb, Jump, Perception)',
        'Cannot use unproficient weapons',
        'Strict Behavioral Inhibitors'
      ],
      restrictions: ['PC droids cannot use this'],
      notes: 'Every droid comes with a Basic Processor at minimum'
    },
    {
      id: 'heuristic',
      name: 'Heuristic Processor',
      type: 'primary',
      tier: 'advanced',
      behavioralInhibitors: true,
      description: 'Advanced learning processor capable of independent reasoning and learning by doing. Can use skills untrained like other characters. Can wield unproficient weapons (at -5 penalty). Can creatively interpret instructions and work around Behavioral Inhibitors if justified. Develops unique personality over time.',
      cost: 2000,
      weight: 5,
      availability: '-',
      features: [
        'Use skills untrained',
        'Wield unproficient weapons (-5 penalty)',
        'Creative instruction interpretation',
        'Can bypass Behavioral Inhibitors with justification',
        'Develops unique personality',
        'Learning by doing capability'
      ],
      restrictions: [],
      notes: 'REQUIRED for PC droids - only way droid characters can be playable. May use Memory Wipes and Restraining Bolts to prevent personality drift.',
      isFree: false  // Override chargen behavior - not free for PCs
    },
    {
      id: 'remote',
      name: 'Remote Processor (External)',
      type: 'primary',
      tier: 'external',
      behavioralInhibitors: true,
      description: "Droid processor isn't located in the droid itself; it's an external control system with transmitter for remote operation. Droid acts as a drone. Less expensive than built-in processor but droid suffers -2 penalty to Dexterity.",
      rangeOptions: [
        { range: '5 km', cost: 1000, weight: 10 },
        { range: '50 km', cost: 10000, weight: 100 },
        { range: '500 km', cost: 100000, weight: 1000, availability: 'Military' },
        { range: '5,000 km', cost: 1000000, weight: 10000, availability: 'Military' }
      ],
      availability: '-',
      features: [
        'Remote operation',
        'Less expensive than internal processor',
        'Can be controlled from distance'
      ],
      restrictions: ['-2 penalty to Dexterity', 'Requires Remote Receiver in droid'],
      notes: "Requires appropriate Remote Receiver installed in droid body. Droid doesn't react as quickly."
    },
    {
      id: 'military',
      name: 'Military Processor',
      type: 'primary',
      tier: 'combat',
      behavioralInhibitors: false,
      description: 'Combat-oriented processor with relaxed or modified ethical constraints. For military and combat-focused droids. Behavioral Inhibitors can be disabled for combat purposes.',
      cost: 5000,
      weight: 10,
      availability: 'Military',
      features: [
        'Optimized for combat',
        'Relaxed ethical constraints',
        'Can harm sentient beings'
      ],
      restrictions: ['Military availability', 'Not available to most PC droids'],
      notes: 'Requires Military clearance or license'
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
      id: 'remote-receiver',
      name: 'Remote Receiver',
      type: 'enhancement',
      category: 'external-processor',
      description: 'Allows a droid to receive instructions from an external Remote Processor. Can only be connected to one Remote Processor at a time. Changing connections requires DC 20 Mechanics check with Tool Kit.',
      cost: -500,  // Negative cost: reduces droid cost when using external processor
      weight: 1,
      availability: '-',
      requiredSystems: ['remote'],
      features: ['Receives remote instructions', 'Single processor connection'],
      restrictions: ['Only for droids without internal processors'],
      notes: 'Must be connected to compatible Remote Processor'
    },
    {
      id: 'backup-processor',
      name: 'Backup Processor',
      type: 'enhancement',
      category: 'processor-backup',
      description: 'Allows droid with Remote Receiver to function even if it loses contact with Remote Processor. Droid continues executing last received orders until contact restored.',
      cost: 100,
      weight: 0,
      availability: '-',
      requiredSystems: ['remote-receiver'],
      features: ['Continues operation without remote signal', 'Maintains last orders'],
      restrictions: ['Requires Remote Receiver'],
      notes: 'Essential for mission-critical droids using external processors'
    },
    {
      id: 'synchronized-fire',
      name: 'Synchronized Fire Circuits',
      type: 'enhancement',
      category: 'processor-combat',
      description: "Better coordinates droid's actions with other droids connected to same Remote Processor. When using Aid Another with connected ally, grants +5 bonus instead of standard +2.",
      cost: 150,
      weight: 1,
      availability: 'Military',
      requiredSystems: ['remote'],
      features: ['Enhanced Aid Another bonus (+5 instead of +2)', 'Synchronized combat operations'],
      restrictions: ['Military availability', 'Requires Remote Processor', 'Only works with connected allies'],
      notes: 'Improves coordination of drone swarms'
    },
    {
      id: 'restraining-bolt',
      name: 'Restraining Bolt',
      type: 'enhancement',
      category: 'processor-control',
      description: "Deactivates droid's motor impulse without shutting down processor. Activated with handheld Droid Caller device. Attachment/removal takes Full-Round Action and DC 10 Mechanics check. Fitted droid cannot upgrade/improve skills.",
      cost: 5,
      weight: 0.1,
      availability: '-',
      features: ['Motor shutdown', 'No processor damage', 'Portable activation'],
      restrictions: ['None mechanically'],
      notes: 'Heuristic Droids can attempt removal (DC 20 CHA check + DC 15 Mechanics check as Standard Action). Failure prevents retry for 24 hours. Must be secured to specific droid locations.'
    },
    {
      id: 'droid-remote-control',
      name: 'Droid Remote Control',
      type: 'enhancement',
      category: 'processor-control',
      description: 'Advanced version of Restraining Bolt. Allows owner to use Droid Caller to move droid using its own Locomotion System at one-half speed. Cannot compel other Droid System usage or equipment use.',
      cost: 500,
      weight: 0.5,
      availability: '-',
      features: ['Movement control via Droid Caller', 'Remote locomotion', 'Selective control'],
      restrictions: ['Cannot control non-locomotion systems'],
      notes: 'Droid moves at 50% normal speed when remotely controlled'
    },
    {
      id: 'hidden-core',
      name: 'Hidden Core',
      type: 'enhancement',
      category: 'processor-backup',
      description: "Concealed backup copy of droid's personality, data, skills, and critical memories. Can be hidden in main processor or as separate data store. Restores itself 1d6 days after Memory Wipe (DC 20 Use Computer check). Discovery requires Use Computer check opposed by droid's Will Defense.",
      cost: 200,
      costWithHigherDefense: 400,  // For Will Defense 30
      weight: 1,  // Or '-' if concealed in main processor
      availability: 'Restricted',
      features: ['Backup personality storage', 'Auto-restoration after wipe', 'Concealed backup'],
      restrictions: ['Restricted availability'],
      notes: 'Can use secondary data store (1 kg weight) or be concealed in main processor (no weight). Restores with successful DC 20 check every 1d6 days after Memory Wipe. Higher cost provides Will Defense 30.'
    },
    {
      id: 'personality-downloader',
      name: 'Personality Downloader',
      type: 'enhancement',
      category: 'processor-invasive',
      description: "Illegal device that suppresses existing droid personality and replaces it with new one. Requires plugging into droid data port. User makes Use Computer check opposed by droid's Will Defense. If successful, new personality copies itself in 5 minutes and suppresses original. Requires continuous checks every 10 minutes to maintain control.",
      cost: 5000,
      costIncrement: 1000,  // Increases with sophistication
      weight: 2,
      weightIncrement: 1,
      availability: 'Illegal',
      features: ['Personality replacement', 'Invasive control', 'Sustained override'],
      restrictions: ['Highly Illegal', 'Requires data port access'],
      notes: "Used by thieves, pirates, and infiltrators. Continuing control requires Use Computer checks every 10 minutes. Invading personality uses attacker's Use Computer skill indefinitely."
    },
    {
      id: 'remote-starship-starter',
      name: 'Remote Starship Starter',
      type: 'enhancement',
      category: 'processor-comms',
      description: 'Radio transmitter allows droid to signal ship to begin preflight processes. Ship transmits preflight diagnostics back to droid as Free Action. Cannot remotely operate ship but can save crew vital minutes during escape.',
      cost: 50,
      weight: 2,
      availability: '-',
      features: ['Starship signaling', 'Preflight diagnostics reception', 'Quick preparation'],
      restrictions: ['None mechanically'],
      notes: 'Essential for scoundrels making quick getaways'
    },
    {
      id: 'specialized-subprocessor',
      name: 'Specialized Subprocessor',
      type: 'enhancement',
      category: 'processor-enhancement',
      description: 'Customized processing unit aids droid in specific tasks. Grants single extra Swift Action each turn that can ONLY be used for actions related to one chosen Skill. Droid can only have one Specialized Subprocessor.',
      cost: 1000,
      weight: 2,
      availability: '-',
      features: ['Extra Swift Action per turn', 'Single-skill focus', 'Task specialization'],
      restrictions: ['Only one per droid', 'Limited to single skill'],
      notes: 'Chosen skill is selected at creation time. Cannot be changed without processor replacement.'
    },
    {
      id: 'tactician-battle-computer',
      name: 'Tactician Battle Computer',
      type: 'enhancement',
      category: 'processor-combat',
      description: "Software package and transmitter that circumvents restrictions on 4th-Degree Droids. Requires transceivers on all Ranged Weapons. Droid uses Standard Action to analyze battle conditions, granting +2 to number of allies equal to INT modifier (minimum 1) for their next attack roll. Bonus lost if ally doesn't attack before end of their next turn.",
      cost: 5000,
      weight: 10,
      availability: '-',
      features: ['Battle analysis', 'Tactical bonus grants', 'Team coordination', 'Weapon targeting integration'],
      restrictions: ['All weapons must have transceivers', 'Only Ranged Weapons supported', 'Requires analysis Standard Action', 'Cannot use non-transceiver weapons'],
      notes: 'Weapon switching to non-transceiver arms shuts down system until DC 20 Mechanics check succeeds. Analysis is Standard Action, bonus applies to number of allies = INT modifier (min 1).'
    }
  ],

  // ======================================================================
  // APPENDAGE TEMPLATES
  // ======================================================================
  // Appendages define WHAT a droid can manipulate, not how many
  // actions it gains. A droid may have any number of appendages.
  //
  // Unarmed damage based on size and appendage type per SWSE Core Rulebook.
  // Droid Strength modifier applies to all unarmed damage rolls.
  // ======================================================================

  // UNARMED DAMAGE TABLE - Per SWSE Core Rulebook
  // Size/Type: Fine | Diminutive | Tiny | Small | Medium | Large | Huge | Gargantuan | Colossal
  unarmedDamageTable: {
    probe: {
      fine: null,
      diminutive: null,
      tiny: null,
      small: null,
      medium: '1',
      large: '1d2',
      huge: '1d3',
      gargantuan: '1d4',
      colossal: '1d6'
    },
    instrument: {
      fine: null,
      diminutive: null,
      tiny: null,
      small: '1',
      medium: '1d2',
      large: '1d3',
      huge: '1d4',
      gargantuan: '1d6',
      colossal: '1d8'
    },
    tool: {
      fine: null,
      diminutive: null,
      tiny: '1',
      small: '1d2',
      medium: '1d3',
      large: '1d4',
      huge: '1d6',
      gargantuan: '1d8',
      colossal: '2d6'
    },
    claw: {
      fine: null,
      diminutive: '1',
      tiny: '1d2',
      small: '1d3',
      medium: '1d4',
      large: '1d6',
      huge: '1d8',
      gargantuan: '2d6',
      colossal: '2d8'
    },
    hand: {
      fine: null,
      diminutive: null,
      tiny: '1',
      small: '1d2',
      medium: '1d3',
      large: '1d4',
      huge: '1d6',
      gargantuan: '1d8',
      colossal: '2d6'
    }
  },

  appendages: [
    {
      id: 'probe',
      name: 'Probe',
      role: 'sensory',
      canManipulate: false,
      canAttack: false,
      createsUnarmedAttack: false,
      description: 'Delicate sensory appendage. Cannot be used for combat.',
      cost: (costFactor) => Math.ceil(2 * costFactor),
      weight: (costFactor) => 0.5 * costFactor,
      availability: '-',
      features: ['Sensory detection', 'Push/pull small objects'],
      restrictions: ['Cannot attack', 'Very delicate']
    },
    {
      id: 'instrument',
      name: 'Instrument',
      role: 'precision',
      canManipulate: true,
      canAttack: false,
      createsUnarmedAttack: false,
      description: 'Precision instrument for fine tasks. Carrying capacity reduced to 1/4 if clamping type.',
      cost: (costFactor) => Math.ceil(5 * costFactor),
      weight: (costFactor) => 1 * costFactor,
      availability: '-',
      features: ['Precision task capability', 'Can hold delicate objects'],
      restrictions: ['Cannot attack', 'Reduced carrying capacity if clamping type']
    },
    {
      id: 'tool',
      name: 'Tool',
      role: 'utility',
      canManipulate: true,
      canAttack: false,
      createsUnarmedAttack: false,
      description: 'General-purpose tool appendage. Sturdy enough for rough use. DC 15 Dexterity check required for tasks not designed for this tool type.',
      cost: (costFactor) => Math.ceil(10 * costFactor),
      weight: (costFactor) => 2 * costFactor,
      availability: '-',
      features: ['General manipulation', 'Mount weapons or tools'],
      restrictions: ['Requires DC 15 DEX check for non-designed tasks']
    },
    {
      id: 'claw',
      name: 'Claw',
      role: 'combat',
      canManipulate: true,
      canAttack: true,
      createsUnarmedAttack: true,
      damageType: 'claw',
      description: 'Grasping claw capable of unarmed attacks. Requires DC 15 Dexterity check to perform tasks requiring fine manipulation.',
      cost: (costFactor) => Math.ceil(20 * costFactor),
      weight: (costFactor) => 5 * costFactor,
      availability: '-',
      features: ['Unarmed attack', 'Grasping capability', 'Combat-ready'],
      restrictions: ['DC 15 DEX check for fine manipulation tasks']
    },
    {
      id: 'hand',
      name: 'Hand',
      role: 'manipulation',
      canManipulate: true,
      canAttack: true,
      createsUnarmedAttack: true,
      damageType: 'hand',
      description: 'Dexterous humanoid-style hand with at least three digits, one opposable. Ideal for fine manipulation and combat.',
      cost: (costFactor) => Math.ceil(50 * costFactor),
      weight: (costFactor) => 5 * costFactor,
      availability: '-',
      features: ['Fine manipulation', 'Unarmed attack', 'Wield weapons'],
      restrictions: ['None']
    },
    {
      id: 'mount',
      name: 'Stabilized Mount',
      role: 'weapon',
      canManipulate: false,
      canAttack: false,
      createsUnarmedAttack: false,
      description: 'Stabilized weapon mount. Does not grant additional attacks. Can hold a weapon as if wielded in two hands.',
      cost: (costFactor) => Math.ceil(125 * costFactor),
      weight: (costFactor) => 2 * costFactor,
      availability: '-',
      features: ['Weapon mounting', 'Two-handed weapon capability'],
      restrictions: ['Cannot attack without mounted weapon']
    }
  ],

  // ======================================================================
  // APPENDAGE ENHANCEMENTS & SPECIAL APPENDAGES
  // ======================================================================
  // These modify existing appendages or provide specialized attack capability.
  // ======================================================================
  appendageEnhancements: [
    {
      id: 'climbing-claws',
      name: 'Climbing Claws',
      type: 'enhancement',
      category: 'locomotion',
      requiresAppendage: ['hand', 'claw'],
      description: 'Claws designed to grip a surface. Grants climb speed equal to 1/2 base speed. Reroll failed Climb checks (keep better result). Take 10 on Climb checks even when rushed or threatened.',
      cost: (appendageCost) => appendageCost * 2,
      weight: (appendageWeight) => appendageWeight,
      availability: '-',
      features: ['Climb speed = 1/2 base speed', 'Reroll Climb checks', 'Take 10 on Climb checks'],
      restrictions: ['Requires Hand or Claw appendage', 'Cannot use appendage for other actions while climbing']
    },
    {
      id: 'telescopic-appendage',
      name: 'Telescopic Appendage',
      type: 'enhancement',
      category: 'manipulation',
      description: 'Appendage reaches farther from body. Grants 2x normal Reach (e.g., Medium Droid goes from 1 to 2 squares).',
      cost: (appendageCost) => appendageCost * 2,
      weight: (appendageWeight) => appendageWeight * 2,
      availability: '-',
      features: ['Double reach distance'],
      restrictions: ['None mechanically']
    },
    {
      id: 'magnetic-hands',
      name: 'Magnetic Hands',
      type: 'enhancement',
      category: 'locomotion',
      description: 'Magnetic grippers for EVA operations. With Magnetic Feet: +2 bonus to Climb checks on hull, +5 bonus to Defense against knock-prone attempts. When activated, cannot make attacks or use hands for other purposes.',
      cost: (costFactor) => 200 * costFactor,
      weight: (costFactor) => 2 * costFactor,
      availability: '-',
      features: ['Hull clinging', '+2 to Climb on hull (with Magnetic Feet)', '+5 Defense vs knockdown (with Magnetic Feet)'],
      restrictions: ['Cannot attack or use hands when activated']
    },
    {
      id: 'projectile-appendage',
      name: 'Projectile Appendage',
      type: 'special-attack',
      category: 'weapon',
      requiresAppendage: ['hand'],
      description: 'Tension-spring device that launches the appendage toward a target. Creates a ranged Simple Weapon dealing 2d8 damage. Can be used to make Disarm attempt (ranged) within 6 squares.',
      cost: 250,
      weight: (costFactor) => 2 * costFactor,
      availability: '-',
      features: ['Ranged attack 2d8 damage', 'Disarm capability'],
      restrictions: ['Licensed availability', 'Requires Hand appendage'],
      createsRangedWeapon: true,
      weaponStats: {
        name: 'Projectile Appendage',
        type: 'simple-ranged',
        damage: '2d8',
        range: '6 squares',
        weight: 1,
        availability: 'Licensed'
      }
    },
    {
      id: 'rocket-arm',
      name: 'Rocket Arm',
      type: 'special-attack',
      category: 'weapon',
      description: 'Hollowed-out arm with rocket engine. Unguided projectile dealing 3d8 damage with 1-square splash radius. DC 20 Mechanics to install (failure: arm detonates with splash damage).',
      cost: 2000,
      weight: (costFactor) => 2 * costFactor,
      availability: 'Illegal',
      features: ['Heavy weapon damage 3d8', 'Splash 1-square radius', 'Self-detaching'],
      restrictions: ['ILLEGAL - normally not available at chargen', 'Installation requires DC 20 Mechanics check'],
      createsRangedWeapon: true,
      weaponStats: {
        name: 'Rocket Arm',
        type: 'heavy-ranged',
        damage: '3d8',
        splash: '1d8 to 1-square radius',
        weight: 2,
        availability: 'Illegal'
      }
    },
    {
      id: 'multifunction-apparatus',
      name: 'Multifunction Apparatus',
      type: 'enhancement',
      category: 'manipulation',
      description: 'Allows up to 3 Tools or Weapons on single appendage. Only one active at a time. Switching requires Swift Action.',
      cost: (costFactor) => Math.ceil(80 * costFactor),
      weight: (costFactor) => 15 * costFactor,
      availability: '-',
      features: ['Mount multiple tools/weapons', 'Swift Action switching', 'Three-tool capacity'],
      restrictions: ['Requires Tool appendage base']
    },
    {
      id: 'remote-limb-control',
      name: 'Remote Limb Control',
      type: 'enhancement',
      category: 'advanced',
      description: 'Allows voluntary detachment with remote operation. Basic (1500 cr): one appendage, 6-square hover range, 24-square control distance. Deluxe (6000 cr): multiple appendages, control number = 1 + INT modifier.',
      cost: [
        { version: 'basic', cost: 1500, weight: 1 },
        { version: 'deluxe', cost: 6000, weight: 2 }
      ],
      availability: 'Restricted',
      features: ['Detachable operation', 'Remote hovering', 'Extended range control'],
      restrictions: ['Restricted availability', 'Requires applicable appendage']
    },
    {
      id: 'quick-release-coupling',
      name: 'Quick-Release Coupling',
      type: 'enhancement',
      category: 'utility',
      description: 'Tool-sized: swap in 2 Standard Actions. Appendage-sized: swap in 2 Full-Round Actions. Requires matching coupling on both pieces.',
      cost: [
        { type: 'tool', cost: (costFactor) => Math.ceil(10 * costFactor) },
        { type: 'appendage', cost: (costFactor) => Math.ceil(50 * costFactor) }
      ],
      weight: [
        { type: 'tool', weight: (costFactor) => 2 * costFactor },
        { type: 'appendage', weight: (costFactor) => 5 * costFactor }
      ],
      availability: '-',
      features: ['Quick tool swaps', 'Quick appendage swaps'],
      restrictions: ['Matching couplings required on both pieces']
    }
  ],

  // ======================================================================
  // ACCESSORIES - DROID ARMOR
  // ======================================================================
  // Built-in armor systems for droids per SWSE rulebook.
  // Armor Bonus applies to Reflex Defense.
  // Armor Check Penalty affects attack rolls and specific skills.
  // Does NOT stack with worn armor.
  // ======================================================================
  accessories: {
    armor: [
      // LIGHT ARMOR (-2 Armor Check Penalty)
      {
        id: 'plasteel-shell',
        name: 'Plasteel Shell',
        armorType: 'light',
        armorCheckPenalty: -2,
        description: 'Basic plasteel armor plating. Common on service droids.',
        armorBonus: 2,
        maxDexBonus: 5,
        cost: (costFactor) => Math.ceil(400 * costFactor),
        weight: (costFactor) => 2 * costFactor,
        availability: '-',
        features: ['Basic protection', 'No speed penalty'],
        restrictions: ['Armor Check Penalty -2']
      },
      {
        id: 'quadanium-shell',
        name: 'Quadanium Shell',
        armorType: 'light',
        armorCheckPenalty: -2,
        description: 'Stronger than plasteel with better deflection properties.',
        armorBonus: 3,
        maxDexBonus: 4,
        cost: (costFactor) => Math.ceil(900 * costFactor),
        weight: (costFactor) => 3 * costFactor,
        availability: '-',
        features: ['Enhanced protection', 'Good deflection'],
        restrictions: ['Armor Check Penalty -2']
      },
      {
        id: 'durasteel-shell',
        name: 'Durasteel Shell',
        armorType: 'light',
        armorCheckPenalty: -2,
        description: 'Durable durasteel plating common on military droids.',
        armorBonus: 4,
        maxDexBonus: 4,
        cost: (costFactor) => Math.ceil(1600 * costFactor),
        weight: (costFactor) => 8 * costFactor,
        availability: '-',
        features: ['Durable construction', 'Reliable protection'],
        restrictions: ['Armor Check Penalty -2', 'Heavier than other light armor']
      },
      {
        id: 'quadanium-plating',
        name: 'Quadanium Plating',
        armorType: 'light',
        armorCheckPenalty: -2,
        description: 'Advanced quadanium plating for enhanced protection.',
        armorBonus: 5,
        maxDexBonus: 3,
        cost: (costFactor) => Math.ceil(2500 * costFactor),
        weight: (costFactor) => 10 * costFactor,
        availability: 'Licensed',
        features: ['Advanced protection', 'Superior strength'],
        restrictions: ['Armor Check Penalty -2', 'Licensed availability']
      },
      {
        id: 'durasteel-plating',
        name: 'Durasteel Plating',
        armorType: 'light',
        armorCheckPenalty: -2,
        description: 'Top-tier durasteel plating with maximum light armor protection.',
        armorBonus: 6,
        maxDexBonus: 3,
        cost: (costFactor) => Math.ceil(3600 * costFactor),
        weight: (costFactor) => 12 * costFactor,
        availability: 'Licensed',
        features: ['Maximum light armor protection', 'Excellent durability'],
        restrictions: ['Armor Check Penalty -2', 'Licensed availability']
      },
      {
        id: 'duravlex-shell',
        name: 'Duravlex Shell',
        armorType: 'light',
        armorCheckPenalty: -2,
        description: 'Heat-resistant durasteel-kevlex alloy. Provides +10 Equipment bonus to Fortitude Defense vs Fire/Heat.',
        armorBonus: 4,
        maxDexBonus: 3,
        specialBonus: { fortitudeVsFire: 10, description: 'vs Fire/Heat attacks' },
        cost: (costFactor) => Math.ceil(1000 * costFactor),
        weight: (costFactor) => 10 * costFactor,
        availability: 'Licensed',
        features: ['Heat resistant', '+10 to Fortitude vs Fire/Heat'],
        restrictions: ['Armor Check Penalty -2', 'Licensed availability']
      },
      {
        id: 'laminanium-plating',
        name: 'Laminanium Plating',
        armorType: 'light',
        armorCheckPenalty: -2,
        description: 'Self-repairing laminanium alloy with acid resistance. Provides +2 Equipment bonus to Fortitude Defense.',
        armorBonus: 4,
        maxDexBonus: 3,
        specialBonus: { fortitudeGeneral: 2, description: 'vs all damage' },
        cost: (costFactor) => Math.ceil(3000 * costFactor),
        weight: (costFactor) => 15 * costFactor,
        availability: 'Military',
        features: ['Self-repairing', 'Acid resistant', '+2 to Fortitude Defense'],
        restrictions: ['Armor Check Penalty -2', 'Military availability']
      },

      // MEDIUM ARMOR (-5 Armor Check Penalty)
      {
        id: 'quadanium-battle-armor',
        name: 'Quadanium Battle Armor',
        armorType: 'medium',
        armorCheckPenalty: -5,
        description: 'Combat-grade quadanium armor for military droids.',
        armorBonus: 7,
        maxDexBonus: 3,
        cost: (costFactor) => Math.ceil(4900 * costFactor),
        weight: (costFactor) => 7 * costFactor,
        availability: 'Restricted',
        features: ['Combat-grade', 'Strong protection'],
        restrictions: ['Armor Check Penalty -5', 'Restricted availability']
      },
      {
        id: 'duranium-plating',
        name: 'Duranium Plating',
        armorType: 'medium',
        armorCheckPenalty: -5,
        description: 'Heavy duranium plating with excellent protection.',
        armorBonus: 8,
        maxDexBonus: 2,
        cost: (costFactor) => Math.ceil(6400 * costFactor),
        weight: (costFactor) => 16 * costFactor,
        availability: 'Restricted',
        features: ['Heavy protection', 'Excellent durability'],
        restrictions: ['Armor Check Penalty -5', 'Restricted availability']
      },
      {
        id: 'durasteel-battle-armor',
        name: 'Durasteel Battle Armor',
        armorType: 'medium',
        armorCheckPenalty: -5,
        description: 'Durasteel battle armor combining strength and maneuverability.',
        armorBonus: 8,
        maxDexBonus: 3,
        cost: (costFactor) => Math.ceil(9600 * costFactor),
        weight: (costFactor) => 8 * costFactor,
        availability: 'Restricted',
        features: ['Balanced protection', 'Better dexterity allowance'],
        restrictions: ['Armor Check Penalty -5', 'Restricted availability']
      },

      // HEAVY ARMOR (-10 Armor Check Penalty, Running Speed = 3x instead of 4x)
      {
        id: 'mandalorian-steel-shell',
        name: 'Mandalorian Steel Shell',
        armorType: 'heavy',
        armorCheckPenalty: -10,
        runningSpeedMultiplier: 3,
        description: 'Rare mandalorian steel plating with superior durability.',
        armorBonus: 9,
        maxDexBonus: 3,
        cost: (costFactor) => Math.ceil(8100 * costFactor),
        weight: (costFactor) => 9 * costFactor,
        availability: ['Military', 'Rare'],
        features: ['Superior durability', 'Excellent protection'],
        restrictions: ['Armor Check Penalty -10', 'Running Speed = 3x only', 'Military/Rare availability']
      },
      {
        id: 'duranium-battle-armor',
        name: 'Duranium Battle Armor',
        armorType: 'heavy',
        armorCheckPenalty: -10,
        runningSpeedMultiplier: 3,
        description: 'Top military duranium battle armor for heavy combat.',
        armorBonus: 10,
        maxDexBonus: 2,
        cost: (costFactor) => Math.ceil(10000 * costFactor),
        weight: (costFactor) => 10 * costFactor,
        availability: 'Military',
        features: ['Maximum protection', 'Military-grade construction'],
        restrictions: ['Armor Check Penalty -10', 'Running Speed = 3x only', 'Military availability']
      },
      {
        id: 'neutronium-plating',
        name: 'Neutronium Plating',
        armorType: 'heavy',
        armorCheckPenalty: -10,
        runningSpeedMultiplier: 3,
        description: 'Ultra-dense neutronium plating for maximum protection.',
        armorBonus: 11,
        maxDexBonus: 1,
        cost: (costFactor) => Math.ceil(12100 * costFactor),
        weight: (costFactor) => 20 * costFactor,
        availability: 'Military',
        features: ['Ultra-dense construction', 'Maximum durability'],
        restrictions: ['Armor Check Penalty -10', 'Running Speed = 3x only', 'Military availability', 'Very heavy']
      },
      {
        id: 'crystadurium-plating',
        name: 'Crystadurium Plating',
        armorType: 'heavy',
        armorCheckPenalty: -10,
        runningSpeedMultiplier: 3,
        description: 'Blaster-resistant armor using rare crystadurium crystals. Reduces blaster damage by 1 point per die.',
        armorBonus: 10,
        maxDexBonus: 2,
        specialBonus: { blasterDamageReduction: 1, description: '1 point per die of blaster damage' },
        cost: (costFactor) => Math.ceil(50000 * costFactor),
        weight: (costFactor) => 30 * costFactor,
        availability: ['Military', 'Rare'],
        features: ['Blaster resistant', '1 point blaster damage reduction', 'Superior protection'],
        restrictions: ['Armor Check Penalty -10', 'Running Speed = 3x only', 'Military/Rare availability', 'Very expensive']
      },
      {
        id: 'laminanium-heavy-plating',
        name: 'Laminanium Heavy Plating',
        armorType: 'heavy',
        armorCheckPenalty: -10,
        runningSpeedMultiplier: 3,
        description: 'Self-repairing laminanium heavy armor with acid resistance. Provides +2 Equipment bonus to Fortitude Defense.',
        armorBonus: 12,
        maxDexBonus: 2,
        specialBonus: { fortitudeGeneral: 2, description: 'vs all damage' },
        cost: (costFactor) => Math.ceil(20000 * costFactor),
        weight: (costFactor) => 15 * costFactor,
        availability: ['Military', 'Rare'],
        features: ['Self-repairing', 'Acid resistant', '+2 to Fortitude Defense', 'Superior protection'],
        restrictions: ['Armor Check Penalty -10', 'Running Speed = 3x only', 'Military/Rare availability']
      }
    ],
    communications: [
      // CORE COMMUNICATION SYSTEMS
      {
        id: 'internal-comlink',
        name: 'Internal Comlink',
        category: 'comlink',
        description: 'Integrated Comlink System built directly into droid chassis. Otherwise identical to standard Comlink. Allows transmission and reception of comlink signals.',
        cost: 250,
        weight: 0.1,
        availability: '-',
        features: ['Integrated comlink', 'Transmit/receive capability'],
        restrictions: ['None']
      },
      {
        id: 'vocabulator',
        name: 'Vocabulator',
        category: 'speech',
        description: 'Speaker system that enables emulation of speech rather than just Binary machine code. Standard if the droid has ability to speak any language other than Binary.',
        cost: 50,
        weight: 0.5,
        availability: '-',
        features: ['Speech emulation', 'Audio output'],
        restrictions: ['None']
      },
      {
        id: 'droid-caller',
        name: 'Droid Caller',
        category: 'control',
        description: "Handheld transmitter (0.2 kg) that overrides a droid's motor function via Restraining Bolt. Compels droid toward caller while activated.",
        cost: 10,
        weight: 0.2,
        availability: '-',
        features: ['Restraining Bolt control', 'Motor override'],
        restrictions: ['Requires Restraining Bolt in target droid']
      },

      // COMMUNICATION COUNTERMEASURES
      {
        id: 'communications-countermeasures',
        name: 'Communications Countermeasures',
        category: 'defensive',
        description: 'Prevents jamming of droid communications by broadcasting on multiple frequencies. Grants +5 Equipment bonus to Use Computer checks made to overcome Communications Jamming.',
        cost: 1000,
        weight: 3,
        availability: 'Restricted',
        features: ['Jam-resistant', '+5 vs Communications Jamming'],
        restrictions: ['Restricted availability', 'Typically unavailable at chargen']
      },

      // COMMUNICATIONS JAMMING SYSTEMS
      {
        id: 'communications-jammer',
        name: 'Communications Jammer',
        category: 'offensive',
        description: 'Allows droid to jam Comlink signals within 1-kilometer radius by interfering with communications systems or directly jamming signals. Grants +5 Equipment bonus to Use Computer checks to slice and shut down systems. Requires DC 25 Use Computer check to jam incoming/outgoing signals.',
        cost: 5000,
        weight: 5,
        availability: 'Military',
        features: ['Comlink jamming', '1 km range', '+5 to slice computer systems'],
        restrictions: ['Military availability', 'NOT available at chargen']
      },
      {
        id: 'remote-receiver-jammer',
        name: 'Remote Receiver Jammer',
        category: 'offensive',
        description: "Portable backpack transmitter developed to scramble Battle Droid Remote Processor links at short range. Affects droids with Remote Receivers but no Backup Processors. Droid loses all actions and is Flat-Footed if jammer's Use Computer check meets or exceeds their Will Defense.",
        cost: 2000,
        weight: 2,
        availability: 'Military',
        features: ['Remote Processor jamming', 'Short range', 'Incapacitates affected droids'],
        restrictions: ['Military availability', 'NOT available at chargen', 'Ineffective against droids with Backup Processors']
      },
      {
        id: 'remote-receiver-signal-booster',
        name: 'Remote Receiver Signal Booster',
        category: 'enhancement',
        description: 'Extends Remote Receiver range by 50%. Successful DC 30 Use Computer check further extends range up to 100% for 1 hour.',
        cost: 500,
        weight: 2,
        availability: 'Licensed',
        features: ['Range extension +50%', 'Range boost +100% (1hr, DC 30 check)'],
        restrictions: ['Licensed availability', 'Requires Remote Receiver', 'Typically unavailable at chargen']
      }
    ],

    // HARDENED SYSTEMS - For Large or greater droids only
    hardenedsystems: [
      {
        id: 'hardened-systems-x2',
        name: 'Hardened Systems x2',
        category: 'internal-armor',
        sizeRestriction: 'large',
        description: 'Internal armor and redundant systems enable droid to continue functioning despite heavy damage. Provides +20 Hit Points and +10 to Damage Threshold (for Large droids; scales with size).',
        multiplier: 2,
        hpBonus: 20,
        dtBonus: 10,
        cost: (costFactor) => Math.ceil(1000 * costFactor),
        weight: (costFactor) => 100 * costFactor,
        availability: 'Military',
        features: ['Internal armor', 'Redundant systems', '+20 HP', '+10 Damage Threshold'],
        restrictions: ['Military availability', 'Large droids or larger only', 'NOT available at chargen']
      },
      {
        id: 'hardened-systems-x3',
        name: 'Hardened Systems x3',
        category: 'internal-armor',
        sizeRestriction: 'large',
        description: 'Internal armor and redundant systems enable droid to continue functioning despite heavy damage. Provides +30 Hit Points and +15 to Damage Threshold (for Large droids; scales with size).',
        multiplier: 3,
        hpBonus: 30,
        dtBonus: 15,
        cost: (costFactor) => Math.ceil(2500 * costFactor),
        weight: (costFactor) => 250 * costFactor,
        availability: 'Military',
        features: ['Internal armor', 'Redundant systems', '+30 HP', '+15 Damage Threshold'],
        restrictions: ['Military availability', 'Large droids or larger only', 'NOT available at chargen']
      },
      {
        id: 'hardened-systems-x4',
        name: 'Hardened Systems x4',
        category: 'internal-armor',
        sizeRestriction: 'large',
        description: 'Internal armor and redundant systems enable droid to continue functioning despite heavy damage. Provides +40 Hit Points and +20 to Damage Threshold (for Large droids; scales with size).',
        multiplier: 4,
        hpBonus: 40,
        dtBonus: 20,
        cost: (costFactor) => Math.ceil(4000 * costFactor),
        weight: (costFactor) => 400 * costFactor,
        availability: 'Military',
        features: ['Internal armor', 'Redundant systems', '+40 HP', '+20 Damage Threshold'],
        restrictions: ['Military availability', 'Large droids or larger only', 'NOT available at chargen']
      },
      {
        id: 'hardened-systems-x5',
        name: 'Hardened Systems x5',
        category: 'internal-armor',
        sizeRestriction: 'large',
        description: 'Internal armor and redundant systems enable droid to continue functioning despite heavy damage. Provides +50 Hit Points and +25 to Damage Threshold (for Large droids; scales with size).',
        multiplier: 5,
        hpBonus: 50,
        dtBonus: 25,
        cost: (costFactor) => Math.ceil(6250 * costFactor),
        weight: (costFactor) => 650 * costFactor,
        availability: 'Military',
        features: ['Internal armor', 'Redundant systems', '+50 HP', '+25 Damage Threshold'],
        restrictions: ['Military availability', 'Large droids or larger only', 'NOT available at chargen']
      }
    ],
    sensors: [
      {
        id: 'improved-sensor-package',
        name: 'Improved Sensor Package',
        description: 'Gains a +2 Equipment bonus to Perception checks. The droid gains Low-Light Vision, ignoring Concealment (but not Total Concealment) from darkness.',
        cost: 200,
        weight: 2.5,
        availability: '-',
        features: ['+2 Equipment bonus to Perception', 'Low-Light Vision', 'Ignores darkness Concealment'],
        restrictions: ['Does not provide Darkvision']
      },
      {
        id: 'darkvision',
        name: 'Darkvision',
        description: 'The Droid ignores Concealment (including Total Concealment) from darkness.',
        cost: 150,
        weight: 1.5,
        availability: '-',
        features: ['Ignores darkness Concealment', 'Includes Total Concealment'],
        restrictions: ['Does not grant Low-Light Vision features']
      },
      {
        id: 'sensor-booster',
        name: 'Sensor Booster',
        description: 'Extends the range of sensors to a maximum of 2 kilometers, if the Droid has a Sensor Pack installed.',
        cost: 200,
        weight: 5,
        availability: '-',
        features: ['2 km sensor range', 'Extended detection capability'],
        restrictions: ['Requires Sensor Pack or Improved Sensor Package']
      },
      {
        id: 'sensor-countermeasure-package',
        name: 'Sensor Countermeasure Package',
        description: 'Broadcasts signals that interfere with incoming sensor signals. A Droid equipped with the Sensor Countermeasure Package can make a Use Computer check to avoid being detected. If the Use Computer check equals or exceeds a Perception check made to detect the Droid through any form of non-visual sensor Equipment, the Droid remains undetected.',
        cost: 1000,
        weight: 2,
        availability: '-',
        features: ['Use Computer check vs detection', 'Concealment from sensor equipment'],
        restrictions: ['Does not provide visual concealment']
      },
      {
        id: 'weapon-detector-package',
        name: 'Weapon-Detector Package',
        description: 'Features a high-frequency receiver that can detect the hum of a deactivated Vibro weapon. It can also perform a chemical analysis to detect tibanna gas residue on blasters. Allows a Droid to add its Intelligence modifier to Perception checks made to Search for Weapons.',
        cost: 1500,
        weight: 5,
        availability: 'Licensed',
        features: ['Vibro weapon detection', 'Blaster residue analysis', '+INT modifier to Search for Weapons'],
        restrictions: ['Licensed availability']
      },
      {
        id: 'yv-sensor-package',
        name: 'YV Sensor Package',
        description: 'Standard on the YVH Battle Droid, this package features highly specialized sensors calibrated specifically to detect Yuuzhan Vong, including those concealed by Ooglith Masquers or other methods. Grants a +10 bonus to Perception checks to detect Yuuzhan Vong within 12 squares and within line of sight of the Droid.',
        cost: 1000,
        weight: 3,
        availability: 'Military',
        features: ['+10 to Perception vs Yuuzhan Vong', 'Ooglith Masquer detection', '12 square detection range'],
        restrictions: ['Military availability', 'NOT available at chargen']
      }
    ],
    shields: [
      // SHIELD GENERATORS
      {
        id: 'sr5-shield-generator',
        name: 'SR 5 Shield Generator',
        category: 'shield',
        description: 'Deflector Shield Generator that reduces incoming damage by 5. When damage equals or exceeds Shield Rating, SR is reduced by 5. Spend three Swift Actions to make DC 20 Endurance check to restore 5 SR.',
        sr: 5,
        sizeMinimum: 'tiny',
        cost: (costFactor) => Math.ceil(2500 * costFactor),
        weight: (costFactor) => 10 * costFactor,
        availability: 'Military',
        features: ['Damage reduction', 'Self-restoration capability'],
        restrictions: ['Military availability', 'Requires 3 Swift Actions for repair check']
      },
      {
        id: 'sr10-shield-generator',
        name: 'SR 10 Shield Generator',
        category: 'shield',
        description: 'Deflector Shield Generator that reduces incoming damage by 10. When damage equals or exceeds Shield Rating, SR is reduced by 5. Spend three Swift Actions to make DC 20 Endurance check to restore 5 SR.',
        sr: 10,
        sizeMinimum: 'small',
        cost: (costFactor) => Math.ceil(5000 * costFactor),
        weight: (costFactor) => 20 * costFactor,
        availability: 'Military',
        features: ['Enhanced damage reduction', 'Self-restoration capability'],
        restrictions: ['Military availability', 'Small droids or larger only', 'Requires 3 Swift Actions for repair check']
      },
      {
        id: 'sr15-shield-generator',
        name: 'SR 15 Shield Generator',
        category: 'shield',
        description: 'Deflector Shield Generator that reduces incoming damage by 15. When damage equals or exceeds Shield Rating, SR is reduced by 5. Spend three Swift Actions to make DC 20 Endurance check to restore 5 SR.',
        sr: 15,
        sizeMinimum: 'medium',
        cost: (costFactor) => Math.ceil(7500 * costFactor),
        weight: (costFactor) => 30 * costFactor,
        availability: 'Military',
        features: ['Heavy damage reduction', 'Self-restoration capability'],
        restrictions: ['Military availability', 'Medium droids or larger only', 'Requires 3 Swift Actions for repair check']
      },
      {
        id: 'sr20-shield-generator',
        name: 'SR 20 Shield Generator',
        category: 'shield',
        description: 'Deflector Shield Generator that reduces incoming damage by 20. When damage equals or exceeds Shield Rating, SR is reduced by 5. Spend three Swift Actions to make DC 20 Endurance check to restore 5 SR.',
        sr: 20,
        sizeMinimum: 'large',
        cost: (costFactor) => Math.ceil(10000 * costFactor),
        weight: (costFactor) => 40 * costFactor,
        availability: 'Military',
        features: ['Maximum damage reduction', 'Self-restoration capability'],
        restrictions: ['Military availability', 'Large droids or larger only', 'Requires 3 Swift Actions for repair check']
      },

      // SHIELD EXPANSION MODULE
      {
        id: 'shield-expansion-module',
        name: 'Shield Expansion Module',
        category: 'shield-enhancement',
        description: "Enables a Droid with a Shield Generator to expand its shield by a single square, allowing an adjacent Medium or smaller ally to benefit from the Droid's SR. Activating is a Standard Action. Only Droids of Small or larger can use this. Medium or smaller droids can install 1 module, Large or larger can install up to 2.",
        cost: (costFactor, shieldRating = 5) => Math.ceil(50 * shieldRating * costFactor),
        weight: (costFactor, shieldRating = 5) => 2 * shieldRating * costFactor,
        availability: 'Military',
        features: ['Shield extension capability', 'Ally protection', 'Reconfigurable per Standard Action'],
        restrictions: ['Military availability', 'Requires Shield Generator', 'Small or larger droids only', 'Medium/smaller can have 1, Large+ can have 2']
      }
    ],
    translators: [
      {
        id: 'basic-translator',
        name: 'Basic Translator',
        description: 'Communicates in common languages.',
        dc: 10,
        cost: 100,
        weight: 1,
        availability: '-'
      },
      {
        id: 'advanced-translator',
        name: 'Advanced Translator',
        description: 'Extended language database.',
        dc: 15,
        cost: 250,
        weight: 1,
        availability: '-'
      },
      {
        id: 'universal-translator',
        name: 'Universal Translator',
        description: 'Learns and adapts to any language.',
        dc: 20,
        cost: 500,
        weight: 2,
        availability: 'Restricted'
      }
    ],
    miscellaneous: [
      {
        id: 'manipulator-arm',
        name: 'Manipulator Arm',
        description: 'Additional articulated limb for fine work.',
        cost: 150,
        weight: 2,
        availability: '-'
      },
      {
        id: 'repulsor-lift',
        name: 'Repulsor Lift',
        description: 'Anti-gravity lift system.',
        cost: 300,
        weight: 3,
        availability: 'Restricted'
      },
      {
        id: 'battery-backup',
        name: 'Battery Backup System',
        description: 'Redundant power supply.',
        cost: 100,
        weight: 2,
        availability: '-'
      },
      {
        id: 'self-repair-kit',
        name: 'Self-Repair Kit',
        description: 'Integrated repair automation.',
        cost: 200,
        weight: 1.5,
        availability: '-'
      }
    ]
  }
};