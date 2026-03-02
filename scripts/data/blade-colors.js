/**
 * LIGHTSABER BLADE COLORS
 *
 * Canonical color map for blade color selection during construction
 * and token light emission.
 *
 * Structure:
 * - Color name → Hex color code
 * - Used by construction UI for selection
 * - Used by item sheet for token light projection
 *
 * Pure cosmetic, zero combat logic.
 */

export const BLADE_COLOR_MAP = {
  // Traditional Jedi Colors
  blue: "#1e90ff",
  green: "#00ff66",
  cyan: "#00ffff",
  aqua: "#00ffaa",
  indigo: "#4b0082",
  teal: "#008080",
  viridian: "#40826d",

  // Sith & Aggressive Colors
  red: "#ff1a1a",
  crimson: "#dc143c",
  purple: "#aa00ff",
  violet: "#8f00ff",
  magenta: "#ff00ff",

  // Neutral & Special Colors
  yellow: "#ffd700",
  gold: "#ffd700",
  amber: "#ffbf00",
  orange: "#ff8800",
  white: "#ffffff",
  silver: "#c0c0c0",
  pink: "#ff69b4",
  emerald: "#50c878"
};

// List of all available colors for iteration
export const VARIES_COLOR_LIST = Object.keys(BLADE_COLOR_MAP);

/**
 * Get hex color for a blade color name
 * @param {string} colorName - Color name (e.g., "blue", "red")
 * @returns {string} Hex color code or cyan fallback
 */
export function getBladeColorHex(colorName) {
  return BLADE_COLOR_MAP[colorName] ?? "#00ffff";
}

/**
 * Default blade color for new constructions
 */
export const DEFAULT_BLADE_COLOR = "blue";
