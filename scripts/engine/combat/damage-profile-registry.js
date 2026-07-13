/**
 * Damage Profile Registry (Phase 1 — data plumbing, no runtime behavior change).
 *
 * One packet shape, many source-specific profiles, one mitigation pipeline.
 * Profiles describe how a source family fills in the swse.damage.packet.v2
 * axes (delivery / attackShape / scale / attack / area / components / riders)
 * without ever creating a parallel packet schema or damage path.
 *
 * Data lives in data/combat/damage-profiles.*.json (see
 * data/combat/damage-profiles.schema.json). Contract doc:
 * docs/systems/CANONICAL_DAMAGE_PACKET.md.
 *
 * IMPORTANT: the runtime damage path does NOT consult this registry yet.
 * Wiring happens family-by-family in later slices, gated on each profile's
 * `confidence` ("verified" only). This module is dependency-free so the node
 * audit tool (tools/audit-damage-profiles.mjs) can import it directly.
 */

export const SOURCE_TYPES = Object.freeze([
  'weapon',
  'vehicleWeapon',
  'forcePower',
  'naturalWeapon',
  'unarmed',
  'areaProfile'
]);

export const CONFIDENCE_LEVELS = Object.freeze(['verified', 'inferred', 'manualRequired']);

const DATA_FILES = Object.freeze([
  'data/combat/damage-profiles.weapon.json',
  'data/combat/damage-profiles.vehicle-weapon.json',
  'data/combat/damage-profiles.force-power.json',
  'data/combat/damage-profiles.natural.json',
  'data/combat/damage-profiles.area.json'
]);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

export function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EMPTY_ATTACK = Object.freeze({
  isArea: false,
  isAutofire: false,
  isBurstFire: false,
  isSplash: false,
  halfDamageOnMiss: false,
  noCriticalDouble: false,
  coverCanNegateMissDamage: false,
  defense: null
});

const EMPTY_AREA = Object.freeze({
  shape: null,
  radius: null,
  size: null,
  originMode: null,
  targetPolicy: null
});

/**
 * Normalize a raw profile entry into the canonical registry shape.
 * Unknown confidence collapses to "manualRequired" so nothing accidentally
 * looks wire-safe.
 */
export function normalizeProfile(raw = {}, sourceTypeFallback = null) {
  const sourceType = SOURCE_TYPES.includes(raw.sourceType)
    ? raw.sourceType
    : (SOURCE_TYPES.includes(sourceTypeFallback) ? sourceTypeFallback : null);
  const name = String(raw.name ?? raw.slug ?? '').trim();
  const slug = slugify(raw.slug ?? name);
  const confidence = CONFIDENCE_LEVELS.includes(raw.confidence) ? raw.confidence : 'manualRequired';
  return {
    sourceType,
    slug,
    name: name || slug,
    delivery: raw.delivery ?? null,
    attackShape: raw.attackShape ?? null,
    scale: raw.scale ?? 'character',
    primaryType: raw.primaryType ?? null,
    tags: asArray(raw.tags).map(t => String(t)),
    attack: { ...EMPTY_ATTACK, ...(raw.attack ?? {}) },
    area: { ...EMPTY_AREA, ...(raw.area ?? {}) },
    components: asArray(raw.components),
    riders: asArray(raw.riders),
    confidence,
    notes: asArray(raw.notes).map(n => String(n))
  };
}

export class DamageProfileRegistry {
  constructor() {
    /** @type {Map<string, Map<string, object>>} sourceType → slug → profile */
    this._bySource = new Map();
  }

  /**
   * Register the parsed content of a damage-profiles.*.json file:
   * `{ sourceType, profiles: [...] }` (per-profile sourceType wins).
   */
  registerProfileData(data = {}) {
    const fallback = data.sourceType ?? null;
    for (const raw of asArray(data.profiles)) this.register(raw, fallback);
    return this;
  }

  register(rawProfile, sourceTypeFallback = null) {
    const profile = normalizeProfile(rawProfile, sourceTypeFallback);
    if (!profile.sourceType || !profile.slug) {
      throw new Error(`DamageProfileRegistry: profile needs sourceType and slug (got ${JSON.stringify({ sourceType: profile.sourceType, slug: profile.slug })})`);
    }
    if (!this._bySource.has(profile.sourceType)) this._bySource.set(profile.sourceType, new Map());
    this._bySource.get(profile.sourceType).set(profile.slug, profile);
    return profile;
  }

  /** All profiles for a source family (or every profile when omitted). */
  all(sourceType = null) {
    if (sourceType) return [...(this._bySource.get(sourceType)?.values() ?? [])];
    return [...this._bySource.values()].flatMap(m => [...m.values()]);
  }

  get(sourceType, slugOrName) {
    return this._bySource.get(sourceType)?.get(slugify(slugOrName)) ?? null;
  }

  /** Profiles carrying a rule-hook tag (e.g. "lightsaber", "autofire"). */
  byTag(tag, sourceType = null) {
    const key = String(tag);
    return this.all(sourceType).filter(p => p.tags.includes(key));
  }

  /**
   * Wiring gate: only "verified" profiles may drive runtime behavior.
   * Returns null (not the profile) for inferred/manualRequired entries so a
   * future builder cannot accidentally wire unreviewed data.
   */
  getWireable(sourceType, slugOrName) {
    const profile = this.get(sourceType, slugOrName);
    return profile?.confidence === 'verified' ? profile : null;
  }

  counts() {
    const out = {};
    for (const [sourceType, map] of this._bySource) {
      const byConfidence = { verified: 0, inferred: 0, manualRequired: 0 };
      for (const p of map.values()) byConfidence[p.confidence] += 1;
      out[sourceType] = { total: map.size, ...byConfidence };
    }
    return out;
  }
}

/** Shared singleton for Foundry-side consumers (empty until loaded). */
export const damageProfileRegistry = new DamageProfileRegistry();

/**
 * Load the default profile data files. In Foundry pass nothing (uses global
 * fetch against the system route); in node the audit tool reads the files
 * itself and calls registerProfileData directly instead.
 */
export async function loadDefaultProfiles({
  registry = damageProfileRegistry,
  fetchImpl = globalThis.fetch,
  basePath = 'systems/foundryvtt-swse/'
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('loadDefaultProfiles: no fetch implementation available');
  for (const file of DATA_FILES) {
    const response = await fetchImpl(`${basePath}${file}`);
    if (!response?.ok) throw new Error(`loadDefaultProfiles: failed to load ${file} (${response?.status})`);
    registry.registerProfileData(await response.json());
  }
  return registry;
}

export const DAMAGE_PROFILE_DATA_FILES = DATA_FILES;

export default DamageProfileRegistry;
