// scripts/engine/import/nonheroic-damage-profile-hydrator.js
/**
 * Nonheroic Damage Profile Hydrator (NH-2)
 *
 * Applies source-backed statblock attack-row profiles to imported NPC weapon
 * reference items. Source/actor/match are attribution wrappers; runtime-facing
 * profile fields intentionally mirror the canonical damage model used by
 * data/combat/damage-profiles.schema.json.
 */

const PROFILE_FILES = Object.freeze([
  'data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json'
]);

const WIREABLE_CONFIDENCE = new Set(['verified', 'sourcebookVerified']);

let profileCachePromise = null;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function slugifyStatblockName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function mergeObject(target, source) {
  if (globalThis.foundry?.utils?.mergeObject) {
    return foundry.utils.mergeObject(target ?? {}, source ?? {}, { inplace: false, recursive: true });
  }
  return deepMerge(target ?? {}, source ?? {});
}

function deepMerge(target, source) {
  const output = { ...(target ?? {}) };
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function uniqueStrings(values) {
  return [...new Set(asArray(values).map(cleanText).filter(Boolean))];
}

function maybeIncludes(haystack, needles) {
  const normalized = cleanText(haystack).toLowerCase();
  const list = asArray(needles).map((needle) => cleanText(needle).toLowerCase()).filter(Boolean);
  if (!list.length) return true;
  return list.some((needle) => normalized.includes(needle));
}

function actorMatches(profile, context = {}) {
  const required = asArray(profile?.match?.actorSlugs).map(slugifyStatblockName).filter(Boolean);
  if (!required.length) return true;

  // Never use profile.actorName as matching evidence; that would let a profile
  // match itself for unrelated actors with similar raw attack text.
  const candidates = [
    context.actorName,
    context.templateName,
    context.statblock?.Name,
    context.statblock?.name
  ].map(slugifyStatblockName).filter(Boolean);

  return candidates.some((candidate) => required.includes(candidate));
}

function rawMatches(profile, raw) {
  return maybeIncludes(raw, profile?.match?.rawIncludes);
}

function canonicalFormula(profile, variant = null) {
  return cleanText(
    asArray(variant?.components)[0]?.formula
    ?? variant?.damage?.formula
    ?? asArray(profile.components)[0]?.formula
    ?? profile.damageFormula
    ?? profile.damage?.formula
  );
}

function canonicalPrimaryType(profile, variant = null) {
  return cleanText(
    variant?.primaryType
    ?? asArray(variant?.components)[0]?.type
    ?? profile.primaryType
    ?? asArray(profile.components)[0]?.type
    ?? profile.damageType
    ?? profile.damage?.primaryType
    ?? asArray(profile.damageTypes)[0]
    ?? asArray(profile.damage?.types)[0]
  );
}

function canonicalDamageTypes(profile, variant = null) {
  return uniqueStrings([
    ...asArray(variant?.components).map((component) => component?.type),
    ...asArray(profile.components).map((component) => component?.type),
    ...asArray(profile.damageTypes),
    ...asArray(profile.damage?.types),
    canonicalPrimaryType(profile, variant)
  ]);
}

function canonicalTags(profile, variant = null) {
  return uniqueStrings([
    ...asArray(profile.tags),
    ...asArray(profile.weapon?.tags),
    ...asArray(variant?.tags),
    ...asArray(variant?.components).flatMap((component) => asArray(component?.tags)),
    ...asArray(profile.components).flatMap((component) => asArray(component?.tags))
  ]);
}

function normalizeRecord(record) {
  const slug = slugifyStatblockName(record.slug ?? record.id ?? record.name ?? record.weapon?.printedName);
  const sourceBook = record.source?.book ?? record.sourceBook ?? null;
  const sourceStatus = record.source?.status ?? record.sourceStatus ?? null;
  const actorName = record.actor?.name ?? record.actorName ?? null;
  const attackName = record.name ?? record.weapon?.printedName ?? record.attackName ?? null;
  const attackKind = record.weapon?.rowKind ?? record.attackKind ?? null;
  const confidence = record.confidence ?? null;
  const components = asArray(record.components).length
    ? asArray(record.components)
    : asArray(record.damage?.components).map((component, index) => ({
        key: component.key ?? (index === 0 ? 'base' : `component-${index + 1}`),
        label: component.label ?? attackName ?? 'Damage',
        formula: component.formula ?? record.damage?.formula ?? null,
        type: component.type ?? record.damage?.primaryType ?? asArray(record.damage?.types)[0] ?? null,
        tags: asArray(component.tags)
      }));

  return {
    ...record,
    slug,
    actorName,
    sourceBook,
    sourceStatus,
    attackName,
    attackKind,
    delivery: record.delivery ?? record.weapon?.delivery ?? null,
    attackShape: record.attackShape ?? record.resolution?.attackShape ?? null,
    scale: record.scale ?? record.resolution?.scale ?? 'character',
    primaryType: record.primaryType ?? record.damage?.primaryType ?? asArray(record.damage?.types)[0] ?? null,
    damageTypes: record.damageTypes ?? record.damage?.types ?? [],
    components,
    attack: record.attack ?? {
      isArea: !!record.resolution?.areaAttack,
      halfDamageOnMiss: !!record.resolution?.halfDamageOnMiss,
      noCriticalDouble: !!record.resolution?.noCriticalDouble,
      coverCanNegateMissDamage: !!record.resolution?.coverCanNegateMissDamage,
      attackRollMinimum: record.resolution?.attackRollMinimum ?? null,
      defense: record.resolution?.defense ?? null
    },
    area: record.area ?? {},
    riders: asArray(record.riders),
    tags: record.tags ?? record.weapon?.tags ?? [],
    sourceRefs: record.sourceRefs ?? (sourceBook ? [{ book: sourceBook, page: record.source?.page ?? null, note: sourceStatus ?? '' }] : []),
    variants: asArray(record.variants).map((variant) => ({
      ...variant,
      slug: slugifyStatblockName(variant.slug ?? variant.id ?? variant.label),
      components: asArray(variant.components).length ? asArray(variant.components) : asArray(variant.damage?.components)
    })),
    confidence
  };
}

function normalizeLegacyProfile(profile) {
  return {
    ...profile,
    slug: slugifyStatblockName(profile.slug ?? profile.attackName ?? profile.actorName),
    sourceBook: profile.sourceBook ?? null,
    sourceStatus: profile.sourceStatus ?? null,
    attackName: profile.attackName ?? profile.name ?? null,
    attackKind: profile.attackKind ?? null,
    components: asArray(profile.components).length
      ? profile.components
      : [{ key: 'base', label: profile.attackName ?? profile.name ?? 'Damage', formula: profile.damageFormula ?? null, type: profile.primaryType ?? asArray(profile.damageTypes)[0] ?? null, tags: ['base'] }],
    variants: asArray(profile.variants).map((variant) => ({ ...variant, slug: slugifyStatblockName(variant.slug ?? variant.id ?? variant.label) }))
  };
}

function flattenProfiles(data) {
  const records = asArray(data?.records).map(normalizeRecord);
  const legacyProfiles = asArray(data?.profiles).map(normalizeLegacyProfile);
  return [...records, ...legacyProfiles].filter((profile) => profile.slug);
}

async function loadProfileFile(file, { fetchImpl, basePath }) {
  const response = await fetchImpl(`${basePath}${file}`);
  if (!response?.ok) throw new Error(`Failed to load ${file} (${response?.status})`);
  return flattenProfiles(await response.json());
}

export async function loadNonheroicDamageProfiles({
  fetchImpl = globalThis.fetch,
  basePath = 'systems/foundryvtt-swse/'
} = {}) {
  if (profileCachePromise) return profileCachePromise;
  profileCachePromise = (async () => {
    if (typeof fetchImpl !== 'function') return [];
    const batches = await Promise.allSettled(PROFILE_FILES.map((file) => loadProfileFile(file, { fetchImpl, basePath })));
    return batches.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  })();
  return profileCachePromise;
}

export function clearNonheroicDamageProfileCache() {
  profileCachePromise = null;
}

function isWireableProfile(profile) {
  return WIREABLE_CONFIDENCE.has(profile?.confidence);
}

export async function findNonheroicDamageProfileMatch(raw, context = {}) {
  const profiles = await loadNonheroicDamageProfiles(context.profileLoaderOptions ?? {});
  const candidates = profiles.filter((profile) => isWireableProfile(profile) && actorMatches(profile, context) && rawMatches(profile, raw));
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const score = (profile) => profile.confidence === 'verified' || profile.confidence === 'sourcebookVerified' ? 3 : 1;
    return score(b) - score(a);
  });

  const profile = candidates[0];
  const variant = chooseVariant(profile, raw);
  return { profile, variant };
}

function chooseVariant(profile, raw) {
  const normalizedRaw = cleanText(raw).toLowerCase();
  for (const variant of asArray(profile.variants)) {
    const markers = [variant.slug, variant.label, ...asArray(variant.tags)]
      .map((value) => cleanText(value).toLowerCase())
      .filter(Boolean);
    if (markers.some((marker) => normalizedRaw.includes(marker))) {
      return variant;
    }
  }
  return null;
}

function buildHydratedSystem(baseSystem = {}, profile, variant = null) {
  const damageFormula = canonicalFormula(profile, variant);
  const primaryType = canonicalPrimaryType(profile, variant);
  const damageTypes = canonicalDamageTypes(profile, variant);
  const tags = canonicalTags(profile, variant);
  const attack = clone(variant?.attack ?? profile.attack ?? {});
  const area = clone(variant?.area ?? profile.area ?? {});
  const components = clone(asArray(variant?.components).length ? variant.components : profile.components ?? []);
  const riders = clone(asArray(variant?.riders).length ? variant.riders : profile.riders ?? []);

  return mergeObject(baseSystem, {
    damage: damageFormula || baseSystem.damage || '',
    damageFormula: damageFormula || baseSystem.damageFormula || '',
    damageType: primaryType || baseSystem.damageType || '',
    damageTypes,
    primaryType: primaryType || null,
    delivery: profile.delivery ?? null,
    attackShape: profile.attackShape ?? null,
    scale: profile.scale ?? 'character',
    attack,
    area,
    components,
    riders,
    damageProfileSlug: variant?.slug ?? profile.slug,
    damageProfileBaseSlug: profile.slug,
    statblockAttackName: profile.attackName ?? null,
    statblockAttackKind: profile.attackKind ?? null,
    statblockSourceBook: profile.sourceBook ?? null,
    statblockSourceStatus: profile.sourceStatus ?? null,
    statblockHydrated: true,
    statblockHydrationConfidence: profile.confidence ?? null,
    tags,
    sourceAuthority: 'statblock',
    playModeReference: true
  });
}

function buildHydratedFlags(baseFlags = {}, raw, profile, variant = null) {
  return mergeObject(baseFlags, {
    swse: {
      import: {
        sourceAuthority: 'statblock',
        raw,
        damageProfile: {
          matched: true,
          slug: variant?.slug ?? profile.slug,
          baseSlug: profile.slug,
          actorName: profile.actorName ?? null,
          attackName: profile.attackName ?? null,
          sourceBook: profile.sourceBook ?? null,
          sourceStatus: profile.sourceStatus ?? null,
          confidence: profile.confidence ?? null,
          reviewRequired: !!profile.reviewRequired
        }
      },
      damageProfile: {
        slug: variant?.slug ?? profile.slug,
        baseSlug: profile.slug,
        sourceType: 'nonheroic-statblock',
        sourceBook: profile.sourceBook ?? null,
        confidence: profile.confidence ?? null
      }
    }
  });
}

export async function hydrateImportedStatblockWeapon(itemData, context = {}) {
  const raw = cleanText(context.raw ?? itemData?.flags?.swse?.import?.raw ?? itemData?.name);
  if (!itemData || !raw) return itemData;

  const match = await findNonheroicDamageProfileMatch(raw, context);
  if (!match) return itemData;

  const { profile, variant } = match;
  const hydrated = clone(itemData) ?? {};
  hydrated.system = buildHydratedSystem(hydrated.system ?? {}, profile, variant);
  hydrated.flags = buildHydratedFlags(hydrated.flags ?? {}, raw, profile, variant);
  return hydrated;
}

export const NONHEROIC_DAMAGE_PROFILE_FILES = PROFILE_FILES;

export default hydrateImportedStatblockWeapon;
