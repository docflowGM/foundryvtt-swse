function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function weaponSystem(weapon) {
  return weapon?.system ?? {};
}

function weaponQualityCandidates(weapon) {
  const system = weaponSystem(weapon);
  return [
    system.qualities,
    system.weaponQualities,
    system.specialQualities,
    system.properties,
    system.traits,
    system.tags,
    system.flags,
    system.combat?.qualities,
    system.combat?.properties
  ];
}

function collectBaseQualities(weapon) {
  const system = weaponSystem(weapon);
  const qualities = new Set();
  for (const candidate of weaponQualityCandidates(weapon)) {
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        const key = typeof entry === 'object'
          ? normalizeKey(entry?.key ?? entry?.id ?? entry?.slug ?? entry?.name ?? entry?.label ?? entry?.value)
          : normalizeKey(entry);
        if (key) qualities.add(key);
      }
    } else if (candidate && typeof candidate === 'object') {
      for (const [key, value] of Object.entries(candidate)) {
        if (value === true) qualities.add(normalizeKey(key));
        else if (typeof value === 'string') qualities.add(normalizeKey(value));
      }
    } else if (typeof candidate === 'string') {
      for (const part of candidate.split(/[,;|]/)) {
        const key = normalizeKey(part);
        if (key) qualities.add(key);
      }
    }
  }

  const text = [
    weapon?.name,
    system.description,
    system.description?.value,
    system.details,
    system.notes
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  if (/\baccurate\b/.test(text)) qualities.add('accurate');
  if (/\binaccurate\b/.test(text)) qualities.add('inaccurate');
  if (/\bautofire\b/.test(text)) qualities.add('autofire');

  return qualities;
}

function collectOverrideQualities(context = {}) {
  const add = new Set();
  const remove = new Set();

  const directAdds = [
    ...asArray(context.addWeaponQualities),
    ...asArray(context.weaponQualitiesAdded),
    ...asArray(context.effectiveWeaponQualities?.add)
  ];
  const directRemoves = [
    ...asArray(context.removeWeaponQualities),
    ...asArray(context.weaponQualitiesRemoved),
    ...asArray(context.effectiveWeaponQualities?.remove)
  ];

  for (const quality of directAdds) {
    const key = normalizeKey(quality);
    if (key) add.add(key);
  }
  for (const quality of directRemoves) {
    const key = normalizeKey(quality);
    if (key) remove.add(key);
  }

  const flags = context.flags ?? context.weaponPropertyFlags ?? {};
  if (flags && typeof flags === 'object' && !Array.isArray(flags)) {
    for (const [rawKey, value] of Object.entries(flags)) {
      const key = normalizeKey(rawKey.replace(/^weaponProperty\./, ''));
      if (!key) continue;
      if (value === true) add.add(key);
      if (value === false) remove.add(key);
    }
  }

  return { add, remove };
}

export class EffectiveWeaponQualityResolver {
  static normalizeKey(value) {
    return normalizeKey(value);
  }

  static resolve(weapon, context = {}) {
    const qualities = collectBaseQualities(weapon);
    const { add, remove } = collectOverrideQualities(context);

    for (const quality of add) qualities.add(quality);
    for (const quality of remove) qualities.delete(quality);

    return qualities;
  }

  static has(weapon, quality, context = {}) {
    return this.resolve(weapon, context).has(normalizeKey(quality));
  }

  static apply(result, mutations = [], source = 'Effective Weapon Quality') {
    result.flags ??= {};
    result.effectiveWeaponQualities ??= { add: [], remove: [] };
    result.breakdown ??= [];

    for (const mutation of mutations) {
      const quality = normalizeKey(mutation?.quality ?? mutation?.key ?? mutation?.property);
      if (!quality) continue;
      const mode = mutation?.mode === 'remove' || mutation?.value === false ? 'remove' : 'add';
      const bucket = mode === 'remove' ? result.effectiveWeaponQualities.remove : result.effectiveWeaponQualities.add;
      if (!bucket.includes(quality)) bucket.push(quality);
      result.flags[`weaponProperty.${quality}`] = mode === 'add';
      result.breakdown.push({
        label: mutation?.label ?? `${source}: ${mode === 'add' ? 'Add' : 'Remove'} ${quality}`,
        value: 0,
        type: mode === 'add' ? 'weaponQualityAdd' : 'weaponQualityRemove'
      });
    }

    return result;
  }
}

export default EffectiveWeaponQualityResolver;
