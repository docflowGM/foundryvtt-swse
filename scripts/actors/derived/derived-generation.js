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
