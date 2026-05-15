/**
 * Poison Effect Adapter
 *
 * Collects active poison state from the actor and displays as effect cards.
 * This is a display-only adapter: it reads existing PoisonEngine state and emits cards.
 * It does not resolve poison, treat poison, clear poison, apply damage, or mutate actors.
 */

import { PoisonRegistry } from "/systems/foundryvtt-swse/scripts/engine/poison/poison-registry.js";

/**
 * Get active poisons array from actor (multiple fallback sources).
 * @param {Actor} actor - The actor
 * @returns {Array} Array of active poison instances (may be empty)
 */
function getActivePoisonsFromActor(actor) {
  // Try flags first (primary source)
  if (Array.isArray(actor?.flags?.swse?.activePoisons)) {
    return actor.flags.swse.activePoisons;
  }
  // Try system path as fallback (kept in sync by PoisonEngine)
  if (Array.isArray(actor?.system?.activePoisons)) {
    return actor.system.activePoisons;
  }
  return [];
}

/**
 * Generate a stable, instance-aware poison card ID to prevent accidental deduplication.
 * Priority:
 * 1. poison instance id / uuid / _id
 * 2. poisonKey + sourceItemId
 * 3. poisonKey + sourceActorId / createdAt / timestamp
 * 4. poisonKey + delivery + index as fallback
 * @param {Object} instance - Active poison instance
 * @param {Object} definition - Poison definition
 * @param {number} index - Index in activePoisons array
 * @returns {string} Stable card id
 */
function poisonInstanceId(instance, definition, index) {
  const poisonKey = instance?.poisonKey ?? definition?.key ?? "unknown";

  // Try instance-specific identifier fields
  const instanceIdField =
    instance?.id ??
    instance?._id ??
    instance?.uuid ??
    instance?.instanceId ??
    instance?.sourceItemId ??
    instance?.itemId ??
    instance?.sourceActorId ??
    instance?.createdAt ??
    instance?.timestamp ??
    null;

  if (instanceIdField) {
    return `poison:${poisonKey}:${instanceIdField}`;
  }

  // Fallback: use delivery + index (ensures uniqueness within same actor)
  const delivery = instance?.delivery ?? "unknown";
  return `poison:${poisonKey}:${delivery}:${index}`;
}

/**
 * Build a poison display card from a poison instance and definition.
 * @param {Object} instance - Active poison instance from actor state
 * @param {Object} definition - Poison definition from PoisonRegistry
 * @param {number} index - Index in activePoisons array (for stable id fallback)
 * @returns {Object} Card object ready for display
 */
function buildPoisonCard(instance, definition, index = 0) {
  // Determine label
  const label = definition?.name || instance?.poisonName || instance?.poisonKey || "Unknown Poison";

  // Build details array with available information
  const details = [];

  // Delivery method
  if (instance?.delivery) {
    details.push(`Delivery: ${String(instance.delivery).charAt(0).toUpperCase() + String(instance.delivery).slice(1)}`);
  }

  // Attack information
  if (definition?.attack) {
    const atk = definition.attack;
    const defense = atk.defense ? atk.defense.charAt(0).toUpperCase() + atk.defense.slice(1) : "Defense";
    const bonus = atk.bonus ? `+${atk.bonus}` : "";
    if (bonus || defense) {
      details.push(`Attack: ${bonus} vs ${defense}`.trim());
    }
  }

  // Damage information
  if (definition?.damage) {
    const dmg = definition.damage;
    if (dmg.formula) {
      details.push(`Damage: ${dmg.formula}`);
    }
    if (dmg.conditionTrack?.steps) {
      const steps = dmg.conditionTrack.steps;
      const dir = steps > 0 ? "+" : "";
      details.push(`Condition Track: ${dir}${steps} step${Math.abs(steps) !== 1 ? "s" : ""}`);
    }
    if (dmg.conditionTrack?.persistent) {
      details.push("Persistent condition until treated.");
    }
  }

  // Recurrence timing
  if (definition?.recurrence?.type) {
    const recType = definition.recurrence.type;
    let recText = "";
    if (recType === "startOfTurnUntilTreated") {
      recText = "Recurs at start of turn until treated.";
    } else if (recType === "startOfTurnWhileExposed") {
      recText = "Recurs at start of turn while exposed.";
    } else if (recType === "onForcePointSpent") {
      recText = "Recurs when Force Points are spent.";
    }
    if (recText) details.push(recText);
  }

  // Treatment information
  if (definition?.treatment) {
    const trt = definition.treatment;
    const skill = trt.skill ? trt.skill.replace(/([A-Z])/g, ' $1').trim() : "Skill check";
    const dc = trt.dc ? `DC ${trt.dc}` : "";
    const kit = trt.requiresMedicalKit ? " with medical kit" : "";
    if (dc) {
      details.push(`Treatment: ${skill} ${dc}${kit}`.trim());
    }
  }

  // Exposure status
  if (instance?.exposed === true) {
    details.push("Ongoing exposure: poison is being actively applied.");
  }

  // Sith Poison specific: consecutive failures
  if (definition?.key === "sith-poison" && instance?.failureCount) {
    details.push(`Sith Poison consecutive failures: ${instance.failureCount}/5`);
  }

  // Build tags
  const tags = ["poison"];
  if (instance?.delivery) {
    tags.push(instance.delivery);
  }
  if (definition?.keywords && Array.isArray(definition.keywords)) {
    definition.keywords.forEach(kw => {
      if (kw && kw !== "poison" && !tags.includes(kw)) {
        tags.push(kw);
      }
    });
  }

  // Determine severity
  // Active poison with recurrence is "danger", exposure-only or uncertain is "warning"
  let severity = "warning";
  if (definition?.recurrence?.type || instance?.failureCount) {
    severity = "danger";
  }

  // Determine source
  const source = definition?.source || "PoisonEngine";

  // Build stable, instance-aware ID to prevent accidental deduplication
  const id = poisonInstanceId(instance, definition, index);

  return {
    id,
    label,
    type: "debuff",
    severity,
    source,
    text: `Active ${label} affecting this actor.`,
    details: details.filter(Boolean),
    gmEnforced: false,
    mechanical: true,
    icon: null,
    tags
  };
}

export class PoisonEffectAdapter {
  /**
   * Collect active poison effect entries.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of poison cards (0 or more)
   */
  static collect(actor, context = {}) {
    const activePoisons = getActivePoisonsFromActor(actor);
    if (!Array.isArray(activePoisons) || activePoisons.length === 0) {
      return [];
    }

    const cards = [];

    for (let index = 0; index < activePoisons.length; index++) {
      const instance = activePoisons[index];
      if (!instance || !instance.poisonKey) continue; // Skip invalid entries

      let definition = null;
      try {
        definition = PoisonRegistry.get(instance.poisonKey);
      } catch (err) {
        // PoisonRegistry lookup failed; still create a fallback card
        console.warn("SWSE | PoisonEffectAdapter: PoisonRegistry lookup failed", instance.poisonKey, err);
      }

      // Build card from instance and definition (definition may be null)
      // Pass index for stable instance-aware ID generation
      const card = buildPoisonCard(instance, definition, index);

      // Only add if we got a valid card
      if (card && card.id) {
        cards.push(card);
      }
    }

    return cards;
  }
}

export default PoisonEffectAdapter;
