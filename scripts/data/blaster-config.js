/**
 * BLASTER CONFIGURATION DATA
 *
 * Bolt colors and visual properties for blaster weapons
 * Data-driven approach: colors persist in item.flags.swse.boltColor
 */

export const BLASTER_BOLT_COLORS = {
  red: "#ff3333",
  blue: "#1e90ff",
  green: "#00ff66",
  yellow: "#ffff00"
};

export const BLASTER_FX_TYPES = {
  standard: {
    name: "Standard",
    description: "Normal bolt velocity and dispersal",
    beamStyle: "bolt"
  },
  heavy: {
    name: "Heavy",
    description: "Increased bolt size and impact energy",
    beamStyle: "heavy"
  },
  ion: {
    name: "Ion",
    description: "Electromagnetic discharge, anti-shield",
    beamStyle: "ion"
  }
};

export const DEFAULT_BOLT_COLOR = "red";
export const DEFAULT_FX_TYPE = "standard";
