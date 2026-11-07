/**
 * Droid installation eligibility (Gate C-2) -- PURE.
 *
 * A valid price is not permission to install. This module answers ONE
 * question from already-established facts and invents nothing:
 *
 *   status ELIGIBLE  every gate below is established and clear
 *          BLOCKED   at least one established gate fails (reasons say which)
 *          UNKNOWN   the facts needed to decide were not supplied
 *
 * Gates (each independent; a numeric quote can be OK while the rest block):
 *   SOURCE_REVIEW_HOLD     component identity has no published-source clearance
 *   PREREQUISITES_UNMET    a typed Gate A prerequisite (size / locomotion /
 *                          required systems / appendage host) is not met by
 *                          CONFIRMED evidence
 *   QUOTE_UNRESOLVED       the price/mass is not an exact certified number
 *   HOST_RULING_PENDING    the component's physical host is not established
 *                          by a published source or an owner ruling
 *   (caller-supplied)      already-established engine restrictions, e.g. a
 *                          primary processor is already installed
 *
 * It does not price, does not read actors, and never converts an unresolved
 * fact into a permit. Unresolved physical hosts are listed by id in a Map
 * built from pairs (an unresolved-decision index, not a rules table).
 */

export const ELIGIBILITY = Object.freeze({ ELIGIBLE: 'ELIGIBLE', BLOCKED: 'BLOCKED', UNKNOWN: 'UNKNOWN' });

const UNRESOLVED_HOSTS = new Map([
  ['telescopic-appendage', { decisionId: 'DROID-RD-002', message: 'Which appendages Telescopic Appendage may be fitted to is an unresolved rules decision (DROID-RD-002).' }],
  ['micro-shield', { decisionId: 'SGD-HOST-002', message: 'Micro Shield\'s physical host (handheld/possessed or installed) is source-undetermined (SGD-HOST-002).' }],
  ['silence-bubble-generator', { decisionId: 'SGD-HOST-002', message: 'Silence-Bubble Generator\'s physical host is source-undetermined (SGD-HOST-002).' }]
]);

const stripPrefix = id => String(id ?? '').trim().toLowerCase().replace(/^droid-/, '');

/** The pending host decision for a component id, or null. */
export function unresolvedHostRequirement(componentId) {
  return UNRESOLVED_HOSTS.get(stripPrefix(componentId)) ?? null;
}

/**
 * @param {object} input
 * @param {string} input.componentId
 * @param {{sourceReview?:string, prerequisites?:string, numeric?:string}|null} input.stages
 *        from resolveSourceReviewedDroidQuoteStaged (null/absent => UNKNOWN)
 * @param {{status?:string, credits?:number|null, kg?:number|null, blockingReason?:string|null}} [input.quote]
 * @param {Array<{code:string, message:string}>} [input.restrictions]  established engine restrictions
 * @returns {{status:string, installable:boolean, reasons:object[], quote:object}}
 */
export function evaluateInstallationEligibility({ componentId, stages = null, quote = null, restrictions = [] } = {}) {
  const reasons = [];
  const q = {
    status: quote?.status ?? null,
    credits: Number.isFinite(quote?.credits) ? quote.credits : null,
    kg: Number.isFinite(quote?.kg) ? quote.kg : null
  };

  if (!stages || typeof stages !== 'object') {
    return { status: ELIGIBILITY.UNKNOWN, installable: false, quote: q, reasons: [{ code: 'FACTS_NOT_SUPPLIED', message: 'Source, prerequisite and quote stages were not established.' }] };
  }

  if (stages.sourceReview !== 'PASS') {
    reasons.push({ code: 'SOURCE_REVIEW_HOLD', message: quote?.blockingReason || 'No published-source clearance for this component.' });
  } else if (stages.prerequisites !== 'MET') {
    reasons.push({ code: 'PREREQUISITES_UNMET', message: quote?.blockingReason || 'A published prerequisite is not met by confirmed installed hardware.' });
  } else if (stages.numeric !== 'OK') {
    reasons.push({ code: 'QUOTE_UNRESOLVED', message: quote?.blockingReason || 'The published price or mass is not an exact certified number.' });
  }

  const pending = unresolvedHostRequirement(componentId);
  if (pending) reasons.push({ code: 'HOST_RULING_PENDING', decisionId: pending.decisionId, message: pending.message });

  for (const restriction of Array.isArray(restrictions) ? restrictions : []) {
    if (restriction?.code) reasons.push({ code: restriction.code, message: String(restriction.message ?? restriction.code) });
  }

  const status = reasons.length ? ELIGIBILITY.BLOCKED : ELIGIBILITY.ELIGIBLE;
  return { status, installable: status === ELIGIBILITY.ELIGIBLE, quote: q, reasons };
}
