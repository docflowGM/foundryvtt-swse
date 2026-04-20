/**
 * NPC Mode Adapter
 *
 * Central authority for NPC mode + subtype resolution.
 * Bridges dual flag namespace (foundryvtt-swse vs swse) during migration.
 * Normalizes legacy system.useProgression reads.
 *
 * Single source of truth for all NPC mode queries.
 */

/**
 * Get canonical NPC mode.
 *
 * Resolution order:
 * 1. flags.foundryvtt-swse.npcLevelUp.mode (canonical)
 * 2. flags.swse.npcLevelUp.mode (legacy bridge)
 * 3. system.useProgression (legacy fallback)
 * 4. 'statblock' (safe default)
 *
 * @param {Actor} actor
 * @returns {string} 'statblock' | 'progression'
 */
export function getNpcMode(actor) {
  if (!actor) return 'statblock';

  // Canonical namespace (priority 1)
  const canonicalMode = actor.getFlag?.('foundryvtt-swse', 'npcLevelUp.mode');
  if (canonicalMode) return canonicalMode;

  // Legacy swse namespace (priority 2)
  const legacyMode = actor.getFlag?.('swse', 'npcLevelUp.mode');
  if (legacyMode) return legacyMode;

  // Legacy system.useProgression (priority 3)
  const useProgression = actor.system?.useProgression;
  if (typeof useProgression === 'boolean') {
    return useProgression ? 'progression' : 'statblock';
  }

  // Safe default (priority 4)
  return 'statblock';
}

/**
 * Get NPC subtype/kind.
 *
 * Resolution order:
 * 1. system.npcProfile.kind (canonical)
 * 2. Existing inferred indicators (beast, follower, mount if detectable)
 * 3. Conservative default (heroic for unknown)
 *
 * @param {Actor} actor
 * @returns {string} 'heroic' | 'nonheroic' | 'beast' | 'follower' | 'mount'
 */
export function getNpcKind(actor) {
  if (!actor) return 'heroic';

  // Canonical npcProfile (priority 1)
  const kind = actor.system?.npcProfile?.kind;
  if (kind && ['heroic', 'nonheroic', 'beast', 'follower', 'mount'].includes(kind)) {
    return kind;
  }

  // Check for explicit follower flag (priority 2)
  if (actor.flags?.swse?.follower?.ownerId || actor.system?.isFollower) {
    return 'follower';
  }

  // Check for beast indicator (priority 2)
  if (actor.system?.creatureType === 'beast') {
    return 'beast';
  }

  // Conservative default: heroic
  return 'heroic';
}

/**
 * Check if NPC is in statblock mode.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isNpcStatblockMode(actor) {
  return getNpcMode(actor) === 'statblock';
}

/**
 * Check if NPC is in progression mode.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isNpcProgressionMode(actor) {
  return getNpcMode(actor) === 'progression';
}

/**
 * Build canonical mode update payload.
 *
 * Sets the canonical flag namespace (foundryvtt-swse) only.
 * Does NOT touch legacy fields; migration happens on next open if needed.
 *
 * @param {string} mode - 'statblock' | 'progression'
 * @returns {Object} Update payload for ActorEngine.updateActor
 */
export function setNpcModeUpdate(mode) {
  if (!['statblock', 'progression'].includes(mode)) {
    throw new Error(`Invalid NPC mode: "${mode}". Must be 'statblock' or 'progression'.`);
  }
  return {
    'flags.foundryvtt-swse.npcLevelUp.mode': mode
  };
}

/**
 * Check if NPC should use flat statblock attack bonuses.
 *
 * Returns true if:
 * - NPC is in statblock mode
 * - Weapon has flat attack bonus stored
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {boolean}
 */
export function usesFlatStatblockAttacks(actor, weapon) {
  if (!actor || actor.type !== 'npc') return false;
  if (!isNpcStatblockMode(actor)) return false;
  return weapon?.flags?.swse?.npc?.useFlat === true && Number.isFinite(weapon?.flags?.swse?.npc?.flatAttackBonus);
}
