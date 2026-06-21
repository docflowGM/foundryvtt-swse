/**
 * ACTIVE Execution Model - Subtype Enum
 *
 * Defines the 2 formal subtypes for active abilities.
 * Each active ability MUST declare its subType from this enum.
 */

export const ACTIVE_SUBTYPES = {
  EFFECT: "EFFECT",
  MODE: "MODE",
  ACTION: "ACTION"
};

const ACTIVE_SUBTYPE_ALIASES = Object.freeze({
  TALENT_ACTION: ACTIVE_SUBTYPES.ACTION,
  ACTION_CARD: ACTIVE_SUBTYPES.ACTION,
  COMBAT_ACTION: ACTIVE_SUBTYPES.ACTION,
});

/**
 * Normalize legacy/migrated ACTIVE subtype values into the runtime contract.
 * Older talent data used TALENT_ACTION or STATE for manual action cards.
 * Foundry should not warn/skip those rows if they carry combatActions metadata.
 */
export function normalizeActiveSubtype(subType, abilityMeta = {}) {
  const key = String(subType ?? '').trim();
  if (!key) return key;
  if (ACTIVE_SUBTYPES[key]) return ACTIVE_SUBTYPES[key];
  const upper = key.toUpperCase();
  if (ACTIVE_SUBTYPES[upper]) return ACTIVE_SUBTYPES[upper];
  if (ACTIVE_SUBTYPE_ALIASES[upper]) return ACTIVE_SUBTYPE_ALIASES[upper];
  if (upper === 'STATE' && Array.isArray(abilityMeta?.combatActions) && abilityMeta.combatActions.length) {
    return ACTIVE_SUBTYPES.ACTION;
  }
  return key;
}
