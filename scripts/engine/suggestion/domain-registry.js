/**
 * Domain Registry for Suggestion Engine
 *
 * Single source of truth for suggestion domains used by progression-framework.
 * Distinguishes between supported (implemented) and unsupported (not-yet-implemented) domains.
 *
 * This prevents silent failures and makes domain mismatches immediately visible.
 */

/**
 * Canonical domain identifiers actually implemented in SuggestionEngineCoordinator
 *
 * These domains have real suggestion engines that can return non-empty results.
 * When SuggestionService receives one of these, it routes to the appropriate engine.
 */
export const SUPPORTED_DOMAINS = Object.freeze({
  FEATS: 'feats',
  TALENTS: 'talents',
  CLASSES: 'classes',
  FORCEPOWERS: 'forcepowers',  // NOTE: NOT 'force-powers' with dashes
  BACKGROUNDS: 'backgrounds',
  SKILLS_L1: 'skills_l1',        // NOTE: NOT plain 'skills'
  ATTRIBUTES: 'attributes',
  SPECIES: 'species',             // Phase 2: SpeciesSuggestionEngine (grounded on class synergy)
  LANGUAGES: 'languages',         // Phase 2: LanguageSuggestionEngine (grounded on species/background)
});

/**
 * Domains requested by progression-framework steps that do NOT yet have
 * suggestion engines implemented in SuggestionEngineCoordinator.
 *
 * These will log warnings when requested and degrade to empty suggestion arrays.
 * This is intentional and correct behavior until real engines are added.
 *
 * Note: SPECIES and LANGUAGES have been moved to SUPPORTED_DOMAINS in Phase 2.
 */
export const UNSUPPORTED_DOMAINS = Object.freeze({
  FORCE_SECRETS: 'force-secrets',
  FORCE_TECHNIQUES: 'force-techniques',
  DROID_SYSTEMS: 'droid-systems',
  STARSHIP_MANEUVERS: 'starship-maneuvers',
});

/**
 * Domains that have been DEPRECATED or REPLACED by canonical versions.
 *
 * If a step requests one of these aliases, log a warning and use the canonical form instead.
 * This helps catch domain mismatches during development.
 *
 * NOTE: After Phase 1 fixes, this should be empty. But we keep it as a pattern
 * for catching future naming inconsistencies.
 */
export const DOMAIN_ALIASES = Object.freeze({
  // 'force-powers' → use 'forcepowers' instead
  // 'skills' → use 'skills_l1' instead
});

/**
 * Get the canonical form of a domain string.
 * If the domain is an alias, returns the canonical version.
 * If it's already canonical, returns unchanged.
 *
 * @param {string} domain - Requested domain string
 * @returns {string} Canonical domain identifier
 */
export function getCanonicalDomain(domain) {
  if (!domain) return domain;

  // Check if this is a known alias
  const canonical = DOMAIN_ALIASES[domain];
  if (canonical) {
    return canonical;
  }

  // Otherwise return as-is (could be supported, unsupported, or unknown)
  return domain;
}

/**
 * Check if a domain is currently supported (has a real suggestion engine).
 *
 * @param {string} domain - Domain identifier to check
 * @returns {boolean} true if domain is in SUPPORTED_DOMAINS
 */
export function isSupportedDomain(domain) {
  const canonical = getCanonicalDomain(domain);
  return Object.values(SUPPORTED_DOMAINS).includes(canonical);
}

/**
 * Check if a domain is known but unsupported (planned but not yet implemented).
 *
 * @param {string} domain - Domain identifier to check
 * @returns {boolean} true if domain is in UNSUPPORTED_DOMAINS
 */
export function isUnsupportedDomain(domain) {
  const canonical = getCanonicalDomain(domain);
  return Object.values(UNSUPPORTED_DOMAINS).includes(canonical);
}

/**
 * Classify a domain's support status for logging and decision-making.
 *
 * @param {string} domain - Domain identifier to classify
 * @returns {string} One of: 'supported', 'unsupported', 'unknown'
 */
export function classifyDomain(domain) {
  const canonical = getCanonicalDomain(domain);

  if (isSupportedDomain(canonical)) {
    return 'supported';
  }

  if (isUnsupportedDomain(canonical)) {
    return 'unsupported';
  }

  return 'unknown';
}

/**
 * Get a human-readable list of supported domains for error messages.
 *
 * @returns {string} Comma-separated list of canonical domain IDs
 */
export function getSupportedDomainsList() {
  return Object.values(SUPPORTED_DOMAINS).sort().join(', ');
}

/**
 * Get a human-readable list of unsupported domains for error messages.
 *
 * @returns {string} Comma-separated list of unsupported domain IDs
 */
export function getUnsupportedDomainsList() {
  return Object.values(UNSUPPORTED_DOMAINS).sort().join(', ');
}

/**
 * Validate a domain request and return classification + metadata.
 * Useful for logging and debugging.
 *
 * @param {string} requestedDomain - The domain string from a step
 * @returns {Object} {
 *   requested: string,           // Original domain string
 *   canonical: string,           // Canonical form after alias resolution
 *   classification: string,      // 'supported', 'unsupported', 'unknown'
 *   isSupported: boolean,
 *   isUnsupported: boolean
 * }
 */
export function validateDomain(requestedDomain) {
  const canonical = getCanonicalDomain(requestedDomain);
  const classification = classifyDomain(canonical);

  return {
    requested: requestedDomain,
    canonical,
    classification,
    isSupported: classification === 'supported',
    isUnsupported: classification === 'unsupported',
  };
}
