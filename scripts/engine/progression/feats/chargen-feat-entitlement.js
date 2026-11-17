/**
 * Chargen general-feat entitlement (single authority).
 *
 * Extracted verbatim from FeatStep._getRequiredFeatCount's chargen branch so the Feat step and the Galactic Profile
 * compiler read ONE rule. Behaviour is unchanged: an explicit species/pending-species `featsRequired` wins; otherwise
 * Human / Near-Human receive the extra feat; NPC lanes add one.
 *
 * @param {{draft?:object, actor?:object, subtype?:string}} input   draft = session.draftSelections
 * @returns {number}
 */
export function getChargenGeneralFeatCount({ draft = {}, actor = null, subtype = null } = {}) {
  const species = draft.species || null;
  const pendingSpeciesContext = draft.pendingSpeciesContext || species?.pendingContext || species?.pendingSpeciesContext || null;
  const explicitCount = Number(
    pendingSpeciesContext?.entitlements?.featsRequired
    ?? species?.entitlements?.featsRequired
    ?? species?.featsRequired
    ?? actor?.system?.featsRequired
  );
  if (Number.isFinite(explicitCount) && explicitCount >= 0) return Math.floor(explicitCount);

  const speciesName = String(
    species?.speciesName
    || species?.name
    || species?.label
    || species?.id
    || pendingSpeciesContext?.identity?.speciesName
    || pendingSpeciesContext?.identity?.name
    || ''
  ).toLowerCase();
  const isHumanLike = speciesName === 'human' || speciesName === 'near-human' || speciesName === 'near human';
  const isNPC = actor?.type === 'npc' || subtype === 'npc';
  return isHumanLike ? (isNPC ? 3 : 2) : (isNPC ? 2 : 1);
}
