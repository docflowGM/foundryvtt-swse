// scripts/actors/v2/actor-item-index.js
//
// Phase 1 perf baseline: a tiny ephemeral per-prepare index over an actor's
// owned Items, grouped by `item.type`. Callers rebuild this once per
// computeCharacterDerived() pass (cheap — one pass, no persistence, nothing
// written to actor source data) and use it only where an existing scan's
// predicate was already a plain `item.type === X` equality check, so
// swapping onto `byType.get(X)` is behaviorally identical to the scan it
// replaces. See docs/audits/v2-actor-authority-performance-phase-1.md,
// "Shared item index".
//
// Deliberately dependency-free (no absolute /systems/foundryvtt-swse/...
// imports) so it can be unit tested directly under plain Node, matching the
// convention used by other pure logic modules in this codebase (e.g.
// scripts/actors/droid/droid-mode-adapter.js).

/**
 * @param {{ items?: Iterable<{ type?: string }> }} actor
 * @returns {{ byType: Map<string, object[]> }}
 */
export function buildActorItemIndex(actor) {
  const byType = new Map();
  for (const item of actor?.items ?? []) {
    const type = item?.type ?? 'unknown';
    let bucket = byType.get(type);
    if (!bucket) {
      bucket = [];
      byType.set(type, bucket);
    }
    bucket.push(item);
  }
  return { byType };
}
