/**
 * Species publication selection — project owner ruling RD-001.
 *
 * When a species is published in more than one verified profile (>= 2 complete-snapshot
 * variants), the player must choose one explicitly; nothing silently defaults to a
 * sourcebook. This module is the single authority for that policy:
 *
 *  - which variants count as verified publication versions (complete snapshots only);
 *  - whether a species requires an explicit choice;
 *  - whether a given selection is acceptable;
 *  - the data the selector shows so players can compare versions.
 *
 * Legacy (non-snapshot) variants are NOT verified publications: they stay in the data so existing
 * actors keep working, but they are never offered as an authoritative version for a new selection.
 * Choices *within* a profile (selectable ability modifiers) are a separate concept
 * (`abilityChoice`) and are applied after the version.
 *
 * Pure module: no Foundry globals.
 */

export const PUBLICATION_SELECTION_ERRORS = Object.freeze({
  NO_VERSION_SELECTED: 'NO_VERSION_SELECTED',
  INVALID_VERSION: 'INVALID_VERSION',
});

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = { str: 'Str', dex: 'Dex', con: 'Con', int: 'Int', wis: 'Wis', cha: 'Cha' };

/** Verified publication versions of a species: its complete-snapshot variants. */
export function getPublicationVersions(entry) {
  return (Array.isArray(entry?.variants) ? entry.variants : []).filter(variant => variant?.completeSnapshot === true);
}

/** A species requires an explicit publication choice when more than one verified version exists. */
export function requiresPublicationSelection(entry) {
  return getPublicationVersions(entry).length >= 2;
}

/**
 * Validate a (possibly absent) variant selection for a species.
 * @returns {{required: boolean, ok: boolean, code: string|null, version: object|null}}
 */
export function checkPublicationSelection(entry, variantId) {
  const required = requiresPublicationSelection(entry);
  if (!required) return { required, ok: true, code: null, version: null };
  const id = variantId == null || variantId === '' || variantId === 'default' ? null : String(variantId);
  if (!id) return { required, ok: false, code: PUBLICATION_SELECTION_ERRORS.NO_VERSION_SELECTED, version: null };
  const version = getPublicationVersions(entry).find(v => String(v.id) === id) ?? null;
  if (!version) return { required, ok: false, code: PUBLICATION_SELECTION_ERRORS.INVALID_VERSION, version: null };
  return { required, ok: true, code: null, version };
}

const signedMods = mods => ABILITY_KEYS
  .filter(key => Number(mods?.[key]))
  .map(key => `${Number(mods[key]) > 0 ? '+' : ''}${Number(mods[key])} ${ABILITY_LABELS[key]}`)
  .join(', ');

function movementLine(version) {
  const movement = version?.movement && typeof version.movement === 'object' ? version.movement : {};
  const modes = ['walk', 'swim', 'fly', 'climb', 'hover', 'glide', 'burrow']
    .filter(mode => Number.isFinite(Number(movement[mode])) && movement[mode] !== null)
    .map(mode => `${mode[0].toUpperCase()}${mode.slice(1)} ${Number(movement[mode])}`);
  if (modes.length) return modes.join(', ');
  return Number.isFinite(Number(version?.speed)) ? `Walk ${Number(version.speed)}` : '';
}

const names = list => (Array.isArray(list) ? list : []).map(item => String(item?.name ?? item ?? '').trim()).filter(Boolean);

/** Normalized, comparable summary of one verified version. */
function summarizeVersion(version) {
  return {
    id: version.id,
    label: version.label || version.id,
    publication: version.label || version.source || version.id,
    source: version.source || null,
    sourceProfileId: version.sourceProfileId || null,
    abilities: signedMods(version.abilityMods) || version.abilities || 'None',
    size: version.size || null,
    movement: movementLine(version),
    languages: names(version.languages),
    traits: names(version.traits?.length ? version.traits : version.special),
    description: version.description || '',
  };
}

const COMPARED_FIELDS = Object.freeze([
  { key: 'abilities', label: 'Ability modifiers' },
  { key: 'size', label: 'Size' },
  { key: 'movement', label: 'Movement' },
  { key: 'languages', label: 'Languages' },
  { key: 'traits', label: 'Traits' },
]);

const sameValue = (a, b) => JSON.stringify(Array.isArray(a) ? [...a].sort() : a) === JSON.stringify(Array.isArray(b) ? [...b].sort() : b);

/**
 * Data for the selector: each verified version, which of its fields differ from the other versions,
 * and, for traits, which trait names are not shared by every version.
 */
export function buildPublicationComparison(entry) {
  const versions = getPublicationVersions(entry).map(summarizeVersion);
  const required = versions.length >= 2;
  if (!required) return { required: false, versions, differingFields: [] };

  const differingKeys = COMPARED_FIELDS.filter(({ key }) => versions.some(v => !sameValue(v[key], versions[0][key]))).map(f => f.key);
  const traitSets = versions.map(v => new Set(v.traits.map(t => t.toLowerCase())));
  const shared = new Set([...traitSets[0]].filter(t => traitSets.every(set => set.has(t))));

  return {
    required: true,
    differingFields: COMPARED_FIELDS.filter(f => differingKeys.includes(f.key)).map(f => f.label),
    versions: versions.map(v => ({
      ...v,
      differs: Object.fromEntries(COMPARED_FIELDS.map(({ key }) => [key, differingKeys.includes(key)])),
      traitRows: v.traits.map(name => ({ name, unique: !shared.has(name.toLowerCase()) })),
    })),
  };
}

/** Label/value rows for a plain choice dialog (used by assignment paths without the step UI, e.g. drag-and-drop). */
export function buildVersionChoices(entry) {
  return buildPublicationComparison(entry).versions.map(v => ({
    id: v.id,
    label: v.label,
    summary: [v.abilities, v.size, v.movement].filter(Boolean).join(' · '),
    languages: v.languages.join(', '),
    traits: v.traits.join(', '),
  }));
}
