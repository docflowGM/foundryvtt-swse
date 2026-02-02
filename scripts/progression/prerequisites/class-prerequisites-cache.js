/**
 * ============================================
 * Class Prerequisites Cache
 * ============================================
 *
 * INVARIANT:
 * SuggestionEngine and PrerequisiteEngine consume the SAME normalizedPrereqs.
 * If a class is illegal, it must never be suggested.
 *
 * Single source of truth: normalize once, cache once.
 * Both engines read from this cache.
 *
 * Initialization:
 * - At system load, normalizeAndCacheAll() is called
 * - Each class doc gets a normalizedPrereqs field
 * - Both prerequisite checker and suggestion engine read this field
 *
 * ============================================
 */

import { normalizeClassPrerequisites } from './class-prereq-normalizer.js';
import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';
import { SWSELogger } from '../../utils/logger.js';

/**
 * In-memory cache: className → normalized prerequisites + eligibility
 * Format:
 * {
 *   "Bounty Hunter": {
 *     normalized: { minLevel: 7, skills: [...], talents: {...}, ... },
 *     classDoc: { ... },
 *     _cached: true
 *   }
 * }
 */
let CLASS_PREREQ_CACHE = {};

/**
 * Normalize and cache all prestige class prerequisites.
 * Call this once at system initialization.
 *
 * @param {Array<Object>} classDocuments - All class documents from classes.db
 * @returns {Object} - Cache stats { total, prestige, normalized, errors }
 */
export function normalizeAndCacheAll(classDocuments) {
    SWSELogger.log('[ClassPrereqCache] Normalizing and caching all prestige classes...');

    const stats = {
        total: classDocuments.length,
        prestige: 0,
        normalized: 0,
        errors: []
    };

    for (const classDoc of classDocuments) {
        try {
            const normalized = normalizeClassPrerequisites(classDoc);

            if (normalized) {
                // It's a prestige class
                stats.prestige++;
                CLASS_PREREQ_CACHE[classDoc.name] = {
                    normalized,
                    classDoc,
                    _cached: true
                };
                stats.normalized++;
                SWSELogger.log(`[ClassPrereqCache] Cached prestige class: ${classDoc.name}`);
            }
        } catch (error) {
            stats.errors.push({
                className: classDoc.name,
                error: error.message
            });
            SWSELogger.error(`[ClassPrereqCache] Error caching ${classDoc.name}: ${error.message}`);
        }
    }

    SWSELogger.log('[ClassPrereqCache] Normalization complete', stats);
    return stats;
}

/**
 * Get cached prerequisites for a class.
 * Returns null if class not found or not prestige.
 *
 * @param {string} className
 * @returns {Object|null} - { normalized, classDoc }
 */
export function getCachedPrerequisites(className) {
    return CLASS_PREREQ_CACHE[className] || null;
}

/**
 * Evaluate class eligibility using normalized prerequisites.
 *
 * This is the SINGLE POINT OF TRUTH for checking if a character can take a class.
 * Both prerequisite engine and suggestion engine use this.
 *
 * Returns detailed eligibility info so suggestions can provide specific guidance.
 *
 * @param {Object} params
 * @param {string} params.className - Class name to check
 * @param {Object} params.actor - Actor document or snapshot
 * @param {Object} params.pendingData - Pending selections (for chargen)
 * @returns {Object} - {
 *   eligible: boolean,
 *   className: string,
 *   isPrestige: boolean,
 *   eligibilityResult: { met, missing, details },
 *   reasons: { missing: string[], met: string[] }
 * }
 */
export function evaluateClassEligibility({
    className,
    actor,
    pendingData = {}
}) {
    const cached = getCachedPrerequisites(className);

    // Base classes or uncached classes are always eligible
    if (!cached) {
        return {
            eligible: true,
            className,
            isPrestige: false,
            eligibilityResult: { met: true, missing: [], details: {} },
            reasons: { missing: [], met: ['No prerequisites'] }
        };
    }

    // Check prestige class prerequisites using normalized data
    const result = PrerequisiteChecker.checkPrestigeClassPrerequisites(
        actor,
        className,
        pendingData
    );

    return {
        eligible: result.met,
        className,
        isPrestige: true,
        eligibilityResult: result,
        reasons: {
            missing: result.missing || [],
            met: result.met ? ['All prerequisites met'] : []
        }
    };
}

/**
 * Build eligibility report for all classes.
 * Used for batch operations and debugging.
 *
 * @param {Object} actor - Actor document
 * @param {Object} pendingData - Pending selections
 * @returns {Array<Object>} - Array of eligibility objects
 */
export function evaluateAllClassEligibility(actor, pendingData = {}) {
    const report = [];

    for (const [className, cached] of Object.entries(CLASS_PREREQ_CACHE)) {
        const eligibility = evaluateClassEligibility({
            className,
            actor,
            pendingData
        });
        report.push(eligibility);
    }

    return report;
}

/**
 * Get all eligible prestige classes for a character.
 * Used by suggestion engine to find prestige options.
 *
 * @param {Object} actor - Actor document
 * @param {Object} pendingData - Pending selections
 * @returns {Array<Object>} - Array of { className, eligibility, reasons }
 */
export function getEligiblePrestigeClasses(actor, pendingData = {}) {
    const eligible = [];

    for (const className of Object.keys(CLASS_PREREQ_CACHE)) {
        const result = evaluateClassEligibility({
            className,
            actor,
            pendingData
        });

        if (result.eligible) {
            eligible.push({
                className,
                eligibility: result,
                reasons: result.reasons
            });
        }
    }

    return eligible;
}

/**
 * Get near-eligible prestige classes.
 * Classes where character is close to meeting all prerequisites.
 *
 * Useful for PRESTIGE_SOON tier suggestions.
 *
 * @param {Object} actor - Actor document
 * @param {Object} pendingData - Pending selections
 * @param {number} maxMissing - Max number of missing prerequisites to consider "close"
 * @returns {Array<Object>} - Array of { className, eligibility, missingCount, missingReasons }
 */
export function getNearEligiblePrestigeClasses(actor, pendingData = {}, maxMissing = 2) {
    const nearEligible = [];

    for (const className of Object.keys(CLASS_PREREQ_CACHE)) {
        const result = evaluateClassEligibility({
            className,
            actor,
            pendingData
        });

        if (!result.eligible && result.reasons.missing.length <= maxMissing) {
            nearEligible.push({
                className,
                eligibility: result,
                missingCount: result.reasons.missing.length,
                missingReasons: result.reasons.missing
            });
        }
    }

    return nearEligible;
}

/**
 * Dev utility: Get cache stats.
 * @returns {Object} - { cached: number, prestige: number }
 */
export function getCacheStats() {
    return {
        cached: Object.keys(CLASS_PREREQ_CACHE).length,
        classes: Object.keys(CLASS_PREREQ_CACHE)
    };
}

/**
 * Dev utility: Clear cache (for testing/reloading).
 */
export function clearCache() {
    CLASS_PREREQ_CACHE = {};
    SWSELogger.log('[ClassPrereqCache] Cache cleared');
}
