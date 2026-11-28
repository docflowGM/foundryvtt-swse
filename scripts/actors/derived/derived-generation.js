/**
 * Runtime-only derived-generation authority.
 *
 * system.derived is Foundry's ephemeral prepared-data output: it is
 * recomputed on every prepareDerivedData() cycle and can be reconstructed
 * (reset to {}) by Foundry independent of any change to the actor's
 * persisted source signature. Both derived-write paths --
 * SWSEV2BaseActor._computeDerivedAsync() and
 * ActorEngine._applyDerivedUpdates() -- stamp a monotonically increasing
 * generation marker onto system.derived.meta whenever they apply an
 * authoritative derived snapshot.
 *
 * Because the stamp lives inside system.derived itself (not on the actor
 * instance), it is wiped along with everything else whenever Foundry
 * reconstructs system.derived, so consumers can trust it to reflect the
 * CURRENT destination rather than "this actor instance believes it applied
 * X once" -- the exact distinction the June 29 cache-optimization pass
 * blurred (see docs/audits/v2-derived-panel-cache-coherency.md).
 */

/**
 * Stamp system.derived.meta with a fresh generation value and (optionally)
 * the source signature this application corresponds to. Call this only when
 * new authoritative derived content has actually been written to `system`.
 *
 * @param {Actor} actor - the actor instance backing the monotonic counter.
 * @param {Object} system - the actor.system object currently being written.
 * @param {string|null} [signature] - the DerivedCalculator source signature
 *   this application corresponds to, if known.
 * @returns {number|null} the newly stamped generation, or null if it could
 *   not be stamped (no actor/system).
 */
export function stampDerivedGeneration(actor, system, signature = null) {
  if (!actor || !system) return null;
  const nextGeneration = (actor._swseDerivedGenerationCounter = (actor._swseDerivedGenerationCounter || 0) + 1);
  system.derived ??= {};
  system.derived.meta ??= {};
  system.derived.meta.generation = nextGeneration;
  if (signature) system.derived.meta.appliedSignature = signature;
  return nextGeneration;
}

/**
 * Read the generation currently stamped on the actor's live destination.
 * Returns 0 when nothing has been stamped yet (fresh actor, or system.derived
 * was just reconstructed by Foundry) so callers can treat "unstamped" as a
 * distinct, comparable value.
 */
export function getDerivedGeneration(actor) {
  return actor?.system?.derived?.meta?.generation ?? 0;
}

/**
 * Read the source signature the CURRENT destination was last stamped with.
 * This is the destination-anchored counterpart to an instance-level "I
 * applied signature S once" flag -- it naturally reports null after Foundry
 * resets system.derived, even though the actor instance itself is unchanged.
 */
export function getDerivedAppliedSignature(actor) {
  return actor?.system?.derived?.meta?.appliedSignature ?? null;
}

/**
 * Announce that an authoritative derived snapshot (for `signature`) is now applied to the actor's live destination.
 * Both derived write paths call this AFTER the destination is stamped, including the "nothing changed" pass, so consumers
 * that depend on completion (reconciliation enrichment) get an event instead of polling or guessing with timers.
 * Best effort and side-effect free for the actor: it only notifies listeners.
 */
export function announceDerivedApplied(actor, signature = null) {
  try { globalThis.Hooks?.callAll?.('swseDerivedApplied', actor, signature); } catch (_err) { /* listeners must never break derived application */ }
}

function derivedValuesEqual(left, right) {
  if (left === right) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (_err) {
    return false;
  }
}

/**
 * The ONE routine that writes a DerivedCalculator.computeAll() result into `system.derived` (DC-A07). Both the prepareDerivedData path
 * (SWSEV2BaseActor._computeDerivedAsync) and the recalcAll/progression path (ActorEngine._applyDerivedUpdates) call it, so the same result always
 * leaves the same state. Each `system.derived.<field>` is REPLACED (no deep merge), so a key dropped from a newer result shape cannot survive from
 * an older one. `system.derived.skills` stays the engine-owned object map (an array display shape is never written).
 * @returns {boolean} true when any field changed
 */
export function applyDerivedSnapshot(derived, updates) {
  if (!derived || typeof derived !== 'object' || !updates || typeof updates !== 'object') return false;
  let changed = false;
  for (const [path, value] of Object.entries(updates)) {
    const parts = path.split('.');
    if (parts.length < 3 || parts[0] !== 'system' || parts[1] !== 'derived') continue;
    const fieldPath = parts.slice(2);
    if (fieldPath[0] === 'skills' && fieldPath.length === 1 && (value == null || typeof value !== 'object' || Array.isArray(value))) continue;
    let target = derived;
    for (const key of fieldPath.slice(0, -1)) {
      if (target[key] == null || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    }
    const last = fieldPath[fieldPath.length - 1];
    if (!derivedValuesEqual(target[last], value)) {
      target[last] = value;
      changed = true;
    }
  }
  return changed;
}

/** Seed `system.derived` (snapshot/mannequin construction): the derived-state writers live in scripts/actors/ (A-03). Returns the destination object. */
export function ensureDerivedState(system, initial = null) {
  if (!system || typeof system !== 'object') return null;
  if (initial && typeof initial === 'object') system.derived = initial;
  else system.derived ??= {};
  return system.derived;
}
