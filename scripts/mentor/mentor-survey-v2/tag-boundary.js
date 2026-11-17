/**
 * Mentor Survey V2: typed, INERT answer-to-intent mapping boundary.
 *
 * Answer-to-tag mapping is reserved for a later, separate project. Until a certified crosswalk exists, every
 * response maps to "unmapped": no ontology tags, no weights, no mechanical signal, no scoring. Surveys must complete,
 * skip and revisit without ever producing a mechanical signal.
 *
 * To integrate later, supply a certified implementation via `setCertifiedMapper` from the integration project; survey
 * definitions and ledger events do not change (they only ever carry stable response ids).
 */

export const MAPPING_STATUS = Object.freeze({ UNMAPPED: 'unmapped', MAPPED: 'mapped' });

let certifiedMapper = null;

/** @returns {{status:'unmapped'}|{status:'mapped', intent: object}} */
export function mapResponseToIntent(responseRecord, context = {}) {
  if (typeof certifiedMapper === 'function') {
    const out = certifiedMapper(responseRecord, context);
    if (out && out.status === MAPPING_STATUS.MAPPED) return out;
  }
  return { status: MAPPING_STATUS.UNMAPPED };
}

/** Reserved for the future integration project. Must be given a certified, owner-approved crosswalk. */
export function setCertifiedMapper(fn) {
  certifiedMapper = typeof fn === 'function' ? fn : null;
}

/** Test hook: restore the inert default. */
export function resetTagBoundary() {
  certifiedMapper = null;
}
