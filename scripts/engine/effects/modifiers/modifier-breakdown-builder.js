/**
 * modifier-breakdown-builder.js — pure helpers for turning an already-resolved
 * (target-filtered, condition-filtered, stacking-resolved) modifier list into
 * display shapes.
 *
 * Deliberately has ZERO imports and does NOT re-implement stacking, condition,
 * or context rules — ModifierEngine/ModifierUtils remain the sole authority
 * for which modifiers apply. This module only groups and labels an already-
 * decided `applied` list, so any breakdown built from it is guaranteed to sum
 * to the same total as the modifiers it was built from.
 */

/**
 * Group applied modifiers by their broad source category and sum each group.
 * This is the shape RollCore has historically returned as `modifierBreakdown`.
 *
 * @param {Array<Object>} applied - Modifiers already resolved for one domain (post stacking).
 * @returns {Object<string, number>} Map of source category -> summed value.
 */
export function buildSourceBreakdown(applied = []) {
  const breakdown = {};
  for (const mod of applied) {
    if (!mod) continue;
    const key = mod.source ?? 'unknown';
    const value = Number(mod.value) || 0;
    breakdown[key] = (breakdown[key] ?? 0) + value;
  }
  // Drop net-zero buckets so display stays free of "0" noise, matching the
  // historical _buildModifierBreakdown() behavior.
  for (const key of Object.keys(breakdown)) {
    if (breakdown[key] === 0) delete breakdown[key];
  }
  return breakdown;
}

/**
 * Build normalized roll-component-ledger entries for a resolved modifier set.
 *
 * Ledger shape:
 * { id, label, value, category, sourceId, sourceName, domain, applied, reason }
 *
 * @param {Array<Object>} applied - Modifiers that were included in the total.
 * @param {Array<{modifier: Object, reason: string}>} suppressed - Modifiers excluded, with why.
 * @param {string} domain - The roll domain these modifiers were resolved for.
 * @returns {Array<Object>} Ledger entries, applied first then suppressed.
 */
export function buildModifierLedger(applied = [], suppressed = [], domain = null) {
  const ledger = [];
  let index = 0;
  for (const mod of applied) {
    if (!mod) continue;
    ledger.push({
      id: mod.id ?? `${mod.source ?? 'modifier'}-${index++}`,
      label: mod.sourceName ?? mod.label ?? mod.source ?? 'Modifier',
      value: Number(mod.value) || 0,
      category: mod.source ?? 'unknown',
      sourceId: mod.sourceId ?? null,
      sourceName: mod.sourceName ?? null,
      domain,
      applied: true,
      reason: mod.description ?? null
    });
  }
  for (const entry of suppressed) {
    const mod = entry?.modifier;
    if (!mod) continue;
    ledger.push({
      id: mod.id ?? `${mod.source ?? 'modifier'}-${index++}`,
      label: mod.sourceName ?? mod.label ?? mod.source ?? 'Modifier',
      value: Number(mod.value) || 0,
      category: mod.source ?? 'unknown',
      sourceId: mod.sourceId ?? null,
      sourceName: mod.sourceName ?? null,
      domain,
      applied: false,
      reason: entry?.reason ?? 'suppressed'
    });
  }
  return ledger;
}

/**
 * Adapt a legacy `{ label: value }` components map (e.g. combat-roll-math.js
 * resolveAttackBonus/resolveDamageBonus) into the normalized roll-component-
 * ledger shape, without changing or re-deriving the resolver's own math.
 *
 * @param {Object<string, number>} components - Label -> value map.
 * @param {string} domain - Roll domain, e.g. "combat.attack".
 * @param {string} [category='baseline'] - Ledger category for these entries.
 * @returns {Array<Object>} Ledger entries.
 */
export function buildLedgerFromComponents(components = {}, domain = null, category = 'baseline') {
  return Object.entries(components || {}).map(([label, value]) => ({
    id: `${category}-${label}`,
    label,
    value: Number(value) || 0,
    category,
    sourceId: null,
    sourceName: label,
    domain,
    applied: true,
    reason: null
  }));
}

/**
 * Build a single invocation-only ledger entry (roll-time-only additions such
 * as Fighting Defensively, a custom modifier, or a sequence penalty) that are
 * intentionally not part of a resolver's static baseline.
 *
 * @param {string} id
 * @param {string} label
 * @param {number} value
 * @param {string} domain
 * @returns {Object|null} Ledger entry, or null if value is 0 (nothing to show).
 */
export function buildInvocationLedgerEntry(id, label, value, domain) {
  const numeric = Number(value) || 0;
  if (numeric === 0) return null;
  return {
    id,
    label,
    value: numeric,
    category: 'invocation',
    sourceId: null,
    sourceName: label,
    domain,
    applied: true,
    reason: null
  };
}

export default { buildSourceBreakdown, buildModifierLedger, buildLedgerFromComponents, buildInvocationLedgerEntry };
