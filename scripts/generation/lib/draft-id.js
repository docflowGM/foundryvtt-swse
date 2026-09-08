/**
 * PHASE 8D-2 foundation — shared draft-id helper + dependency-seam
 * investigation conclusion.
 *
 * `location-draft.js` (Phase 8D-1) already established the pattern: a
 * locally-unique, DOMAIN-NAMESPACED id (`draft:location:<hex>`) that
 * can never be confused with a real canonical record id, meaningful
 * only within one generation batch via `parentDraftId`-style
 * references, never written to a canonical record. This module
 * generalizes that ONE small piece — the id-minting function — so every
 * new domain (Faction, NPC, Job, POI, ...) uses the identical
 * `draft:<domain>:<hex>` shape instead of each domain reinventing its
 * own local `newDraftId()` (as `location-draft.js` did before this
 * module existed).
 *
 * INVESTIGATION CONCLUSION (Phase 8D-2 spec §7): the wider addendum
 * asked whether a generic `draftRef`/`{refType, entityType, id}`
 * wrapper shape is worth introducing. Conclusion: NO — the existing
 * specialized pattern (a domain-namespaced string id, cross-referenced
 * via a plain `parentDraftId`-style field whose meaning is
 * domain-specific and already documented at each use site) is
 * sufficient and clearer. A generic wrapper would need to either (a)
 * carry the same domain/kind information the namespace prefix already
 * encodes, making it redundant, or (b) become a second parallel
 * addressing scheme callers must translate between. Every domain's
 * dependency needs so far (`location-draft.js`'s planet→POI
 * `parentDraftId`; this phase's Faction→Contact, Job→subject/Location/
 * Faction) are all "this draft belongs to / was generated alongside
 * that other draft," which a plain string id plus a documented field
 * name already expresses without ambiguity. If a genuinely different
 * dependency SHAPE is needed later (e.g. many-to-many, not
 * parent-to-child), it should be solved when that need is concrete,
 * not speculatively now.
 */

import { stableHexId } from '../../utils/stable-id.js';

/**
 * Mint a locally-unique, domain-namespaced draft id:
 * `draft:<domain>:<12-hex>`. Never a canonical id, never persisted to
 * a canonical record — meaningful only for cross-referencing other
 * drafts within the same generation batch (see `location-draft.js`'s
 * `parentDraftId` for the established usage pattern).
 */
export function createDraftId(domain) {
  const clean = String(domain || 'entity').trim().toLowerCase() || 'entity';
  return `draft:${clean}:${stableHexId(`${Date.now()}:${Math.random()}:${clean}`).slice(0, 12)}`;
}

/** True if `value` looks like a draft id (never a canonical id/UUID). */
export function isDraftId(value) {
  return typeof value === 'string' && value.startsWith('draft:');
}

/** Extract the domain segment from a draft id (`draft:location:...` -> `'location'`), or '' if not a draft id. */
export function draftIdDomain(value) {
  if (!isDraftId(value)) return '';
  return value.split(':')[1] || '';
}
