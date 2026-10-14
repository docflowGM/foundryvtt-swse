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

import { listMissingSnapshotFields } from './species-variant-profile.js';

export const PUBLICATION_SELECTION_ERRORS = Object.freeze({
  NO_VERSION_SELECTED: 'NO_VERSION_SELECTED',
  INVALID_VERSION: 'INVALID_VERSION',
  UNAVAILABLE_VERSION: 'UNAVAILABLE_VERSION',       // a verified version exists but its data is malformed
  NO_IMPLEMENTED_VERSION: 'NO_IMPLEMENTED_VERSION', // publications are known but none is implementable yet
});

/** How many publications of a species are known, and how many of them can actually be selected. */
export const PUBLICATION_STATUS = Object.freeze({
  SINGLE_PROFILE: 'SINGLE_PROFILE',                                   // one canonical profile: no extra selection
  MULTIPLE_VERIFIED: 'MULTIPLE_VERIFIED',                             // every known publication is a usable verified version
  MULTIPLE_PARTIALLY_IMPLEMENTED: 'MULTIPLE_PARTIALLY_IMPLEMENTED',   // some known publications are not implementable yet
  MULTIPLE_NOT_IMPLEMENTED: 'MULTIPLE_NOT_IMPLEMENTED',               // several are known, none is implementable: selection blocked
});

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = { str: 'Str', dex: 'Dex', con: 'Con', int: 'Int', wis: 'Wis', cha: 'Cha' };

/** Verified publication versions of a species: its complete-snapshot variants (usable or not). */
export function getPublicationVersions(entry) {
  return (Array.isArray(entry?.variants) ? entry.variants : []).filter(variant => variant?.completeSnapshot === true);
}

/** A verified version whose data is well-formed enough to apply. A malformed one is never silently replaced by base data. */
export function isUsablePublicationVersion(variant) {
  return variant?.completeSnapshot === true && listMissingSnapshotFields(variant).length === 0;
}

/** Audited publications recorded for the species that are known but not hydrated (e.g. held for natural weapons). */
export function getKnownPublications(entry) {
  return Array.isArray(entry?.knownPublications) ? entry.knownPublications : [];
}

/**
 * Distinguish: one canonical profile; several verified profiles; several known publications of which only some
 * (or none) are implementable. Absence of hydrated snapshots is NOT evidence of a single publication.
 */
export function getPublicationStatus(entry) {
  const verified = getPublicationVersions(entry);
  const usable = verified.filter(isUsablePublicationVersion);
  const known = Math.max(verified.length, getKnownPublications(entry).length);
  if (known < 2) return PUBLICATION_STATUS.SINGLE_PROFILE;
  if (usable.length === 0) return PUBLICATION_STATUS.MULTIPLE_NOT_IMPLEMENTED;
  return usable.length === known ? PUBLICATION_STATUS.MULTIPLE_VERIFIED : PUBLICATION_STATUS.MULTIPLE_PARTIALLY_IMPLEMENTED;
}

/**
 * The one verified profile of a species that is published exactly once (no other known publication, no legacy
 * variants offered next to it). It is that species' canonical profile, so it applies without a selection: there is
 * nothing to choose between, and nothing from the legacy base record is inherited. Returns null otherwise.
 */
export function getSoleSnapshotVersion(entry) {
  if (getPublicationStatus(entry) !== PUBLICATION_STATUS.SINGLE_PROFILE) return null;
  const variants = Array.isArray(entry?.variants) ? entry.variants : [];
  const verified = getPublicationVersions(entry);
  if (verified.length !== 1 || variants.length !== 1) return null;
  return verified[0];
}

/** A species requires an explicit publication choice whenever several publications are known. */
export function requiresPublicationSelection(entry) {
  return getPublicationStatus(entry) !== PUBLICATION_STATUS.SINGLE_PROFILE;
}

/**
 * Validate a (possibly absent) variant selection for a species making a NEW selection.
 * @returns {{required: boolean, ok: boolean, code: string|null, version: object|null, status: string}}
 */
export function checkPublicationSelection(entry, variantId) {
  const status = getPublicationStatus(entry);
  const required = status !== PUBLICATION_STATUS.SINGLE_PROFILE;
  if (!required) return { required, ok: true, code: null, version: null, status };
  if (status === PUBLICATION_STATUS.MULTIPLE_NOT_IMPLEMENTED) {
    return { required, ok: false, code: PUBLICATION_SELECTION_ERRORS.NO_IMPLEMENTED_VERSION, version: null, status };
  }
  const id = variantId == null || variantId === '' || variantId === 'default' ? null : String(variantId);
  if (!id) return { required, ok: false, code: PUBLICATION_SELECTION_ERRORS.NO_VERSION_SELECTED, version: null, status };
  const version = getPublicationVersions(entry).find(v => String(v.id) === id) ?? null;
  if (!version) return { required, ok: false, code: PUBLICATION_SELECTION_ERRORS.INVALID_VERSION, version: null, status };
  if (!isUsablePublicationVersion(version)) {
    return { required, ok: false, code: PUBLICATION_SELECTION_ERRORS.UNAVAILABLE_VERSION, version, status };
  }
  return { required, ok: true, code: null, version, status };
}

const recordedSpeciesName = actor => String(actor?.system?.species?.name ?? actor?.system?.species ?? actor?.system?.race ?? '').trim().toLowerCase();
const recordedVariantId = actor => actor?.system?.speciesVariant?.id ?? actor?.flags?.swse?.speciesVariant?.id ?? null;
const normalizeVariantId = id => (id == null || id === '' || id === 'default' ? null : String(id));

/**
 * Evidence that a request merely RESTORES an existing actor's recorded species configuration, as opposed to a new
 * or reassigned selection. Derived from the actor itself, never from a caller-supplied flag: the actor must already
 * record this very species and this very variant (or, for the legacy base record, no variant). A newly created or
 * reassigned character never satisfies this, so it cannot bypass the explicit publication choice.
 */
export function isRecordedConfigurationRestore(actor, entry, variantId) {
  if (!actor || !entry?.name) return false;
  if (recordedSpeciesName(actor) !== String(entry.name).trim().toLowerCase()) return false;
  return normalizeVariantId(recordedVariantId(actor)) === normalizeVariantId(variantId);
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

const norm = text => String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const stable = value => JSON.stringify(value, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'id').sort(([a], [b]) => a.localeCompare(b)))
  : v));

/** Trait objects (name, description, structured rules) of a version; bare-name entries carry no description. */
function traitDetails(version) {
  const list = Array.isArray(version?.traits) && version.traits.length ? version.traits : (version?.special ?? []);
  return (Array.isArray(list) ? list : []).map(t => (typeof t === 'string'
    ? { name: t.trim(), description: '', rules: null }
    : { name: String(t?.name ?? '').trim(), description: String(t?.description ?? ''), rules: Array.isArray(t?.rules) && t.rules.length ? t.rules : null }))
    .filter(t => t.name);
}

/**
 * Same-named traits are not assumed identical across publications. Compare the structured rules when both
 * publications carry them; otherwise compare the source-specific descriptions. Prose alone is never proof that
 * mechanics differ, so a description-only difference is reported as 'wording' (mechanics not machine-comparable).
 * @returns {'rules'|'wording'|null}
 */
export function compareTraitMechanics(a, b) {
  if (a.rules && b.rules) return stable(a.rules) === stable(b.rules) ? (norm(a.description) === norm(b.description) ? null : 'wording') : 'rules';
  if (a.rules || b.rules) return 'rules';
  return norm(a.description) === norm(b.description) ? null : 'wording';
}

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
    traitDetails: traitDetails(version),
    description: version.description || '',
    unavailable: !isUsablePublicationVersion(version),
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
  const required = requiresPublicationSelection(entry);
  if (versions.length < 2) return { required, versions, differingFields: [] };

  const differingKeys = COMPARED_FIELDS.filter(({ key }) => versions.some(v => !sameValue(v[key], versions[0][key]))).map(f => f.key);
  const traitSets = versions.map(v => new Set(v.traits.map(t => t.toLowerCase())));
  const shared = new Set([...traitSets[0]].filter(t => traitSets.every(set => set.has(t))));
  const differenceFor = (version, trait) => {
    const kinds = versions.filter(o => o !== version)
      .map(o => o.traitDetails.find(t => t.name.toLowerCase() === trait.name.toLowerCase()))
      .filter(Boolean).map(other => compareTraitMechanics(trait, other)).filter(Boolean);
    return kinds.includes('rules') ? 'rules' : (kinds.includes('wording') ? 'wording' : null);
  };

  return {
    required: true,
    differingFields: COMPARED_FIELDS.filter(f => differingKeys.includes(f.key)).map(f => f.label),
    versions: versions.map(v => ({
      ...v,
      differs: Object.fromEntries(COMPARED_FIELDS.map(({ key }) => [key, differingKeys.includes(key)])),
      traitRows: v.traitDetails.map(t => ({
        name: t.name,
        unique: !shared.has(t.name.toLowerCase()),
        // Same name in every publication, but the printed text/rules differ between them.
        differsBy: shared.has(t.name.toLowerCase()) ? differenceFor(v, t) : null,
        description: t.description,
      })),
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
