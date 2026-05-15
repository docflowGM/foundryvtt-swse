/**
 * Recurring Damage Adapter
 *
 * Collects active recurring damage and hazard queues from the actor and displays as effect cards.
 * This is a display-only adapter: it reads existing pending recurring damage state and emits cards.
 * It does not resolve, consume, or mutate recurring damage entries.
 */

/**
 * Get pending recurring damage array from actor.
 * @param {Actor} actor - The actor
 * @returns {Array} Array of pending recurring damage instances (may be empty)
 */
function getPendingRecurringDamageFromActor(actor) {
  if (Array.isArray(actor?.flags?.swse?.pendingRecurringDamage)) {
    return actor.flags.swse.pendingRecurringDamage;
  }
  return [];
}

/**
 * Generate a stable, instance-aware recurring damage card ID.
 * Priority:
 * 1. instance id / uuid / _id
 * 2. sourceItemId + formula + trigger
 * 3. sourceKey + createdAt / timestamp
 * 4. key + formula + index as fallback
 * @param {Object} instance - Recurring damage instance
 * @param {number} index - Index in pendingRecurringDamage array
 * @returns {string} Stable card id
 */
function recurringDamageInstanceId(instance, index) {
  // Try instance-specific identifier fields
  const instanceIdField =
    instance?.id ??
    instance?._id ??
    instance?.uuid ??
    instance?.instanceId ??
    instance?.sourceItemId ??
    instance?.sourceActorId ??
    instance?.createdAt ??
    instance?.timestamp ??
    null;

  if (instanceIdField) {
    return `recurring:${instanceIdField}`;
  }

  // Fallback: use key + formula + index (ensures uniqueness within same actor)
  const key = instance?.key ?? "unknown";
  const formula = instance?.formula ?? "unknown";
  return `recurring:${key}:${formula}:${index}`;
}

/**
 * Build a recurring damage display card from a recurring damage instance.
 * @param {Object} instance - Recurring damage instance from actor state
 * @param {number} index - Index in pendingRecurringDamage array (for stable id fallback)
 * @returns {Object} Card object ready for display
 */
function buildRecurringDamageCard(instance, index = 0) {
  // Determine label
  const label = instance?.name || instance?.key || "Recurring Damage";

  // Build details array with available information
  const details = [];

  // Damage formula
  if (instance?.formula) {
    details.push(`Damage: ${instance.formula}`);
  }

  // Damage type
  if (instance?.damageType) {
    details.push(`Type: ${String(instance.damageType).charAt(0).toUpperCase() + String(instance.damageType).slice(1)}`);
  }

  // Trigger timing
  if (instance?.trigger) {
    let triggerText = "";
    const trig = instance.trigger;
    if (trig === "startOfTurn") {
      triggerText = "Triggers at start of turn";
    } else if (trig === "endOfTurn") {
      triggerText = "Triggers at end of turn";
    } else if (trig === "onMovement") {
      triggerText = "Triggers on movement";
    } else if (trig === "onAction") {
      triggerText = "Triggers when action taken";
    } else if (trig === "onDamage") {
      triggerText = "Triggers when taking damage";
    } else {
      triggerText = `Triggers: ${trig}`;
    }
    details.push(triggerText);
  }

  // Remaining triggers / duration
  if (instance?.remainingTriggers !== undefined && instance.remainingTriggers !== null) {
    const plural = Math.abs(instance.remainingTriggers) !== 1 ? "s" : "";
    details.push(`${instance.remainingTriggers} trigger${plural} remaining`);
  } else if (instance?.duration) {
    details.push(`Duration: ${instance.duration}`);
  }

  // Source information
  if (instance?.sourceActorId || instance?.sourceItemId) {
    const sources = [];
    if (instance.sourceItemId) {
      sources.push(`item ${instance.sourceItemId}`);
    }
    if (instance.sourceActorId) {
      sources.push(`actor ${instance.sourceActorId}`);
    }
    if (sources.length > 0) {
      details.push(`Source: ${sources.join(", ")}`);
    }
  }

  // Removal/treatment condition if specified
  if (instance?.removalCondition) {
    details.push(`Ends when: ${instance.removalCondition}`);
  }

  // Build tags
  const tags = ["recurring", "damage"];
  if (instance?.damageType) {
    tags.push(instance.damageType);
  }
  if (instance?.trigger) {
    tags.push(instance.trigger);
  }

  // Determine severity (recurring damage is always at least warning)
  let severity = "warning";
  if (instance?.damageType === "hazard" || instance?.trigger === "startOfTurn") {
    severity = "danger";
  }

  // Determine source
  const source = instance?.sourceName || "Recurring Damage";

  // Build stable, instance-aware ID
  const id = recurringDamageInstanceId(instance, index);

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

export class RecurringDamageAdapter {
  /**
   * Collect active recurring damage effect entries.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of recurring damage cards (0 or more)
   */
  static collect(actor, context = {}) {
    const pendingDamage = getPendingRecurringDamageFromActor(actor);
    if (!Array.isArray(pendingDamage) || pendingDamage.length === 0) {
      return [];
    }

    const cards = [];

    for (let index = 0; index < pendingDamage.length; index++) {
      const instance = pendingDamage[index];
      if (!instance || !instance.key) continue; // Skip invalid entries

      // Build card from instance
      const card = buildRecurringDamageCard(instance, index);

      // Only add if we got a valid card
      if (card && card.id) {
        cards.push(card);
      }
    }

    return cards;
  }
}

export default RecurringDamageAdapter;
