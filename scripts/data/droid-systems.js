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
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8 },
      availability: "-"
    },
    {
      id: "wheeled",
      name: "Wheeled",
      speeds: { tiny: 6, small: 6, medium: 8, large: 10, huge: 10 },
      availability: "-"
    },
    {
      id: "tracked",
      name: "Tracked",
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8 },
      availability: "-"
    },
    {
      id: "hovering",
      name: "Hovering",
      speeds: { tiny: 6, small: 6, medium: 6, large: 6, huge: 6 },
      availability: "-"
    },
    {
      id: "flying",
      name: "Flying",
      speeds: { tiny: 9, small: 9, medium: 12, large: 12, huge: 12 },
      availability: "-"
    },
    {
      id: "burrower",
      name: "Burrower Drive",
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8 },
      availability: "Restricted"
    },
    {
      id: "underwater",
      name: "Underwater Drive",
      speeds: { tiny: 4, small: 4, medium: 6, large: 8, huge: 8 },
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
      description: "Simple processor for basic, task-focused droids."
    },
    {
      id: "heuristic",
      name: "Heuristic Processor",
      behavioralInhibitors: true,
      description: "Advanced learning processor capable of independent reasoning."
    },
    {
      id: "remote",
      name: "Remote-Control Processor",
      behavioralInhibitors: true,
      description: "Processor designed to be controlled remotely."
    },
    {
      id: "military",
      name: "Military Processor",
      behavioralInhibitors: false,
      description: "Combat-oriented processor with relaxed ethical constraints."
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
      description: "Delicate sensory appendage."
    },
    {
      id: "instrument",
      name: "Instrument",
      role: "precision",
      canManipulate: true,
      canAttack: false,
      description: "Precision instrument for fine tasks."
    },
    {
      id: "tool",
      name: "Tool",
      role: "utility",
      canManipulate: true,
      canAttack: false,
      description: "General-purpose tool appendage."
    },
    {
      id: "claw",
      name: "Claw",
      role: "combat",
      canManipulate: true,
      canAttack: true,
      description: "Grasping claw capable of unarmed attacks."
    },
    {
      id: "hand",
      name: "Hand",
      role: "manipulation",
      canManipulate: true,
      canAttack: true,
      description: "Dexterous humanoid-style hand."
    },
    {
      id: "mount",
      name: "Stabilized Mount",
      role: "weapon",
      canManipulate: false,
      canAttack: false,
      description: "Weapon mount; does not grant additional attacks."
    }
  ]
};