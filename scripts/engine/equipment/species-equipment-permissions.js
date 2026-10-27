/**
 * Species equipment-permission projection (E3-A1) -- PURE and READ ONLY.
 *
 * Projects explicitly published, species-specific equipment permissions that cannot be inferred from anatomy alone. It allocates no
 * hands, authorizes no attack, changes no item and stores nothing. The input is the ALREADY SELECTED effective species publication
 * profile (the output of applySpeciesVariantProfile) -- never an actor, a base-species lookup or a display name. Identity is matched
 * exactly on selected-variant ids and the exact canonical trait id; trait prose and appendage counts are never consulted.
 *
 * The only authorized positive entitlement is the certified Codru-Ji Extra Arms trait (Legacy Era Campaign Guide, printed p. 13;
 * E2B-S1 case E2B-RD-01). The values describe what THIS trait grants; they are not a global maximum for any character and do not
 * override attacks granted by other feats, talents or combat authorities.
 *
 * Result statuses (`status`):
 *   verified-permission-present  every identity requirement holds and the trait is present: `permissions` has the entitlement
 *   no-matching-entitlement      nothing in the profile claims a recognized publication; says nothing about ordinary wielding
 *   recognized-incomplete-evidence  the profile claims a recognized publication's identity but evidence is missing or contradictory:
 *                                no grant, structured `issues` explain why. Unknown evidence is never converted into a grant.
 */

export const SPECIES_PERMISSION_STATUS = Object.freeze({
  VERIFIED: 'verified-permission-present',
  NONE: 'no-matching-entitlement',
  INCOMPLETE: 'recognized-incomplete-evidence',
});

const CODRU_JI_EXTRA_ARMS = Object.freeze({
  variantId: 'codru-ji-leg-2c-03',
  sourceProfileId: 'LEG-2C-03',
  traitId: 'extra-arms',
  source: Object.freeze({ book: 'Legacy Era Campaign Guide', printedPage: 13, reviewCase: 'E2B-RD-01' }),
});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmptyString = (v) => (typeof v === 'string' && v ? v : null);
const done = (status, permissions, issues) => deepFreeze({ status, permissions, issues });

/**
 * @param {object} effectiveSpeciesProfile the selected effective publication profile (read: selectedVariantId, selectedVariant.id,
 *   selectedVariant.sourceProfileId, selectedVariant.completeSnapshot, canonicalTraits[].id). Never mutated or frozen.
 * @returns {{status:string, permissions:object[], issues:object[]}} deterministic, independently owned, deeply frozen
 */
export function resolveSpeciesEquipmentPermissions(effectiveSpeciesProfile) {
  if (!isPlainObject(effectiveSpeciesProfile)) {
    return done(SPECIES_PERMISSION_STATUS.NONE, [], [issue('species-profile-not-provided', 'warning', 'No effective species profile object was provided; no permission is granted.')]);
  }
  const profile = effectiveSpeciesProfile;
  const selected = isPlainObject(profile.selectedVariant) ? profile.selectedVariant : null;
  const variantIds = [nonEmptyString(profile.selectedVariantId), nonEmptyString(selected?.id)].filter(Boolean);
  const sourceProfileId = nonEmptyString(selected?.sourceProfileId);
  const R = CODRU_JI_EXTRA_ARMS;

  // Only an explicit publication-identity claim makes this a recognized case; names, traits and prose never do.
  const claims = variantIds.includes(R.variantId) || sourceProfileId === R.sourceProfileId;
  if (!claims) return done(SPECIES_PERMISSION_STATUS.NONE, [], []);

  const problems = [];
  if (variantIds.some((id) => id !== R.variantId)) problems.push(issue('selected-variant-identity-conflict', 'blocking', 'The selected-variant identity evidence is inconsistent with the recognized publication.', { variantIds: [...new Set(variantIds)].sort(), expectedVariantId: R.variantId }));
  else if (!variantIds.length) problems.push(issue('selected-variant-id-missing', 'blocking', 'The recognized publication is claimed by source profile only; no selected variant id is present.', { expectedVariantId: R.variantId }));
  if (sourceProfileId !== R.sourceProfileId) problems.push(issue(sourceProfileId ? 'source-profile-id-mismatch' : 'source-profile-id-missing', 'blocking', 'The source-profile identity is missing or does not match the recognized publication.', { sourceProfileId, expectedSourceProfileId: R.sourceProfileId }));
  if (selected?.completeSnapshot !== true) problems.push(issue('complete-snapshot-not-established', 'blocking', 'The selected publication is not marked as a complete snapshot.', {}));
  const traitIds = Array.isArray(profile.canonicalTraits) ? profile.canonicalTraits.map((t) => (isPlainObject(t) ? t.id : null)) : [];
  if (!traitIds.includes(R.traitId)) problems.push(issue('required-trait-missing', 'blocking', `The effective canonical traits do not include "${R.traitId}".`, { traitId: R.traitId }));

  if (problems.length) return done(SPECIES_PERMISSION_STATUS.INCOMPLETE, [], problems);

  return done(SPECIES_PERMISSION_STATUS.VERIFIED, [{
    id: 'codru-ji-extra-arms',
    maxSimultaneouslyHeldItemsOrWeapons: 4,
    maxSimultaneousTwoHandedWeapons: 2,
    additionalAttacksGrantedByThisTrait: 0,
    source: { ...R.source },
    provenance: { variantId: R.variantId, sourceProfileId: R.sourceProfileId, traitId: R.traitId },
  }], []);
}

export default { resolveSpeciesEquipmentPermissions, SPECIES_PERMISSION_STATUS };
