/**
 * WeaponRangeProfileResolver
 *
 * Data-driven helper for hydrating personal weapon range bands from
 * data/actor-weapon-ranges.json. Used by item editor and pre-roll config.
 */

const ACTOR_RANGE_PATH = 'systems/foundryvtt-swse/data/actor-weapon-ranges.json';

const FALLBACK_PROFILES = [
  { id: 'heavy-weapons', name: 'Heavy Weapons', slug: 'heavy-weapons', bands: { pb: { min: 0, max: 50, attackMod: 0 }, short: { min: 51, max: 100, attackMod: -2 }, medium: { min: 101, max: 250, attackMod: -5 }, long: { min: 251, max: 500, attackMod: -10 } } },
  { id: 'pistols', name: 'Pistols', slug: 'pistols', bands: { pb: { min: 0, max: 20, attackMod: 0 }, short: { min: 21, max: 40, attackMod: -2 }, medium: { min: 41, max: 60, attackMod: -5 }, long: { min: 61, max: 80, attackMod: -10 } } },
  { id: 'rifles', name: 'Rifles', slug: 'rifles', bands: { pb: { min: 0, max: 30, attackMod: 0 }, short: { min: 31, max: 60, attackMod: -2 }, medium: { min: 61, max: 150, attackMod: -5 }, long: { min: 151, max: 300, attackMod: -10 } } },
  { id: 'simple-weapons', name: 'Simple Weapons', slug: 'simple-weapons', bands: { pb: { min: 0, max: 20, attackMod: 0 }, short: { min: 21, max: 40, attackMod: -2 }, medium: { min: 41, max: 60, attackMod: -5 }, long: { min: 61, max: 80, attackMod: -10 } } },
  { id: 'thrown-weapons', name: 'Thrown Weapons', slug: 'thrown-weapons', bands: { pb: { min: 0, max: 6, attackMod: 0 }, short: { min: 7, max: 8, attackMod: -2 }, medium: { min: 9, max: 10, attackMod: -5 }, long: { min: 11, max: 12, attackMod: -10 } } }
];

function key(value) {
  return String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
}

function normalizeSlug(value) {
  const v = key(value);
  if (!v) return '';
  if (['heavy', 'heavy-weapons', 'heavy-weapon'].includes(v)) return 'heavy-weapons';
  if (['pistol', 'pistols'].includes(v)) return 'pistols';
  if (['rifle', 'rifles', 'carbine', 'carbines'].includes(v)) return 'rifles';
  if (['simple', 'simple-weapons', 'simple-weapon'].includes(v)) return 'simple-weapons';
  if (['thrown', 'thrown-weapons', 'grenade', 'grenades'].includes(v)) return 'thrown-weapons';
  if (['ranged-exotic', 'exotic-ranged'].includes(v)) return 'rifles';
  return v;
}

function weaponCategoryCandidate(itemOrSystem = {}) {
  const system = itemOrSystem.system ?? itemOrSystem;
  return system?.rangeProfile
    ?? system?.weaponRangeProfile
    ?? system?.weaponCategory
    ?? system?.category
    ?? system?.group
    ?? system?.weaponGroup
    ?? '';
}

function clone(value) {
  return foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value));
}

export class WeaponRangeProfileResolver {
  static _profiles = null;

  static async loadActorProfiles() {
    if (Array.isArray(this._profiles)) return this._profiles;
    try {
      const response = await fetch(ACTOR_RANGE_PATH);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this._profiles = Array.isArray(data) ? data : FALLBACK_PROFILES;
    } catch (_err) {
      this._profiles = FALLBACK_PROFILES;
    }
    return this._profiles;
  }

  static async getActorProfile(slugOrCategory) {
    const slug = normalizeSlug(slugOrCategory);
    if (!slug) return null;
    const profiles = await this.loadActorProfiles();
    return profiles.find(p => key(p.slug) === slug || key(p.id) === slug) ?? null;
  }

  static async resolveForWeapon(itemOrSystem = {}) {
    const system = itemOrSystem.system ?? itemOrSystem;
    const branch = key(system?.meleeOrRanged ?? system?.weaponRangeType ?? system?.rangeType ?? system?.range);
    if (branch === 'melee' || String(system?.range ?? '').toLowerCase() === 'melee') {
      return null;
    }
    const profile = await this.getActorProfile(weaponCategoryCandidate(itemOrSystem));
    if (!profile) return null;
    return this.toSheetRangeData(profile);
  }

  static toSheetRangeData(profile) {
    if (!profile?.bands) return null;
    const bands = profile.bands;
    const normalized = {
      pb: clone(bands.pb ?? bands.pointBlank ?? null),
      short: clone(bands.short ?? null),
      medium: clone(bands.medium ?? null),
      long: clone(bands.long ?? null)
    };
    return {
      profileId: profile.id ?? profile.slug,
      profileSlug: profile.slug ?? profile.id,
      profileName: profile.name ?? profile.slug ?? 'Weapon Range',
      range: this.formatRangeSummary(normalized),
      ranges: normalized
    };
  }

  static formatRangeSummary(ranges = {}) {
    const parts = [];
    for (const [label, band] of Object.entries(ranges)) {
      if (!band) continue;
      const name = label === 'pb' ? 'PB' : label.charAt(0).toUpperCase() + label.slice(1);
      parts.push(`${name} ${band.min}-${band.max}`);
    }
    return parts.join(' / ');
  }

  static applyToForm(form, rangeData, { overwrite = false } = {}) {
    if (!form || !rangeData) return false;
    const set = (name, value) => {
      const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
      if (!input) return;
      if (!overwrite && String(input.value ?? '').trim() !== '') return;
      input.value = value ?? '';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    set('system.rangeProfile', rangeData.profileSlug ?? rangeData.profileId ?? '');
    set('system.rangeProfileName', rangeData.profileName ?? '');
    set('system.range', rangeData.range ?? '');

    for (const [bandKey, band] of Object.entries(rangeData.ranges ?? {})) {
      if (!band) continue;
      set(`system.ranges.${bandKey}.min`, band.min);
      set(`system.ranges.${bandKey}.max`, band.max);
      set(`system.ranges.${bandKey}.attackMod`, band.attackMod ?? 0);
    }
    return true;
  }
}

export default WeaponRangeProfileResolver;
