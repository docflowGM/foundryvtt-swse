/**
 * SWSE SSOT Detection Layer
 *
 * Lightweight, opt-in detection of direct actor.items access bypassing ActorAbilityBridge.
 *
 * Enable via console:
 * globalThis.SWSE_DEV_MODE = true;
 *
 * Then play normally. Violations appear in console.warn with actionable stack traces.
 */

// Global dev mode flag
globalThis.SWSE_DEV_MODE = globalThis.SWSE_DEV_MODE ?? false;

// Track instrumented actors to avoid re-patching
const instrumentedActors = new WeakMap();

/**
 * Detect direct actor.items access and emit warning if in dev mode.
 * Ignores whitelisted call stacks (ActorAbilityBridge, approved utilities, etc).
 *
 * @param {Actor} actor
 * @param {string} methodName - 'filter', 'some', 'map', 'find'
 */
export function detectActorItemsAccess(actor, methodName) {
  if (!globalThis.SWSE_DEV_MODE) return;

  try {
    const stack = new Error().stack;

    // Ignore approved call paths to avoid noise
    if (
      stack.includes('ActorAbilityBridge') ||
      stack.includes('ActorItemIndex') ||
      stack.includes('ssot-detection') ||
      stack.includes('detec tActorItemsAccess')
    ) {
      return;
    }

    // Emit warning with trimmed, actionable stack
    const lines = stack.split('\n');
    const trimmedStack = lines.slice(2, 8).map(l => l.trim()).join('\n');

    console.warn(
      `[SSOT VIOLATION] Direct actor.items.${methodName}() detected`,
      {
        actor: actor?.name ?? 'unknown',
        method: methodName,
        stack: trimmedStack
      }
    );
  } catch (e) {
    // Fail silently — detection must never break execution
  }
}

/**
 * Instrument an actor's items collection to detect bypasses.
 * Safe to call multiple times (uses WeakMap to skip already-instrumented actors).
 *
 * @param {Actor} actor
 */
export function instrumentActorItems(actor) {
  if (!actor?.items) return;
  if (instrumentedActors.has(actor)) return; // Already instrumented

  try {
    const itemsCollection = actor.items;

    // Patch filter
    const originalFilter = itemsCollection.filter.bind(itemsCollection);
    itemsCollection.filter = function (...args) {
      detectActorItemsAccess(actor, 'filter');
      return originalFilter(...args);
    };

    // Patch some
    const originalSome = itemsCollection.some.bind(itemsCollection);
    itemsCollection.some = function (...args) {
      detectActorItemsAccess(actor, 'some');
      return originalSome(...args);
    };

    // Patch map
    const originalMap = itemsCollection.map.bind(itemsCollection);
    itemsCollection.map = function (...args) {
      detectActorItemsAccess(actor, 'map');
      return originalMap(...args);
    };

    // Patch find
    const originalFind = itemsCollection.find.bind(itemsCollection);
    itemsCollection.find = function (...args) {
      detectActorItemsAccess(actor, 'find');
      return originalFind(...args);
    };

    // Mark as instrumented
    instrumentedActors.set(actor, true);
  } catch (e) {
    // Fail silently — instrumentation must never break execution
  }
}
