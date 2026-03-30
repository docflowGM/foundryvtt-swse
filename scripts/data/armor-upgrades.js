/**
 * ARMOR UPGRADES DATA
 *
 * Available modifications for armor
 * Data-driven approach: upgrades persist in item.flags.swse.armorUpgrades[]
 */

export const ARMOR_UPGRADES = {
  "reinforced-plating": {
    name: "Reinforced Plating",
    description: "Layered durasteel plates for enhanced protection",
    costCredits: 500,
    effect: "2 DR"
  },
  "energy-dampener": {
    name: "Energy Dampener",
    description: "Ablative coating reduces energy weapon damage",
    costCredits: 400,
    effect: "5 ED"
  },
  "mobility-joints": {
    name: "Mobility Joints",
    description: "Articulated sections improve movement",
    costCredits: 300,
    effect: "5ft Speed"
  },
  "thermal-insulation": {
    name: "Thermal Insulation",
    description: "Protects against extreme temperatures",
    costCredits: 350,
    effect: "Temp Resist"
  },
  "reactive-plating": {
    name: "Reactive Plating",
    description: "Responds to incoming attacks",
    costCredits: 600,
    effect: "Reflect 10%"
  },
  "integrated-comlink": {
    name: "Integrated Comlink",
    description: "Encrypted communication system",
    costCredits: 250,
    effect: "Comlink"
  },
  "medical-system": {
    name: "Medical System",
    description: "Built-in diagnostic and treatment tools",
    costCredits: 800,
    effect: "Med +2"
  },
  "stealth-weave": {
    name: "Stealth Weave",
    description: "Advanced camouflage and sensor dampening",
    costCredits: 900,
    effect: "Stealth +3"
  },
  "sensor-array": {
    name: "Sensor Array",
    description: "Integrated tactical sensor suite",
    costCredits: 550,
    effect: "Percep +2"
  },
  "power-cell": {
    name: "Power Cell Integration",
    description: "Powers active systems",
    costCredits: 400,
    effect: "Powers"
  }
};

export const ARMOR_UPGRADE_GROUPS = {
  defensive: ["reinforced-plating", "energy-dampener", "thermal-insulation", "reactive-plating"],
  utility: ["integrated-comlink", "medical-system", "sensor-array", "power-cell"],
  mobility: ["mobility-joints", "stealth-weave"]
};

export const MAX_ARMOR_UPGRADES = 5;  // Balance rule: max 5 modifications per armor
