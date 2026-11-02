/**
 * Force Disciple — Prophet (SWSE Core Rulebook, printed p. 215).
 *
 * One Force Disciple level grants TWO Destiny Points instead of the usual one.
 * No vision selection, destiny mutation, or Destiny Point spending occurs here:
 * the GM and player handle that option with the existing resource controls.
 *
 * The Core Destiny rules restrict Destiny Point gains to characters with an
 * active Destiny. This pure planner participates only in a LEVEL-UP mutation.
 */
const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export function isForceDiscipleClass(selectedClass) {
  const name = typeof selectedClass === 'string' ? selectedClass
    : selectedClass?.name ?? selectedClass?.className
      ?? selectedClass?.system?.class_name ?? selectedClass?.system?.className ?? null;
  return normalize(name) === 'forcedisciple';
}

function nonnegativeInteger(value, label) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Prophet Destiny grant requires valid ${label}`);
  }
  return value;
}

/**
 * @returns {object|null} ActorEngine set fragment; null means no grant.
 * Existing spent points are NOT refilled. We add +2 to current and maximum,
 * in the same level-up mutation as class progression.
 */
export function planForceDiscipleProphetDestinyGrant({
  actor, selectedClass, mode, targetLevel, sessionId = null,
} = {}) {
  if (mode !== 'levelup' || !isForceDiscipleClass(selectedClass)) return null;
  // Only a hero with an active Destiny gains Destiny Points (Core, p. 112).
  if (actor?.system?.destiny?.hasDestiny !== true
    || actor?.system?.destiny?.fulfilled === true) return null;

  const previousLevel = nonnegativeInteger(actor?.system?.level, 'existing character level');
  const nextLevel = nonnegativeInteger(targetLevel, 'new character level');
  if (nextLevel !== previousLevel + 1) {
    throw new Error('Prophet Destiny grant requires exactly one new character level');
  }
  if (actor?.system?.progression?.lastProphetDestinyGrant?.targetLevel === nextLevel) {
    // Do not repeat a committed grant when a stale session is reopened.
    return null;
  }

  const previousValue = nonnegativeInteger(actor?.system?.destinyPoints?.value, 'current points');
  const previousMax = nonnegativeInteger(actor?.system?.destinyPoints?.max, 'point maximum');
  const amount = 2;
  const newValue = previousValue + amount;
  const newMax = Math.max(previousMax, previousValue) + amount;
  if (!Number.isSafeInteger(newValue) || !Number.isSafeInteger(newMax)) {
    throw new Error('Prophet Destiny grant would overflow Destiny Point counters');
  }
  return {
    'system.destinyPoints.value': newValue,
    'system.destinyPoints.max': newMax,
    'system.progression.lastProphetDestinyGrant': {
      source: 'forceDisciple.prophet',
      targetLevel: nextLevel,
      sessionId: typeof sessionId === 'string' && sessionId.trim() ? sessionId : null,
      amount, previousValue, previousMax, newValue, newMax,
    },
  };
}
