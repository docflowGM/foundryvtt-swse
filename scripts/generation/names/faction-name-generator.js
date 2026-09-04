/**
 * PHASE 8D-2 foundation — procedural faction-name generator.
 *
 * Reuses `organization-metadata.js`'s existing `ORGANIZATION_FAMILY`
 * taxonomy verbatim (never a second family enum) to pick a
 * family-appropriate organization-type noun ("Syndicate" for
 * crime-syndicate, "Directorate" for government-bureaucracy, ...),
 * combined with a shared root-name pool and an optional adjective
 * descriptor. Same rolled-template contract as
 * `settlement-name-generator.js`: whether a descriptor is present is
 * itself a weighted roll (`FACTION_NAME_TEMPLATE`), so a caller with a
 * queued/deterministic RNG can pin an exact shape for testing. A
 * generated faction NAME is a GENERATE-tier narrative fact only — it
 * never implies a canonical Faction record; committing one still goes
 * through `FactionRegistryService` exactly as `faction-draft.js`
 * already documents.
 */

import { ORGANIZATION_FAMILY } from '../organization-metadata.js';
import {
  FACTION_NAME_ROOTS,
  FACTION_NAME_DESCRIPTORS,
  FACTION_TYPE_NOUNS_BY_FAMILY
} from '../data/faction-name-components.js';
import { pickRandom, weightedPick, weightedPickWithPreference } from '../lib/weighted-random.js';

const ALL_FAMILIES = Object.freeze(Object.values(ORGANIZATION_FAMILY));

/** Faction-name descriptor-presence template shapes, rolled by `getRandomFactionName()`. */
export const FACTION_NAME_TEMPLATE = Object.freeze({
  WITH_DESCRIPTOR: 'with-descriptor',
  WITHOUT_DESCRIPTOR: 'without-descriptor'
});

const TEMPLATE_ENTRIES = Object.freeze([
  { value: FACTION_NAME_TEMPLATE.WITH_DESCRIPTOR, weight: 2 },
  { value: FACTION_NAME_TEMPLATE.WITHOUT_DESCRIPTOR, weight: 3 }
]);

/** Resolve a valid family id, falling back to a uniform random family for an unknown/omitted one. */
function resolveFamily(family, { rng } = {}) {
  return ALL_FAMILIES.includes(family) ? family : pickRandom(ALL_FAMILIES, { rng });
}

function typeNounPoolFor(family) {
  return FACTION_TYPE_NOUNS_BY_FAMILY[family] || FACTION_TYPE_NOUNS_BY_FAMILY[ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL];
}

/** Pick a random descriptor entry. */
export function pickFactionNameDescriptor({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(FACTION_NAME_DESCRIPTORS, { rng, preferTags });
}

/** Pick a random root-name entry. */
export function pickFactionNameRoot({ rng } = {}) {
  return weightedPickWithPreference(FACTION_NAME_ROOTS, { rng });
}

/** Pick a random family-appropriate organization-type noun. Falls back to `business-professional`'s pool for an unrecognized family. */
export function pickFactionNameTypeNoun(family, { rng } = {}) {
  return weightedPick(typeNounPoolFor(family), { rng });
}

function composeName(template, descriptor, root, typeNoun) {
  const rootValue = root?.value ?? 'Kestral';
  const typeValue = typeNoun?.value ?? 'Syndicate';
  const prefix = template === FACTION_NAME_TEMPLATE.WITH_DESCRIPTOR && descriptor ? `${descriptor.value} ` : '';
  return `${prefix}${rootValue} ${typeValue}`;
}

/**
 * Generate a full faction-name draft:
 * `{ name, family, template, descriptor, root, typeNoun }`. `descriptor`
 * is `null` when the rolled template omits it.
 *
 * @param {object} [options]
 * @param {string} [options.family] - an `ORGANIZATION_FAMILY` value;
 *   an unrecognized/omitted family rolls a uniform random one (recorded
 *   on the returned draft so a caller always knows which family's noun
 *   pool was actually used).
 * @param {() => number} [options.rng]
 * @param {string[]} [options.preferTags] - soft tone preference for the descriptor roll only.
 */
export function getRandomFactionName({ family, rng, preferTags = [] } = {}) {
  const resolvedFamily = resolveFamily(family, { rng });
  const templateEntry = weightedPick(TEMPLATE_ENTRIES, { rng });
  const template = templateEntry?.value ?? FACTION_NAME_TEMPLATE.WITHOUT_DESCRIPTOR;
  const descriptor = template === FACTION_NAME_TEMPLATE.WITH_DESCRIPTOR ? pickFactionNameDescriptor({ rng, preferTags }) : null;
  const root = pickFactionNameRoot({ rng });
  const typeNoun = pickFactionNameTypeNoun(resolvedFamily, { rng });
  return { name: composeName(template, descriptor, root, typeNoun), family: resolvedFamily, template, descriptor, root, typeNoun };
}

/** Reroll ONLY the root, preserving family/template/descriptor/typeNoun. */
export function rerollFactionNameRoot(draft, { rng } = {}) {
  const root = pickFactionNameRoot({ rng });
  return { ...draft, root, name: composeName(draft?.template, draft?.descriptor ?? null, root, draft?.typeNoun ?? null) };
}

/** Reroll ONLY the type noun (still scoped to the draft's own family), preserving everything else. */
export function rerollFactionNameTypeNoun(draft, { rng } = {}) {
  const typeNoun = pickFactionNameTypeNoun(draft?.family, { rng });
  return { ...draft, typeNoun, name: composeName(draft?.template, draft?.descriptor ?? null, draft?.root ?? null, typeNoun) };
}

/**
 * Reroll ONLY the descriptor. A no-op (returns the draft unchanged) if
 * the draft's template doesn't use a descriptor slot — matches
 * `settlement-name-generator.js`'s same reroll-declines-silently
 * convention for a field the current shape doesn't render.
 */
export function rerollFactionNameDescriptor(draft, { rng, preferTags = [] } = {}) {
  if (draft?.template !== FACTION_NAME_TEMPLATE.WITH_DESCRIPTOR) return draft;
  const descriptor = pickFactionNameDescriptor({ rng, preferTags });
  return { ...draft, descriptor, name: composeName(draft.template, descriptor, draft?.root ?? null, draft?.typeNoun ?? null) };
}
