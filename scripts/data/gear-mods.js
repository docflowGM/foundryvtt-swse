/**
 * GEAR MODIFICATIONS DATA
 *
 * Available modifications for gear items
 * CRITICAL: All options are structured and predefined
 * NO free-form or arbitrary editing allowed
 *
 * Gear mods persist in item.flags.swse.gearMods[]
 */

export const GEAR_MODS = {
  "enhanced-sensors": {
    name: "Enhanced Sensors",
    description: "Improved detection and tracking systems",
    costCredits: 200,
    effect: "Percep +2",
    compatible: ["civilian", "military"]
  },
  "power-booster": {
    name: "Power Booster",
    description: "Extended battery life and increased output",
    costCredits: 250,
    effect: "Oper +4hr",
    compatible: ["civilian", "military"]
  },
  "stealth-coating": {
    name: "Stealth Coating",
    description: "Reflective materials reduce visibility",
    costCredits: 300,
    effect: "Stealth +3",
    compatible: ["military"]
  },
  "ergonomic-grip": {
    name: "Ergonomic Grip",
    description: "Improved handling and control",
    costCredits: 100,
    effect: "Use +2",
    compatible: ["civilian", "military"]
  },
  "tactical-mount": {
    name: "Tactical Mount",
    description: "Secure attachment points for accessories",
    costCredits: 180,
    effect: "Attach",
    compatible: ["military"]
  },
  "environmental-seal": {
    name: "Environmental Seal",
    description: "Protection against harsh conditions",
    costCredits: 220,
    effect: "Resist",
    compatible: ["civilian", "military"]
  },
  "data-encryption": {
    name: "Data Encryption",
    description: "Secure communication and storage",
    costCredits: 150,
    effect: "Secure",
    compatible: ["civilian", "military"]
  },
  "quick-release": {
    name: "Quick Release",
    description: "One-handed activation mechanism",
    costCredits: 120,
    effect: "Speed +1",
    compatible: ["civilian", "military"]
  }
};

export const GEAR_VARIANTS = {
  civilian: {
    name: "Civilian Configuration",
    description: "Optimized for commercial and utility use",
    restrictions: [] // Can use all non-military mods
  },
  military: {
    name: "Military Configuration",
    description: "Hardened for combat and field operations",
    restrictions: [] // Can use all mods
  }
};

export const DEFAULT_GEAR_VARIANT = "civilian";
export const DEFAULT_GEAR_ACCENT = "#888888";
export const MAX_GEAR_MODS = 6;  // Balance rule: max 6 mods per gear
