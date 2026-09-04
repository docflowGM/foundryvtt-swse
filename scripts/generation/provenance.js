/**
 * PHASE 8D-1 — shared draft provenance stamp.
 *
 * Every generated draft (ship name, NPC concept, objective, Job draft,
 * Faction draft, Location dependency) carries the SAME small provenance
 * shape, so a future UI/reroll layer has one place to look, and so
 * "generator metadata" is never confused with a real campaign
 * relationship id (Faction id, Location id, Actor uuid, ...).
 *
 * HARD RULE: fields here are generator bookkeeping only. A provenance id
 * (e.g. presetId 'rescue', templateId 'rescue-person-secured-site') is
 * never a substitute for a real canonical id. A generated draft that
 * references a real Faction/Location/Actor must carry that reference as
 * its own explicit, separately named field (e.g. `factionId`), never
 * inferred from provenance. See §99/§111 of the audit doc for the same
 * discipline already established for Bulletin's {sourceKind, sourceId}
 * provenance contract — this module generalizes the same idea to
 * generation drafts, deliberately not unified with that contract (a
 * Bulletin's source provenance points at an existing record; a
 * generation draft's provenance describes how it was invented).
 */

export const GENERATION_SCHEMA_VERSION = 1;

/**
 * Build a provenance stamp. `presetId`/`templateId` are optional strings
 * naming which archetype/template produced this draft; `seed` is an
 * optional RNG seed for reproducibility; `tags` are free-form generator
 * tags (e.g. `['pirates', 'ship-theft']`); `warnings` is a list of
 * diagnostic codes (see `reward-estimator.js`'s
 * `ISSUER_RESOURCE_MISMATCH`).
 */
export function createProvenance({ presetId = '', templateId = '', seed = null, tags = [], warnings = [] } = {}) {
  return {
    schemaVersion: GENERATION_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    presetId: String(presetId || ''),
    templateId: String(templateId || ''),
    seed: seed === null || seed === undefined ? null : Number(seed),
    tags: Array.isArray(tags) ? [...tags] : [],
    warnings: Array.isArray(warnings) ? [...warnings] : []
  };
}

/**
 * Return a NEW provenance object with an additional warning code appended
 * (no mutation of the input — draft objects stay safe to share/compare).
 */
export function withWarning(provenance, warningCode) {
  const base = isProvenance(provenance) ? provenance : createProvenance();
  if (!warningCode || base.warnings.includes(warningCode)) return { ...base, tags: [...base.tags], warnings: [...base.warnings] };
  return { ...base, tags: [...base.tags], warnings: [...base.warnings, warningCode] };
}

/**
 * Structural check: does this look like a provenance stamp? Used by other
 * modules' validators/tests, never by production logic to decide
 * behavior.
 */
export function isProvenance(value) {
  return Boolean(
    value && typeof value === 'object' &&
    typeof value.schemaVersion === 'number' &&
    Array.isArray(value.tags) &&
    Array.isArray(value.warnings)
  );
}
