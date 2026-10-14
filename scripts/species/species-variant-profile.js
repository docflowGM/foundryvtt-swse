/**
 * Species variant profile application — single authority.
 *
 * Two variant kinds exist in species.db:
 *
 *  1. COMPLETE SNAPSHOT variants (`variant.completeSnapshot === true`): one
 *     published sourcebook profile. Every rule family comes from the variant
 *     alone. Nothing is inherited from the base entry, including traits,
 *     natural weapons, languages, proficiency rules, and the base
 *     `supplementaryTraits` sidecar data. An empty list means "this
 *     publication prints none", not "fall back to the base species".
 *
 *  2. LEGACY overlay variants (no flag): historical behaviour, empty fields fall
 *     back to the base entry. The fields that fell back are reported in
 *     `variantFallbackFields` so the inheritance is visible rather than silent.
 *     These are retired one at a time as their publication is hydrated as a
 *     complete snapshot.
 *
 * Pure module: no Foundry globals, safe to unit test under plain Node.
 */

export class SpeciesVariantSnapshotError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'SpeciesVariantSnapshotError';
    this.code = code;
  }
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function isCompleteSnapshotVariant(variant) {
  return variant?.completeSnapshot === true;
}

function normalizeAbilityMods(mods) {
  const out = {};
  for (const key of ABILITY_KEYS) {
    const n = Number(mods?.[key] ?? mods?.[key.toUpperCase()] ?? 0);
    out[key] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

/**
 * Names of required fields a complete snapshot variant fails to declare.
 * Empty arrays are valid; missing (undefined/null) is not.
 */
export function listMissingSnapshotFields(variant) {
  const missing = [];
  if (!variant || typeof variant !== 'object') return ['variant'];
  if (!variant.id) missing.push('id');
  if (!variant.sourceProfileId) missing.push('sourceProfileId');
  if (!variant.size) missing.push('size');
  if (!Number.isFinite(Number(variant.speed))) missing.push('speed');
  if (!variant.movement || typeof variant.movement !== 'object') missing.push('movement');
  if (!variant.abilityMods || typeof variant.abilityMods !== 'object') missing.push('abilityMods');
  for (const field of ['languages', 'special', 'traits', 'skillBonuses', 'naturalWeapons']) {
    if (!Array.isArray(variant[field])) missing.push(field);
  }
  return missing;
}

function selectedVariantSummary(variant) {
  return {
    id: variant.id,
    label: variant.label || 'Variant',
    source: variant.source || null,
    ...(variant.sourceProfileId ? { sourceProfileId: variant.sourceProfileId } : {}),
    ...(isCompleteSnapshotVariant(variant) ? { completeSnapshot: true } : {}),
  };
}

function applyCompleteSnapshot(base, variant) {
  const missing = listMissingSnapshotFields(variant);
  if (missing.length) {
    throw new SpeciesVariantSnapshotError('INCOMPLETE_SNAPSHOT_VARIANT', `${base?.name}:${variant?.id}: missing ${missing.join(', ')}`);
  }
  const abilityScores = normalizeAbilityMods(variant.abilityMods);
  return {
    // Identity only; nothing rules-bearing is read from the base entry below.
    id: base.id,
    uuid: base.uuid ?? null,
    name: base.name,
    type: base.type,
    category: base.category,
    tags: base.tags,
    pack: base.pack,
    canonicalName: base.canonicalName,
    variants: base.variants,
    droidBuilder: base.droidBuilder ?? null,
    speciesActsAsDroid: !!base.speciesActsAsDroid,

    source: variant.source || null,
    description: variant.description || '',
    size: variant.size,
    speed: Number(variant.speed),
    movement: variant.movement,
    rawAbilities: variant.abilities ?? null,
    abilityScores,
    abilityMods: { ...abilityScores },
    abilityChoice: variant.abilityChoice ?? null,
    skillBonuses: [...variant.skillBonuses],
    abilities: [...variant.special],
    canonicalTraits: [...variant.traits],
    languages: [...variant.languages],
    naturalWeapons: [...variant.naturalWeapons],
    primitive: !!variant.primitive,
    suppressedClassProficiencies: Array.isArray(variant.suppressedClassProficiencies) ? [...variant.suppressedClassProficiencies] : [],
    noConstitution: !!variant.noConstitution,
    retainsConstitution: !!variant.retainsConstitution,
    // Base sidecar trait data is keyed by species name and is NOT publication-aware.
    supplementaryTraits: null,
    variantFallbackFields: [],
    selectedVariantId: variant.id,
    selectedVariant: selectedVariantSummary(variant),
  };
}

function applyLegacyOverlay(base, variant) {
  const fallbackFields = [];
  const pickArray = (field, mine, theirs) => {
    if (Array.isArray(mine) && mine.length) return mine;
    fallbackFields.push(field);
    return theirs;
  };
  const abilityScores = variant.abilityMods && typeof variant.abilityMods === 'object'
    ? normalizeAbilityMods(variant.abilityMods)
    : base.abilityScores;
  if (abilityScores === base.abilityScores) fallbackFields.push('abilityScores');
  const hasMovement = variant.movement && typeof variant.movement === 'object';
  if (!hasMovement) fallbackFields.push('movement');
  if (!variant.size) fallbackFields.push('size');
  const hasSpeed = Number.isFinite(Number(variant.speed)) && variant.speed !== null && variant.speed !== '';
  if (!hasSpeed) fallbackFields.push('speed');
  return {
    ...base,
    source: variant.source || base.source,
    size: variant.size || base.size,
    speed: hasSpeed ? Number(variant.speed) : base.speed,
    movement: hasMovement ? variant.movement : base.movement,
    rawAbilities: variant.abilities || base.rawAbilities,
    abilityScores,
    abilityMods: { ...abilityScores },
    abilityChoice: variant.abilityChoice || base.abilityChoice || null,
    skillBonuses: pickArray('skillBonuses', variant.skillBonuses, base.skillBonuses),
    abilities: pickArray('special', variant.special, base.abilities),
    canonicalTraits: pickArray('traits', variant.traits, base.canonicalTraits),
    languages: pickArray('languages', variant.languages, base.languages),
    description: variant.description || base.description,
    variantFallbackFields: fallbackFields,
    selectedVariantId: variant.id,
    selectedVariant: selectedVariantSummary(variant),
  };
}

/**
 * Overlay a selected variant onto its base registry entry.
 * @param {object} base - SpeciesRegistry entry
 * @param {object|null} variant - entry from base.variants
 * @returns {object} effective registry entry
 * @throws {SpeciesVariantSnapshotError} for a malformed complete snapshot
 */
export function applySpeciesVariantProfile(base, variant) {
  if (!base || !variant) return base;
  return isCompleteSnapshotVariant(variant)
    ? applyCompleteSnapshot(base, variant)
    : applyLegacyOverlay(base, variant);
}
