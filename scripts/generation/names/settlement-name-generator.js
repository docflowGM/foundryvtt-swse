/**
 * PHASE 8D-2 foundation — procedural settlement-name generator.
 *
 * Same combinatorial contract as the other Phase 8D-2 name generators:
 * small tagged component pools (`data/settlement-name-components.js`)
 * combined at generation time. Unlike planet names (always
 * prefix+suffix), settlements use one of four TEMPLATE shapes so the
 * output varies more naturally ("New Kalar", "Kalhaven", "New
 * Kalhaven", "Kalar" alone) — the template itself is rolled, so a
 * caller with a queued/deterministic RNG can pin an exact shape for
 * testing. This is a GENERATE-tier fact only, never a canonical
 * Location id.
 */

import {
  SETTLEMENT_NAME_PREFIXES,
  SETTLEMENT_NAME_ROOTS,
  SETTLEMENT_NAME_SUFFIXES
} from '../data/settlement-name-components.js';
import { weightedPick, weightedPickWithPreference } from '../lib/weighted-random.js';

/** Settlement name template shapes, in the exact order/weight rolled by `getRandomSettlementName()`. */
export const SETTLEMENT_NAME_TEMPLATE = Object.freeze({
  PREFIX_ROOT: 'prefix-root',
  ROOT_SUFFIX: 'root-suffix',
  PREFIX_ROOT_SUFFIX: 'prefix-root-suffix',
  ROOT_ONLY: 'root-only'
});

const TEMPLATE_ENTRIES = Object.freeze([
  { value: SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT, weight: 3 },
  { value: SETTLEMENT_NAME_TEMPLATE.ROOT_SUFFIX, weight: 4 },
  { value: SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT_SUFFIX, weight: 2 },
  { value: SETTLEMENT_NAME_TEMPLATE.ROOT_ONLY, weight: 1 }
]);

/** Pick a random prefix component entry. */
export function pickSettlementNamePrefix({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(SETTLEMENT_NAME_PREFIXES, { rng, preferTags });
}

/** Pick a random root component entry. */
export function pickSettlementNameRoot({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(SETTLEMENT_NAME_ROOTS, { rng, preferTags });
}

/** Pick a random suffix component entry. */
export function pickSettlementNameSuffix({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(SETTLEMENT_NAME_SUFFIXES, { rng, preferTags });
}

function composeName(template, prefix, root, suffix) {
  const rootValue = root?.value ?? 'Kal';
  switch (template) {
    case SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT:
      return `${prefix?.value ?? 'New'} ${rootValue}`;
    case SETTLEMENT_NAME_TEMPLATE.ROOT_SUFFIX:
      return `${rootValue}${suffix?.value ?? 'town'}`;
    case SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT_SUFFIX:
      return `${prefix?.value ?? 'New'} ${rootValue}${suffix?.value ?? 'town'}`;
    case SETTLEMENT_NAME_TEMPLATE.ROOT_ONLY:
    default:
      return rootValue;
  }
}

/**
 * Generate a full settlement-name draft:
 * `{ name, template, prefix, root, suffix }`. `prefix`/`suffix` are
 * `null` when the rolled template doesn't use that slot.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string[]} [options.preferTags] - soft tone preference shared
 *   by every component roll (e.g. `['military','frontier']`).
 */
export function getRandomSettlementName({ rng, preferTags = [] } = {}) {
  const templateEntry = weightedPick(TEMPLATE_ENTRIES, { rng });
  const template = templateEntry?.value ?? SETTLEMENT_NAME_TEMPLATE.ROOT_SUFFIX;
  const usesPrefix = template === SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT || template === SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT_SUFFIX;
  const usesSuffix = template === SETTLEMENT_NAME_TEMPLATE.ROOT_SUFFIX || template === SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT_SUFFIX;
  const prefix = usesPrefix ? pickSettlementNamePrefix({ rng, preferTags }) : null;
  const root = pickSettlementNameRoot({ rng, preferTags });
  const suffix = usesSuffix ? pickSettlementNameSuffix({ rng, preferTags }) : null;
  return { name: composeName(template, prefix, root, suffix), template, prefix, root, suffix };
}

/**
 * Reroll ONLY the root, preserving the template shape and any
 * prefix/suffix already on the draft.
 */
export function rerollSettlementNameRoot(draft, { rng, preferTags = [] } = {}) {
  const template = draft?.template ?? SETTLEMENT_NAME_TEMPLATE.ROOT_SUFFIX;
  const root = pickSettlementNameRoot({ rng, preferTags });
  return { name: composeName(template, draft?.prefix ?? null, root, draft?.suffix ?? null), template, prefix: draft?.prefix ?? null, root, suffix: draft?.suffix ?? null };
}

/**
 * Reroll ONLY the prefix. A no-op (returns the draft unchanged) if the
 * draft's template doesn't use a prefix slot — rerolling a field the
 * current shape doesn't render would silently do nothing visible,
 * which would be more confusing than declining the reroll.
 */
export function rerollSettlementNamePrefix(draft, { rng, preferTags = [] } = {}) {
  const template = draft?.template ?? SETTLEMENT_NAME_TEMPLATE.ROOT_SUFFIX;
  const usesPrefix = template === SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT || template === SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT_SUFFIX;
  if (!usesPrefix) return draft;
  const prefix = pickSettlementNamePrefix({ rng, preferTags });
  return { name: composeName(template, prefix, draft?.root ?? null, draft?.suffix ?? null), template, prefix, root: draft?.root ?? null, suffix: draft?.suffix ?? null };
}

/** Reroll ONLY the suffix. Mirrors `rerollSettlementNamePrefix()`. */
export function rerollSettlementNameSuffix(draft, { rng, preferTags = [] } = {}) {
  const template = draft?.template ?? SETTLEMENT_NAME_TEMPLATE.ROOT_SUFFIX;
  const usesSuffix = template === SETTLEMENT_NAME_TEMPLATE.ROOT_SUFFIX || template === SETTLEMENT_NAME_TEMPLATE.PREFIX_ROOT_SUFFIX;
  if (!usesSuffix) return draft;
  const suffix = pickSettlementNameSuffix({ rng, preferTags });
  return { name: composeName(template, draft?.prefix ?? null, draft?.root ?? null, suffix), template, prefix: draft?.prefix ?? null, root: draft?.root ?? null, suffix };
}
