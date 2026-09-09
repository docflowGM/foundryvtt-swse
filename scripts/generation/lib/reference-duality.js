/**
 * PHASE 8D-3C correction round 1 — generic cross-domain draft/canonical
 * reference-duality resolver.
 *
 * Extracted from `npc/npc-bundle.js`'s `resolveNpcLocationGenerationContext()`
 * (Phase 8D-3B, independent review round 5): that function's actual
 * duality-resolution logic was already fully domain-agnostic (it never
 * touched anything NPC-specific — only `linkedLocationId`/`locationDraftId`/
 * a context object's own declared identity), so building a SECOND,
 * near-identical implementation for Job's Location/Faction/Contact duality
 * needs would have been exactly the duplicate-parallel-system this
 * codebase's standing discipline forbids. This module is now the ONE
 * shared authority; `npc-bundle.js`'s own export is preserved byte-for-byte
 * in its public behavior (verified by the existing 8D-3B test suite,
 * unchanged), its internals now simply delegate here.
 *
 * The rule (identical for every reference KIND this codebase resolves —
 * Location, Faction, Contact, or any future one):
 *  - no explicit identity, a context identity exists -> use the context's.
 *  - an explicit identity, but the context declares none of its own at
 *    all -> assume the context describes the explicit target; use it
 *    normally (the common case: a caller resolves one record and passes
 *    both its id and its own context together).
 *  - explicit identity equals the context's own declared identity -> use it.
 *  - explicit identity CONFLICTS with a context identity -> the explicit
 *    target wins for the returned reference; `conflict: true` is reported
 *    so the caller can both attach a diagnostic warning AND drop whatever
 *    ELSE that context carries (tags, bias, suggestions, ...) — this
 *    module only resolves the IDENTITY question; what "drop the context"
 *    means for the rest of its shape is domain-specific and stays the
 *    caller's job, exactly like `resolveNpcLocationGenerationContext()`
 *    already left it to `createGeneratedNpcConcept()`.
 */
export function resolveDualityReference({ explicitId = '', explicitDraftId = '', contextId = '', contextDraftId = '' } = {}) {
  const eId = String(explicitId || '').trim();
  const eDraftId = String(explicitDraftId || '').trim();
  const explicitWinner = eId || eDraftId;

  const cId = String(contextId || '').trim();
  const cDraftId = String(contextDraftId || '').trim();
  const contextWinner = cId || cDraftId;

  const conflict = Boolean(explicitWinner) && Boolean(contextWinner) && explicitWinner !== contextWinner;

  const ref = {
    id: eId || (conflict ? '' : cId),
    draftId: eDraftId || (conflict ? '' : cDraftId)
  };
  // Canonical always wins over draft in the FINAL ref.
  if (ref.id) ref.draftId = '';

  return { ref, conflict };
}
