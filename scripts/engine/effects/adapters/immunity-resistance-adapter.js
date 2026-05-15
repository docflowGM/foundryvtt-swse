/**
 * Immunity/Resistance Adapter
 *
 * Collects tactically important immunities, resistances, shields, and damage reduction.
 * This is a display-only adapter: it reads existing protection state and emits cards.
 * It does not calculate new bonuses, apply immunities, change damage, or mutate actors.
 */

import { actorItems } from "./effect-card-utils.js";

/**
 * Get species immunities from actor derived data.
 * @param {Actor} actor - The actor
 * @returns {Array} Array of species immunities (may be empty)
 */
function getSpeciesImmunities(actor) {
  const immunities = actor?.system?.derived?.speciesImmunities;
  if (Array.isArray(immunities)) {
    return immunities.filter(Boolean);
  }
  if (typeof immunities === "object" && immunities !== null) {
    return Object.entries(immunities)
      .filter(([key, val]) => val === true || val > 0)
      .map(([key]) => key);
  }
  return [];
}

/**
 * Get species resistances from actor derived data.
 * @param {Actor} actor - The actor
 * @returns {Array} Array of species resistances (may be empty)
 */
function getSpeciesResistances(actor) {
  const resistances = actor?.system?.derived?.speciesResistances;
  if (Array.isArray(resistances)) {
    return resistances.filter(Boolean);
  }
  if (typeof resistances === "object" && resistances !== null) {
    return Object.entries(resistances)
      .filter(([key, val]) => val === true || val > 0)
      .map(([key, val]) => typeof val === "number" ? `${key} ${val}` : key);
  }
  return [];
}

/**
 * Get NPC-style immunities text field, filtering out "none"/"n/a" markers.
 * @param {Actor} actor - The actor
 * @returns {string} Immunities text or empty string
 */
function getNpcImmunities(actor) {
  const text = actor?.system?.immunities;
  if (typeof text !== "string") return "";

  const trimmed = text.trim();

  // Filter out common "none" markers
  if (/^(none|n\/a|—|-|null|undefined)$/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

/**
 * Get NPC-style resistances text field, filtering out "none"/"n/a" markers.
 * @param {Actor} actor - The actor
 * @returns {string} Resistances text or empty string
 */
function getNpcResistances(actor) {
  const text = actor?.system?.resistances;
  if (typeof text !== "string") return "";

  const trimmed = text.trim();

  // Filter out common "none" markers
  if (/^(none|n\/a|—|-|null|undefined)$/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

/**
 * Get actor-level damage reduction value.
 * @param {Actor} actor - The actor
 * @returns {number} Damage reduction value (0 if none)
 */
function getActorDamageReduction(actor) {
  return Number(actor?.system?.damageReduction ?? 0) || 0;
}

/**
 * Get shield rating and current value from actor.
 * @param {Actor} actor - The actor
 * @returns {Object} { rating, current, source } or null
 */
function getActorShieldRating(actor) {
  const derived = actor?.system?.derived?.shield;
  const systemRating = Number(actor?.system?.shieldRating ?? 0) || 0;
  const systemCurrent = Number(actor?.system?.currentSR ?? 0) || 0;

  const rating = derived?.max ?? systemRating;
  const current = derived?.current ?? systemCurrent;

  if (rating > 0) {
    return {
      rating,
      current,
      source: derived ? "derived" : "system"
    };
  }
  return null;
}

/**
 * Check if actor is a droid and extract droid-specific immunities.
 * Droids are immune to poison per poison-engine canonical rules.
 * @param {Actor} actor - The actor
 * @returns {Array} Array of droid immunity descriptions (from canonical state)
 */
function getDroidImmunities(actor) {
  const immunities = [];

  // Droids are immune to poison (canonical from poison-engine line 652)
  // This is the only droid immunity explicitly encoded in engine behavior
  if (actor?.type === "droid") {
    immunities.push("Poison");
  }

  return immunities;
}

/**
 * Generate a stable, instance-aware protection card ID.
 * Priority:
 * 1. explicit state id / uuid
 * 2. protection type + source item id
 * 3. protection type + source actor/species id
 * 4. protection type + value + index fallback
 * @param {string} protectionType - Type of protection (immunity, resistance, dr, sr)
 * @param {string} protectionName - Name of the protection
 * @param {Object} sourceInfo - { id, type } for source
 * @param {number} index - Index for fallback
 * @returns {string} Stable card id
 */
function protectionCardId(protectionType, protectionName, sourceInfo, index = 0) {
  const type = protectionType.toLowerCase();
  const name = String(protectionName ?? "unknown").toLowerCase().replace(/\s+/g, "-");

  // Try explicit source id first
  if (sourceInfo?.id) {
    return `protection:${type}:${sourceInfo.id}`;
  }

  // Try source type + name
  if (sourceInfo?.type) {
    return `protection:${type}:${sourceInfo.type}:${name}`;
  }

  // Fallback with index
  return `protection:${type}:${name}:${index}`;
}

/**
 * Build a species immunity card.
 * @param {string} immunityType - Type of immunity (Poison, Disease, etc.)
 * @returns {Object} Card object ready for display
 */
function buildSpeciesImmunityCard(immunityType, index = 0) {
  const label = `${immunityType} Immunity`;
  const details = [`Species trait: Immune to ${immunityType.toLowerCase()}`];

  return {
    id: protectionCardId("immunity", immunityType, { type: "species" }, index),
    label,
    type: "buff",
    severity: "positive",
    source: "Species Trait",
    text: `Character is immune to ${immunityType.toLowerCase()}.`,
    details,
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["immunity", "protection", "species"]
  };
}

/**
 * Build a species resistance card.
 * @param {string} resistanceType - Type of resistance
 * @param {number|null} value - Resistance value if numeric, null if boolean
 * @param {number} index - Index for fallback ID
 * @returns {Object} Card object ready for display
 */
function buildSpeciesResistanceCard(resistanceType, value = null, index = 0) {
  const valueText = value ? ` ${value}` : "";
  const label = `${resistanceType} Resistance${valueText}`;
  const details = [`Species trait: Resistant to ${resistanceType.toLowerCase()}${valueText}`];

  return {
    id: protectionCardId("resistance", resistanceType, { type: "species" }, index),
    label,
    type: "buff",
    severity: "positive",
    source: "Species Trait",
    text: `Character has ${resistanceType.toLowerCase()} resistance${valueText}.`,
    details,
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["resistance", "protection", "species"]
  };
}

/**
 * Build a droid immunity card.
 * @param {string} immunityType - Type of droid immunity
 * @returns {Object} Card object ready for display
 */
function buildDroidImmunityCard(immunityType, index = 0) {
  const label = `${immunityType} Immunity`;
  const details = [`Droid trait: Immune to ${immunityType.toLowerCase()}`];

  return {
    id: protectionCardId("immunity", `droid-${immunityType}`, { type: "droid" }, index),
    label,
    type: "buff",
    severity: "positive",
    source: "Droid Trait",
    text: `Droid is immune to ${immunityType.toLowerCase()}.`,
    details,
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["immunity", "protection", "droid"]
  };
}

/**
 * Build a damage reduction card.
 * @param {number} value - DR value
 * @returns {Object} Card object ready for display
 */
function buildDamageReductionCard(value) {
  if (value <= 0) return null;

  const label = `Damage Reduction ${value}`;
  const details = [`Reduces incoming damage by ${value} points`];

  return {
    id: protectionCardId("damage-reduction", `dr-${value}`, { type: "actor" }),
    label,
    type: "buff",
    severity: "positive",
    source: "Actor",
    text: `Actor has damage reduction ${value}.`,
    details,
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["protection", "damage-reduction", "dr"]
  };
}

/**
 * Build a shield rating card.
 * @param {number} rating - Shield rating max
 * @param {number} current - Current shield points
 * @returns {Object} Card object ready for display
 */
function buildShieldRatingCard(rating, current = 0) {
  if (rating <= 0) return null;

  const label = `Shield Rating ${rating}`;
  const statusText = current < rating ? ` (${current}/${rating})` : "";
  const details = [`Shields can absorb up to ${rating} points of damage${current < rating ? `, currently ${current} active` : ""}`];

  return {
    id: protectionCardId("shield-rating", `sr-${rating}`, { type: "actor" }),
    label,
    type: "buff",
    severity: "positive",
    source: "Equipment",
    text: `Character has shield rating ${rating}${statusText}.`,
    details,
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["protection", "shield", "sr"]
  };
}

/**
 * Build an NPC immunity card from text field.
 * @param {string} immunityText - Text describing immunities
 * @returns {Object|null} Card object or null if text is empty
 */
function buildNpcImmunityCard(immunityText) {
  if (!immunityText || immunityText.length === 0) return null;

  const label = "Immunities";
  const details = [immunityText];

  return {
    id: protectionCardId("immunity", "npc-immunities", { type: "npc" }),
    label,
    type: "buff",
    severity: "positive",
    source: "NPC Data",
    text: `Character has the following immunities: ${immunityText}`,
    details,
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["immunity", "protection", "npc"]
  };
}

/**
 * Build an NPC resistance card from text field.
 * @param {string} resistanceText - Text describing resistances
 * @returns {Object|null} Card object or null if text is empty
 */
function buildNpcResistanceCard(resistanceText) {
  if (!resistanceText || resistanceText.length === 0) return null;

  const label = "Resistances";
  const details = [resistanceText];

  return {
    id: protectionCardId("resistance", "npc-resistances", { type: "npc" }),
    label,
    type: "buff",
    severity: "positive",
    source: "NPC Data",
    text: `Character has the following resistances: ${resistanceText}`,
    details,
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["resistance", "protection", "npc"]
  };
}

export class ImmunityResistanceAdapter {
  /**
   * Collect tactically important protection effect entries.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of protection cards (0 or more)
   */
  static collect(actor, context = {}) {
    if (!actor) return [];

    const cards = [];

    // Collect species immunities
    try {
      const speciesImmunities = getSpeciesImmunities(actor);
      speciesImmunities.forEach((immunity, index) => {
        const card = buildSpeciesImmunityCard(immunity, index);
        if (card) cards.push(card);
      });
    } catch (err) {
      console.warn("SWSE | ImmunityResistanceAdapter: species immunity collection failed", err);
    }

    // Collect species resistances
    try {
      const speciesResistances = getSpeciesResistances(actor);
      speciesResistances.forEach((resistance, index) => {
        // Parse "type value" format if present
        const parts = String(resistance ?? "").split(/\s+/);
        const type = parts[0];
        const value = parts.length > 1 ? Number(parts[1]) : null;
        const card = buildSpeciesResistanceCard(type, isNaN(value) ? null : value, index);
        if (card) cards.push(card);
      });
    } catch (err) {
      console.warn("SWSE | ImmunityResistanceAdapter: species resistance collection failed", err);
    }

    // Collect droid immunities (if actor is a droid)
    if (actor?.type === "droid") {
      try {
        const droidImmunities = getDroidImmunities(actor);
        droidImmunities.forEach((immunity, index) => {
          const card = buildDroidImmunityCard(immunity, index);
          if (card) cards.push(card);
        });
      } catch (err) {
        console.warn("SWSE | ImmunityResistanceAdapter: droid immunity collection failed", err);
      }
    }

    // Collect damage reduction
    try {
      const dr = getActorDamageReduction(actor);
      if (dr > 0) {
        const card = buildDamageReductionCard(dr);
        if (card) cards.push(card);
      }
    } catch (err) {
      console.warn("SWSE | ImmunityResistanceAdapter: damage reduction collection failed", err);
    }

    // Collect shield rating
    try {
      const shield = getActorShieldRating(actor);
      if (shield) {
        const card = buildShieldRatingCard(shield.rating, shield.current);
        if (card) cards.push(card);
      }
    } catch (err) {
      console.warn("SWSE | ImmunityResistanceAdapter: shield rating collection failed", err);
    }

    // Collect NPC immunities (text field)
    try {
      const npcImmunities = getNpcImmunities(actor);
      if (npcImmunities) {
        const card = buildNpcImmunityCard(npcImmunities);
        if (card) cards.push(card);
      }
    } catch (err) {
      console.warn("SWSE | ImmunityResistanceAdapter: NPC immunity collection failed", err);
    }

    // Collect NPC resistances (text field)
    try {
      const npcResistances = getNpcResistances(actor);
      if (npcResistances) {
        const card = buildNpcResistanceCard(npcResistances);
        if (card) cards.push(card);
      }
    } catch (err) {
      console.warn("SWSE | ImmunityResistanceAdapter: NPC resistance collection failed", err);
    }

    return cards;
  }
}

export default ImmunityResistanceAdapter;
