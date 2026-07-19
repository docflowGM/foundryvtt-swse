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
  'data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-3.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json',
  'data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json'
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
    variant?.formula?.printed
    ?? profile?.formula?.printed
    ?? asArray(variant?.components)[0]?.formula
    ?? variant?.damage?.formula
    ?? asArray(profile.components)[0]?.formula
    ?? profile.damageFormula
    ?? profile.damage?.formula
  );
}

function canonicalPrimaryType(profile, variant = null) {
  return cleanText(
    variant?.formula?.typeOverride
    ?? profile?.formula?.typeOverride
    ?? variant?.primaryType
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
    variant?.formula?.typeOverride,
    profile?.formula?.typeOverride,
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

function normalizePrintedAttack(value) {
  if (!value) return null;
  const bonuses = asArray(value.bonuses).map(Number).filter(Number.isFinite);
  const bonus = Number.isFinite(Number(value.bonus)) ? Number(value.bonus) : bonuses[0] ?? null;
  return {
    text: value.text ?? (bonus === null ? null : `${bonus >= 0 ? '+' : ''}${bonus}`),
    bonus,
    bonuses,
    source: value.source ?? 'printed-statblock',
    hydratePolicy: value.hydratePolicy ?? 'metadata-only',
    notes: asArray(value.notes)
  };
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
    primaryType: record.primaryType ?? record.formula?.typeOverride ?? record.damage?.primaryType ?? asArray(record.damage?.types)[0] ?? null,
    damageTypes: record.damageTypes ?? record.damage?.types ?? [],
    components,
    formula: record.formula ?? null,
    printedAttack: normalizePrintedAttack(record.printedAttack),
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
      components: asArray(variant.components).length ? asArray(variant.components) : asArray(variant.damage?.components),
      formula: variant.formula ?? null,
      printedAttack: normalizePrintedAttack(variant.printedAttack)
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
    printedAttack: normalizePrintedAttack(profile.printedAttack),
    components: asArray(profile.components).length
      ? profile.components
      : [{ key: 'base', label: profile.attackName ?? profile.name ?? 'Damage', formula: profile.damageFormula ?? null, type: profile.primaryType ?? asArray(profile.damageTypes)[0] ?? null, tags: ['base'] }],
    variants: asArray(profile.variants).map((variant) => ({ ...variant, slug: slugifyStatblockName(variant.slug ?? variant.id ?? variant.label), printedAttack: normalizePrintedAttack(variant.printedAttack) }))
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

function isSafeBulkLaneAProfile(profile) {
  const tags = new Set(asArray(profile?.tags).map((tag) => cleanText(tag).toLowerCase()));
  const formulaMode = cleanText(profile?.formula?.mode);
  const actorSlugs = asArray(profile?.match?.actorSlugs).map(slugifyStatblockName).filter(Boolean);
  const rawIncludes = asArray(profile?.match?.rawIncludes).map(cleanText).filter(Boolean);
  const components = asArray(profile?.components);
  const riders = asArray(profile?.riders);
  const attack = profile?.attack ?? {};
  const area = profile?.area ?? {};

  return profile?.confidence === 'manualRequired'
    && tags.has('generated-candidate')
    && profile?.source?.status === 'repo-raw-statblock-field; page review still required'
    && actorSlugs.length > 0
    && rawIncludes.length > 0
    && !!cleanText(profile?.weapon?.uuid)
    && ['melee', 'ranged'].includes(cleanText(profile?.weapon?.rowKind))
    && !!cleanText(profile?.formula?.printed)
    && ['base', 'base-plus-delta', 'base-plus-dice'].includes(formulaMode)
    && profile?.delivery === 'weapon'
    && profile?.attackShape === 'single-target'
    && attack.isArea === false
    && !area?.shape
    && riders.length === 0
    && components.length > 0
    && components.every((component) => !!cleanText(component?.formula));
}

function hydrationPolicy(profile) {
  if (WIREABLE_CONFIDENCE.has(profile?.confidence)) return 'source-verified';
  if (isSafeBulkLaneAProfile(profile)) return 'safe-bulk-lane-a';
  return null;
}

function isWireableProfile(profile) {
  return hydrationPolicy(profile) !== null;
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
  const formula = clone(variant?.formula ?? profile.formula ?? null);
  const printedAttack = clone(variant?.printedAttack ?? profile.printedAttack ?? null);
  const weaponRef = clone(profile.weapon ?? {});
  const delivery = variant?.delivery ?? profile.delivery ?? null;
  const attackShape = variant?.attackShape ?? profile.attackShape ?? null;
  const scale = variant?.scale ?? profile.scale ?? 'character';

  return mergeObject(baseSystem, {
    damage: damageFormula || baseSystem.damage || '',
    damageFormula: damageFormula || baseSystem.damageFormula || '',
    damageType: primaryType || baseSystem.damageType || '',
    damageTypes,
    primaryType: primaryType || null,
    delivery,
    attackShape,
    scale,
    attack,
    area,
    components,
    riders,
    formula,
    sourceWeaponUuid: weaponRef.uuid ?? null,
    sourceWeaponBaseSlug: weaponRef.baseSlug ?? null,
    sourceWeaponBasePack: weaponRef.basePack ?? null,
    sourceWeaponBaseFormula: weaponRef.baseFormula ?? null,
    sourceWeaponBaseType: weaponRef.baseType ?? null,
    damageProfileSlug: variant?.slug ?? profile.slug,
    damageProfileBaseSlug: profile.slug,
    statblockAttackName: profile.attackName ?? null,
    statblockAttackKind: profile.attackKind ?? null,
    statblockSourceBook: profile.sourceBook ?? null,
    statblockSourceStatus: profile.sourceStatus ?? null,
    statblockHydrated: true,
    statblockHydrationConfidence: profile.confidence ?? null,
    statblockHydrationPolicy: hydrationPolicy(profile),
    statblockPrintedFormula: formula?.printed ?? damageFormula ?? null,
    statblockFormulaMode: formula?.mode ?? null,
    statblockFormulaDelta: formula?.delta ?? null,
    statblockPrintedAttackText: printedAttack?.text ?? null,
    statblockPrintedAttackBonus: printedAttack?.bonus ?? null,
    statblockPrintedAttackBonuses: printedAttack?.bonuses ?? [],
    statblockPrintedAttackHydratePolicy: printedAttack?.hydratePolicy ?? null,
    tags,
    sourceAuthority: 'statblock',
    playModeReference: true
  });
}

function buildHydratedFlags(baseFlags = {}, raw, profile, variant = null) {
  const formula = variant?.formula ?? profile.formula ?? null;
  const printedAttack = variant?.printedAttack ?? profile.printedAttack ?? null;
  const weaponRef = profile.weapon ?? {};

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
          hydrationPolicy: hydrationPolicy(profile),
          reviewRequired: !!profile.reviewRequired,
          printedFormula: formula?.printed ?? null,
          formulaMode: formula?.mode ?? null,
          formulaDelta: formula?.delta ?? null,
          printedAttackText: printedAttack?.text ?? null,
          printedAttackBonus: printedAttack?.bonus ?? null,
          printedAttackBonuses: printedAttack?.bonuses ?? [],
          printedAttackHydratePolicy: printedAttack?.hydratePolicy ?? null,
          sourceWeaponUuid: weaponRef.uuid ?? null,
          sourceWeaponBaseSlug: weaponRef.baseSlug ?? null,
          sourceWeaponBaseFormula: weaponRef.baseFormula ?? null
        }
      },
      damageProfile: {
        slug: variant?.slug ?? profile.slug,
        baseSlug: profile.slug,
        sourceType: 'nonheroic-statblock',
        sourceBook: profile.sourceBook ?? null,
        confidence: profile.confidence ?? null,
        hydrationPolicy: hydrationPolicy(profile),
        sourceWeaponUuid: weaponRef.uuid ?? null,
        printedFormula: formula?.printed ?? null,
        formulaMode: formula?.mode ?? null,
        formulaDelta: formula?.delta ?? null,
        printedAttackText: printedAttack?.text ?? null,
        printedAttackBonus: printedAttack?.bonus ?? null,
        printedAttackHydratePolicy: printedAttack?.hydratePolicy ?? null
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
