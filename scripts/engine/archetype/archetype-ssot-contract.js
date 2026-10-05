/**
 * Archetype SSOT contract (Phase 12A)
 *
 * Pure, dependency-free description of the class-independent archetype
 * dataset at data/archetypes.json plus the one validator for it. No Foundry
 * globals and no absolute-path imports, so the same module is used by
 * ArchetypeRegistry at runtime, by tools/build-archetype-phase-12a-runtime-ssot.mjs,
 * and by tests.
 *
 * Authority order: exact canonical identity > primary semantic tags >
 * supporting semantic tags > class/access route context > narrative taxonomy.
 * Parentage is organizational only and never implies mechanical inheritance.
 *
 * This module defines no scoring weights.
 */

export const ARCHETYPE_SSOT_PATH = 'data/archetypes.json';
export const ARCHETYPE_SSOT_SCHEMA_VERSION = 2;

export const EXPECTED_COUNTS = Object.freeze({ records: 297, parents: 97, specializations: 200 });

/**
 * Phase-11-only semantic shorthand. NOT members of the frozen Phase 3 ontology.
 * Removed from the semantic lane; exact/typed evidence stays authoritative.
 */
export const PHASE11_ONLY_TAGS = Object.freeze([
  'ability_cha', 'ability_con', 'ability_dex', 'ability_int', 'ability_str', 'ability_wis',
  'accuracy', 'advanced_melee', 'area_damage', 'fieldcraft', 'finesse', 'hacking',
  'lightsaber_form', 'rifle', 'starship'
]);

/** Synthetic Phase 11 form-power ids -> ForceRegistry identity (normalized power-name slug). */
export const FORM_POWER_ID_CORRECTIONS = Object.freeze({
  'lightsaber-form-power-assured-strike': 'assured-strike',
  'lightsaber-form-power-barrier-of-blades': 'barrier-of-blades',
  'lightsaber-form-power-circle-of-shelter': 'circle-of-shelter',
  'lightsaber-form-power-deflecting-slash': 'deflecting-slash',
  'lightsaber-form-power-draw-closer': 'draw-closer',
  'lightsaber-form-power-falling-avalanche': 'falling-avalanche',
  'lightsaber-form-power-fluid-riposte': 'fluid-riposte',
  'lightsaber-form-power-hawk-bat-swoop': 'hawk-bat-swoop',
  'lightsaber-form-power-pass-the-blade': 'pass-the-blade',
  'lightsaber-form-power-saber-swarm': 'saber-swarm',
  'lightsaber-form-power-shien-deflection': 'shien-deflection',
  'lightsaber-form-power-vornskr-s-ferocity': 'vornskrs-ferocity'
});

/** Exact-reference domains and the baseline Phase 12A must preserve. */
export const EXACT_REF_BASELINE = Object.freeze({
  foundationClasses: 5,
  prestigeAndApexClasses: 32,
  skills: 25,
  talentTrees: 126,
  talents: 292,
  feats: 66,
  species: 58,
  backgrounds: 80,
  forcePowers: 63
});

const SKILL_BRIDGE_FIELDS = ['signatureSkillBridges', 'supportingSkillBridges', 'homebrewSkillBridges'];
const TIERS = ['signature', 'supporting'];

function uniqSorted(values) {
  return [...new Set(values)].sort();
}

/**
 * Collect every exact reference of one record by domain, from the typed
 * mechanics block (the authoritative location). Output is sorted and unique.
 */
export function collectExactRefs(record) {
  const m = record?.mechanics ?? {};
  const tiers = (block) => TIERS.flatMap((t) => block?.[t] ?? []);
  const bg = m.backgrounds ?? {};
  return {
    foundationClasses: uniqSorted(m.classes?.foundation ?? []),
    prestigeAndApexClasses: uniqSorted([...(m.classes?.prestige ?? []), ...(m.classes?.apex ?? [])]),
    skills: uniqSorted(tiers(m.skills)),
    talentTrees: uniqSorted(tiers(m.talentTrees)),
    talents: uniqSorted(tiers(m.talents)),
    feats: uniqSorted(tiers(m.feats)),
    species: uniqSorted(['required', 'iconic', 'supporting'].flatMap((k) => m.species?.[k] ?? [])),
    backgrounds: uniqSorted(
      SKILL_BRIDGE_FIELDS.flatMap((f) => Object.values(bg[f] ?? {}).flat())
    ),
    forcePowers: uniqSorted(tiers(m.force?.powers))
  };
}

/** Union of exact refs across a dataset: { domain: sorted unique[] }. */
export function collectDatasetExactRefs(archetypes) {
  const acc = {};
  for (const domain of Object.keys(EXACT_REF_BASELINE)) acc[domain] = new Set();
  for (const record of archetypes) {
    const refs = collectExactRefs(record);
    for (const [domain, list] of Object.entries(refs)) list.forEach((r) => acc[domain].add(r));
  }
  return Object.fromEntries(Object.entries(acc).map(([d, s]) => [d, [...s].sort()]));
}

/**
 * Validate a data/archetypes.json payload.
 *
 * @param {object} dataset - parsed JSON ({ _meta, archetypes })
 * @param {object} [authorities] - optional exact-ref authorities. Any domain
 *   may be omitted (it is then reported as unchecked, never as resolved).
 *   { ontologyTags: Set|{has}, foundationClasses, prestigeClasses, skills,
 *     talentTrees, talents, feats, species, backgrounds, forcePowers }
 *   Each value needs a `has(ref)` method. Resolution is exact; no fuzzy match.
 * @returns {{valid:boolean, errors:string[], counts:object, refs:object}}
 */
export function validateArchetypeDataset(dataset, authorities = {}) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  const map = dataset?.archetypes;

  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return { valid: false, errors: ['dataset.archetypes must be an object keyed by archetype id'], counts: {}, refs: {} };
  }

  const entries = Object.entries(map);
  const records = entries.map(([, r]) => r);
  const parents = records.filter((r) => r.kind === 'parent');
  const specs = records.filter((r) => r.kind === 'specialization');
  const counts = { records: records.length, parents: parents.length, specializations: specs.length };

  if (counts.records !== EXPECTED_COUNTS.records) err(`record count ${counts.records} != ${EXPECTED_COUNTS.records}`);
  if (counts.parents !== EXPECTED_COUNTS.parents) err(`parent count ${counts.parents} != ${EXPECTED_COUNTS.parents}`);
  if (counts.specializations !== EXPECTED_COUNTS.specializations) {
    err(`specialization count ${counts.specializations} != ${EXPECTED_COUNTS.specializations}`);
  }
  if (dataset._meta?.schemaVersion !== ARCHETYPE_SSOT_SCHEMA_VERSION) {
    err(`_meta.schemaVersion must be ${ARCHETYPE_SSOT_SCHEMA_VERSION}`);
  }

  const ids = new Set();
  const ID_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
  const ontology = authorities.ontologyTags;
  const legacy = new Set(PHASE11_ONLY_TAGS);

  for (const [key, r] of entries) {
    const where = `archetype "${key}"`;
    if (r.id !== key) err(`${where}: id "${r.id}" does not match its key`);
    if (ids.has(r.id)) err(`${where}: duplicate id`);
    ids.add(r.id);
    if (!ID_RE.test(String(r.id))) err(`${where}: id is not a stable snake_case identity`);
    if ('baseClassId' in r) err(`${where}: class-owned identity field baseClassId is not allowed`);
    if (r.kind !== 'parent' && r.kind !== 'specialization') err(`${where}: invalid kind "${r.kind}"`);

    // Parent graph (organizational only).
    if (r.kind === 'parent') {
      if (r.parentId != null) err(`${where}: parent record must not have a parentId`);
    } else if (r.kind === 'specialization') {
      if (typeof r.parentId !== 'string') err(`${where}: specialization must have exactly one string parentId`);
      else if (r.parentId === r.id) err(`${where}: parentId references itself`);
      else if (map[r.parentId]?.kind !== 'parent') err(`${where}: parentId "${r.parentId}" does not resolve to a parent record`);
    }
    if (r.metadata?.taxonomy?.parentId !== undefined && (r.metadata.taxonomy.parentId ?? null) !== (r.parentId ?? null)) {
      err(`${where}: metadata.taxonomy.parentId disagrees with parentId`);
    }

    // Semantic lane.
    const tags = r.metadata?.tags;
    if (!tags) { err(`${where}: missing metadata.tags`); continue; }
    const primary = tags.primary ?? [];
    const supporting = tags.supporting ?? [];
    const all = tags.all ?? [];
    for (const t of [...primary, ...supporting, ...all]) {
      if (legacy.has(t)) err(`${where}: Phase-11-only tag "${t}" present in semantic lane`);
      else if (ontology && !ontology.has(t)) err(`${where}: tag "${t}" is not in the frozen ontology`);
    }
    const collide = primary.filter((t) => supporting.includes(t));
    if (collide.length) err(`${where}: primary/supporting collision [${collide.join(', ')}]`);
    if (primary.length === 0) err(`${where}: no canonical primary tag`);
    if (JSON.stringify(uniqSorted([...primary, ...supporting])) !== JSON.stringify(uniqSorted(all))) {
      err(`${where}: metadata.tags.all is not primary ∪ supporting`);
    }
    for (const [lane, values] of Object.entries(r.metadata?.tagProvenance ?? {})) {
      for (const t of values) if (legacy.has(t)) err(`${where}: Phase-11-only tag "${t}" in tagProvenance.${lane}`);
    }

    // metadata.exactRefs must mirror the typed mechanics block.
    const typed = collectExactRefs(r);
    const mirrored = r.metadata?.exactRefs;
    if (mirrored) {
      const same = (a, b) => JSON.stringify(uniqSorted(a)) === JSON.stringify(uniqSorted(b));
      const mt = (block) => TIERS.flatMap((t) => block?.[t] ?? []);
      if (!same(mirrored.classes?.foundation ?? [], typed.foundationClasses)) err(`${where}: exactRefs.classes.foundation disagrees with mechanics`);
      if (!same([...(mirrored.classes?.prestige ?? []), ...(mirrored.classes?.apex ?? [])], typed.prestigeAndApexClasses)) err(`${where}: exactRefs prestige/apex disagrees with mechanics`);
      if (!same(mt(mirrored.skills), typed.skills)) err(`${where}: exactRefs.skills disagrees with mechanics`);
      if (!same(mt(mirrored.talentTrees), typed.talentTrees)) err(`${where}: exactRefs.talentTrees disagrees with mechanics`);
      if (!same(mt(mirrored.talents), typed.talents)) err(`${where}: exactRefs.talents disagrees with mechanics`);
      if (!same(mt(mirrored.feats), typed.feats)) err(`${where}: exactRefs.feats disagrees with mechanics`);
      if (!same(mt(mirrored.forcePowers), typed.forcePowers)) err(`${where}: exactRefs.forcePowers disagrees with mechanics`);
    }
  }

  // Exact-reference resolution (exact match only).
  const datasetRefs = collectDatasetExactRefs(records);
  const authorityFor = {
    foundationClasses: authorities.foundationClasses,
    prestigeAndApexClasses: authorities.prestigeClasses,
    skills: authorities.skills,
    talentTrees: authorities.talentTrees,
    talents: authorities.talents,
    feats: authorities.feats,
    species: authorities.species,
    backgrounds: authorities.backgrounds,
    forcePowers: authorities.forcePowers
  };
  const refs = {};
  for (const [domain, list] of Object.entries(datasetRefs)) {
    const authority = authorityFor[domain];
    if (!authority) {
      refs[domain] = { total: list.length, resolved: null, unresolved: [], checked: false };
      continue;
    }
    const unresolved = list.filter((ref) => !authority.has(ref));
    refs[domain] = { total: list.length, resolved: list.length - unresolved.length, unresolved, checked: true };
    for (const ref of unresolved) err(`unresolved ${domain} reference "${ref}"`);
  }

  return { valid: errors.length === 0, errors, counts, refs };
}
