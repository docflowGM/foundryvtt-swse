/**
 * MELEE WEAPON UPGRADES DATA
 *
 * Available modifications for melee weapons (non-lightsaber)
 * Data-driven approach: upgrades persist in item.flags.swse.meleeUpgrades[]
 */

export const MELEE_UPGRADES = {
  "sharpened-edge": {
    name: "Sharpened Edge",
    description: "Honed to razor sharpness for increased cutting power",
    costCredits: 150,
    effect: "+1 Damage"
  },
  "balanced-grip": {
    name: "Balanced Grip",
    description: "Expertly weighted for improved control and accuracy",
    costCredits: 120,
    effect: "+1 Attack"
  },
  "reinforced-core": {
    name: "Reinforced Core",
    description: "Steel reinforcement prevents breakage and dulling",
    costCredits: 200,
    effect: "Durability"
  },
  "vibro-edge-tuning": {
    name: "Vibro-Edge Tuning",
    description: "Microsonic vibrations enhance cutting ability",
    costCredits: 300,
    effect: "+2 Damage"
  },
  "weight-redistribution": {
    name: "Weight Redistribution",
    description: "Shifted mass for faster, more deadly strikes",
    costCredits: 180,
    effect: "Speed +5ft"
  },
  "defensive-guard": {
    name: "Defensive Guard",
    description: "Enhanced crossguard for improved parrying",
    costCredits: 160,
    effect: "+1 AC"
  },
  "grip-enhancement": {
    name: "Grip Enhancement",
    description: "Non-slip coating and ergonomic shaping",
    costCredits: 100,
    effect: "+Grip"
  },
  "pommel-counterweight": {
    name: "Pommel Counterweight",
    description: "Weighted pommel improves swing control",
    costCredits: 140,
    effect: "Balance"
  }
};

export const MELEE_ACCENT_COLORS = {
  "steel": "#a0a0a0",
  "gold": "#d4af37",
  "copper": "#b87333",
  "silver": "#c0c0c0",
  "black": "#1a1a1a",
  "crimson": "#dc143c"
};

export const DEFAULT_MELEE_ACCENT = "steel";
