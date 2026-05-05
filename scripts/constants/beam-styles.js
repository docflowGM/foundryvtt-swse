/**
 * BEAM STYLES SYSTEM
 *
 * Player-selectable visual styles for ranged weapon projectiles.
 * All styles are purely cosmetic and never influence combat mechanics.
 *
 * Storage Location: weapon.flags.swse.beamStyle
 *
 * Each style defines:
 * - id: unique identifier
 * - name: display name for UI
 * - description: brief flavor description
 * - color: default bolt color (can be overridden by flags.swse.boltColor)
 */

export const BEAM_STYLES = {
  laser: {
    id: "laser",
    name: "Laser Line",
    description: "Instant beam effect — travels instantaneously",
    color: "red",
    type: "instant",
    characteristics: {
      appearance: "Thin line (1-2px)",
      duration: "instant",
      visual: "Energy beam from weapon to target",
      intensity: "sharp and precise"
    }
  },

  bolt: {
    id: "bolt",
    name: "Energy Bolt",
    description: "Traveling orb projectile — 300ms travel time",
    color: "blue",
    type: "traveling",
    travelDuration: 300,
    size: 4,
    characteristics: {
      appearance: "Small glowing sphere (4px radius)",
      duration: "300ms + impact",
      visual: "Arcing energy bolt from weapon to target",
      intensity: "medium glow"
    }
  },

  heavy: {
    id: "heavy",
    name: "Heavy Bolt",
    description: "Thick beam with concussive impact — triggers screen shake",
    color: "red",
    type: "traveling",
    travelDuration: 300,
    size: 8,
    screenShake: true,
    characteristics: {
      appearance: "Thick beam (8px width)",
      duration: "300ms + shake effect",
      visual: "Heavy impact effect on target",
      intensity: "strong with camera shake"
    }
  },

  pulse: {
    id: "pulse",
    name: "Rapid Pulse",
    description: "Short burst of energy bolts — 200ms travel time",
    color: "orange",
    type: "traveling",
    travelDuration: 200,
    size: 6,
    characteristics: {
      appearance: "Medium bolts (6px radius)",
      duration: "200ms rapid fire",
      visual: "Multiple rapid pulses",
      intensity: "quick and snappy"
    }
  },

  ion: {
    id: "ion",
    name: "Ion Stream",
    description: "Thin cyan energy stream — ionized particle beam",
    color: "cyan",
    type: "instant",
    characteristics: {
      appearance: "Thin cyan line (2px)",
      duration: "instant",
      visual: "Electrical energy stream",
      intensity: "precise and penetrating"
    }
  },

  plasma: {
    id: "plasma",
    name: "Plasma Shot",
    description: "Large plasma charge — 400ms travel with intense glow",
    color: "orange",
    type: "traveling",
    travelDuration: 400,
    size: 10,
    glow: true,
    characteristics: {
      appearance: "Large sphere (10px radius) with glow",
      duration: "400ms + impact",
      visual: "High-energy plasma projectile",
      intensity: "intense and destructive"
    }
  }
};

/**
 * Bolt color options
 * Matches BLADE_COLOR_MAP hex values from blade-colors.js
 */
export const BOLT_COLORS = {
  red: { name: "Red", hex: "#ff3333" },
  green: { name: "Green", hex: "#00ff66" },
  blue: { name: "Blue", hex: "#1e90ff" },
  yellow: { name: "Yellow", hex: "#ffff00" },
  cyan: { name: "Cyan", hex: "#00ffff" },
  orange: { name: "Orange", hex: "#ff8800" }
};

/**
 * Get beam style by ID
 * @param {string} styleId
 * @returns {Object|null}
 */
export function getBeamStyle(styleId) {
  return BEAM_STYLES[styleId] ?? null;
}

/**
 * Get bolt color by ID
 * @param {string} colorId
 * @returns {string} hex color code
 */
export function getBoltColor(colorId) {
  const value = String(colorId ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const key = value.toLowerCase();
  return BOLT_COLORS[key]?.hex ?? BOLT_COLORS.blue.hex;
}

/**
 * All available beam style IDs
 */
export const BEAM_STYLE_IDS = Object.keys(BEAM_STYLES);

/**
 * All available bolt color IDs
 */
export const BOLT_COLOR_IDS = Object.keys(BOLT_COLORS);
