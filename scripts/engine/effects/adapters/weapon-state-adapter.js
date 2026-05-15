/**
 * Weapon State Adapter
 *
 * Collects actor-owned weapon items with tactically relevant active/armed state.
 * This is a display-only adapter: it reads weapon state flags and emits cards for active effects.
 * It does not mutate weapons, coatings, or state flags.
 *
 * Emits cards only for tactically relevant state:
 * - Applied poison coatings
 * - Vile / Jagged conditions
 * - Stun / Ion modes
 * - Other tactical weapon enhancements
 */

import { actorItems } from "./effect-card-utils.js";

/**
 * Check if a weapon has applied poison coating.
 * @param {Item} weapon - The weapon item
 * @returns {Object|null} Applied poison state or null
 */
function getAppliedPoisonCoating(weapon) {
  const coating = weapon?.flags?.swse?.appliedPoison;
  if (coating && typeof coating === "object" && coating.poisonKey) {
    return coating;
  }
  return null;
}

/**
 * Check if a weapon has a Vile condition applied.
 * @param {Item} weapon - The weapon item
 * @returns {boolean}
 */
function hasVileCondition(weapon) {
  return weapon?.flags?.swse?.vile === true || weapon?.system?.conditions?.vile === true;
}

/**
 * Check if a weapon has a Jagged condition applied.
 * @param {Item} weapon - The weapon item
 * @returns {boolean}
 */
function hasJaggedCondition(weapon) {
  return weapon?.flags?.swse?.jagged === true || weapon?.system?.conditions?.jagged === true;
}

/**
 * Check if a weapon has stun mode enabled.
 * @param {Item} weapon - The weapon item
 * @returns {boolean}
 */
function hasStunMode(weapon) {
  return weapon?.flags?.swse?.stunMode === true || weapon?.system?.modes?.stun === true;
}

/**
 * Check if a weapon has ion mode enabled.
 * @param {Item} weapon - The weapon item
 * @returns {boolean}
 */
function hasIonMode(weapon) {
  return weapon?.flags?.swse?.ionMode === true || weapon?.system?.modes?.ion === true;
}

/**
 * Generate a stable, instance-aware weapon state card ID.
 * Priority:
 * 1. weapon id + state type (coating, vile, jagged, stun, ion)
 * 2. weapon uuid
 * @param {Item} weapon - The weapon item
 * @param {string} stateType - Type of weapon state (e.g., "coating", "vile")
 * @returns {string} Stable card id
 */
function weaponStateCardId(weapon, stateType) {
  const weaponId = weapon?.id ?? weapon?.uuid ?? "unknown";
  return `weapon:${weaponId}:${stateType}`;
}

/**
 * Build a poison coating effect card for a weapon.
 * @param {Item} weapon - The weapon item
 * @param {Object} coating - Applied poison coating state
 * @returns {Object|null} Card object or null if insufficient data
 */
function buildCoatingCard(weapon, coating) {
  if (!weapon || !coating) return null;

  const label = `${weapon.name} - ${coating.poisonName || coating.poisonKey}`;
  const details = [];

  // Poison key
  if (coating.poisonKey) {
    details.push(`Poison: ${coating.poisonKey}`);
  }

  // Delivery method
  if (coating.delivery) {
    details.push(`Delivery: ${String(coating.delivery).charAt(0).toUpperCase() + String(coating.delivery).slice(1)}`);
  }

  // Source information
  if (coating.sourceActorId || coating.sourceItemId) {
    const sources = [];
    if (coating.sourceItemId) {
      sources.push(`from item ${coating.sourceItemId}`);
    }
    if (coating.sourceActorId) {
      sources.push(`by actor ${coating.sourceActorId}`);
    }
    if (sources.length > 0) {
      details.push(`Applied ${sources.join(", ")}`);
    }
  }

  const id = weaponStateCardId(weapon, "coating");

  return {
    id,
    label,
    type: "debuff",
    severity: "danger",
    source: weapon.name,
    text: `${weapon.name} has an active poison coating.`,
    details: details.filter(Boolean),
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["weapon", "poison", "coating"]
  };
}

/**
 * Build a special weapon condition card (Vile, Jagged, etc.).
 * @param {Item} weapon - The weapon item
 * @param {string} conditionType - Type of condition (vile, jagged)
 * @returns {Object} Card object ready for display
 */
function buildWeaponConditionCard(weapon, conditionType) {
  const conditionLabel = conditionType.charAt(0).toUpperCase() + conditionType.slice(1);
  const label = `${weapon.name} - ${conditionLabel}`;

  const details = [];
  if (conditionType === "vile") {
    details.push("Special weapon condition: Vile");
    details.push("Enhanced lethality against living creatures");
  } else if (conditionType === "jagged") {
    details.push("Special weapon condition: Jagged");
    details.push("Causes bleeding and tearing wounds");
  }

  const id = weaponStateCardId(weapon, conditionType);

  return {
    id,
    label,
    type: "debuff",
    severity: "warning",
    source: weapon.name,
    text: `${weapon.name} has ${conditionLabel.toLowerCase()} condition applied.`,
    details: details.filter(Boolean),
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["weapon", conditionType.toLowerCase()]
  };
}

/**
 * Build a weapon mode card (Stun, Ion, etc.).
 * @param {Item} weapon - The weapon item
 * @param {string} modeType - Type of mode (stun, ion)
 * @returns {Object} Card object ready for display
 */
function buildWeaponModeCard(weapon, modeType) {
  const modeLabel = modeType.charAt(0).toUpperCase() + modeType.slice(1);
  const label = `${weapon.name} - ${modeLabel} Mode`;

  const details = [];
  if (modeType === "stun") {
    details.push("Weapon mode: Stun");
    details.push("Configured to deal non-lethal stun damage");
  } else if (modeType === "ion") {
    details.push("Weapon mode: Ion");
    details.push("Configured to deal ion damage");
  }

  const id = weaponStateCardId(weapon, modeType);

  return {
    id,
    label,
    type: "buff",
    severity: "info",
    source: weapon.name,
    text: `${weapon.name} is in ${modeLabel.toLowerCase()} mode.`,
    details: details.filter(Boolean),
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags: ["weapon", modeType.toLowerCase(), "mode"]
  };
}

export class WeaponStateAdapter {
  /**
   * Collect tactically relevant weapon state effect entries.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of weapon state cards (0 or more)
   */
  static collect(actor, context = {}) {
    const cards = [];

    for (const item of actorItems(actor)) {
      if (!item || item.type !== "weapon") continue; // Only weapons
      if (item.system?.disabled === true) continue; // Skip disabled items

      // Check for applied poison coating
      const coating = getAppliedPoisonCoating(item);
      if (coating) {
        const coatingCard = buildCoatingCard(item, coating);
        if (coatingCard) {
          cards.push(coatingCard);
        }
      }

      // Check for Vile condition
      if (hasVileCondition(item)) {
        cards.push(buildWeaponConditionCard(item, "vile"));
      }

      // Check for Jagged condition
      if (hasJaggedCondition(item)) {
        cards.push(buildWeaponConditionCard(item, "jagged"));
      }

      // Check for Stun mode
      if (hasStunMode(item)) {
        cards.push(buildWeaponModeCard(item, "stun"));
      }

      // Check for Ion mode
      if (hasIonMode(item)) {
        cards.push(buildWeaponModeCard(item, "ion"));
      }
    }

    return cards;
  }
}

export default WeaponStateAdapter;
