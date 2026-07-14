// scripts/engine/import/nonheroic-damage-profile-hydrator.js
/**
 * Nonheroic Damage Profile Hydrator (NH-2)
 *
 * Applies source-backed statblock attack-row profiles to imported NPC weapon
 * reference items. This is intentionally conservative: if no profile matches
 * both the source actor and raw attack text, the importer keeps the legacy
 * reference-only item unchanged.
 */

const PROFILE_FILES = Object.freeze([
  'data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json'
]);

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

function maybeIncludes(haystack, needles) {
  const normalized = cleanText(haystack).toLowerCase();
  const list = asArray(needles).map((needle) => cleanText(needle).toLowerCase()).filter(Boolean);
  if (!list.length) return true;
  return list.some((needle) => normalized.includes(needle));
}

function actorMatches(profile, context = {}) {
  const required = asArray(profile?.match?.actorSlugs).map(slugifyStatblockName).filter(Boolean);
  if (!required.length) return true;

  const candidates = [
    context.actorName,
    context.templateName,
    context.statblock?.Name,
    context.statblock?.name,
    profile.actorName
  ].map(slugifyStatblockName).filter(Boolean);

  return candidates.some((candidate) => required.includes(candidate));
}

function rawMatches(profile, raw) {
  return maybeIncludes(raw, profile?.match?.rawIncludes);
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

function flattenProfiles(data) {
  return asArray(data?.profiles)
    .filter((profile) => profile && typeof profile === 'object')
    .map((profile) => ({ ...profile, slug: slugifyStatblockName(profile.slug ?? profile.attackName ?? profile.actorName) }))
    .filter((profile) => profile.slug);
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

export async function findNonheroicDamageProfileMatch(raw, context = {}) {
  const profiles = await loadNonheroicDamageProfiles(context.profileLoaderOptions ?? {});
  const candidates = profiles.filter((profile) => actorMatches(profile, context) && rawMatches(profile, raw));
  if (!candidates.length) return null;

  // Prefer fully sourcebook-verified rows, then source-text verified rows, then
  // any remaining explicit profile. This keeps review-required rows from
  // displacing page-verified entries when both could match.
  candidates.sort((a, b) => {
    const score = (profile) => profile.confidence === 'sourcebookVerified' ? 3 : profile.confidence === 'sourceTextVerified' ? 2 : 1;
    return score(b) - score(a);
  });

  const profile = candidates[0];
  const variant = chooseVariant(profile, raw);
  return { profile, variant };
}

function buildHydratedSystem(baseSystem = {}, profile, variant = null) {
  const damageFormula = cleanText(variant?.damageFormula ?? profile.damageFormula);
  const tags = [...new Set([...asArray(profile.tags), ...asArray(variant?.tags)].map(cleanText).filter(Boolean))];
  const damageTypes = asArray(profile.damageTypes).map(cleanText).filter(Boolean);
  const primaryType = cleanText(profile.primaryType || damageTypes[0]);

  return mergeObject(baseSystem, {
    damage: damageFormula || baseSystem.damage || '',
    damageFormula: damageFormula || baseSystem.damageFormula || '',
    damageType: primaryType || baseSystem.damageType || '',
    damageTypes,
    primaryType: primaryType || null,
    delivery: profile.delivery ?? null,
    attackShape: profile.attackShape ?? null,
    scale: profile.scale ?? 'character',
    attack: clone(profile.attack ?? {}),
    area: clone(profile.area ?? {}),
    riders: clone(profile.riders ?? []),
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
