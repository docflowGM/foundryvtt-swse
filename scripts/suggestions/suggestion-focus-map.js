/**
 * Suggestion Focus → Reason Domain Visibility Map
 *
 * This file declares which reason domains are relevant to each progression focus.
 * When a progression step requests suggestions with a specific focus,
 * the suggestion engine filters returned reasons to only those domains.
 *
 * Key principle:
 * - Does NOT generate reasons
 * - Does NOT change scoring logic
 * - Only gates visibility of reason domains
 *
 * If focus is undefined, all reason domains are shown (backward compatible).
 */

export const SUGGESTION_FOCUS_REASON_DOMAINS = {
  // "What skills should I train?"
  // Show reasons related to: attributes enabling the skill, class requirements, already trained skills, synergies
  skills: [
    'attributes',
    'class',
    'trained_skills',
    'synergy'
  ],

  // "Which talents fit my build?"
  // Show reasons related to: class prerequisites, level requirements, prerequisites
  talents: [
    'class',
    'level',
    'prerequisites'
  ],

  // "What feats should I select?"
  // Show reasons related to: ability requirements, BAB progression, skill synergies
  feats: [
    'attributes',
    'bab',
    'trained_skills'
  ],

  // "Which class should I take?"
  // Show reasons related to: ability alignment, previous class lock-in, role alignment
  classes: [
    'attributes',
    'previous_class',
    'role_alignment'
  ],

  // "Should I increase this ability?"
  // Show reasons related to: class alignment, role requirements
  attributes: [
    'class',
    'role_alignment'
  ]
};

/**
 * Get the allowed reason domains for a given focus
 * @param {string} focus - The progression focus ("skills", "feats", etc.)
 * @returns {Array|null} Array of allowed domain strings, or null if focus is undefined
 */
export function getAllowedReasonDomains(focus) {
  if (!focus) {return null;}
  return SUGGESTION_FOCUS_REASON_DOMAINS[focus] ?? null;
}

/**
 * Check if a reason domain is visible for a given focus
 * @param {string} focus - The progression focus
 * @param {string} domain - The reason domain to check
 * @returns {boolean} True if domain should be visible, false otherwise
 */
export function isReasonDomainAllowed(focus, domain) {
  if (!focus) {return true;} // No focus means show all
  const allowed = SUGGESTION_FOCUS_REASON_DOMAINS[focus];
  if (!allowed) {return false;} // Unknown focus means show nothing
  return allowed.includes(domain);
}
