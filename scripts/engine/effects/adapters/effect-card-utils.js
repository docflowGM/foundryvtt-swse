/**
 * Effect Card Utilities
 *
 * Shared helper functions for effect adapters.
 * These functions perform lightweight normalization and text generation without semantic changes.
 */

/**
 * Normalize a name into a kebab-case id.
 * @param {*} value - Any value to normalize
 * @returns {string} Normalized kebab-case string
 */
export function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Safely extract actor items array.
 * @param {Actor} actor - The actor
 * @returns {Item[]} Array of items (empty if error)
 */
export function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

/**
 * Safely extract actor effects array.
 * @param {Actor} actor - The actor
 * @returns {ActiveEffect[]} Array of effects (empty if error)
 */
export function actorEffects(actor) {
  try { return Array.from(actor?.effects ?? []); }
  catch (_err) { return []; }
}

/**
 * Extract system active effects array.
 * @param {Actor} actor - The actor
 * @returns {Object[]} Array of system active effects
 */
export function systemActiveEffects(actor) {
  return Array.isArray(actor?.system?.activeEffects) ? actor.system.activeEffects : [];
}

/**
 * Detect condition step from multiple fallback sources.
 * @param {Actor} actor - The actor
 * @returns {number} Condition step 0-5
 */
export function getConditionStep(actor) {
  const candidates = [
    actor?.system?.conditionTrack?.current,
    actor?.system?.derived?.damage?.conditionStep,
    actor?.system?.condition?.step
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.max(0, Math.min(5, numeric));
  }
  return 0;
}

/**
 * Check if condition is marked persistent.
 * @param {Actor} actor - The actor
 * @returns {boolean} True if persistent
 */
export function isPersistentCondition(actor) {
  return actor?.system?.conditionTrack?.persistent === true
    || actor?.flags?.swse?.rageAftereffectActive === true
    || actor?.system?.derived?.damage?.conditionPersistent === true;
}

/**
 * Generate condition penalty text for a given step.
 * @param {number} step - Condition step 0-5
 * @returns {string} Penalty text ("Normal", "-1", "-2", etc.)
 */
export function conditionPenaltyForStep(step) {
  switch (Number(step) || 0) {
    case 1: return "-1";
    case 2: return "-2";
    case 3: return "-5";
    case 4: return "-10";
    case 5: return "Helpless";
    default: return "Normal";
  }
}

/**
 * Generate severity for a condition step.
 * @param {number} step - Condition step 0-5
 * @returns {string} Severity ("danger", "warning", "info")
 */
export function severityForStep(step) {
  if (step >= 5) return "danger";
  if (step >= 3) return "danger";
  if (step >= 1) return "warning";
  return "info";
}

/**
 * Generate duration text from effect duration object.
 * @param {Object} effect - The ActiveEffect
 * @returns {string} Duration text ("Active", "X rounds", "X seconds", etc.)
 */
export function effectDurationText(effect) {
  const duration = effect?.duration ?? {};
  if (Number.isFinite(Number(duration.rounds)) && Number(duration.rounds) > 0) {
    return `${Number(duration.rounds)} round${Number(duration.rounds) === 1 ? "" : "s"}`;
  }
  if (Number.isFinite(Number(duration.seconds)) && Number(duration.seconds) > 0) {
    return `${Number(duration.seconds)} second${Number(duration.seconds) === 1 ? "" : "s"}`;
  }
  if (duration.type) return String(duration.type);
  return "Active";
}

/**
 * Summarize effect changes into text array.
 * @param {Object} effect - The ActiveEffect
 * @returns {string[]} Array of change descriptions (up to 3)
 */
export function summarizeEffectChanges(effect) {
  const changes = Array.isArray(effect?.changes) ? effect.changes : [];
  return changes.slice(0, 3).map(change => {
    const key = String(change?.key ?? "").replace(/^system\./, "");
    const value = change?.value ?? "";
    return key ? `${key}: ${value}` : String(value || "Effect change");
  }).filter(Boolean);
}

/**
 * Build a rule note card from item and rule metadata.
 * @param {Item} item - The item containing the rule
 * @param {Object} rule - The rule metadata object
 * @param {number} index - Index in rules array (for fallback id)
 * @returns {Object} Card object ready for display
 */
export function buildRuleNote(item, rule, index) {
  const id = rule.id ?? `${item.id ?? normalizeName(item.name)}-${index}`;
  const label = rule.label ?? item.name ?? "Rule Note";
  const text = rule.note ?? rule.description ?? rule.text ?? item?.system?.description?.value ?? "GM-enforced rule hook.";
  return {
    id: `rule-${normalizeName(id)}`,
    label,
    type: rule.conditionType ?? rule.type ?? "rule",
    severity: rule.severity ?? "info",
    source: item.name ?? "Rule",
    text,
    details: Array.isArray(rule.details) ? rule.details : [],
    gmEnforced: rule.gmEnforced !== false,
    mechanical: rule.mechanical === true,
    icon: rule.icon ?? null,
    tags: Array.isArray(rule.tags) ? rule.tags : []
  };
}
